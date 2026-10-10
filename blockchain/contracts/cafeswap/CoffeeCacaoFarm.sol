// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CoffeeCacaoFarm
/// @notice MasterChef-style liquidity mining contract for Coffee/Cacao LP tokens
/// @dev Implements time-based rewards with proper reward debt accounting
contract CoffeeCacaoFarm is ReentrancyGuard, Ownable {
    /// @notice Information about each farm
    struct FarmInfo {
        IERC20 lpToken;
        uint256 allocPoint;
        uint256 lastRewardTime;
        uint256 accCafePerShare;
        string farmName;
        bool isCoffeeFarm;
    }

    /// @notice User stake information per farm
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    /// @notice Maximum number of farms allowed
    uint256 public constant MAX_FARMS = 50;

    /// @notice Array of all farms
    FarmInfo[] public farms;

    /// @notice Mapping from farmId to user address to user info
    mapping(uint256 => mapping(address => UserInfo)) public userInfo;

    /// @notice CAFE token emissions per second
    uint256 public cafePerSecond;

    /// @notice Total allocation points (sum of all farm allocPoints)
    uint256 public totalAllocPoint;

    /// @notice CAFE token contract (immutable)
    ICafeToken public immutable cafe;

    /// @notice CoffeeCacaoSwapFactory contract (immutable, used for LP token validation)
    ICoffeeCacaoSwapFactory public immutable factory;

    /// @notice Address with governance privileges (can add farms, set params)
    address public governance;

    // Custom errors
    error OnlyGovernance();
    error FarmsFull();
    error InvalidLpToken();
    error ZeroAmount();
    error InvalidFarmId();
    error InsufficientStake();

    // Events
    event FarmAdded(uint256 indexed farmId, address indexed lpToken, uint256 allocPoint, string farmName, bool isCoffeeFarm);
    event AllocPointUpdated(uint256 indexed farmId, uint256 oldAllocPoint, uint256 newAllocPoint);
    event RewardRateUpdated(uint256 oldCafePerSecond, uint256 newCafePerSecond);
    event Staked(address indexed user, uint256 indexed farmId, uint256 amount);
    event Unstaked(address indexed user, uint256 indexed farmId, uint256 amount);
    event Harvested(address indexed user, uint256 indexed farmId, uint256 reward);
    event EmergencyWithdrawn(address indexed user, uint256 indexed farmId, uint256 amount);

    /// @notice Initializes the farm contract
    /// @param _cafe Address of the CAFE token contract
    /// @param _factory Address of the CoffeeCacaoSwapFactory
    /// @param _cafePerSecond Initial CAFE emissions per second
    /// @param _governance Address with governance privileges
    constructor(address _cafe, address _factory, uint256 _cafePerSecond, address _governance) Ownable(msg.sender) {
        cafe = ICafeToken(_cafe);
        factory = ICoffeeCacaoSwapFactory(_factory);
        cafePerSecond = _cafePerSecond;
        governance = _governance;
    }

    /// @notice Sets governance address (onlyGovernance)
    /// @param _governance New governance address
    function setGovernance(address _governance) external {
        if (msg.sender != governance) revert OnlyGovernance();
        governance = _governance;
    }

    /// @notice Adds a new farm (onlyGovernance)
    /// @dev Validates LP token is from the factory, updates all farms first
    /// @param _lpToken Address of the LP token to stake
    /// @param _allocPoint Allocation points for this farm
    /// @param _farmName Human-readable name for the farm
    /// @param _isCoffeeFarm True if Coffee-only or Coffee/Cacao pair, false if Cacao-only
    function addFarm(
        address _lpToken,
        uint256 _allocPoint,
        string calldata _farmName,
        bool _isCoffeeFarm
    ) external {
        if (msg.sender != governance) revert OnlyGovernance();
        if (farms.length >= MAX_FARMS) revert FarmsFull();
        if (!factory.isCertifiedCoffeeOrCacao(_lpToken)) revert InvalidLpToken();

        // Update all existing farms before changing allocPoints
        massUpdateFarms();

        totalAllocPoint += _allocPoint;
        farms.push(FarmInfo({
            lpToken: IERC20(_lpToken),
            allocPoint: _allocPoint,
            lastRewardTime: block.timestamp,
            accCafePerShare: 0,
            farmName: _farmName,
            isCoffeeFarm: _isCoffeeFarm
        }));

        emit FarmAdded(farms.length - 1, _lpToken, _allocPoint, _farmName, _isCoffeeFarm);
    }

    /// @notice Sets allocation points for a farm (onlyGovernance)
    /// @param _farmId Index of the farm
    /// @param _newAllocPoint New allocation points
    function setAllocPoint(uint256 _farmId, uint256 _newAllocPoint) external {
        if (msg.sender != governance) revert OnlyGovernance();
        if (_farmId >= farms.length) revert InvalidFarmId();

        updateFarm(_farmId);

        FarmInfo storage farm = farms[_farmId];
        uint256 oldAllocPoint = farm.allocPoint;
        totalAllocPoint = totalAllocPoint - oldAllocPoint + _newAllocPoint;
        farm.allocPoint = _newAllocPoint;

        emit AllocPointUpdated(_farmId, oldAllocPoint, _newAllocPoint);
    }

    /// @notice Sets CAFE emission rate (onlyGovernance)
    /// @dev Updates all farms before changing rate
    /// @param _newCafePerSecond New CAFE emissions per second
    function setRewardRate(uint256 _newCafePerSecond) external {
        if (msg.sender != governance) revert OnlyGovernance();

        massUpdateFarms();

        uint256 oldCafePerSecond = cafePerSecond;
        cafePerSecond = _newCafePerSecond;

        emit RewardRateUpdated(oldCafePerSecond, _newCafePerSecond);
    }

    /// @notice Updates a farm's accCafePerShare based on time elapsed
    /// @param _farmId Index of the farm
    function updateFarm(uint256 _farmId) internal {
        if (_farmId >= farms.length) revert InvalidFarmId();

        FarmInfo storage farm = farms[_farmId];

        if (block.timestamp <= farm.lastRewardTime) return;

        uint256 lpSupply = farm.lpToken.balanceOf(address(this));
        if (lpSupply == 0) {
            farm.lastRewardTime = block.timestamp;
            return;
        }

        uint256 timeElapsed = block.timestamp - farm.lastRewardTime;
        uint256 cafeReward = (timeElapsed * cafePerSecond * farm.allocPoint) / totalAllocPoint;
        farm.accCafePerShare += (cafeReward * 1e12) / lpSupply;
        farm.lastRewardTime = block.timestamp;
    }

    /// @notice Updates all farms
    function massUpdateFarms() public {
        uint256 len = farms.length;
        for (uint256 i = 0; i < len; i++) {
            updateFarm(i);
        }
    }

    /// @notice Stakes LP tokens in a farm
    /// @dev CRITICAL: Maintains proper reward debt ordering
    /// @param _farmId Index of the farm
    /// @param _amount Amount of LP tokens to stake
    function stake(uint256 _farmId, uint256 _amount) external nonReentrant {
        if (_farmId >= farms.length) revert InvalidFarmId();
        if (_amount == 0) revert ZeroAmount();

        FarmInfo storage farm = farms[_farmId];
        UserInfo storage user = userInfo[_farmId][msg.sender];

        // 1. Update farm state
        updateFarm(_farmId);

        // 2. If user had previous stake, harvest pending rewards
        if (user.amount > 0) {
            uint256 pending = (user.amount * farm.accCafePerShare) / 1e12 - user.rewardDebt;
            if (pending > 0) {
                _safeMint(msg.sender, pending);
            }
        }

        // 3. Update user amount
        user.amount += _amount;

        // 4. Set reward debt based on NEW amount
        user.rewardDebt = (user.amount * farm.accCafePerShare) / 1e12;

        // 5. Transfer LP tokens from user to contract
        farm.lpToken.transferFrom(msg.sender, address(this), _amount);

        emit Staked(msg.sender, _farmId, _amount);
    }

    /// @notice Unstakes LP tokens from a farm
    /// @dev Auto-harvests pending rewards before returning LP tokens
    /// @param _farmId Index of the farm
    /// @param _amount Amount of LP tokens to unstake
    function unstake(uint256 _farmId, uint256 _amount) external nonReentrant {
        if (_farmId >= farms.length) revert InvalidFarmId();
        if (_amount == 0) revert ZeroAmount();

        FarmInfo storage farm = farms[_farmId];
        UserInfo storage user = userInfo[_farmId][msg.sender];

        if (user.amount < _amount) revert InsufficientStake();

        // 1. Update farm state
        updateFarm(_farmId);

        // 2. Calculate and harvest pending rewards
        uint256 pending = (user.amount * farm.accCafePerShare) / 1e12 - user.rewardDebt;
        if (pending > 0) {
            _safeMint(msg.sender, pending);
        }

        // 3. Update user amount
        user.amount -= _amount;

        // 4. Update reward debt
        user.rewardDebt = (user.amount * farm.accCafePerShare) / 1e12;

        // 5. Return LP tokens
        farm.lpToken.transfer(msg.sender, _amount);

        emit Unstaked(msg.sender, _farmId, _amount);
    }

    /// @notice Harvests pending rewards from a farm
    /// @param _farmId Index of the farm
    function harvest(uint256 _farmId) external nonReentrant {
        if (_farmId >= farms.length) revert InvalidFarmId();

        FarmInfo storage farm = farms[_farmId];
        UserInfo storage user = userInfo[_farmId][msg.sender];

        // 1. Update farm state
        updateFarm(_farmId);

        // 2. Calculate pending rewards
        uint256 pending = (user.amount * farm.accCafePerShare) / 1e12 - user.rewardDebt;

        // 3. Mint rewards if any
        if (pending > 0) {
            _safeMint(msg.sender, pending);
        }

        // 4. Update reward debt
        user.rewardDebt = (user.amount * farm.accCafePerShare) / 1e12;

        emit Harvested(msg.sender, _farmId, pending);
    }

    /// @notice Emergency withdrawal of LP tokens without rewards
    /// @param _farmId Index of the farm
    function emergencyWithdraw(uint256 _farmId) external nonReentrant {
        if (_farmId >= farms.length) revert InvalidFarmId();

        FarmInfo storage farm = farms[_farmId];
        UserInfo storage user = userInfo[_farmId][msg.sender];

        uint256 amount = user.amount;
        if (amount == 0) revert ZeroAmount();

        // Zero out user stake
        user.amount = 0;
        user.rewardDebt = 0;

        // Return LP tokens without rewards
        farm.lpToken.transfer(msg.sender, amount);

        emit EmergencyWithdrawn(msg.sender, _farmId, amount);
    }

    /// @notice View function to calculate pending CAFE rewards (no state change)
    /// @param _farmId Index of the farm
    /// @param _user User address
    /// @return Pending CAFE amount
    function pendingCafe(uint256 _farmId, address _user) external view returns (uint256) {
        if (_farmId >= farms.length) return 0;

        FarmInfo storage farm = farms[_farmId];
        UserInfo storage user = userInfo[_farmId][_user];

        uint256 accCafePerShare = farm.accCafePerShare;
        uint256 lpSupply = farm.lpToken.balanceOf(address(this));

        // Calculate what accCafePerShare would be if we updated now
        if (block.timestamp > farm.lastRewardTime && lpSupply > 0) {
            uint256 timeElapsed = block.timestamp - farm.lastRewardTime;
            uint256 cafeReward = (timeElapsed * cafePerSecond * farm.allocPoint) / totalAllocPoint;
            accCafePerShare += (cafeReward * 1e12) / lpSupply;
        }

        return (user.amount * accCafePerShare) / 1e12 - user.rewardDebt;
    }

    /// @notice Returns total number of farms
    function farmsLength() external view returns (uint256) {
        return farms.length;
    }

    /// @dev Mints CAFE tokens, respecting max supply
    function _safeMint(address _to, uint256 _amount) internal {
        cafe.mint(_to, _amount);
    }
}

/// @notice Interface for CAFE token
interface ICafeToken {
    function mint(address to, uint256 amount) external;
}

/// @notice Interface for CoffeeCacaoSwapFactory
interface ICoffeeCacaoSwapFactory {
    function isCertifiedCoffeeOrCacao(address token) external view returns (bool);
}
