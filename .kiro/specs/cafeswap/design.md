# Design Document: CoffeeCacaoSwap DEX

## Overview

CoffeeCacaoSwap is a specialized permissionless decentralized exchange protocol implementing a constant product automated market maker (AMM) model exclusively for Coffee and Cacao agricultural tokens. The protocol ensures only certified Coffee (Arabica, Robusta/Conilon) and Cacao tokens can create liquidity pools through integration with AgroChainCertificacoes, provides liquidity mining incentives via the CAFE governance token, and operates on multiple EVM chains (CafeChain, Polygon, Arbitrum).

### Core Architecture Principles

1. **Coffee & Cacao Only**: Exclusively accepts certified Coffee_Token (Arabica, Robusta/Conilon) and Cacao_Token with valid AgroChain ZK certification
2. **Agricultural Focus**: Specialized for the global Coffee and Cacao supply chain with EUDR compliance built-in
3. **Certification-First**: Only ZK-certified Coffee and Cacao tokens can create liquidity pools via AgroChainCertificacoes integration
2. **Deterministic Deployment**: CREATE2 ensures identical pool addresses across multiple chains for the same token pairs
3. **Governance-Controlled**: CAFE token holders vote on protocol parameters, emission rates, and emergency actions
4. **Composable Design**: Modular contracts enable independent operation while supporting cross-contract interactions
5. **Security-Priority**: Reentrancy guards, timelock delays, and pause mechanisms protect user funds

---

## System Architecture

### Contract Dependency Graph

```
CafeToken (ERC20 + Governance - universal for Coffee & Cacao)
├── CoffeeCacaoSwapFactory (depends on: AgroChainCoffeeCacaoTraceability, CafeToken)
│   └── CoffeeCacaoSwapPool (created by Factory - Coffee/Cacao pairs only)
│       └── CoffeeCacaoSwapRouter (uses Factory + Pool)
│           └── CoffeeCacaoFarm (uses CoffeeCacaoSwapPool, CafeToken)
└── CafeGovernance (uses CafeToken for voting power)
    ├── CoffeeCacaoFarm (execution of setRewardRate)
    ├── CoffeeCacaoSwapRouter (pause/unpause)
    └── CafeToken (mint permission)
```

### High-Level Flow Diagram

```
Coffee/Cacao Producer → Router → Factory (certification check)
                              → Pool (COFFEE/USDC, CACAO/USDC, COFFEE/CACAO)
       Pool → CoffeeCacaoSwapFactory (Coffee/Cacao token whitelist)
       Pool → AgroChainCoffeeCacaoTraceability (Coffee/Cacao certification)

Governance Flow:
CAFE Holder → Governance Contract → Vote on Coffee/Cacao incentives
           → Propose (e.g., new Coffee variety support)
           → Execute (after timelock)
           → Update CoffeeCacaoFarm allocation points

Farming Flow:
Coffee/Cacao Farmer → CoffeeCacaoFarm (stake Coffee/Cacao LP tokens)
                   → CafeToken (harvest CAFE rewards)
```

---

## Smart Contract Specifications

### 1. CafeToken.sol (ERC20 + Governance)

**Purpose**: Native CAFE governance and utility token with voting power snapshots and delegation.

#### State Variables

```solidity
mapping(address => uint256) public balanceOf;              // ERC20 balances
mapping(address => mapping(address => uint256)) public allowance; // ERC20 approvals
mapping(address => address) public delegates;              // Vote delegation
mapping(address => uint32) public numCheckpoints;          // Voting power checkpoints per address
mapping(address => mapping(uint32 => Checkpoint)) public checkpoints; // Block -> voting power

struct Checkpoint {
    uint32 blockNumber;
    uint256 votes;
}

uint256 public constant MAX_SUPPLY = 100_000_000e18;      // 100M with 18 decimals
uint256 public totalSupply;
uint256 public constant PERMIT_TYPEHASH = ...;            // EIP-2612 permit
mapping(address => uint256) public nonces;                // EIP-2612 nonce tracking
```

#### Core Functions

**mint(address to, uint256 amount)**
- Precondition: `msg.sender == masterChef` (only MasterChef can mint)
- Precondition: `totalSupply + amount <= MAX_SUPPLY`
- Effect: Increases balances and creates voting power checkpoint
- Postcondition: `balanceOf[to] += amount`
- Postcondition: `totalSupply += amount`
- Event: `Transfer(address(0), to, amount)`

**transfer(address to, uint256 amount)**
- Precondition: `balanceOf[msg.sender] >= amount`
- Effect: Transfers tokens and adjusts voting power
- Postcondition: `balanceOf[msg.sender] -= amount && balanceOf[to] += amount`
- Event: `Transfer(msg.sender, to, amount)`

**delegate(address delegatee)**
- Effect: Sets voting power delegation
- Postcondition: `delegates[msg.sender] == delegatee`
- Event: `DelegateChanged(msg.sender, currentDelegate, delegatee)`

**getVotes(address account, uint256 blockNumber)**
- Returns: Voting power at specific block (snapshot-based)
- Logic: If delegated, return delegate's votes; else return account's votes at block

**permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s)**
- Implements EIP-2612 gasless approvals
- Precondition: `block.timestamp <= deadline`
- Precondition: Signature valid per EIP-2612
- Effect: Sets allowance without requiring separate tx
- Postcondition: `allowance[owner][spender] == value`

---

### 2. CafeSwapFactory.sol

**Purpose**: Creates new liquidity pools using CREATE2 with deterministic addressing and certification verification.

#### State Variables

```solidity
mapping(address => mapping(address => address)) public getPair; // (token0, token1) -> pool
address[] public allPairs;
address public feeTo;
address public feeToSetter;
address public agroChainCertificacoes;                // AgroChainCertificacoes contract address
```

#### Core Functions

**createPool(address tokenA, address tokenB)**
- Precondition: `tokenA != tokenB`
- Precondition: `getPair[tokenMin][tokenMax] == address(0)` (pool not exists)
- Precondition: Both tokenA and tokenB pass `verifyTokenCertification(token)` check
  - Check: Call AgroChainCertificacoes.verifyCertification(token) returns true
- Effect: Deploys new CafeSwapPool via CREATE2 using deterministic salt
- Postcondition: `getPair[tokenMin][tokenMax] != address(0)`
- Postcondition: `allPairs` contains new pool address
- Event: `PoolCreated(tokenA, tokenB, pool, allPairs.length)`

**verifyTokenCertification(address token)**
- Effect: Queries AgroChainCertificacoes contract
- Logic: 
  ```solidity
  // AgroChainCertificacoes doesn't have isCertified()
  // Instead, check if token has at least one active certification
  try AgroChainCertificacoes.certificacaoValida(tokenToCertId[token]) returns (bool valid) {
      return valid;
  } catch {
      // Token never registered or no mapping exists
      revert("Token not certified");
  }
  ```
- Alternative: Maintain whitelist mapping in Factory: `mapping(address => bool) public certifiedTokens`
  - Admin can add certified tokens: `addCertifiedToken(address token, bytes32 certId)`
  - Verify certId is valid in AgroChainCertificacoes before adding
- Returns: Boolean certification status

**getPool(address tokenA, address tokenB)**
- Returns: Pool address for token pair (with canonical ordering)
- Logic: Returns `getPair[tokenMin][tokenMax]`

**setFeeTo(address _feeTo)**
- Precondition: `msg.sender == feeToSetter`
- Effect: Updates protocol fee recipient
- Postcondition: `feeTo == _feeTo`

**Deterministic Pool Address Calculation**

```
INIT_CODE_HASH = keccak256(type(CafeSwapPool).creationCode)
poolAddress = CREATE2(
    salt: keccak256(abi.encode(tokenMin, tokenMax)),
    initCode: CafeSwapPool bytecode
)
Result: Same address for same token pair on all chains
```

---

### 3. CafeSwapPool.sol

**Purpose**: Implements x*y=k constant product AMM with LP tokens, swaps, and fee handling.

#### State Variables

```solidity
address public token0;
address public token1;
uint112 private reserve0;
uint112 private reserve1;
uint32 private blockTimestampLast;

uint256 public price0CumulativeLast;                      // TWAP oracle data
uint256 public price1CumulativeLast;

uint256 public totalSupply;                               // LP token supply
mapping(address => uint256) public balanceOf;             // LP token balances
mapping(address => mapping(address => uint256)) public allowance; // LP token approvals

uint256 public constant MINIMUM_LIQUIDITY = 1000;         // Burned as minimum liquidity
uint256 public constant FEE_PERCENTAGE = 3;               // 0.3% = 3/1000
```

#### Core Functions

**mint(address to, uint256 amount0, uint256 amount1)**
- Precondition: Reentrancy guard active
- Precondition: Balance checks pass (tokens transferred before call)
- Effect: Calculates liquidity, mints LP tokens, updates reserves
- Logic (first deposit):
  ```
  liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
  MINIMUM_LIQUIDITY locked forever
  ```
- Logic (subsequent deposits):
  ```
  liquidity = min(
      amount0 * totalSupply / reserve0,
      amount1 * totalSupply / reserve1
  )
  ```
- Postcondition: `balanceOf[to] += liquidity`
- Postcondition: `totalSupply += liquidity`
- Postcondition: `reserve0 += amount0 && reserve1 += amount1`
- Event: `Mint(msg.sender, amount0, amount1)`
- Event: `Transfer(address(0), to, liquidity)`

**burn(address to, uint256 liquidity)**
- Precondition: Reentrancy guard active
- Precondition: `balanceOf[msg.sender] >= liquidity`
- Effect: Burns LP tokens, calculates proportional withdrawal, transfers tokens
- Logic:
  ```
  amount0 = liquidity * reserve0 / totalSupply
  amount1 = liquidity * reserve1 / totalSupply
  ```
- Postcondition: `balanceOf[msg.sender] -= liquidity`
- Postcondition: `totalSupply -= liquidity`
- Postcondition: `reserve0 -= amount0 && reserve1 -= amount1`
- Event: `Burn(msg.sender, amount0, amount1)`
- Event: `Transfer(from, address(0), liquidity)`

**swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data)**
- Precondition: Reentrancy guard active
- Precondition: `amount0Out > 0 || amount1Out > 0`
- Precondition: `amount0Out < reserve0 && amount1Out < reserve1`
- Precondition: Tokens transferred to pool before call
- Effect: Applies 0.3% fee, validates constant product, transfers output tokens
- Fee logic:
  ```
  If amount0In (input):
      feeAmount = amount0In * FEE_PERCENTAGE / 1000
      amountInWithFee = amount0In - feeAmount
  
  amount0Out must satisfy:
      (reserve0 * 1000 + amountInWithFee * 997) * (reserve1 * 1000 - amount1Out * 1000) 
      >= reserve0 * reserve1 * 1000 * 1000
  ```
- Constant product check:
  ```
  k_before = reserve0 * reserve1
  k_after = (reserve0 + amount0In - feeAmount) * (reserve1 - amount1Out)
  require(k_after >= k_before)
  ```
- Postcondition: Constant product maintained
- Event: `Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to)`

**sync()**
- Effect: Updates reserves to match current token balances
- Precondition: Reentrancy guard active
- Logic:
  ```
  balance0 = IERC20(token0).balanceOf(address(this))
  balance1 = IERC20(token1).balanceOf(address(this))
  require(balance0 <= uint112.max && balance1 <= uint112.max)
  reserve0 = uint112(balance0)
  reserve1 = uint112(balance1)
  ```
- Event: `Sync(reserve0, reserve1)`

**emergencyWithdraw(address token, address to)**
- Precondition: `msg.sender == factory.feeToSetter()` (admin only)
- Precondition: `token != token0 && token != token1` (can't withdraw pool tokens)
- Effect: Withdraws mistakenly sent tokens (e.g., airdropped tokens)
- Logic:
  ```
  uint256 balance = IERC20(token).balanceOf(address(this))
  require(balance > 0, "No balance")
  IERC20(token).transfer(to, balance)
  ```
- Event: `EmergencyWithdraw(token, to, balance)`
- Note: Does NOT affect pool reserves or LP tokens

**getReserves()**
- Returns: `(reserve0, reserve1, blockTimestampLast)`
- Effect: View function, no state change

**k() - Constant Product Invariant**
- Returns: `reserve0 * reserve1`
- Effect: View function for protocol verification

**getCurrentTWAP(uint32 windowSize) - Time-Weighted Average Price**
- Returns: `(price0Average, price1Average)` over windowSize seconds
- Logic:
  ```
  require(windowSize > 0 && windowSize <= block.timestamp - blockTimestampLast)
  timeElapsed = block.timestamp - blockTimestampLast
  
  // Calculate average from cumulative prices
  price0Average = (price0CumulativeLast - price0CumulativeAtStart) / timeElapsed
  price1Average = (price1CumulativeLast - price1CumulativeAtStart) / timeElapsed
  ```
- Effect: View function for external oracle consumption
- Note: External contracts should store previous cumulative values to calculate TWAP

**Price Accumulator Update (internal)**
- Called after every `mint`, `burn`, `swap`
- Logic:
  ```
  timeElapsed = block.timestamp - blockTimestampLast
  if timeElapsed > 0:
      price0CumulativeLast += reserve1 / reserve0 * timeElapsed
      price1CumulativeLast += reserve0 / reserve1 * timeElapsed
      blockTimestampLast = block.timestamp
  ```

---

### 4. CafeSwapRouter.sol

**Purpose**: Handles multi-hop swaps, liquidity operations, slippage protection, and deadline enforcement.

#### State Variables

```solidity
address public factory;
address public CAFE_TOKEN;
mapping(address => bool) public isPaused;                 // Pause status per function
bool public globalPause;                                  // Emergency protocol pause
```

#### Core Functions

**addLiquidity(address tokenA, address tokenB, uint256 amountADesired, uint256 amountBDesired, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline)**
- Precondition: `block.timestamp <= deadline`
- Precondition: `!globalPause && !isPaused[addLiquidity]`
- Precondition: Tokens approved for Router
- Effect: Calculates optimal amounts, adds liquidity to pool
- Logic:
  ```
  pool = factory.getPool(tokenA, tokenB)
  (reserve0, reserve1) = pool.getReserves()
  
  if reserves == 0:
      amountA = amountADesired
      amountB = amountBDesired
  else:
      optimalAmountB = quote(amountADesired, reserve0, reserve1)
      if optimalAmountB <= amountBDesired:
          amountA = amountADesired
          amountB = optimalAmountB
          require(amountB >= amountBMin)
      else:
          optimalAmountA = quote(amountBDesired, reserve1, reserve0)
          require(optimalAmountA <= amountADesired)
          require(optimalAmountA >= amountAMin)
          amountA = optimalAmountA
          amountB = amountBDesired
  ```
- Postcondition: Liquidity added to pool
- Postcondition: LP tokens minted to `to` address
- Returns: `(amountA, amountB, liquidity)`

**removeLiquidity(address tokenA, address tokenB, uint256 liquidity, uint256 amountAMin, uint256 amountBMin, address to, uint256 deadline)**
- Precondition: `block.timestamp <= deadline`
- Precondition: `!globalPause` (emergency pause doesn't block withdrawals)
- Precondition: LP tokens approved for Router
- Effect: Burns LP tokens and withdraws both tokens
- Logic:
  ```
  pool = factory.getPool(tokenA, tokenB)
  pool.burn(to, liquidity)
  (amountA, amountB) = amounts from pool.burn()
  require(amountA >= amountAMin && amountB >= amountBMin)
  ```
- Postcondition: Liquidity removed from pool
- Postcondition: Tokens transferred to `to` address
- Returns: `(amountA, amountB)`

**swap(uint256 amountIn, uint256 amountOutMin, address[] calldata path, address to, uint256 deadline)**
- Precondition: `block.timestamp <= deadline`
- Precondition: `!globalPause && !isPaused[swap]`
- Precondition: `path.length >= 2`
- Precondition: Input token approved for Router
- Effect: Executes sequential swaps through pools in path
- Algorithm (multi-hop):
  ```
  amounts = new uint256[](path.length)
  amounts[0] = amountIn
  
  for i = 0 to path.length - 2:
      // Canonicalize token order before querying pool
      (token0, token1) = path[i] < path[i+1] ? (path[i], path[i+1]) : (path[i+1], path[i])
      pool = factory.getPool(token0, token1)
      require(pool != address(0), "Pool does not exist")
      
      amounts[i+1] = getAmountOut(amounts[i], path[i], path[i+1])
  
  require(amounts[path.length-1] >= amountOutMin, "Insufficient output")
  
  IERC20(path[0]).transferFrom(msg.sender, pools[0], amounts[0])
  
  for i = 0 to path.length - 2:
      (token0, token1) = path[i] < path[i+1] ? (path[i], path[i+1]) : (path[i+1], path[i])
      pool = factory.getPool(token0, token1)
      
      // Determine which token is output
      (uint amountOut0, uint amountOut1) = path[i] == token0 ? (uint(0), amounts[i+1]) : (amounts[i+1], uint(0))
      address nextRecipient = i == path.length - 2 ? to : factory.getPool(canonicalize(path[i+1], path[i+2]))
      
      pool.swap(amountOut0, amountOut1, nextRecipient, new bytes(0))
  ```
- Postcondition: Constant product maintained across all pools
- Event: Swap events emitted by pools
- Returns: `amounts` array with all intermediate amounts

**getAmountsOut(uint256 amountIn, address[] calldata path)**
- Returns: Array of amounts for each hop
- Logic: For each hop, calculate output using:
  ```
  amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
  ```
- Effect: View function, no state change
- Accounts for: 0.3% fee on each hop

**getAmountsIn(uint256 amountOut, address[] calldata path)**
- Returns: Array of amounts working backwards from desired output
- Logic: For each hop (reverse), calculate required input:
  ```
  amountIn = (reserveIn * amountOut * 1000) / (reserveOut * 997 - amountOut * 3)
  ```
- Effect: View function, no state change
- Round-trip property: `getAmountsOut(getAmountsIn(X, path), path) ≈ X`

**quote(uint256 amountA, uint256 reserveA, uint256 reserveB)**
- Returns: Equivalent amount for amountA in reserveB terms
- Logic: `(amountA * reserveB) / reserveA`
- Effect: View function used for liquidity calculations

**pause() / unpause()**
- Precondition: `msg.sender == governance`
- Precondition (unpause): 24-hour timelock elapsed since pause
- Effect: Sets `globalPause` flag
- Postcondition: All swaps and liquidity operations revert
- Postcondition: Withdrawals remain available
- Event: `ProtocolPaused()` / `ProtocolUnpaused()`

---

### 5. CafeFarm.sol (MasterChef)

**Purpose**: Manages liquidity mining with per-second CAFE rewards, multiple farms with allocation points.

#### State Variables

```solidity
address public cafe;                                       // CAFE token address
address public governance;                                // Governance contract
uint256 public cafePerSecond;                             // CAFE tokens minted per second

struct FarmInfo {
    IERC20 lpToken;
    uint256 allocPoint;
    uint256 lastRewardTime;
    uint256 accCafePerShare;                             // Accumulated CAFE per LP token (scaled by 1e12)
}

FarmInfo[] public farms;
mapping(address => mapping(uint256 => UserInfo)) public userInfo; // farmer -> (farm -> info)
uint256 public totalAllocPoint;

struct UserInfo {
    uint256 amount;                                       // LP tokens staked
    uint256 rewardDebt;                                  // Already claimed rewards (scaled by 1e12)
}

uint256 public constant MAX_FARMS = 50;
```

#### Core Functions

**stake(uint256 farmId, uint256 amount)**
- Precondition: Reentrancy guard active
- Precondition: `farmId < farms.length`
- Precondition: `amount > 0`
- Precondition: LP tokens approved for MasterChef
- Effect: Updates rewards, transfers tokens, records stake
- Algorithm:
  ```
  updateFarm(farmId)
  
  user = userInfo[msg.sender][farmId]
  
  // Calculate pending rewards BEFORE updating amount
  if user.amount > 0:
      pending = user.amount * farms[farmId].accCafePerShare / 1e12 - user.rewardDebt
      if pending > 0:
          // Store pending for later claim or auto-transfer
          user.pendingRewards += pending
  
  user.amount += amount
  user.rewardDebt = user.amount * farms[farmId].accCafePerShare / 1e12
  
  IERC20(farms[farmId].lpToken).transferFrom(msg.sender, address(this), amount)
  ```
- Event: `Staked(msg.sender, farmId, amount)`
- Note: Reward debt MUST be set AFTER amount update to prevent reward loss

**unstake(uint256 farmId, uint256 amount)**
- Precondition: Reentrancy guard active
- Precondition: `farmId < farms.length`
- Precondition: `userInfo[msg.sender][farmId].amount >= amount`
- Effect: Harvests pending rewards, transfers LP tokens back
- Algorithm:
  ```
  harvest(farmId)  // Automatically claim rewards
  user.amount -= amount
  user.rewardDebt = user.amount * farms[farmId].accCafePerShare / 1e12
  IERC20(farms[farmId].lpToken).transfer(msg.sender, amount)
  ```
- Event: `Unstaked(msg.sender, farmId, amount)`

**harvest(uint256 farmId)**
- Precondition: Reentrancy guard active
- Precondition: `farmId < farms.length`
- Effect: Calculates pending rewards, mints CAFE, transfers to user
- Algorithm:
  ```
  updateFarm(farmId)
  pending = user.amount * farms[farmId].accCafePerShare / 1e12 - user.rewardDebt
  user.rewardDebt = user.amount * farms[farmId].accCafePerShare / 1e12
  
  if pending > 0:
      cafe.mint(msg.sender, pending)
  ```
- Postcondition: User's rewardDebt updated to current accumulated rewards
- Event: `Harvested(msg.sender, farmId, pending)`

**updateFarm(uint256 farmId) - internal**
- Effect: Updates accumulated rewards for all farmers in farm
- Algorithm:
  ```
  if block.timestamp <= farms[farmId].lastRewardTime:
      return
  
  lpSupply = IERC20(farms[farmId].lpToken).balanceOf(address(this))
  if lpSupply == 0:
      farms[farmId].lastRewardTime = block.timestamp
      return
  
  timeElapsed = block.timestamp - farms[farmId].lastRewardTime
  cafeReward = timeElapsed * cafePerSecond * farms[farmId].allocPoint / totalAllocPoint
  farms[farmId].accCafePerShare += cafeReward * 1e12 / lpSupply
  farms[farmId].lastRewardTime = block.timestamp
  ```

**pendingCafe(uint256 farmId, address farmer)**
- Returns: Pending CAFE rewards for farmer in farm
- Logic:
  ```
  user = userInfo[farmer][farmId]
  farm = farms[farmId]
  accCafePerShare = farm.accCafePerShare
  
  if block.timestamp > farm.lastRewardTime && lpSupply > 0:
      timeElapsed = block.timestamp - farm.lastRewardTime
      cafeReward = timeElapsed * cafePerSecond * farm.allocPoint / totalAllocPoint
      accCafePerShare += cafeReward * 1e12 / lpSupply
  
  pending = user.amount * accCafePerShare / 1e12 - user.rewardDebt
  return pending
  ```
- Effect: View function, no state change

**addFarm(address lpToken, uint256 allocPoint)**
- Precondition: `msg.sender == governance`
- Precondition: `farms.length < MAX_FARMS` (max 50 farms)
- Precondition: `lpToken != address(0)`
- Effect: Adds new farm with allocation points
- Algorithm:
  ```
  farms.push(FarmInfo({
      lpToken: lpToken,
      allocPoint: allocPoint,
      lastRewardTime: block.timestamp,
      accCafePerShare: 0
  }))
  totalAllocPoint += allocPoint
  ```
- Event: `FarmAdded(farms.length - 1, lpToken, allocPoint)`

**setAllocPoint(uint256 farmId, uint256 newAllocPoint)**
- Precondition: `msg.sender == governance`
- Precondition: `farmId < farms.length`
- Effect: Updates farm allocation points
- Algorithm:
  ```
  updateFarm(farmId)
  totalAllocPoint = totalAllocPoint - farms[farmId].allocPoint + newAllocPoint
  farms[farmId].allocPoint = newAllocPoint
  ```
- Event: `AllocationPointsUpdated(farmId, oldAllocPoint, newAllocPoint)`

**setRewardRate(uint256 newCafePerSecond)**
- Precondition: `msg.sender == governance`
- Effect: Updates CAFE emission rate for all farms
- Algorithm:
  ```
  for all farms:
      updateFarm(farmId)
  cafePerSecond = newCafePerSecond
  ```
- Event: `RewardRateUpdated(oldRate, newCafePerSecond)`

---

### 6. CafeGovernance.sol

**Purpose**: Decentralized governance with proposal voting, execution, and timelock delays.

#### State Variables

```solidity
address public cafe;                                      // CAFE token for voting power
uint256 public constant VOTING_PERIOD = 7 days;          // Voting duration
uint256 public constant TIMELOCK_DELAY = 48 hours;       // Delay before execution
uint256 public constant EXECUTION_TIMELOCK = 24 hours;   // Delay before unpause
uint256 public constant PROPOSAL_THRESHOLD = 100000e18;  // 1% of 100M supply
uint256 public constant QUORUM_PERCENTAGE = 10;          // 10% required to execute

struct Proposal {
    uint256 id;
    address proposer;
    string description;
    uint256 startBlock;
    uint256 endBlock;
    uint256 forVotes;
    uint256 againstVotes;
    uint256 abstainVotes;
    bool executed;
    bool canceled;
    mapping(address => bool) hasVoted;
    mapping(address => uint8) voteType;                  // 1=For, 2=Against, 3=Abstain
    bytes[] calldatas;
    address[] targets;
    uint256[] values;
}

mapping(uint256 => Proposal) public proposals;
uint256 public proposalCount;
mapping(address => uint256) public latestProposalIds;    // Latest proposal per proposer
```

#### Core Functions

**propose(address[] calldata targets, uint256[] calldata values, bytes[] calldata calldatas, string calldata description)**
- Precondition: `cafe.balanceOf(msg.sender) >= PROPOSAL_THRESHOLD` (1% of supply)
- Precondition: Arrays all same length
- Effect: Creates new proposal
- Algorithm:
  ```
  startBlock = block.number
  endBlock = startBlock + VOTING_PERIOD / 12 (approx 7 days in blocks)
  creationTime = block.timestamp  // CRITICAL: Store timestamp for timelock
  
  proposals[proposalCount] = Proposal({
      id: proposalCount,
      proposer: msg.sender,
      description: description,
      startBlock: startBlock,
      endBlock: endBlock,
      creationTime: creationTime,  // NEW FIELD
      forVotes: 0,
      againstVotes: 0,
      abstainVotes: 0,
      executed: false,
      targets: targets,
      calldatas: calldatas,
      values: values
  })
  latestProposalIds[msg.sender] = proposalCount
  ```
- Postcondition: `proposalCount` incremented
- Event: `ProposalCreated(proposalCount-1, msg.sender, description, startBlock, endBlock, creationTime)`

**vote(uint256 proposalId, uint8 voteType)**
- Precondition: `block.number <= proposals[proposalId].endBlock` (voting period active)
- Precondition: `!proposals[proposalId].hasVoted[msg.sender]` (not double voted)
- Precondition: `voteType in [1, 2, 3]` (1=For, 2=Against, 3=Abstain)
- Effect: Records vote weighted by voting power at proposal start block
- Algorithm:
  ```
  votes = cafe.getVotes(msg.sender, proposals[proposalId].startBlock)
  require(votes > 0, "No voting power")
  
  if voteType == 1:
      proposals[proposalId].forVotes += votes
  elif voteType == 2:
      proposals[proposalId].againstVotes += votes
  else:
      proposals[proposalId].abstainVotes += votes
  
  proposals[proposalId].hasVoted[msg.sender] = true
  proposals[proposalId].voteType[msg.sender] = voteType
  ```
- Event: `VoteCast(msg.sender, proposalId, voteType, votes)`

**execute(uint256 proposalId)**
- Precondition: `block.number > proposals[proposalId].endBlock` (voting period ended)
- Precondition: `!proposals[proposalId].executed`
- Precondition: Proposal succeeded (more For than Against votes)
- Precondition: Quorum met (forVotes >= totalVotes * 10%)
- Precondition: Timelock delay elapsed: `block.timestamp >= proposals[proposalId].creationTime + TIMELOCK_DELAY`
- Effect: Executes all encoded function calls via delegatecall
- Algorithm:
  ```
  proposal = proposals[proposalId]
  
  require(proposal.forVotes > proposal.againstVotes, "Proposal failed")
  totalVotes = proposal.forVotes + proposal.againstVotes + proposal.abstainVotes
  quorum = cafe.totalSupply() * QUORUM_PERCENTAGE / 100
  require(proposal.forVotes >= quorum, "Quorum not met")
  require(block.timestamp >= proposal.creationTime + TIMELOCK_DELAY, "Timelock not elapsed")
  
  for each target, value, calldata in proposal:
      (bool success, bytes memory returnData) = target.delegatecall(calldata)
      require(success, "Execution failed")
  
  proposal.executed = true
  ```
- Event: `ProposalExecuted(proposalId, block.timestamp)`

**isProposalSucceeded(uint256 proposalId)**
- Returns: Boolean whether proposal has more For than Against votes
- Logic: `forVotes > againstVotes && forVotes >= quorum`
- Effect: View function

---

## Data Flow Diagrams

### Swap Transaction Flow

```
1. User calls Router.swap(amountIn, amountOutMin, path, deadline)
2. Router validates:
   - Deadline not passed
   - Protocol not paused
   - Path valid
3. Router calls Pool.swap() for first pool in path
   a. Pool validates constant product before/after
   b. Pool applies 0.3% fee
   c. Pool updates reserves
4. Router chains output as input for next pool
5. Final output compared against amountOutMin
6. Router transfers final output to user
7. Events emitted (Swap by each pool)
```

### Liquidity Provision Flow

```
1. User calls Router.addLiquidity(tokenA, tokenB, amountADesired, ...)
2. Router queries Factory for pool address
3. If pool doesn't exist:
   a. Factory verifies both tokens certified with AgroChainCertificacoes
   b. Factory deploys pool via CREATE2
4. Router calculates optimal amounts to maintain pool ratio
5. User approves Router for token transfers
6. Router transfers both tokens to Pool
7. Pool mints LP tokens proportional to share
8. LP tokens transferred to user
9. Events emitted (Mint by pool, Transfer for LP tokens)
```

### Farm Reward Distribution

```
Time T0: User stakes 100 LP tokens in Farm with 10% allocation points
  - cafePerSecond = 10
  - totalAllocPoint = 100
  - accCafePerShare = 0 (no prior farmers)

Time T1 (60 seconds later): Second user stakes
  - Farm updates: accCafePerShare = (60 * 10 * 10 / 100) / lpSupply
  - First user pending = 100 * accCafePerShare / 1e12 - rewardDebt
  - rewardDebt for second user set based on new accCafePerShare

Time T2 (120 seconds total): First user harvests
  - New accCafePerShare calculated for elapsed time
  - pending = 100 * accCafePerShare / 1e12 - rewardDebt
  - CAFE minted and transferred
  - rewardDebt updated
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection & Consolidation

After analyzing the acceptance criteria, the following properties are logically redundant and have been consolidated:

1. **Mint operations**: Properties for first deposit vs subsequent deposits are unified into one comprehensive property checking proportional minting
2. **Swap fee logic**: Fee deduction and constant product properties combined into single invariant
3. **Governance voting**: Vote recording and event emission consolidated
4. **Reward distribution**: Farm update logic and pending reward calculation combined

---

### Property 1: Token Certification Requirement

For any pool creation request with tokens T0 and T1, both tokens SHALL be verified as certified through AgroChainCertificacoes before pool deployment, and if either token is not certified, the transaction SHALL revert with "Token not certified".

**Validates: Requirements 1.1, 1.2, 1.3**

---

### Property 2: Deterministic Pool Addresses

For any two token addresses in canonical order (token0, token1), the pool address computed via CREATE2 on CaféChain SHALL be identical to the pool address on Polygon and Arbitrum, enabling deterministic cross-chain references.

**Validates: Requirements 2.2, 16.2**

---

### Property 3: LP Token Mint Proportionality

For any liquidity deposit where reserve ratio is maintained, the minted LP tokens SHALL be proportional to the deposited share, such that if user A deposits twice the liquidity of user B under identical pool ratios, user A receives exactly double the LP tokens of user B.

**Validates: Requirements 3.1, 3.3, 3.6**

---

### Property 4: Liquidity Removal and Fee Distribution

For any liquidity removal, the withdrawn token amounts SHALL include all accumulated trading fees proportional to the burned LP token share, such that when a Liquidity_Provider removes all liquidity and has been the sole provider, received tokens SHALL equal initial deposit plus 0.3% fee revenue accumulated since deposit.

**Validates: Requirements 4.1, 4.2, 4.5, 25.1, 25.3**

---

### Property 5: Constant Product Formula Maintenance

For any swap transaction, the constant product invariant k = reserve0 * reserve1 SHALL be maintained or increased after the transaction, accounting for the 0.3% trading fee which increases k by redirecting fee value into reserves.

**Validates: Requirements 5.1, 5.2, 5.6, 25.2, 18.3**

---

### Property 6: Multi-Hop Swap Atomicity

For any multi-hop swap through path [token0 → token1 → token2 → tokenN], the entire transaction SHALL execute atomically such that either all intermediate swaps complete and final output reaches the user, or the entire transaction reverts without partial state changes.

**Validates: Requirements 6.1, 6.2, 6.4, 6.5**

---

### Property 7: Price Impact Consistency

For any input amount and path, the view function getAmountsOut(amountIn, path) SHALL calculate the identical output amount that would result from executing the actual swap transaction, accounting for all intermediate 0.3% fees.

**Validates: Requirements 7.1, 7.4**

---

### Property 8: Inverse Price Calculation

For any desired output amount and path, calling getAmountsIn(amountOut, path) followed by getAmountsOut(result, path) SHALL return an amount approximately equal to the original amountOut (within rounding error due to integer division).

**Validates: Requirements 7.2**

---

### Property 9: Farm Reward Accumulation

For any farmer staking LP tokens in a farm with allocation points, the accumulated CAFE rewards SHALL be correctly calculated as: pending = (amount * accCafePerShare / 1e12) - rewardDebt, where accCafePerShare increments by (cafeRewardPerSecond * allocPoint / totalAllocPoint) / lpSupply for each second elapsed.

**Validates: Requirements 8.1, 8.2, 8.3, 9.1, 9.4**

---

### Property 10: Farm Reward Distribution Without Double-Counting

For any farmer with multiple stake/unstake/harvest operations, the sum of all harvested CAFE tokens plus remaining pending rewards SHALL equal the total CAFE tokens earned since first stake, with no double-counting or token loss.

**Validates: Requirements 9.1, 9.2, 10.1, 10.3**

---

### Property 11: Voting Power Snapshot Consistency

For any CAFE holder with delegated voting power, the voting power used in a proposal vote SHALL match the CAFE balance at the proposal's start block, ensuring vote weight cannot be increased retroactively by transferring tokens after voting begins.

**Validates: Requirements 11.1, 11.2, 11.3, 13.1**

---

### Property 12: Governance Proposal Success Determination

For any proposal in voting period ended state, the proposal SHALL be marked as succeeded if and only if: forVotes > againstVotes AND forVotes ≥ (cafeTotal * 10% / 100), ensuring both majority requirement and quorum are met before execution.

**Validates: Requirements 12.1, 12.2, 14.1, 14.3, 14.4**

---

### Property 13: Governance Execution Atomicity

For any successfully voted proposal, executing it via delegatecall SHALL either complete all encoded function calls successfully or revert the entire execution, preventing partial state changes from incomplete proposal transactions.

**Validates: Requirements 14.2**

---

### Property 14: CAFE Token Supply Cap Enforcement

For any minting operation including farm rewards and governance emissions, the totalSupply SHALL never exceed 100,000,000 tokens (100M), and any mint operation that would exceed this cap SHALL revert with "Supply cap exceeded".

**Validates: Requirements 15.4, 15.5**

---

### Property 15: Reentrancy Guard Protection

For any swap, liquidity operation (mint/burn), or farm operation (stake/unstake/harvest), if a reentrant call is detected through the same function, the transaction SHALL revert with "Reentrancy detected", preventing attackers from manipulating pool state during active execution.

**Validates: Requirements 17.1, 17.2, 17.3, 17.4**

---

### Property 16: Pause Mechanism Preservation of Withdrawals

While globalPause flag is active, swap() and addLiquidity() operations SHALL revert with "Protocol paused", but removeLiquidity() and farm unstake() operations SHALL remain available, allowing users to exit positions during emergency states.

**Validates: Requirements 24.2, 24.3**

---

### Property 17: Reserve Synchronization Accuracy

For any pool with token balance exceeding cached reserve values (due to direct token transfer), calling sync() SHALL update reserves to exactly match current token balances and emit Sync event with updated values, restoring AMM pricing accuracy.

**Validates: Requirements 26.1, 26.2, 26.3, 26.4**

---

### Property 18: Price Oracle Cumulative Price Tracking

For any pool with swaps occurring, the price0Cumulative and price1Cumulative values SHALL increment by (reserve1/reserve0 * timeElapsed) and (reserve0/reserve1 * timeElapsed) respectively, enabling Time-Weighted Average Price (TWAP) calculations over 10+ minute windows.

**Validates: Requirements 27.1, 27.2**

---

### Property 19: Event Emission Completeness

For any on-chain operation (pool creation, swap, mint, burn, stake, unstake, harvest, vote, proposal), the corresponding event SHALL be emitted with indexed parameters (token addresses, user addresses) enabling complete protocol history reconstruction through standard blockchain indexers.

**Validates: Requirements 29.1, 29.2, 29.3**

---

### Property 20: Farm Allocation Points Distribution

For any set of farms with allocation points, the sum of rewards distributed across all farms in a time period SHALL equal (timeElapsed * cafePerSecond), with each farm receiving (cafePerSecond * farmAllocPoint / totalAllocPoint), ensuring no token creation beyond emission schedule.

**Validates: Requirements 30.1, 30.2**

---

## Implementation Patterns

### Reentrancy Guard Pattern

```solidity
uint256 private locked;

modifier nonReentrant() {
    require(locked == 0, "Reentrancy detected");
    locked = 1;
    _;
    locked = 0;
}
```

### Checks-Effects-Interactions Pattern

```
// ✓ Correct order:
1. require() - Checks
2. balances[user] -= amount - Effects
3. token.transfer(user, amount) - Interactions

// ✗ Incorrect (vulnerable):
1. token.transfer(user, amount) - Interactions first
2. balances[user] -= amount - Effects after
```

### SafeMath in Solidity 0.8+

```solidity
// Built-in overflow protection - automatically reverts
uint256 a = uint256.max;
uint256 b = a + 1; // Automatically reverts
```

### CREATE2 Deterministic Deployment

```solidity
pool = new CafeSwapPool{salt: keccak256(abi.encode(token0, token1))}();
// Same salt always produces same address across chains
```

---

## Deployment Architecture

### Contract Deployment Order

1. **CafeToken** - Deploy with initial governance settings
2. **CafeSwapFactory** - Deploy with CafeToken and AgroChainCertificacoes addresses
3. **CafeSwapRouter** - Deploy with Factory address
4. **CafeFarm** - Deploy with CafeToken and Governance addresses
5. **CafeGovernance** - Deploy with CafeToken address
6. **Setup permissions**:
   - CafeToken: Set MasterChef as minter
   - CafeSwapRouter: Set Governance for pause/unpause
   - CafeFarm: Set Governance for setRewardRate/addFarm
   - CafeGovernance: Connect to all contracts for execution

### Multi-Chain Deployment

```
Deployment Target 1: CaféChain (Mainnet)
  - All contracts deployed
  - Full governance active
  
Deployment Target 2: Polygon
  - Identical bytecode via CREATE2
  - Independent liquidity pools
  - Independent governance OR synced via bridge
  
Deployment Target 3: Arbitrum
  - Identical bytecode via CREATE2
  - Independent liquidity pools
  - Independent governance OR synced via bridge
```

**Cross-Chain Bridge Integration (Phase 2 - Optional):**

CaféSwap Phase 1 (MVP) operates as **independent deployments** on each chain with NO automatic cross-chain liquidity. If bridging is required:

1. **Bridge Registry Contract:**
   ```solidity
   contract BridgeRegistry {
       mapping(address => bool) public approvedBridges;
       mapping(uint256 => bool) public supportedChains;
       
       function addBridge(address bridge) external onlyGovernance {
           require(bridge != address(0), "Invalid bridge");
           approvedBridges[bridge] = true;
           emit BridgeAdded(bridge);
       }
       
       function removeBridge(address bridge) external onlyGovernance {
           approvedBridges[bridge] = false;
           emit BridgeRemoved(bridge);
       }
   }
   ```

2. **Router Bridge Function (Optional):**
   ```solidity
   function swapAndBridge(
       uint256 amountIn,
       uint256 amountOutMin,
       address[] calldata path,
       uint256 targetChainId,
       address bridgeContract,
       uint256 deadline
   ) external payable ensure(deadline) {
       // Verify bridge is whitelisted
       require(bridgeRegistry.approvedBridges(bridgeContract), "Bridge not approved");
       require(bridgeRegistry.supportedChains(targetChainId), "Chain not supported");
       
       // Execute swap on source chain (output to Router)
       uint256 outputAmount = _swap(amountIn, amountOutMin, path, address(this), deadline);
       
       // Approve bridge for output token
       IERC20(path[path.length-1]).approve(bridgeContract, outputAmount);
       
       // Bridge to target chain (user pays native gas as msg.value)
       IBridge(bridgeContract).bridge{value: msg.value}(
           path[path.length-1], // token to bridge
           outputAmount,
           targetChainId,
           msg.sender // recipient on target chain
       );
       
       emit SwapAndBridge(msg.sender, path, outputAmount, targetChainId);
   }
   ```

3. **Supported Bridge Protocols:**
   - LayerZero (recommended for CAFE token)
   - Wormhole (alternative)
   - Axelar (alternative)
   - Native chain bridges (Polygon Bridge, Arbitrum Bridge)

4. **Bridge Verification Requirements:**
   - Governance must whitelist each bridge contract
   - Bridge contracts must emit verifiable events
   - Router checks bridge approval before transfer

**For MVP (Phase 1):** Users manually bridge tokens via existing bridges, then trade independently on each chain.

---

## Security Considerations

### Known Attack Vectors & Mitigations

1. **Flash Loan Attacks**
   - Mitigation: TWAP oracle (10+ minute window) used by dependent contracts
   - Single-block manipulation insufficient to move time-weighted price

2. **Sandwich Attacks**
   - Mitigation: slippage tolerance (amountOutMin) set by user
   - Router reverts if execution price falls below tolerance

3. **Double-Spending in Multi-Hop**
   - Mitigation: Atomic execution (all hops or revert)
   - Output from each swap becomes input for next

4. **Governance Attack (51% of CAFE)**
   - Mitigation: 1% threshold for proposals (high barrier)
   - 7-day voting period (community response time)
   - 48-hour timelock before execution (exit opportunity)
   - 10% quorum requirement (prevents governance apathy)

5. **Reentrancy in Liquidity Operations**
   - Mitigation: ReentrancyGuard on mint/burn/swap
   - Checks-Effects-Interactions pattern enforced

---

## Performance Targets

### Gas Optimization Goals

- **Single-hop swap**: ≤ 150,000 gas on Layer 2 (Arbitrum, Polygon)
- **Liquidity add**: ≤ 180,000 gas
- **Liquidity remove**: ≤ 150,000 gas
- **Farm stake/unstake**: ≤ 120,000 gas

### Scalability

- **Maximum pools**: Unlimited (CREATE2 enables unlimited deployment)
- **Maximum farms**: 50 (gas cost protection)
- **Maximum concurrent farmers per farm**: Unlimited (time-based reward tracking)

---

## Testing Strategy

### Unit Tests

1. **CafeToken**: mint, transfer, approve, delegation, snapshots
2. **Factory**: pool creation, certification verification, deterministic addressing
3. **Pool**: mint, burn, swap, reserves, constant product, fee calculation
4. **Router**: multi-hop routing, price calculations, slippage protection
5. **Farm**: stake, unstake, harvest, reward calculations, allocation points
6. **Governance**: propose, vote, execute, timelock

### Property-Based Tests (Minimum 100 iterations each)

- **Constant Product**: For any valid swap sequence, k ≥ k_initial
- **LP Token Proportionality**: For any deposit ratio, LP tokens proportional
- **Reward Distribution**: For any time period, total rewards = timeElapsed * cafePerSecond
- **Multi-Hop Atomicity**: For any path, either all swaps or complete revert
- **Voting Power**: For any delegations and transfers, snapshot voting power matches

### Integration Tests

- **Multi-chain deployment**: Identical bytecode, deterministic addresses
- **Governance execution**: Proposals execute via delegatecall, state updates apply
- **Cross-contract interactions**: Factory → Pool → Router flows

---

## References

- ERC-20: Token Standard
- ERC-2612: Permit Extension
- Uniswap V2: Constant product formula and architecture
- OpenZeppelin: ReentrancyGuard, Pausable, Ownable implementations

