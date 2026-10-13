# Implementation Plan: CaféSwap DEX Protocol

## Overview

This plan implements a complete decentralized exchange protocol for AgroChain with:
- **Certification-first approach**: Only tokens verified by AgroChainCertificacoes can create pools
- **Constant product AMM**: x*y=k formula with 0.3% trading fees
- **Liquidity mining**: CAFE token rewards for LP stakers
- **Governance**: CAFE holders vote on protocol parameters

## Project Context

**OpenZeppelin Version**: 5.6.1 (import paths: `@openzeppelin/contracts/...`)  
**Solidity Version**: 0.8.37 with optimizer enabled (200 runs, viaIR)  
**Test Framework**: Hardhat test framework (needs setup)  
**Build Command**: `npm run blockchain:compile`  
**Test Command**: `npx hardhat test --network hardhatMainnet`  
**AgroChainCertificacoes Interface**: `certificacaoValida(bytes32 id) returns (bool)`

## Critical Design Decisions

### 1. Certification Verification Approach
**Decision**: Factory maintains whitelist mapping with admin function `addCertifiedToken(address token, bytes32 certId)` that calls `AgroChainCertificacoes.certificacaoValida(certId)` before whitelisting.

**Rationale**: AgroChainCertificacoes doesn't have `isCertified(address)`. We need a token→certId mapping to verify tokens. Admin whitelisting provides flexibility while maintaining security through on-chain verification.

### 2. Multi-Hop Routing with Canonical Ordering
**Decision**: Router canonicalizes token order `(token0, token1) = pathA < pathB ? (pathA, pathB) : (pathB, pathA)` before querying Factory for pool address, then determines output direction based on original path order.

**Rationale**: Per DESIGN-FIXES.md, pools store tokens in canonical order (lower address first). Without canonicalization, Router would fail to find existing pools when tokens appear in non-canonical order in swap paths.

### 3. Reward Debt Calculation Order
**Decision**: In `stake()`, reward debt MUST be set AFTER amount update:
```
1. updateFarm() 
2. calculate pending rewards BEFORE amount update
3. user.amount += amount
4. user.rewardDebt = user.amount * accCafePerShare / 1e12  // AFTER
```

**Rationale**: Per DESIGN-FIXES.md, setting rewardDebt before amount update causes reward loss. The debt represents "rewards already accounted for" and must reflect the new amount.

### 4. Governance Timelock Storage
**Decision**: Proposal struct includes `uint256 creationTime` field set to `block.timestamp` on proposal creation. Execute requires `block.timestamp >= proposal.creationTime + TIMELOCK_DELAY`.

**Rationale**: Per DESIGN-FIXES.md, timelock enforcement requires storing creation timestamp. Using blocks alone is insufficient for time-based delays.

## Implementation Plan

---

## Phase 1: Core Contracts

### - [ ] 1. Create project structure and implement CafeToken

**What**: Implement ERC20 governance token with 100M fixed supply, voting power snapshots, delegation, and minting restricted to MasterChef.

**Files**:
- CREATE `blockchain/contracts/cafeswap/CafeToken.sol`
- CREATE `blockchain/tests/CafeToken.test.js`

**Implementation Details**:
- Import from OpenZeppelin 5.6.1: `ERC20`, `ERC20Votes`, `ERC20Permit`, `AccessControl`
- Constants: `MAX_SUPPLY = 100_000_000e18`, `MINTER_ROLE = keccak256("MINTER_ROLE")`
- `mint(address to, uint256 amount)`: require `hasRole(MINTER_ROLE)`, require `totalSupply + amount <= MAX_SUPPLY`
- Inherit voting power from ERC20Votes (automatic delegation and snapshots)
- Use custom errors instead of require strings

**Tests**:
- mint() respects supply cap
- mint() reverts when called by non-minter
- transfer() updates voting power
- delegate() changes delegation
- getVotes() returns snapshot at past block
- permit() accepts valid EIP-2612 signature

**Verify**: `npm run blockchain:compile && npx hardhat test blockchain/tests/CafeToken.test.js --network hardhatMainnet` — all tests pass

---

### - [ ] 2. Implement CafeSwapFactory with certification verification

**What**: Create factory contract that deploys pools via CREATE2 with deterministic addressing and verifies token certification via AgroChainCertificacoes.

**Files**:
- CREATE `blockchain/contracts/cafeswap/CafeSwapFactory.sol`
- CREATE `blockchain/tests/CafeSwapFactory.test.js`

**Implementation Details**:
- State: `mapping(address => bytes32) tokenToCertId`, `mapping(address => bool) certifiedTokens`, `mapping(address => mapping(address => address)) getPair`, `address public immutable agroChainCertificacoes`
- `addCertifiedToken(address token, bytes32 certId) onlyOwner`: call `IAgroChainCertificacoes(agroChainCertificacoes).certificacaoValida(certId)`, require returns true, set `tokenToCertId[token] = certId` and `certifiedTokens[token] = true`
- `createPool(address tokenA, address tokenB)`: require `certifiedTokens[tokenA] && certifiedTokens[tokenB]`, canonicalize order `(token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA)`, require `getPair[token0][token1] == address(0)`, deploy CafeSwapPool via CREATE2 with salt `keccak256(abi.encodePacked(token0, token1))`, store in `getPair[token0][token1]`, emit `PoolCreated(token0, token1, pool)`
- Import interface: `interface IAgroChainCertificacoes { function certificacaoValida(bytes32 id) external view returns (bool); }`

**Tests**:
- addCertifiedToken() calls certificacaoValida() and reverts on invalid cert
- createPool() reverts when tokenA not certified
- createPool() reverts when tokenB not certified
- createPool() produces deterministic address (same salt → same address)
- createPool() reverts on duplicate pool creation
- getPair() returns correct pool address

**Verify**: `npm run blockchain:compile && npx hardhat test blockchain/tests/CafeSwapFactory.test.js --network hardhatMainnet` — all tests pass

---

### - [ ] 3. Implement CafeSwapPool with constant product AMM

**What**: Implement x*y=k AMM pool with LP token minting/burning, swap functionality with 0.3% fee, TWAP oracle, and emergency withdrawal.

**Files**:
- CREATE `blockchain/contracts/cafeswap/CafeSwapPool.sol`
- CREATE `blockchain/tests/CafeSwapPool.test.js`

**Implementation Details**:
- Inherit ERC20 for LP tokens, ReentrancyGuard
- Packed storage: `uint112 reserve0; uint112 reserve1; uint32 blockTimestampLast;` (single slot)
- `uint256 public price0CumulativeLast; uint256 public price1CumulativeLast;` (TWAP oracle)
- Constants: `MINIMUM_LIQUIDITY = 1000`, `FEE_NUMERATOR = 3`, `FEE_DENOMINATOR = 1000`
- `mint(address to) nonReentrant`: check balances, calculate amounts, on first deposit `liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY` (burn to address(0)), on subsequent `liquidity = min(amount0 * totalSupply / reserve0, amount1 * totalSupply / reserve1)`, mint LP tokens, update reserves, update price accumulators
- `burn(address to) nonReentrant`: calculate `amount0 = liquidity * reserve0 / totalSupply`, `amount1 = liquidity * reserve1 / totalSupply`, burn LP tokens, transfer tokens, update reserves
- `swap(uint amount0Out, uint amount1Out, address to, bytes calldata data) nonReentrant`: require one output > 0, check balances for inputs, calculate `amountInWithFee = amountIn * 997`, require `(balance0 * 1000 - amount0Out * 1000) * (balance1 * 1000 - amount1Out * 1000) >= reserve0 * reserve1 * 1000000` (k-invariant with fee), transfer output, update reserves
- `getCurrentTWAP(uint32 windowSize) view returns (uint256 price0Avg, uint256 price1Avg)`: calculate from price cumulatives over window
- `emergencyWithdraw(address token, address to) onlyFactory`: require `token != token0 && token != token1`, transfer entire balance of stuck token
- `sync() nonReentrant`: update reserves to actual token balances
- `_update() internal`: update reserves, update price accumulators if time elapsed

**Tests**:
- First mint() burns 1000 wei MINIMUM_LIQUIDITY
- Subsequent mint() uses proportional formula
- burn() returns correct proportional amounts
- swap() maintains k-invariant: k_after >= k_before (accounting for 0.3% fee)
- swap() applies 0.3% fee to input amount
- getCurrentTWAP() returns correct time-weighted average
- emergencyWithdraw() works for non-pool tokens
- emergencyWithdraw() reverts for token0/token1
- sync() updates reserves to match balances

**Verify**: `npm run blockchain:compile && npx hardhat test blockchain/tests/CafeSwapPool.test.js --network hardhatMainnet` — all tests pass

---

### - [ ] 4. Implement CafeSwapRouter with multi-hop routing

**What**: Router handles liquidity operations and multi-hop swaps with canonical token ordering, slippage protection, and deadline enforcement.

**Files**:
- CREATE `blockchain/contracts/cafeswap/CafeSwapRouter.sol`
- CREATE `blockchain/tests/CafeSwapRouter.test.js`

**Implementation Details**:
- Import: `Pausable`, `ReentrancyGuard`
- State: `address public immutable factory`, `address public governance`
- Modifier: `ensure(uint deadline)` requires `block.timestamp <= deadline`
- `addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) ensure(deadline) nonReentrant returns (uint amountA, uint amountB, uint liquidity)`: get or create pool, calculate optimal amounts using `_quote()`, transfer tokens to pool, call pool.mint(), return amounts
- `removeLiquidity(address tokenA, address tokenB, uint liquidity, uint amountAMin, uint amountBMin, address to, uint deadline) ensure(deadline) nonReentrant returns (uint amountA, uint amountB)`: transfer LP tokens to pool, call pool.burn(), check minimums, return amounts
- `swap(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) ensure(deadline) whenNotPaused nonReentrant returns (uint[] memory amounts)`: calculate amounts with `getAmountsOut()`, check `amounts[last] >= amountOutMin`, transfer first token to first pool, FOR each hop: **canonicalize pair order** `(token0, token1) = path[i] < path[i+1] ? (path[i], path[i+1]) : (path[i+1], path[i])`, get pool address `factory.getPair(token0, token1)`, determine output direction based on original path order, call pool.swap(), return amounts array
- `getAmountsOut(uint amountIn, address[] calldata path) view returns (uint[] memory amounts)`: FOR each hop calculate `amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)`
- `getAmountsIn(uint amountOut, address[] calldata path) view returns (uint[] memory amounts)`: reverse calculation
- `quote(uint amountA, uint reserveA, uint reserveB) pure returns (uint amountB)`: return `amountA * reserveB / reserveA`
- `pause() onlyGovernance`, `unpause() onlyGovernance`

**Tests**:
- addLiquidity() on empty pool accepts desired amounts
- addLiquidity() on existing pool calculates optimal amounts maintaining ratio
- removeLiquidity() returns proportional tokens
- Single-hop swap() executes correctly
- Multi-hop swap() through path [A, B, C] executes with canonical ordering
- swap() reverts when output < amountOutMin (slippage protection)
- swap() reverts when deadline passed
- getAmountsOut() matches actual swap execution
- pause() blocks swaps but allows removeLiquidity()

**Verify**: `npm run blockchain:compile && npx hardhat test blockchain/tests/CafeSwapRouter.test.js --network hardhatMainnet` — all tests pass

---

### - [ ] 5. Implement integration tests for core AMM

**What**: End-to-end tests covering complete user flows from token certification to liquidity provision to swapping.

**Files**:
- CREATE `blockchain/tests/integration.test.js`

**Tests**:
- Full flow: addCertifiedToken → createPool → addLiquidity → swap → removeLiquidity
- Multi-hop routing: create 3 pools (A-B, B-C, C-D), swap A→D through path
- Fee accumulation: perform multiple swaps, verify reserves grow due to 0.3% fee
- Canonical ordering: create pool with token pair in one order, swap using opposite order in path, verify it works

**Verify**: `npx hardhat test blockchain/tests/integration.test.js --network hardhatMainnet` — all tests pass

---

## Phase 2: Liquidity Mining

### - [ ] 6. Implement CafeFarm (MasterChef) with correct reward debt management

**What**: Liquidity mining contract with per-second CAFE emissions, multiple farms with allocation points, and critical reward debt ordering fix.

**Files**:
- CREATE `blockchain/contracts/cafeswap/CafeFarm.sol`
- CREATE `blockchain/tests/CafeFarm.test.js`

**Implementation Details**:
- Import: `ReentrancyGuard`, `AccessControl`
- Structs: `struct FarmInfo { IERC20 lpToken; uint256 allocPoint; uint256 lastRewardTime; uint256 accCafePerShare; }`, `struct UserInfo { uint256 amount; uint256 rewardDebt; }`
- State: `FarmInfo[] public farms`, `mapping(address => mapping(uint256 => UserInfo)) public userInfo`, `uint256 public cafePerSecond`, `uint256 public totalAllocPoint`, `address public immutable cafe`, `address public governance`, `uint256 constant MAX_FARMS = 50`
- `updateFarm(uint256 farmId) internal`: if `block.timestamp <= lastRewardTime || lpSupply == 0` return, calculate `cafeReward = (block.timestamp - lastRewardTime) * cafePerSecond * allocPoint / totalAllocPoint`, increment `accCafePerShare += cafeReward * 1e12 / lpSupply`, set `lastRewardTime = block.timestamp`
- `stake(uint256 farmId, uint256 amount) nonReentrant`: **CRITICAL ORDERING**: 1) `updateFarm(farmId)`, 2) IF `user.amount > 0` calculate `pending = user.amount * accCafePerShare / 1e12 - user.rewardDebt` and store, 3) `user.amount += amount`, 4) `user.rewardDebt = user.amount * accCafePerShare / 1e12` **(SET AFTER AMOUNT UPDATE)**, 5) transfer LP tokens to contract
- `unstake(uint256 farmId, uint256 amount) nonReentrant`: call `harvest(farmId)` first, decrement `user.amount -= amount`, recalculate `user.rewardDebt`, transfer LP tokens back, require `amount <= user.amount`
- `harvest(uint256 farmId) nonReentrant`: `updateFarm()`, calculate pending rewards, mint CAFE to user, update `user.rewardDebt`
- `addFarm(address lpToken, uint256 allocPoint) onlyGovernance`: require `farms.length < MAX_FARMS`, push new farm, `totalAllocPoint += allocPoint`
- `setAllocPoint(uint256 farmId, uint256 newAllocPoint) onlyGovernance`: `updateFarm(farmId)`, adjust `totalAllocPoint`, update `farm.allocPoint`
- `setRewardRate(uint256 newCafePerSecond) onlyGovernance`: update all farms, set `cafePerSecond`
- `pendingCafe(uint256 farmId, address farmer) view returns (uint256)`: calculate current pending rewards without state change

**Tests**:
- **CRITICAL TEST**: stake() sets rewardDebt AFTER amount update (test that staking at T1, then staking more at T2 correctly accumulates T1→T2 rewards)
- harvest() mints correct CAFE amount based on time elapsed and allocation points
- unstake() auto-harvests before withdrawal
- addFarm() enforces MAX_FARMS = 50
- setAllocPoint() redistributes rewards correctly
- setRewardRate() updates emission rate
- pendingCafe() view matches harvest() results
- Multiple users staking in same farm receive proportional rewards
- ReentrancyGuard prevents reentrancy

**Verify**: `npm run blockchain:compile && npx hardhat test blockchain/tests/CafeFarm.test.js --network hardhatMainnet` — all tests pass, especially reward debt ordering test

---

## Phase 3: Governance

### - [ ] 7. Implement CafeGovernance with timelock

**What**: On-chain governance with proposal creation, voting, execution, and 48-hour timelock.

**Files**:
- CREATE `blockchain/contracts/cafeswap/CafeGovernance.sol`
- CREATE `blockchain/tests/CafeGovernance.test.js`

**Implementation Details**:
- Struct: `struct Proposal { uint256 id; address proposer; string description; uint256 startBlock; uint256 endBlock; uint256 creationTime; uint256 forVotes; uint256 againstVotes; uint256 abstainVotes; bool executed; bool canceled; mapping(address => bool) hasVoted; address[] targets; bytes[] calldatas; uint256[] values; }`
- Constants: `VOTING_PERIOD = 7 days`, `TIMELOCK_DELAY = 48 hours`, `PROPOSAL_THRESHOLD = 1_000_000e18` (1% of 100M), `QUORUM_PERCENTAGE = 10`
- State: `mapping(uint256 => Proposal) public proposals`, `uint256 public proposalCount`, `address public immutable cafe`
- `propose(address[] targets, uint256[] values, bytes[] calldatas, string description) returns (uint256)`: require `ICafeToken(cafe).balanceOf(msg.sender) >= PROPOSAL_THRESHOLD`, require arrays same length, create proposal with **`creationTime = block.timestamp`**, `startBlock = block.number`, `endBlock = block.number + VOTING_PERIOD / 12` (assuming 12s blocks), emit `ProposalCreated`, return proposalId
- `vote(uint256 proposalId, uint8 voteType)`: require `block.number <= proposal.endBlock`, require `!proposal.hasVoted[msg.sender]`, require `voteType in [1,2,3]`, get `votes = ICafeToken(cafe).getVotes(msg.sender, proposal.startBlock)` (snapshot), increment `forVotes/againstVotes/abstainVotes` by votes, set `hasVoted[msg.sender] = true`, emit `VoteCast`
- `execute(uint256 proposalId)`: require `block.number > proposal.endBlock` (voting ended), require `!proposal.executed`, require `proposal.forVotes > proposal.againstVotes` (majority), calculate `totalSupply = ICafeToken(cafe).totalSupply()`, require `proposal.forVotes >= totalSupply * QUORUM_PERCENTAGE / 100` (quorum), **require `block.timestamp >= proposal.creationTime + TIMELOCK_DELAY`** (timelock), FOR each target execute `(bool success,) = targets[i].call{value: values[i]}(calldatas[i])`, require success, set `proposal.executed = true`, emit `ProposalExecuted`
- `state(uint256 proposalId) view returns (ProposalState)`: return Pending/Active/Succeeded/Defeated/Executed enum

**Tests**:
- propose() requires >= 1M CAFE tokens (1% threshold)
- propose() reverts when proposer has insufficient tokens
- vote() uses voting power snapshot from proposal startBlock
- vote() prevents double voting
- vote() supports For/Against/Abstain
- execute() reverts when voting period not ended
- execute() reverts when quorum not met
- execute() reverts when timelock not elapsed (block.timestamp < creationTime + 48 hours)
- execute() succeeds after timelock and performs delegatecall
- execute() can call setRewardRate() on CafeFarm contract
- state() returns correct proposal status

**Verify**: `npm run blockchain:compile && npx hardhat test blockchain/tests/CafeGovernance.test.js --network hardhatMainnet` — all tests pass

---

## Phase 4: Deployment and Full Integration

### - [ ] 8. Create deployment script and full protocol test

**What**: Deploy all contracts with proper initialization and permissions, plus end-to-end protocol test.

**Files**:
- CREATE `blockchain/scripts/deploy-cafeswap.mjs`
- CREATE `blockchain/tests/full-protocol.test.js`
- MODIFY `package.json` (add scripts)

**Deployment Script** (`deploy-cafeswap.mjs`):
```javascript
// Deploy order:
1. Deploy CafeToken
2. Deploy CafeSwapFactory(agroChainCertificacoesAddress)
3. Deploy CafeSwapPool implementation (for CREATE2 calculation)
4. Deploy CafeSwapRouter(factory)
5. Deploy CafeFarm(cafeToken)
6. Deploy CafeGovernance(cafeToken)

// Set permissions:
- CafeToken.grantRole(MINTER_ROLE, cafeFarm)
- CafeFarm.setGovernance(cafeGovernance)
- CafeSwapRouter.setGovernance(cafeGovernance)

// Log all addresses
// Save to blockchain/deployments.json
```

**Full Protocol Test** (`full-protocol.test.js`):
```javascript
// End-to-end flow:
1. Deploy all contracts
2. Set up permissions
3. Add certified tokens to Factory
4. Create pools
5. Add liquidity
6. Perform swaps
7. Stake LP tokens in Farm
8. Wait for rewards to accumulate
9. Harvest rewards
10. Create governance proposal to change reward rate
11. Vote on proposal
12. Wait for timelock
13. Execute proposal
14. Verify reward rate changed
15. Unstake and remove liquidity
```

**Package.json updates**:
```json
{
  "scripts": {
    "test:cafeswap": "hardhat test blockchain/tests/{CafeToken,CafeSwapFactory,CafeSwapPool,CafeSwapRouter,CafeFarm,CafeGovernance,integration,full-protocol}.test.js",
    "deploy:cafeswap": "hardhat run blockchain/scripts/deploy-cafeswap.mjs --network hardhatMainnet"
  }
}
```

**Verify**: 
- `npm run blockchain:compile` — no errors
- `npm run deploy:cafeswap` — deploys all contracts, logs addresses
- `npm run test:cafeswap` — all tests pass (full test suite)

---

## Phase 5: Final Commit

### - [ ] 9. Final commit with all CafeSwap contracts

**What**: Commit all implemented contracts, tests, and deployment scripts.

**Commit Message**: `feat: implement CafeSwap DEX with certification-verified AMM, liquidity mining, and governance`

**Verify**: 
- All files in `blockchain/contracts/cafeswap/` committed
- All test files committed
- Deployment script committed
- `npm run test:cafeswap` passes on clean checkout

---

## Summary Statistics

**Total Contracts**: 6 (CafeToken, CafeSwapFactory, CafeSwapPool, CafeSwapRouter, CafeFarm, CafeGovernance)  
**Total Test Files**: 8 (6 unit test files + integration + full-protocol)  
**Total Steps**: 9  
**Dependencies**: OpenZeppelin 5.6.1, Hardhat 3.18.1, ethers 6.17.0

## Critical Success Factors

✅ **Certification verification** via `AgroChainCertificacoes.certificacaoValida(bytes32)`  
✅ **Canonical token ordering** in Router multi-hop swaps  
✅ **Reward debt set AFTER amount update** in CafeFarm.stake()  
✅ **Timelock with creationTime storage** in CafeGovernance.execute()  
✅ **CREATE2 deterministic addresses** for cross-chain compatibility  
✅ **Comprehensive test coverage** for all critical invariants

## Next Steps After Implementation

1. Security audit of all contracts
2. Gas optimization review
3. Frontend development (swap UI, farming dashboard, governance interface)
4. Multi-chain deployment (Polygon, Arbitrum)
5. Contract verification on block explorers
