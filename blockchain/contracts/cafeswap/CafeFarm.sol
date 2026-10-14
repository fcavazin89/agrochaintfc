// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address owner) external view returns (uint256);
}

interface ICafeToken {
    function mint(address to, uint256 amount) external;
    function totalSupply() external view returns (uint256);
    function MAX_SUPPLY() external view returns (uint256);
}

/// @title CafeFarm
/// @notice MasterChef-style liquidity mining contract for CaféSwap
/// @dev Time-based CAFE emissions with multiple farm pools and allocation points
contract CafeFarm is ReentrancyGuard, AccessControl {
    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    
    /// @notice Info for each farm pool
    struct PoolInfo {
        IERC20 lpToken;           // LP token contract
        uint256 allocPoint;       // Allocation points for this pool
        uint256 lastRewardTime;   // Last timestamp where CAFE was distributed
        uint256 accCafePerShare;  // Accumulated CAFE per share, scaled by 1e12
    }
    
    /// @notice Info for each user in a pool
    struct UserInfo {
        uint256 amount;       // Amount of LP tokens staked
        uint256 rewardDebt;   // Reward debt (rewards already accounted for)
    }
    
    /// @notice CAFE token contract
    address public immutable cafe;
    
    /// @notice CAFE tokens emitted per second
    uint256 public cafePerSecond;
    
    /// @notice Array of all pool info
    PoolInfo[] public poolInfo;
    
    /// @notice Mapping from pool ID to user address to user info
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;
    
    /// @notice Total allocation points across all pools
    uint256 public totalAllocPoint;
    
    /// @notice Maximum number of pools allowed
    uint256 public constant MAX_POOLS = 50;
    
    error MaxPoolsReached();
    error InvalidPool();
    error InsufficientBalance();
    error OnlyGovernance();
    
    /// @notice Emitted when CAFE minting is skipped because max supply was reached
    event RewardSkipped(address indexed user, uint256 indexed pid, uint256 amount);
    
    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event Withdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount);
    event Harvest(address indexed user, uint256 indexed pid, uint256 amount);
    event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint);
    event AllocPointUpdated(uint256 indexed pid, uint256 allocPoint);
    event RewardRateUpdated(uint256 cafePerSecond);
    
    constructor(address _cafe, uint256 _cafePerSecond) {
        cafe = _cafe;
        cafePerSecond = _cafePerSecond;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GOVERNANCE_ROLE, msg.sender);
    }
    
    /// @notice Returns the number of pools
    function poolLength() external view returns (uint256) {
        return poolInfo.length;
    }
    
    /// @notice Adds a new farm pool
    /// @param lpToken LP token address for this pool
    /// @param allocPoint Allocation points for reward distribution
    /// @param withUpdate Whether to update all pools before adding
    function addPool(address lpToken, uint256 allocPoint, bool withUpdate) external {
        if (!hasRole(GOVERNANCE_ROLE, msg.sender)) revert OnlyGovernance();
        if (poolInfo.length >= MAX_POOLS) revert MaxPoolsReached();
        
        if (withUpdate) {
            massUpdatePools();
        }
        
        uint256 lastRewardTime = block.timestamp;
        totalAllocPoint += allocPoint;
        
        poolInfo.push(PoolInfo({
            lpToken: IERC20(lpToken),
            allocPoint: allocPoint,
            lastRewardTime: lastRewardTime,
            accCafePerShare: 0
        }));
        
        emit PoolAdded(poolInfo.length - 1, lpToken, allocPoint);
    }
    
    /// @notice Updates allocation points for a pool
    /// @dev Always updates all pools first to prevent reward miscalculation
    function setAllocPoint(uint256 pid, uint256 allocPoint) external {
        if (!hasRole(GOVERNANCE_ROLE, msg.sender)) revert OnlyGovernance();
        if (pid >= poolInfo.length) revert InvalidPool();
        
        // Always update all pools before changing allocation to prevent
        // reward miscalculation for the period before this change
        massUpdatePools();
        
        totalAllocPoint = totalAllocPoint - poolInfo[pid].allocPoint + allocPoint;
        poolInfo[pid].allocPoint = allocPoint;
        
        emit AllocPointUpdated(pid, allocPoint);
    }
    
    /// @notice Updates reward emission rate
    function setRewardRate(uint256 newCafePerSecond) external {
        if (!hasRole(GOVERNANCE_ROLE, msg.sender)) revert OnlyGovernance();
        
        massUpdatePools();
        cafePerSecond = newCafePerSecond;
        
        emit RewardRateUpdated(newCafePerSecond);
    }
    
    /// @notice View function to see pending CAFE rewards
    function pendingCafe(uint256 pid, address _user) external view returns (uint256) {
        if (pid >= poolInfo.length) revert InvalidPool();
        
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][_user];
        uint256 accCafePerShare = pool.accCafePerShare;
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        
        if (block.timestamp > pool.lastRewardTime && lpSupply != 0 && totalAllocPoint > 0) {
            uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
            uint256 cafeReward = (timeElapsed * cafePerSecond * pool.allocPoint) / totalAllocPoint;
            accCafePerShare += (cafeReward * 1e12) / lpSupply;
        }
        
        return (user.amount * accCafePerShare) / 1e12 - user.rewardDebt;
    }
    
    /// @notice Updates all pools (gas intensive, use carefully)
    function massUpdatePools() public {
        uint256 length = poolInfo.length;
        for (uint256 pid = 0; pid < length; pid++) {
            updatePool(pid);
        }
    }
    
    /// @notice Updates reward variables for a specific pool
    function updatePool(uint256 pid) public {
        if (pid >= poolInfo.length) revert InvalidPool();
        
        PoolInfo storage pool = poolInfo[pid];
        
        if (block.timestamp <= pool.lastRewardTime) {
            return;
        }
        
        uint256 lpSupply = pool.lpToken.balanceOf(address(this));
        
        if (lpSupply == 0 || totalAllocPoint == 0) {
            pool.lastRewardTime = block.timestamp;
            return;
        }
        
        uint256 timeElapsed = block.timestamp - pool.lastRewardTime;
        uint256 cafeReward = (timeElapsed * cafePerSecond * pool.allocPoint) / totalAllocPoint;
        
        pool.accCafePerShare += (cafeReward * 1e12) / lpSupply;
        pool.lastRewardTime = block.timestamp;
    }
    
    /// @notice Stakes LP tokens in a farm
    /// @dev CRITICAL: Reward debt is set AFTER amount update to prevent reward loss
    function stake(uint256 pid, uint256 amount) external nonReentrant {
        if (pid >= poolInfo.length) revert InvalidPool();
        
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        
        // Step 1: Update pool rewards
        updatePool(pid);
        
        // Step 2: If user already has stake, calculate and transfer pending rewards
        uint256 pending = 0;
        if (user.amount > 0) {
            pending = (user.amount * pool.accCafePerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                safeCafeTransfer(msg.sender, pending);
            }
        }
        
        // Step 3: Transfer LP tokens from user
        if (amount > 0) {
            pool.lpToken.transferFrom(msg.sender, address(this), amount);
            user.amount += amount;
        }
        
        // Step 4: Update reward debt AFTER amount update (CRITICAL)
        user.rewardDebt = (user.amount * pool.accCafePerShare) / 1e12;
        
        emit Deposit(msg.sender, pid, amount);
        if (pending > 0) {
            emit Harvest(msg.sender, pid, pending);
        }
    }
    
    /// @notice Unstakes LP tokens from a farm
    function unstake(uint256 pid, uint256 amount) external nonReentrant {
        if (pid >= poolInfo.length) revert InvalidPool();
        
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        
        if (user.amount < amount) revert InsufficientBalance();
        
        updatePool(pid);
        
        uint256 pending = (user.amount * pool.accCafePerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            safeCafeTransfer(msg.sender, pending);
            emit Harvest(msg.sender, pid, pending);
        }
        
        if (amount > 0) {
            user.amount -= amount;
            pool.lpToken.transfer(msg.sender, amount);
        }
        
        user.rewardDebt = (user.amount * pool.accCafePerShare) / 1e12;
        
        emit Withdraw(msg.sender, pid, amount);
    }
    
    /// @notice Harvests pending CAFE rewards without unstaking
    function harvest(uint256 pid) external nonReentrant {
        if (pid >= poolInfo.length) revert InvalidPool();
        
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        
        updatePool(pid);
        
        uint256 pending = (user.amount * pool.accCafePerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            safeCafeTransfer(msg.sender, pending);
            emit Harvest(msg.sender, pid, pending);
        }
        
        user.rewardDebt = (user.amount * pool.accCafePerShare) / 1e12;
    }
    
    /// @notice Emergency withdraw without caring about rewards (emergency only)
    function emergencyWithdraw(uint256 pid) external nonReentrant {
        if (pid >= poolInfo.length) revert InvalidPool();
        
        PoolInfo storage pool = poolInfo[pid];
        UserInfo storage user = userInfo[pid][msg.sender];
        
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        
        pool.lpToken.transfer(msg.sender, amount);
        
        emit EmergencyWithdraw(msg.sender, pid, amount);
    }
    
    /// @dev Safe CAFE transfer function (mints new tokens)
    /// @dev Gracefully skips minting if the max supply cap would be exceeded.
    ///      Emits RewardSkipped so indexers can detect supply-exhausted farms.
    function safeCafeTransfer(address to, uint256 amount) internal {
        ICafeToken cafeToken = ICafeToken(cafe);
        uint256 remaining = cafeToken.MAX_SUPPLY() - cafeToken.totalSupply();
        if (remaining == 0) {
            // Supply cap reached – skip reward to avoid reverting the entire operation
            emit RewardSkipped(to, 0, amount);
            return;
        }
        uint256 mintAmount = amount > remaining ? remaining : amount;
        cafeToken.mint(to, mintAmount);
    }
}
