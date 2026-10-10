// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20Transfer {
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}

/// @title CoffeeCacaoSwapPool
/// @notice Constant product AMM pool (x*y=k) for Coffee/Cacao certified token pairs
/// @dev Issues ERC20 LP tokens (CCLP) to liquidity providers. Implements 0.3% swap fee.
contract CoffeeCacaoSwapPool is ERC20, ReentrancyGuard {
    /// @notice Minimum liquidity permanently locked on first deposit
    uint256 public constant MINIMUM_LIQUIDITY = 1000;

    /// @dev Dead address used to permanently lock the MINIMUM_LIQUIDITY on first mint.
    ///      OZ v5 disallows minting to address(0) so we use the canonical dead address instead.
    address private constant DEAD = 0x000000000000000000000000000000000000dEaD;

    /// @notice Address of the factory that deployed this pool
    address public factory;

    /// @notice The two tokens in this pool (canonically ordered: token0 < token1)
    address public token0;
    address public token1;

    /// @dev Packed reserves and last-updated timestamp
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;

    /// @notice TWAP price accumulators (UQ112.112 fixed-point, wraps on overflow by design)
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;

    // ---------- Custom errors ----------
    error InsufficientLiquidity();
    error InvalidTo();
    error InsufficientOutputAmount();
    error InsufficientInputAmount();
    error InvalidK();
    error Overflow();

    // ---------- Events ----------
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(address indexed sender, uint256 amount0, uint256 amount1, address indexed to);
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );
    event Sync(uint112 reserve0, uint112 reserve1);

    // ---------- Constructor ----------

    /// @notice Deploys the pool; called by the factory via CREATE2
    /// @param _token0 Canonical token0 address (token0 < token1)
    /// @param _token1 Canonical token1 address
    constructor(address _token0, address _token1) ERC20("CoffeeCacao LP", "CCLP") {
        factory = msg.sender;
        token0 = _token0;
        token1 = _token1;
    }

    // ---------- View ----------

    /// @notice Returns the current reserves and the timestamp of the last update
    function getReserves()
        external
        view
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }

    // ---------- Internal helpers ----------

    /// @dev Update reserves and accumulate TWAP prices
    function _update(
        uint256 balance0,
        uint256 balance1,
        uint112 _reserve0,
        uint112 _reserve1
    ) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert Overflow();

        uint32 blockTimestamp = uint32(block.timestamp % 2 ** 32);
        uint32 timeElapsed;
        unchecked {
            timeElapsed = blockTimestamp - blockTimestampLast;
        }

        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            // UQ112.112 price accumulation — overflow is intentional (Uniswap v2 pattern)
            unchecked {
                price0CumulativeLast += (uint256(_reserve1) * 2 ** 112 / uint256(_reserve0)) * timeElapsed;
                price1CumulativeLast += (uint256(_reserve0) * 2 ** 112 / uint256(_reserve1)) * timeElapsed;
            }
        }

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;

        emit Sync(reserve0, reserve1);
    }

    /// @dev Integer square root (Babylonian method)
    function _sqrt(uint256 y) private pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /// @dev Returns the smaller of two values
    function _min(uint256 a, uint256 b) private pure returns (uint256) {
        return a < b ? a : b;
    }

    // ---------- Core AMM operations ----------

    /// @notice Mint LP tokens by depositing token0 and token1 into the pool
    /// @param to Recipient of the LP tokens
    /// @return liquidity Amount of LP tokens minted
    function mint(address to) external nonReentrant returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = (reserve0, reserve1, blockTimestampLast);

        uint256 balance0 = IERC20Transfer(token0).balanceOf(address(this));
        uint256 balance1 = IERC20Transfer(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;

        uint256 _totalSupply = totalSupply();

        if (_totalSupply == 0) {
            // First deposit: permanently lock MINIMUM_LIQUIDITY at the dead address.
            // OZ v5 disallows minting to address(0), so we use 0x000...dEaD instead.
            liquidity = _sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(DEAD, MINIMUM_LIQUIDITY);
        } else {
            // Subsequent deposits: proportional to the smaller ratio
            liquidity = _min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
        }

        if (liquidity == 0) revert InsufficientLiquidity();

        _mint(to, liquidity);
        _update(balance0, balance1, _reserve0, _reserve1);

        emit Mint(msg.sender, amount0, amount1);
    }

    /// @notice Burn LP tokens and receive proportional token0 and token1
    /// @param to Recipient of the underlying tokens
    /// @return amount0 Amount of token0 returned
    /// @return amount1 Amount of token1 returned
    function burn(address to) external nonReentrant returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = (reserve0, reserve1, blockTimestampLast);

        uint256 balance0 = IERC20Transfer(token0).balanceOf(address(this));
        uint256 balance1 = IERC20Transfer(token1).balanceOf(address(this));
        uint256 liquidity = balanceOf(address(this));

        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;

        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidity();

        _burn(address(this), liquidity);
        IERC20Transfer(token0).transfer(to, amount0);
        IERC20Transfer(token1).transfer(to, amount1);

        balance0 = IERC20Transfer(token0).balanceOf(address(this));
        balance1 = IERC20Transfer(token1).balanceOf(address(this));

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Burn(msg.sender, amount0, amount1, to);
    }

    /// @notice Execute a swap with optimistic transfer then verify k invariant
    /// @param amount0Out Amount of token0 to send out (set to 0 if not needed)
    /// @param amount1Out Amount of token1 to send out (set to 0 if not needed)
    /// @param to Recipient address (must not be token0 or token1)
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external nonReentrant {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();

        (uint112 _reserve0, uint112 _reserve1,) = (reserve0, reserve1, blockTimestampLast);

        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) revert InsufficientLiquidity();
        if (to == token0 || to == token1) revert InvalidTo();

        // Optimistic transfers
        if (amount0Out > 0) IERC20Transfer(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20Transfer(token1).transfer(to, amount1Out);

        uint256 balance0 = IERC20Transfer(token0).balanceOf(address(this));
        uint256 balance1 = IERC20Transfer(token1).balanceOf(address(this));

        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;

        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();

        // Verify constant product invariant with 0.3% fee
        // (balance0 * 1000 - amount0In * 3) * (balance1 * 1000 - amount1In * 3) >= reserve0 * reserve1 * 1_000_000
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;

        if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * 1_000_000) {
            revert InvalidK();
        }

        _update(balance0, balance1, _reserve0, _reserve1);

        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    /// @notice Force-sync reserves to match current token balances
    function sync() external {
        _update(
            IERC20Transfer(token0).balanceOf(address(this)),
            IERC20Transfer(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }

    /// @notice Transfer any surplus tokens (above reserves) to `to`
    /// @param to Recipient of the excess tokens
    function skim(address to) external {
        address _token0 = token0;
        address _token1 = token1;
        uint256 excess0 = IERC20Transfer(_token0).balanceOf(address(this)) - reserve0;
        uint256 excess1 = IERC20Transfer(_token1).balanceOf(address(this)) - reserve1;
        if (excess0 > 0) IERC20Transfer(_token0).transfer(to, excess0);
        if (excess1 > 0) IERC20Transfer(_token1).transfer(to, excess1);
    }
}
