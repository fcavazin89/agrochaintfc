// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CoffeeCacaoSwapFactory
/// @notice Factory contract for creating CoffeeCacaoSwap liquidity pools with Coffee/Cacao batch certification verification
/// @dev Only tokens representing certified Coffee or Cacao batches can create pools
/// @custom:requirements FEAT-001: Core token contracts for CoffeeCacaoSwap DEX
contract CoffeeCacaoSwapFactory is Ownable, ReentrancyGuard {
    /// @notice Types of tokens that can be traded
    enum TokenType { COFFEE, CACAO }
    
    /// @notice Address of the AgroChainCoffeeCacaoTraceability contract for batch verification
    address public immutable traceabilityContract;
    
    /// @notice Address authorized for emergency withdrawals (feeToSetter)
    address public feeToSetter;
    
    /// @notice Mapping from token address to batch ID
    mapping(address => bytes32) public tokenToBatchId;
    
    /// @notice Mapping from token address to Coffee token status
    mapping(address => bool) public coffeeTokens;
    
    /// @notice Mapping from token address to Cacao token status
    mapping(address => bool) public cacaoTokens;
    
    /// @notice Mapping from token pair to pool address (token0 => token1 => pool)
    mapping(address => mapping(address => address)) public getPool;
    
    /// @notice All created pool addresses
    address[] public allPools;
    
    /// @dev Custom errors for gas efficiency
    error ZeroAddress();
    error NotCertifiedCoffee();
    error NotCertifiedCacao();
    error InvalidToken();
    error IdenticalAddresses();
    error PairExists();
    error NotAuthorized();
    error TokenAlreadyWhitelisted();
    error NotCoffeeOrCacaoToken();
    
    /// @notice Emitted when a certified Coffee token is added
    event CertifiedCoffeeTokenAdded(address indexed token, bytes32 batchId);
    
    /// @notice Emitted when a certified Cacao token is added
    event CertifiedCacaoTokenAdded(address indexed token, bytes32 batchId);
    
    /// @notice Emitted when a new pool is created
    event PoolCreated(address indexed token0, address indexed token1, address pool, uint256 poolIndex);
    
    /// @notice Emitted when feeToSetter is changed
    event FeeToSetterChanged(address indexed newFeeToSetter);
    
    /// @notice Initializes the factory with the traceability contract address
    /// @param _traceabilityContract Address of the AgroChainCoffeeCacaoTraceability contract
    constructor(address _traceabilityContract) Ownable(msg.sender) {
        if (_traceabilityContract == address(0)) revert ZeroAddress();
        traceabilityContract = _traceabilityContract;
        feeToSetter = msg.sender;
    }
    
    /// @notice Adds a certified Coffee token to the whitelist after verifying batch certification
    /// @dev Calls AgroChainCoffeeCacaoTraceability.isBatchCertified(batchId, true) to verify Coffee batch certification
    /// @param token The token address representing the Coffee batch
    /// @param batchId The batch ID to verify in the traceability contract
    function addCertifiedCoffeeToken(address token, bytes32 batchId) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (coffeeTokens[token] || cacaoTokens[token]) revert TokenAlreadyWhitelisted();
        
        // Verify the Coffee batch is certified using the traceability contract
        bool isCertified = IAgroChainCoffeeCacaoTraceability(traceabilityContract).isBatchCertified(batchId, true);
        if (!isCertified) revert NotCertifiedCoffee();
        
        coffeeTokens[token] = true;
        tokenToBatchId[token] = batchId;
        
        emit CertifiedCoffeeTokenAdded(token, batchId);
    }
    
    /// @notice Adds a certified Cacao token to the whitelist after verifying batch certification
    /// @dev Calls AgroChainCoffeeCacaoTraceability.isBatchCertified(batchId, false) to verify Cacao batch certification
    /// @param token The token address representing the Cacao batch
    /// @param batchId The batch ID to verify in the traceability contract
    function addCertifiedCacaoToken(address token, bytes32 batchId) external onlyOwner {
        if (token == address(0)) revert ZeroAddress();
        if (coffeeTokens[token] || cacaoTokens[token]) revert TokenAlreadyWhitelisted();
        
        // Verify the Cacao batch is certified using the traceability contract
        bool isCertified = IAgroChainCoffeeCacaoTraceability(traceabilityContract).isBatchCertified(batchId, false);
        if (!isCertified) revert NotCertifiedCacao();
        
        cacaoTokens[token] = true;
        tokenToBatchId[token] = batchId;
        
        emit CertifiedCacaoTokenAdded(token, batchId);
    }
    
    /// @notice Creates a new liquidity pool for certified Coffee/Cacao token pairs
    /// @dev Both tokens must be certified Coffee or Cacao tokens, uses CREATE2 for deterministic addresses
    /// @param tokenA First token address (must be certified Coffee or Cacao)
    /// @param tokenB Second token address (must be certified Coffee or Cacao)
    /// @return pool The address of the created pool
    function createPool(address tokenA, address tokenB) external nonReentrant returns (address pool) {
        // Validate token addresses
        if (tokenA == tokenB) revert IdenticalAddresses();
        if (tokenA == address(0) || tokenB == address(0)) revert ZeroAddress();
        
        // Both tokens must be certified Coffee or Cacao tokens
        if (!isCertifiedCoffeeOrCacao(tokenA)) revert NotCoffeeOrCacaoToken();
        if (!isCertifiedCoffeeOrCacao(tokenB)) revert NotCoffeeOrCacaoToken();
        
        // Canonicalize token order (token0 < token1)
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        // Check if pool already exists
        if (getPool[token0][token1] != address(0)) revert PairExists();
        
        // Create pool with CREATE2 for deterministic address
        bytes memory bytecode = type(CoffeeCacaoSwapPool).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        
        assembly {
            pool := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        
        // Initialize the pool
        CoffeeCacaoSwapPool(pool).initialize(token0, token1);
        
        // Store the pool address in both directions
        getPool[token0][token1] = pool;
        getPool[token1][token0] = pool;
        allPools.push(pool);
        
        emit PoolCreated(token0, token1, pool, allPools.length - 1);
    }
    
    /// @notice Sets the address authorized for emergency withdrawals (feeToSetter)
    /// @param _feeToSetter New feeToSetter address
    function setFeeToSetter(address _feeToSetter) external {
        if (msg.sender != feeToSetter) revert NotAuthorized();
        if (_feeToSetter == address(0)) revert ZeroAddress();
        feeToSetter = _feeToSetter;
        emit FeeToSetterChanged(_feeToSetter);
    }
    
    /// @notice Returns the total number of pools created
    function allPoolsLength() external view returns (uint256) {
        return allPools.length;
    }
    
    /// @notice Checks if a token is certified as Coffee or Cacao
    /// @param token The token address to check
    /// @return True if token is certified Coffee or Cacao
    function isCertifiedCoffeeOrCacao(address token) public view returns (bool) {
        return coffeeTokens[token] || cacaoTokens[token];
    }
    
    /// @notice Returns the token type (COFFEE or CACAO) for a whitelisted token
    /// @param token The token address to check
    /// @return tokenType The TokenType enum value
    function getTokenType(address token) external view returns (TokenType) {
        if (coffeeTokens[token]) return TokenType.COFFEE;
        if (cacaoTokens[token]) return TokenType.CACAO;
        revert InvalidToken();
    }
}

/// @title CoffeeCacaoSwapPool
/// @notice Constant product AMM pool for Coffee/Cacao token pairs (placeholder for FEAT-002)
/// @dev This is a minimal placeholder implementation for FEAT-001
contract CoffeeCacaoSwapPool {
    address public factory;
    address public token0;
    address public token1;
    
    error AlreadyInitialized();
    error Forbidden();
    
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
    
    /// @notice Placeholder function for pool functionality (to be implemented in FEAT-002)
    function placeholder() external pure returns (string memory) {
        return "CoffeeCacaoSwapPool placeholder for FEAT-001, full implementation in FEAT-002";
    }
}

/// @notice Interface for AgroChainCoffeeCacaoTraceability contract
interface IAgroChainCoffeeCacaoTraceability {
    function isBatchCertified(bytes32 _batchId, bool _isCoffee) external view returns (bool);
}