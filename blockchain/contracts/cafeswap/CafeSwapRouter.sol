// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ICafeSwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address);
    function createPool(address tokenA, address tokenB) external returns (address);
}

interface ICafeSwapPool {
    function mint(address to) external returns (uint256 liquidity);
    function burn(address to) external returns (uint256 amount0, uint256 amount1);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

/// @title CafeSwapRouter
/// @notice Router for adding/removing liquidity and executing swaps through CaféSwap pools
/// @dev Handles multi-hop routing with canonical token ordering and deadline protection
contract CafeSwapRouter is ReentrancyGuard, Ownable {
    address public immutable factory;
    address public governance;
    
    error Expired();
    error InsufficientAmount();
    error InsufficientLiquidity();
    error InvalidPath();
    error ExcessiveInputAmount();
    error InsufficientOutputAmount();
    
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity
    );
    event LiquidityRemoved(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB
    );
    event Swap(
        address indexed sender,
        address[] path,
        uint256 amountIn,
        uint256 amountOut
    );
    
    modifier ensure(uint256 deadline) {
        if (block.timestamp > deadline) revert Expired();
        _;
    }
    
    constructor(address _factory) Ownable(msg.sender) {
        factory = _factory;
        governance = msg.sender;
    }
    
    /// @notice Adds liquidity to a token pair pool
    /// @dev If createPoolIfNeeded is false and the pool does not exist, the call reverts.
    ///      Set createPoolIfNeeded=true only when you explicitly intend to deploy a new pool
    ///      (incurs pool-deployment gas cost).
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline,
        bool createPoolIfNeeded
    ) external ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        // Canonicalize order
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        
        // Get or create pool
        address pool = ICafeSwapFactory(factory).getPair(token0, token1);
        if (pool == address(0)) {
            if (!createPoolIfNeeded) revert InsufficientLiquidity();
            pool = ICafeSwapFactory(factory).createPool(tokenA, tokenB);
        }
        
        // Calculate optimal amounts
        (uint256 amount0Desired, uint256 amount1Desired) = tokenA == token0 
            ? (amountADesired, amountBDesired) 
            : (amountBDesired, amountADesired);
        (uint256 amount0Min, uint256 amount1Min) = tokenA == token0 
            ? (amountAMin, amountBMin) 
            : (amountBMin, amountAMin);
        
        (uint112 reserve0, uint112 reserve1,) = ICafeSwapPool(pool).getReserves();
        
        uint256 amount0;
        uint256 amount1;
        
        if (reserve0 == 0 && reserve1 == 0) {
            (amount0, amount1) = (amount0Desired, amount1Desired);
        } else {
            uint256 amount1Optimal = quote(amount0Desired, reserve0, reserve1);
            if (amount1Optimal <= amount1Desired) {
                if (amount1Optimal < amount1Min) revert InsufficientAmount();
                (amount0, amount1) = (amount0Desired, amount1Optimal);
            } else {
                uint256 amount0Optimal = quote(amount1Desired, reserve1, reserve0);
                assert(amount0Optimal <= amount0Desired);
                if (amount0Optimal < amount0Min) revert InsufficientAmount();
                (amount0, amount1) = (amount0Optimal, amount1Desired);
            }
        }
        
        // Convert back to original token order
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        
        // Transfer tokens to pool
        IERC20(tokenA).transferFrom(msg.sender, pool, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pool, amountB);
        
        // Mint LP tokens
        liquidity = ICafeSwapPool(pool).mint(to);
        
        emit LiquidityAdded(tokenA, tokenB, amountA, amountB, liquidity);
    }
    
    /// @notice Removes liquidity from a token pair pool
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidity,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256 amountA, uint256 amountB) {
        // Canonicalize order
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        address pool = ICafeSwapFactory(factory).getPair(token0, token1);
        
        if (pool == address(0)) revert InsufficientLiquidity();
        
        // Transfer LP tokens to pool
        IERC20(pool).transferFrom(msg.sender, pool, liquidity);
        
        // Burn LP tokens and receive tokens
        (uint256 amount0, uint256 amount1) = ICafeSwapPool(pool).burn(to);
        
        // Convert to original token order
        (amountA, amountB) = tokenA == token0 ? (amount0, amount1) : (amount1, amount0);
        
        if (amountA < amountAMin) revert InsufficientAmount();
        if (amountB < amountBMin) revert InsufficientAmount();
        
        emit LiquidityRemoved(tokenA, tokenB, amountA, amountB);
    }
    
    /// @notice Executes a swap through a multi-hop path
    /// @dev Handles canonical token ordering per hop
    function swap(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external ensure(deadline) nonReentrant returns (uint256[] memory amounts) {
        if (path.length < 2) revert InvalidPath();
        
        amounts = getAmountsOut(amountIn, path);
        if (amounts[amounts.length - 1] < amountOutMin) revert InsufficientOutputAmount();
        
        // Canonicalize first pair and transfer input to first pool
        (address token0, address token1) = path[0] < path[1] ? (path[0], path[1]) : (path[1], path[0]);
        address firstPool = ICafeSwapFactory(factory).getPair(token0, token1);
        IERC20(path[0]).transferFrom(msg.sender, firstPool, amounts[0]);
        
        // Execute swaps through path
        _swap(amounts, path, to);
        
        emit Swap(msg.sender, path, amountIn, amounts[amounts.length - 1]);
    }
    
    /// @dev Internal swap execution with canonical ordering
    function _swap(uint256[] memory amounts, address[] memory path, address _to) internal {
        for (uint256 i = 0; i < path.length - 1; i++) {
            (address input, address output) = (path[i], path[i + 1]);
            
            // Canonicalize pair order
            (address token0, address token1) = input < output ? (input, output) : (output, input);
            address pool = ICafeSwapFactory(factory).getPair(token0, token1);
            
            uint256 amountOut = amounts[i + 1];
            
            // Determine output direction based on original path order
            (uint256 amount0Out, uint256 amount1Out) = input == token0 
                ? (uint256(0), amountOut) 
                : (amountOut, uint256(0));
            
            address recipient = i < path.length - 2 
                ? ICafeSwapFactory(factory).getPair(
                    path[i + 1] < path[i + 2] ? path[i + 1] : path[i + 2],
                    path[i + 1] < path[i + 2] ? path[i + 2] : path[i + 1]
                  )
                : _to;
            
            ICafeSwapPool(pool).swap(amount0Out, amount1Out, recipient, new bytes(0));
        }
    }
    
    /// @notice Calculates output amounts for a swap path
    function getAmountsOut(uint256 amountIn, address[] memory path) 
        public 
        view 
        returns (uint256[] memory amounts) 
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[0] = amountIn;
        
        for (uint256 i = 0; i < path.length - 1; i++) {
            // Canonicalize pair order
            (address token0, address token1) = path[i] < path[i + 1] 
                ? (path[i], path[i + 1]) 
                : (path[i + 1], path[i]);
            
            address pool = ICafeSwapFactory(factory).getPair(token0, token1);
            if (pool == address(0)) revert InsufficientLiquidity();
            
            (uint112 reserve0, uint112 reserve1,) = ICafeSwapPool(pool).getReserves();
            
            // Determine reserve order based on path
            (uint112 reserveIn, uint112 reserveOut) = path[i] == token0 
                ? (reserve0, reserve1) 
                : (reserve1, reserve0);
            
            amounts[i + 1] = getAmountOut(amounts[i], reserveIn, reserveOut);
        }
    }
    
    /// @notice Calculates input amounts for a desired output
    function getAmountsIn(uint256 amountOut, address[] memory path) 
        public 
        view 
        returns (uint256[] memory amounts) 
    {
        if (path.length < 2) revert InvalidPath();
        amounts = new uint256[](path.length);
        amounts[amounts.length - 1] = amountOut;
        
        for (uint256 i = path.length - 1; i > 0; i--) {
            // Canonicalize pair order
            (address token0, address token1) = path[i - 1] < path[i] 
                ? (path[i - 1], path[i]) 
                : (path[i], path[i - 1]);
            
            address pool = ICafeSwapFactory(factory).getPair(token0, token1);
            if (pool == address(0)) revert InsufficientLiquidity();
            
            (uint112 reserve0, uint112 reserve1,) = ICafeSwapPool(pool).getReserves();
            
            // Determine reserve order based on path
            (uint112 reserveIn, uint112 reserveOut) = path[i - 1] == token0 
                ? (reserve0, reserve1) 
                : (reserve1, reserve0);
            
            amounts[i - 1] = getAmountIn(amounts[i], reserveIn, reserveOut);
        }
    }
    
    /// @notice Calculates output amount for a given input with 0.3% fee
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) 
        public 
        pure 
        returns (uint256 amountOut) 
    {
        if (amountIn == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        amountOut = numerator / denominator;
    }
    
    /// @notice Calculates input amount needed for a desired output
    function getAmountIn(uint256 amountOut, uint256 reserveIn, uint256 reserveOut) 
        public 
        pure 
        returns (uint256 amountIn) 
    {
        if (amountOut == 0) revert InsufficientAmount();
        if (reserveIn == 0 || reserveOut == 0) revert InsufficientLiquidity();
        
        uint256 numerator = reserveIn * amountOut * 1000;
        uint256 denominator = (reserveOut - amountOut) * 997;
        amountIn = (numerator / denominator) + 1;
    }
    
    /// @notice Quotes equivalent amount for a given ratio
    function quote(uint256 amountA, uint256 reserveA, uint256 reserveB) 
        public 
        pure 
        returns (uint256 amountB) 
    {
        if (amountA == 0) revert InsufficientAmount();
        if (reserveA == 0 || reserveB == 0) revert InsufficientLiquidity();
        amountB = (amountA * reserveB) / reserveA;
    }
    
    /// @notice Sets the governance address
    function setGovernance(address _governance) external {
        if (msg.sender != governance && msg.sender != owner()) revert("FORBIDDEN");
        governance = _governance;
    }
}
