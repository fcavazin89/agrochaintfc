// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IAgroChainCertificacoes {
    function certificacaoValida(bytes32 id) external view returns (bool);
}

/// @title CafeSwapFactory
/// @notice Factory contract for creating CaféSwap liquidity pools with certification verification
/// @dev Only tokens certified by AgroChainCertificacoes can create pools
contract CafeSwapFactory is Ownable {
    /// @notice Address of the AgroChainCertificacoes contract for token verification
    address public immutable agroChainCertificacoes;
    
    /// @notice Mapping from token pair to pool address (token0 => token1 => pool)
    mapping(address => mapping(address => address)) public getPair;
    
    /// @notice Array of all created pool addresses
    address[] public allPairs;
    
    /// @notice Address that receives protocol fees
    address public feeTo;
    
    /// @notice Address authorized to change feeTo
    address public feeToSetter;
    
    /// @notice Mapping of token addresses to their certified status
    mapping(address => bool) public certifiedTokens;
    
    /// @notice Mapping of token addresses to their certification ID
    mapping(address => bytes32) public tokenToCertId;
    
    error TokenNotCertified();
    error InvalidCertification();
    error IdenticalAddresses();
    error ZeroAddress();
    error PairExists();
    error InvalidToken();
    
    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 totalPools);
    event CertifiedTokenAdded(address indexed token, bytes32 certId);
    event CertifiedTokenRemoved(address indexed token);
    event FeeToChanged(address indexed feeTo);
    event FeeToSetterChanged(address indexed feeToSetter);
    
    /// @notice Initializes the factory with the certification contract address
    /// @param _agroChainCertificacoes Address of the AgroChainCertificacoes contract
    constructor(address _agroChainCertificacoes) Ownable(msg.sender) {
        if (_agroChainCertificacoes == address(0)) revert ZeroAddress();
        agroChainCertificacoes = _agroChainCertificacoes;
        feeToSetter = msg.sender;
    }
    
    /// @notice Adds a certified token to the whitelist after verifying its certification
    /// @dev Calls AgroChainCertificacoes to verify the certification is valid
    /// @param token The token address to certify
    /// @param certId The certification ID to verify
    function addCertifiedToken(address token, bytes32 certId) external onlyOwner {
        if (token == address(0)) revert InvalidToken();
        if (certId == bytes32(0)) revert InvalidCertification();
        
        // Verify the certification with AgroChainCertificacoes
        if (!IAgroChainCertificacoes(agroChainCertificacoes).certificacaoValida(certId)) {
            revert InvalidCertification();
        }
        
        certifiedTokens[token] = true;
        tokenToCertId[token] = certId;
        
        emit CertifiedTokenAdded(token, certId);
    }
    
    /// @notice Removes a token from the certification whitelist
    /// @dev Does NOT affect existing pools – they continue to operate.
    ///      New pools cannot be created for the delisted token.
    /// @param token The token address to delist
    function removeCertifiedToken(address token) external onlyOwner {
        if (!certifiedTokens[token]) revert TokenNotCertified();
        
        certifiedTokens[token] = false;
        tokenToCertId[token] = bytes32(0);
        
        emit CertifiedTokenRemoved(token);
    }
    
    /// @notice Creates a new liquidity pool for a certified token pair    /// @dev Both tokens must be certified, uses CREATE2 for deterministic addresses
    /// @param tokenA First token address
    /// @param tokenB Second token address
    /// @return pool The address of the created pool
    function createPool(address tokenA, address tokenB) external returns (address pool) {
        if (tokenA == tokenB) revert IdenticalAddresses();
        if (!certifiedTokens[tokenA]) revert TokenNotCertified();
        if (!certifiedTokens[tokenB]) revert TokenNotCertified();
        
        // Canonicalize token order (token0 < token1)
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        if (token0 == address(0)) revert ZeroAddress();
        if (getPair[token0][token1] != address(0)) revert PairExists();
        
        // Create pool with CREATE2 for deterministic address
        bytes memory bytecode = type(CafeSwapPool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize the pool
        CafeSwapPool(pool).initialize(token0, token1);
        
        // Store the pool address in both directions
        getPair[token0][token1] = pool;
        getPair[token1][token0] = pool;
        allPairs.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPairs.length);
    }
    
    /// @notice Returns the total number of pools created
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
    
    /// @notice Sets the address that receives protocol fees
    /// @param _feeTo New feeTo address
    function setFeeTo(address _feeTo) external {
        if (msg.sender != feeToSetter) revert("FORBIDDEN");
        feeTo = _feeTo;
        emit FeeToChanged(_feeTo);
    }
    
    /// @notice Sets the address authorized to change feeTo
    /// @param _feeToSetter New feeToSetter address
    function setFeeToSetter(address _feeToSetter) external {
        if (msg.sender != feeToSetter) revert("FORBIDDEN");
        if (_feeToSetter == address(0)) revert ZeroAddress();
        feeToSetter = _feeToSetter;
        emit FeeToSetterChanged(_feeToSetter);
    }
}

/// @title CafeSwapPool
/// @notice Constant product AMM pool with integrated LP token
/// @dev Implements x*y=k formula with 0.3% trading fee
contract CafeSwapPool {
    string public constant name = "CafeSwap LP";
    string public constant symbol = "CAFE-LP";
    uint8 public constant decimals = 18;
    
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    uint256 public constant MINIMUM_LIQUIDITY = 1000;
    uint256 public constant FEE_DENOMINATOR = 1000;
    uint256 public constant FEE_NUMERATOR = 997;
    
    address public factory;
    address public token0;
    address public token1;
    
    uint112 private reserve0;
    uint112 private reserve1;
    uint32 private blockTimestampLast;
    
    uint256 public price0CumulativeLast;
    uint256 public price1CumulativeLast;
    
    uint256 private unlocked = 1;
    
    error Locked();
    error Overflow();
    error InsufficientLiquidity();
    error InsufficientLiquidityMinted();
    error InsufficientLiquidityBurned();
    error InsufficientOutputAmount();
    error InsufficientInputAmount();
    error InvalidTo();
    error InvariantK();
    error BalanceOverflow();
    error Forbidden();
    error AlreadyInitialized();
    error InsufficientBalance();
    
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
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event EmergencyWithdraw(address indexed token, address indexed to, uint256 amount);
    
    modifier lock() {
        if (unlocked == 0) revert Locked();
        unlocked = 0;
        _;
        unlocked = 1;
    }
    
    constructor() {
        factory = msg.sender;
    }
    
    /// @notice Initializes the pool with token addresses (called by factory)
    function initialize(address _token0, address _token1) external {
        if (msg.sender != factory) revert Forbidden();
        if (token0 != address(0)) revert AlreadyInitialized();
        token0 = _token0;
        token1 = _token1;
    }
    
    /// @notice Returns current reserves and last update timestamp
    function getReserves() public view returns (uint112 _reserve0, uint112 _reserve1, uint32 _blockTimestampLast) {
        _reserve0 = reserve0;
        _reserve1 = reserve1;
        _blockTimestampLast = blockTimestampLast;
    }
    
    /// @notice Mints LP tokens to recipient based on deposited amounts
    /// @dev First mint burns MINIMUM_LIQUIDITY to address(0)
    function mint(address to) external lock returns (uint256 liquidity) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        
        if (totalSupply == 0) {
            liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY;
            _mint(address(0), MINIMUM_LIQUIDITY); // Burn minimum liquidity
        } else {
            liquidity = min((amount0 * totalSupply) / _reserve0, (amount1 * totalSupply) / _reserve1);
        }
        
        if (liquidity == 0) revert InsufficientLiquidityMinted();
        _mint(to, liquidity);
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Mint(msg.sender, amount0, amount1);
    }
    
    /// @notice Burns LP tokens and returns proportional amounts to recipient
    function burn(address to) external lock returns (uint256 amount0, uint256 amount1) {
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        address _token0 = token0;
        address _token1 = token1;
        uint256 balance0 = IERC20(_token0).balanceOf(address(this));
        uint256 balance1 = IERC20(_token1).balanceOf(address(this));
        uint256 liquidity = balanceOf[address(this)];
        
        amount0 = (liquidity * balance0) / totalSupply;
        amount1 = (liquidity * balance1) / totalSupply;
        
        if (amount0 == 0 || amount1 == 0) revert InsufficientLiquidityBurned();
        
        _burn(address(this), liquidity);
        _safeTransfer(_token0, to, amount0);
        _safeTransfer(_token1, to, amount1);
        
        balance0 = IERC20(_token0).balanceOf(address(this));
        balance1 = IERC20(_token1).balanceOf(address(this));
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Burn(msg.sender, amount0, amount1, to);
    }
    
    /// @notice Executes a swap with k-invariant validation
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external lock {
        if (amount0Out == 0 && amount1Out == 0) revert InsufficientOutputAmount();
        (uint112 _reserve0, uint112 _reserve1,) = getReserves();
        if (amount0Out >= _reserve0 || amount1Out >= _reserve1) revert InsufficientLiquidity();
        
        if (to == token0 || to == token1) revert InvalidTo();
        
        if (amount0Out > 0) _safeTransfer(token0, to, amount0Out);
        if (amount1Out > 0) _safeTransfer(token1, to, amount1Out);
        
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        
        uint256 amount0In = balance0 > _reserve0 - amount0Out ? balance0 - (_reserve0 - amount0Out) : 0;
        uint256 amount1In = balance1 > _reserve1 - amount1Out ? balance1 - (_reserve1 - amount1Out) : 0;
        
        if (amount0In == 0 && amount1In == 0) revert InsufficientInputAmount();
        
        // K-invariant check with fee
        uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
        uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);
        
        if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * (1000**2)) {
            revert InvariantK();
        }
        
        _update(balance0, balance1, _reserve0, _reserve1);
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }
    
    /// @notice Forces reserves to match current balances
    function sync() external lock {
        _update(
            IERC20(token0).balanceOf(address(this)),
            IERC20(token1).balanceOf(address(this)),
            reserve0,
            reserve1
        );
    }
    
    /// @notice Returns cumulative price accumulators for TWAP computation
    /// @dev To compute a true TWAP over a window, callers must:
    ///      1. Record (price0CumulativeLast, block.timestamp) at time T0
    ///      2. Record (price0CumulativeLast, block.timestamp) at time T1
    ///      3. Compute average = (cumulative1 - cumulative0) / (T1 - T0)
    ///      The windowSize parameter is accepted for ABI compatibility but is not used here.
    /// @param windowSize Reserved for future on-chain averaging (unused)
    /// @return price0Average Current price0CumulativeLast value (not a windowed average)
    /// @return price1Average Current price1CumulativeLast value (not a windowed average)
    function getPriceCumulatives(uint32 windowSize) external view returns (uint256 price0Average, uint256 price1Average) {
        // Return current cumulative prices.
        // NOTE: These are NOT averages. Use the difference between two snapshots to get TWAP.
        price0Average = price0CumulativeLast;
        price1Average = price1CumulativeLast;
    }
    
    /// @notice Emergency withdrawal of stuck tokens (not pool tokens)
    /// @dev CENTRALIZATION NOTE: feeToSetter (initially the deployer) can extract
    ///      non-pool tokens immediately with no timelock. Intended only for genuine
    ///      stuck-token recovery. Mitigate by transferring feeToSetter to a multisig
    ///      or governance contract after deployment.
    function emergencyWithdraw(address token, address to) external {
        address _feeToSetter = CafeSwapFactory(factory).feeToSetter();
        if (msg.sender != _feeToSetter) revert Forbidden();
        if (token == token0 || token == token1) revert Forbidden();
        
        uint256 balance = IERC20(token).balanceOf(address(this));
        _safeTransfer(token, to, balance);
        
        emit EmergencyWithdraw(token, to, balance);
    }
    
    /// @dev Updates reserves and price accumulators
    function _update(uint256 balance0, uint256 balance1, uint112 _reserve0, uint112 _reserve1) private {
        if (balance0 > type(uint112).max || balance1 > type(uint112).max) revert BalanceOverflow();
        
        uint32 blockTimestamp = uint32(block.timestamp % 2**32);
        uint32 timeElapsed = blockTimestamp - blockTimestampLast;
        
        if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
            unchecked {
                price0CumulativeLast += uint256((uint224(_reserve1) << 112) / _reserve0) * timeElapsed;
                price1CumulativeLast += uint256((uint224(_reserve0) << 112) / _reserve1) * timeElapsed;
            }
        }
        
        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = blockTimestamp;
        
        emit Sync(reserve0, reserve1);
    }
    
    function _mint(address to, uint256 value) private {
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }
    
    function _burn(address from, uint256 value) private {
        balanceOf[from] -= value;
        totalSupply -= value;
        emit Transfer(from, address(0), value);
    }
    
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function transfer(address to, uint256 value) external returns (bool) {
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        if (allowance[from][msg.sender] != type(uint256).max) {
            allowance[from][msg.sender] -= value;
        }
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
        return true;
    }
    
    function _safeTransfer(address token, address to, uint256 value) private {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSelector(0xa9059cbb, to, value)
        );
        if (!success || (data.length != 0 && !abi.decode(data, (bool)))) {
            revert("TRANSFER_FAILED");
        }
    }
    
    function sqrt(uint256 y) internal pure returns (uint256 z) {
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
    
    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}

interface IERC20 {
    function balanceOf(address owner) external view returns (uint256);
    function transfer(address to, uint256 value) external returns (bool);
}
