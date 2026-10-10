// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

// ---------- Interfaces ----------

interface ICoffeeCacaoSwapFactory {
    function getPool(address tokenA, address tokenB) external view returns (address);
    function createPool(address tokenA, address tokenB) external returns (address);
    function isCertifiedToken(address token) external view returns (bool);
}

interface ICoffeeCacaoSwapPool {
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IERC20Min {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

/// @title CoffeeCacaoSwapRouter
/// @notice Router for addLiquidity, removeLiquidity and multi-hop swaps through certified Coffee/Cacao pools
/// @dev All swap paths must consist exclusively of certified tokens. Implements Pausable for emergency governance.
contract CoffeeCacaoSwapRouter is Pausable, Ownable, ReentrancyGuard {

    /// @notice The factory contract that manages pool creation and token certification
    ICoffeeCacaoSwapFactory public immutable factory;

    // ---------- Custom errors ----------
    error Expired();
    error InvalidPath();
    error InsufficientOutputAmount();
    error InsufficientInputAmount();
    error InsufficientAAmount();
    error InsufficientBAmount();
    error InsufficientLiquidity();
    error ExcessiveInputAmount();
    error TokenNotCertified(address token);
    error PoolDoesNotExist(address tokenA, address tokenB);

    // ---------- Events ----------
    event LiquidityAdded(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB, uint256 liquidity);
    event LiquidityRemoved(address indexed tokenA, address indexed tokenB, uint256 amountA, uint256 amountB);
    event Swap(address indexed sender, address[] path, uint256 amountIn, uint256 amountOut);

    // ---------- Modifiers ----------

    /// @notice Reverts if the current block timestamp is past `deadline`
    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }

    // ---------- Constructor ----------

    constructor(address _factory) Ownable(msg.sender) {
        factory = ICoffeeCacaoSwapFactory(_factory);
    }

    // ---------- Internal helpers ----------

    /// @dev Returns tokens in canonical order (token0 < token1)
    function _sortTokens(address tokenA, address tokenB)
        internal
        pure
        returns (address token0, address token1)
    {
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }

    /// @dev Looks up the pool for a token pair using canonical order
    function _getPool(address tokenA, address tokenB) internal view returns (address pool) {
        (address t0, address t1) = _sortTokens(tokenA, tokenB);
        pool = factory.getPool(t0, t1);
        if (pool == address(0)) revert PoolDoesNotExist(tokenA, tokenB);
    }

    /// @dev Quotes the equivalent amount given a ratio (no fee)
    function _quote(uint256 amountA, uint256 reserveA, uint256 reserveB)
        internal
        pure
        returns (uint256 amountB)
    {
        amountB = (amountA * reserveB) / reserveA;
    }

    /// @dev Calculates optimal amounts to deposit respecting the current pool ratio
    function _addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin
    ) private view returns (uint256 amountA, uint256 amountB) {
        (address token0,) = _sortTokens(tokenA, tokenB);

        address pool = factory.getPool(
            tokenA < tokenB ? tokenA : tokenB,
            tokenA < tokenB ? tokenB : tokenA
        );

        if (pool == address(0)) {
            // New pool — accept desired amounts as-is
            return (amountADesired, amountBDesired);
        }

        (uint112 reserve0, uint112 reserve1,) = ICoffeeCacaoSwapPool(pool).getReserves();

        // Map reserves to tokenA/tokenB order
        (uint256 reserveA, uint256 reserveB) = tokenA == token0
            ? (uint256(reserve0), uint256(reserve1))
            : (uint256(reserve1), uint256(reserve0));

        if (reserveA == 0 && reserveB == 0) {
            return (amountADesired, amountBDesired);
        }

        uint256 amountBOptimal = _quote(amountADesired, reserveA, reserveB);
        if (amountBOptimal <= amountBDesired) {
            if (amountBOptimal < amountBMin) revert InsufficientBAmount();
            return (amountADesired, amountBOptimal);
        }

        uint256 amountAOptimal = _quote(amountBDesired, reserveB, reserveA);
        if (amountAOptimal < amountAMin) revert InsufficientAAmount();
        return (amountAOptimal, amountBDesired);
    }

    // ---------- Liquidity ----------

    /// @notice Add liquidity to a Coffee/Cacao pool (creates pool if needed)
    /// @dev Both tokens must be certified. Transfers tokens from caller to pool and mints LP tokens.
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        nonReentrant
        whenNotPaused
        returns (uint256 amountA, uint256 amountB, uint256 liquidity)
    {
        if (!factory.isCertifiedToken(tokenA)) revert TokenNotCertified(tokenA);
        if (!factory.isCertifiedToken(tokenB)) revert TokenNotCertified(tokenB);

        // Ensure pool exists, creating it if necessary
        (address t0, address t1) = _sortTokens(tokenA, tokenB);
        address pool = factory.getPool(t0, t1);
        if (pool == address(0)) {
            pool = factory.createPool(tokenA, tokenB);
        }

        (amountA, amountB) = _addLiquidity(tokenA, tokenB, amountADesired, amountBDesired, amountAMin, amountBMin);

        IERC20Min(tokenA).transferFrom(msg.sender, pool, amountA);
        IERC20Min(tokenB).transferFrom(msg.sender, pool, amountB);

        liquidity = ICoffeeCacaoSwapPool(pool).mint(to);

        emit LiquidityAdded(tokenA, tokenB, amountA, amountB, liquidity);
    }

    /// @notice Remove liquidity from a Coffee/Cacao pool
    /// @dev Burns LP tokens held by caller (must be approved first) and returns underlying tokens.
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        nonReentrant
        returns (uint256 amountA, uint256 amountB)
    {
        address pool = _getPool(tokenA, tokenB);
        (address token0,) = _sortTokens(tokenA, tokenB);

        // Transfer LP tokens from caller to the pool, then burn
        IERC20Min(pool).transferFrom(msg.sender, pool, liquidity);
        (uint256 amount0, uint256 amount1) = ICoffeeCacaoSwapPool(pool).burn(to);

        // Re-map to tokenA/tokenB order
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

        if (amountA < amountAMin) revert InsufficientAAmount();
        if (amountB < amountBMin) revert InsufficientBAmount();

        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB);
    }

    // ---------- Swap helpers ----------

    /// @notice Calculate output amount for a given input and reserves (0.3% fee)
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountOut)
    {
        if (amountIn == 0) revert InsufficientInputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    /// @notice Calculate required input for a desired output (0.3% fee)
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut)
        public
        pure
        returns (uint256 amountIn)
    {
        if (amountOut == 0) revert InsufficientOutputAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }

    /// @notice Calculate output amounts for an entire path
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        public
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address t0,) = _sortTokens(path[i], path[i + 1]);
            address pool = factory.getPool(
                path[i] < path[i + 1] ? path[i] : path[i + 1],
                path[i] < path[i + 1] ? path[i + 1] : path[i]
            );
            if (pool == address(0)) revert PoolDoesNotExist(path[i], path[i + 1]);
            (uint112 reserve0, uint112 reserve1,) = ICoffeeCacaoSwapPool(pool).getReserves();
            (uint256 reserveIn, uint256 reserveOut) = path[i] == t0
                ? (uint256(reserve0), uint256(reserve1))
                : (uint256(reserve1), uint256(reserve0));
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }

    /// @notice Calculate input amounts for a desired final output along a path
    function getAmountsIn(uint256 amountOut, address[] calldata path)
        public
        view
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        for (uint256 i = path.length - 1; i > 0; i--) {
            (address t0,) = _sortTokens(path[i - 1], path[i]);
            address pool = factory.getPool(
                path[i - 1] < path[i] ? path[i - 1] : path[i],
                path[i - 1] < path[i] ? path[i] : path[i - 1]
            );
            if (pool == address(0)) revert PoolDoesNotExist(path[i - 1], path[i]);
            (uint112 reserve0, uint112 reserve1,) = ICoffeeCacaoSwapPool(pool).getReserves();
            (uint256 reserveIn, uint256 reserveOut) = path[i - 1] == t0
                ? (uint256(reserve0), uint256(reserve1))
                : (uint256(reserve1), uint256(reserve0));
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }

    /// @dev Execute multi-hop swaps; intermediate outputs go to the next pool
    function _swap(uint256[] memory amounts, address[] calldata path, address _to) internal {
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            (address token0,) = _sortTokens(input, output);

            address pool = factory.getPool(
                input < output ? input : output,
                input < output ? output : input
            );

            uint256 amountOut = amounts[i + 1];
            (uint256 amount0Out, uint256 amount1Out) = input == token0
                ? (uint256(0), amountOut)
                : (amountOut, uint256(0));

            // Intermediate hops send output directly to the next pool
            address recipient;
            if (i < path.length - 2) {
                recipient = factory.getPool(
                    path[i + 1] < path[i + 2] ? path[i + 1] : path[i + 2],
                    path[i + 1] < path[i + 2] ? path[i + 2] : path[i + 1]
                );
            } else {
                recipient = _to;
            }

            ICoffeeCacaoSwapPool(pool).swap(amount0Out, amount1Out, recipient);
        }
    }

    // ---------- Swap entry points ----------

    /// @notice Swap an exact amount of input tokens for as many output tokens as possible
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        nonReentrant
        whenNotPaused
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();

        // All tokens in path must be certified
        for (uint256 i = 0; i < path.length; i++) {
            if (!factory.isCertifiedToken(path[i])) revert TokenNotCertified(path[i]);
        }

        amounts = getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutputAmount();

        // Transfer input to first pool
        address firstPool = factory.getPool(
            path[0] < path[1] ? path[0] : path[1],
            path[0] < path[1] ? path[1] : path[0]
        );
        IERC20Min(path[0]).transferFrom(msg.sender, firstPool, amounts[0]);

        _swap(amounts, path, to);

        emit Swap(msg.sender, path, amountIn, amounts[amounts.length - 1]);
    }

    /// @notice Swap as few input tokens as possible to receive an exact output amount
    function swapTokensForExactTokens(
        uint256 amountOut,
        uint256 amountInMax,
        address[] calldata path,
        address to,
        uint256 deadline
    )
        external
        ensure(deadline)
        nonReentrant
        whenNotPaused
        returns (uint256[] memory amounts)
    {
        if (path.length < 2) revert InvalidPath();

        // All tokens in path must be certified
        for (uint256 i = 0; i < path.length; i++) {
            if (!factory.isCertifiedToken(path[i])) revert TokenNotCertified(path[i]);
        }

        amounts = getAmountsIn(amountOut, path);
        if (amounts[0] > amountInMax) revert ExcessiveInputAmount();

        // Transfer input to first pool
        address firstPool = factory.getPool(
            path[0] < path[1] ? path[0] : path[1],
            path[0] < path[1] ? path[1] : path[0]
        );
        IERC20Min(path[0]).transferFrom(msg.sender, firstPool, amounts[0]);

        _swap(amounts, path, to);

        emit Swap(msg.sender, path, amounts[0], amountOut);
    }

    // ---------- Governance ----------

    /// @notice Pause all swaps and liquidity operations
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause all swaps and liquidity operations
    function unpause() external onlyOwner {
        _unpause();
    }
}
