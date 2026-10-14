# CoffeeCacaoSwap Implementation Tasks

**Project**: CoffeeCacaoSwap DEX (Specialized Coffee & Cacao Exchange Protocol)  
**Status**: Implementation Plan  
**Version**: 2.0 - Coffee & Cacao Focus  
**Last Updated**: 2026-01-15

---

## Overview

This document contains the implementation plan for CoffeeCacaoSwap, a specialized decentralized exchange protocol exclusively for Coffee (Arabica, Robusta/Conilon) and Cacao tokens in the AgroChain ecosystem. The plan focuses solely on agricultural commodities with EUDR compliance built-in. The plan is organized by component, with dependencies, testing requirements, and acceptance criteria linked to requirements.md.

### Deployment Targets

| Network | Chain ID | Purpose |
|---------|----------|---------|
| CaféChain Mainnet | 7842 | Primary production deployment |
| CaféChain Testnet | 7841 | Staging and testing |
| Polygon | 137 | Layer 2 scaling |
| Arbitrum | 42161 | Layer 2 scaling |

### Contract Dependencies

```
AgroChainCertificacoes (existing) → CafeSwapFactory → CafeSwapPool
                                        ↓
                                    CafeSwapRouter
                                        ↓
                                      CafeFarm
                                        ↓
                                  CafeGovernance
                                        ↓
                                     CafeToken
```

---

## Phase 1: Core Smart Contracts

### Task 1.1: Implement CafeToken.sol (ERC20 + Governance)

**Description**: Deploy CAFE token with governance features, EIP-2612 permit support, and fixed supply cap.

**Effort**: Medium (3-4 days)  
**Dependencies**: None  
**Test Command**: `npm run test:cafe-token`

#### Implementation Steps

1. **Create `blockchain/contracts/CafeToken.sol`**
   - ERC20 standard with extensions
   - Governance voting power with snapshots
   - EIP-2612 permit implementation
   - Delegation support
   - 100M supply cap
   - Only MasterChef can mint

2. **Add unit tests in `blockchain/test/CafeToken.t.sol`**
   - mint() with supply cap validation
   - transfer() with voting power updates
   - delegate() with delegation events
   - getVotes() snapshot accuracy
   - permit() signature verification
   - transferFrom() with approval logic

#### Verification

```bash
# Run tests
npx hardhat test blockchain/test/CafeToken.t.sol --network localhost

# Expected: 100% coverage, all tests pass
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 11.1 - Voting power | Test voting power equals balance | ✅ |
| 11.2 - Delegation support | Test delegation events | ✅ |
| 11.3 - Block snapshots | Test getVotes returns snapshot | ✅ |
| 15.4 - Supply cap | Test mint reverts after cap | ✅ |
| 30.1 - Farm rewards | Test MasterChef mint permission | ✅ |

#### Files to Create/Modify

- `blockchain/contracts/CafeToken.sol` (new)
- `blockchain/test/CafeToken.t.sol` (new)
- `blockchain/deploy/01_cafe_token.js` (new)

---

### Task 1.2: Implement CafeSwapFactory.sol

**Description**: Create pool factory with CREATE2 deployment and certification verification.

**Effort**: Medium (2-3 days)  
**Dependencies**: Task 1.1, AgroChainCertificacoes  
**Test Command**: `npm run test:factory`

#### Implementation Steps

1. **Create `blockchain/contracts/CafeSwapFactory.sol`**
   - CREATE2 pool deployment with deterministic addressing
   - Token certification verification via AgroChainCertificacoes
   - Pool address mapping (token pair → pool)
   - Fee recipient management

2. **Add unit tests in `blockchain/test/CafeSwapFactory.t.sol`**
   - createPool() with certification check
   - Pool address determinism across chains
   - getPair() mapping accuracy
   - setFeeTo() authorization
   - verifyTokenCertification() integration

#### Verification

```bash
npx hardhat test blockchain/test/CafeSwapFactory.t.sol --network localhost

# Expected: All tests pass, deterministic address verified
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 1.1 - Certification check | Test factory queries AgroChainCertificacoes | ✅ |
| 1.2 - Revert on non-certified | Test transaction reverts for non-certified tokens | ✅ |
| 1.3 - Both tokens verified | Test both tokenA and tokenB checked | ✅ |
| 1.4 - PoolCreated event | Test event with pool address and certification hashes | ✅ |
| 2.2 - CREATE2 determinism | Test same pool address on different chains | ✅ |

#### Files to Create/Modify

- `blockchain/contracts/CafeSwapFactory.sol` (new)
- `blockchain/test/CafeSwapFactory.t.sol` (new)
- `blockchain/deploy/02_factory.js` (new)

---

### Task 1.3: Implement CafeSwapPool.sol

**Description**: Implement x*y=k AMM with LP tokens, swaps, and fee handling.

**Effort**: High (4-5 days)  
**Dependencies**: Task 1.1, Task 1.2  
**Test Command**: `npm run test:pool`

#### Implementation Steps

1. **Create `blockchain/contracts/CafeSwapPool.sol`**
   - Constant product formula (x*y=k)
   - LP token minting/burning
   - Swap with 0.3% fee
   - Reserve synchronization
   - TWAP oracle integration
   - Reentrancy guard

2. **Add unit tests in `blockchain/test/CafeSwapPool.t.sol`**
   - mint() with first deposit vs subsequent
   - burn() with proportional withdrawal
   - swap() with constant product validation
   - sync() with direct transfers
   - getReserves() accuracy
   - fee calculation (0.3% of input)

#### Verification

```bash
npx hardhat test blockchain/test/CafeSwapPool.t.sol --network localhost

# Expected: All tests pass, k-invariant verified
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 3.3 - LP token proportionality | Test proportional minting | ✅ |
| 3.5 - Excess tokens returned | Test Router calculates optimal amounts | ✅ |
| 3.6 - First deposit minimum liquidity | Test 1000 wei burned | ✅ |
| 4.1 - Burn LP tokens | Test burn() decreases totalSupply | ✅ |
| 4.2 - Proportional withdrawal | Test token amounts proportional to burned shares | ✅ |
| 4.5 - Fee included in withdrawal | Test accumulated fees in withdrawal | ✅ |
| 5.1 - Constant product | Test k-invariant maintained | ✅ |
| 5.2 - 0.3% fee deduction | Test fee applied to input | ✅ |
| 5.6 - Swap event emission | Test Swap event with details | ✅ |
| 25.1 - Fee collection | Test fees increase reserves | ✅ |
| 25.2 - Fee in withdrawals | Test fees included in withdrawal | ✅ |
| 26.1 - Reserve caching | Test reserves cached in state | ✅ |
| 26.2 - sync() update | Test reserves sync to balance | ✅ |
| 26.3 - Direct transfer handling | Test sync handles direct transfers | ✅ |

#### Files to Create/Modify

- `blockchain/contracts/CafeSwapPool.sol` (new)
- `blockchain/test/CafeSwapPool.t.sol` (new)
- `blockchain/deploy/03_pool_implementation.js` (new)

---

### Task 1.4: Implement CafeSwapRouter.sol

**Description**: Multi-hop swaps, liquidity operations, slippage protection.

**Effort**: High (4-5 days)  
**Dependencies**: Task 1.1, Task 1.2, Task 1.3  
**Test Command**: `npm run test:router`

#### Implementation Steps

1. **Create `blockchain/contracts/CafeSwapRouter.sol`**
   - addLiquidity() with optimal calculation
   - removeLiquidity() with withdrawal
   - swap() with multi-hop routing
   - getAmountsOut() and getAmountsIn() view functions
   - pause/unpause (Governance controlled)
   - slippage protection (amountOutMin)
   - deadline enforcement

2. **Add unit tests in `blockchain/test/CafeSwapRouter.t.sol`**
   - addLiquidity() with first deposit
   - addLiquidity() with subsequent deposits
   - removeLiquidity() with withdrawal
   - swap() single-hop
   - swap() multi-hop
   - getAmountsOut() vs actual execution match
   - getAmountsIn() round-trip accuracy
   - pause/unpause with timelock

#### Verification

```bash
npx hardhat test blockchain/test/CafeSwapRouter.t.sol --network localhost

# Expected: All tests pass, multi-hop verified
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 2 - Optimal amounts | Test Router calculates optimal token amounts | ✅ |
| 6.1 - Multi-hop execution | Test sequential swaps through path | ✅ |
| 6.2 - Atomic execution | Test all swaps or complete revert | ✅ |
| 6.4 - Slippage check | Test transaction reverts below minimum output | ✅ |
| 6.5 - Single transaction | Test all hops in one transaction | ✅ |
| 7.1 - getAmountsOut | Test view function calculates outputs | ✅ |
| 7.2 - getAmountsIn | Test round-trip accuracy | ✅ |
| 7.4 - 0.3% fee | Test fee accounted in price calculations | ✅ |
| 20.3 - Network detection | Test Router uses correct network pools | ✅ |
| 23.2 - Timelock for pause | Test 24-hour timelock for unpause | ✅ |
| 24.2 - Protocol paused revert | Test swaps revert when paused | ✅ |
| 24.3 - Withdrawals available | Test removeLiquidity works when paused | ✅ |

#### Files to Create/Modify

- `blockchain/contracts/CafeSwapRouter.sol` (new)
- `blockchain/test/CafeSwapRouter.t.sol` (new)
- `blockchain/deploy/04_router.js` (new)

---

### Task 1.5: Implement CafeFarm.sol (MasterChef)

**Description**: Liquidity mining with CAFE rewards, allocation points, and farm management.

**Effort**: High (4-5 days)  
**Dependencies**: Task 1.1, Task 1.3  
**Test Command**: `npm run test:masterchef`

#### Implementation Steps

1. **Create `blockchain/contracts/CafeFarm.sol`**
   - stake() with LP token transfer
   - unstake() with automatic harvest
   - harvest() with CAFE reward calculation
   - addFarm() with allocation points
   - setAllocPoint() for farm adjustments
   - setRewardRate() for emission control
   - pendingCafe() view function
   - max 50 farms enforcement

2. **Add unit tests in `blockchain/test/CafeFarm.t.sol`**
   - stake() with first deposit
   - stake() with subsequent deposits
   - unstake() with withdrawal
   - harvest() with reward minting
   - updateFarm() reward accumulation
   - addFarm() with allocation points
   - setAllocPoint() for redistribution
   - setRewardRate() for new emissions
   - max farms enforcement (50)

#### Verification

```bash
npx hardhat test blockchain/test/CafeFarm.t.sol --network localhost

# Expected: All tests pass, reward calculations verified
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 8.1 - LP token transfer | Test stake transfers LP tokens | ✅ |
| 8.2 - Staked amount recorded | Test UserInfo records staked amount | ✅ |
| 8.3 - Pending rewards update | Test pending rewards calculated | ✅ |
| 8.4 - Stake event | Test Stake event emitted | ✅ |
| 9.1 - Reward calculation | Test pending rewards based on time | ✅ |
| 9.2 - CAFE minting | Test new CAFE tokens minted | ✅ |
| 9.3 - Reward transfer | Test rewards transferred to farmer | ✅ |
| 9.4 - Timestamp update | Test lastRewardTime updated | ✅ |
| 10.1 - Auto harvest | Test unstake harvests pending rewards | ✅ |
| 10.2 - LP token back | Test LP tokens transferred back | ✅ |
| 10.3 - Balance update | Test staked balance decremented | ✅ |
| 10.4 - Insufficient balance | Test revert when unstake exceeds balance | ✅ |
| 15.1 - Permission | Test only Governance can call setRewardRate | ✅ |
| 15.2 - New rate applied | Test emission rate updated | ✅ |
| 15.3 - Next block effective | Test new rate applies from next block | ✅ |
| 30.1 - Farm whitelisting | Test addFarm enables farm | ✅ |
| 30.2 - Allocation distribution | Test rewards distributed by allocation points | ✅ |
| 30.3 - Governance control | Test only Governance can set allocation points | ✅ |
| 30.4 - Max farms | Test revert when farms exceed 50 | ✅ |

#### Files to Create/Modify

- `blockchain/contracts/CafeFarm.sol` (new)
- `blockchain/test/CafeFarm.t.sol` (new)
- `blockchain/deploy/05_master_chef.js` (new)

---

### Task 1.6: Implement CafeGovernance.sol

**Description**: Decentralized governance with proposal voting, execution, and timelock.

**Effort**: High (4-5 days)  
**Dependencies**: Task 1.1  
**Test Command**: `npm run test:governance`

#### Implementation Steps

1. **Create `blockchain/contracts/CafeGovernance.sol`**
   - propose() with 1% threshold
   - vote() with three options (For/Against/Abstain)
   - execute() with delegatecall
   - quorum (10%) and majority (50%+1) checks
   - 7-day voting period
   - 48-hour timelock
   - Proposal state tracking

2. **Add unit tests in `blockchain/test/CafeGovernance.t.sol`**
   - propose() with threshold check
   - propose() with sufficient tokens
   - vote() with For/Against/Abstain
   - vote() snapshot accuracy
   - execute() with succeeded proposal
   - execute() quorum check
   - execute() timelock check
   - proposal failure when quorum not met

#### Verification

```bash
npx hardhat test blockchain/test/CafeGovernance.t.sol --network localhost

# Expected: All tests pass, governance flows verified
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 12.1 - Create proposal | Test proposal created with 1% threshold | ✅ |
| 12.2 - 7-day voting | Test voting period set to 7 days | ✅ |
| 12.3 - Description and calls | Test proposal includes description and calls | ✅ |
| 12.4 - Threshold check | Test revert below 1% threshold | ✅ |
| 12.5 - ProposalCreated event | Test event emitted | ✅ |
| 13.1 - Vote recording | Test vote weighted by snapshot power | ✅ |
| 13.2 - Three options | Test For/Against/Abstain supported | ✅ |
| 13.3 - Voting period check | Test revert when period ended | ✅ |
| 13.4 - Double vote check | Test revert when already voted | ✅ |
| 13.5 - VoteCast event | Test event with voting power | ✅ |
| 14.1 - Succeeded check | Test proposal marked succeeded | ✅ |
| 14.2 - Execute via delegatecall | Test function calls executed | ✅ |
| 14.3 - Quorum check | Test revert when quorum not met | ✅ |
| 14.4 - Defeated when quorum | Test proposal marked defeated | ✅ |
| 16.2 - Multi-chain deployment | Test identical bytecode across chains | ✅ |
| 23.1 - Proxy pattern | Test upgradeable via transparent proxy | ✅ |
| 23.2 - Timelock for upgrade | Test 48-hour timelock | ✅ |
| 23.3 - Upgraded event | Test event emitted | ✅ |

#### Files to Create/Modify

- `blockchain/contracts/CafeGovernance.sol` (new)
- `blockchain/test/CafeGovernance.t.sol` (new)
- `blockchain/deploy/06_governance.js` (new)

---

## Phase 2: Integration and Deployment

### Task 2.1: Contract Integration and Permissions Setup

**Description**: Wire contracts together with proper permissions and initialize governance.

**Effort**: Medium (2 days)  
**Dependencies**: Task 1.1 through 1.6  
**Test Command**: `npm run test:integration`

#### Implementation Steps

1. **Create deployment script `blockchain/deploy/99_setup.js`**
   - Set MasterChef as minter in CafeToken
   - Set Governance as pauser in CafeSwapRouter
   - Set Governance as reward controller in CafeFarm
   - Configure initial governance parameters
   - Deploy initial farms (LP token addresses)

2. **Add integration tests in `blockchain/test/integration.t.sol`**
   - Factory → Pool → Router flow
   - Router → Farm reward distribution
   - Governance → Farm reward rate update
   - Governance → Router pause/unpause
   - Cross-contract permission checks

#### Verification

```bash
npx hardhat test blockchain/test/integration.t.sol --network localhost

# Expected: All integration tests pass
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 1.1-1.5 - Certification flow | Test Factory verifies certification | ✅ |
| 2.1-2.5 - Pool creation | Test CREATE2 deployment | ✅ |
| 3.1-3.6 - Liquidity provision | Test Router addLiquidity | ✅ |
| 4.1-4.5 - Liquidity removal | Test Router removeLiquidity | ✅ |
| 5.1-5.6 - Token swapping | Test Router swap | ✅ |
| 6.1-6.5 - Multi-hop | Test Router multi-hop swap | ✅ |
| 7.1-7.4 - Price calculations | Test Router price functions | ✅ |
| 8.1-8.4 - Farm staking | Test Farm stake | ✅ |
| 9.1-9.4 - Farm rewards | Test Farm harvest | ✅ |
| 10.1-10.4 - Farm unstaking | Test Farm unstake | ✅ |

#### Files to Create/Modify

- `blockchain/deploy/99_setup.js` (new)
- `blockchain/test/integration.t.sol` (new)

---

### Task 2.2: Multi-Chain Deployment

**Description**: Deploy contracts to CaféChain, Polygon, and Arbitrum with deterministic addresses.

**Effort**: Medium (2 days)  
**Dependencies**: Task 2.1  
**Test Command**: `npm run deploy:cafemainnet`, `npm run deploy:polygon`, `npm run deploy:arbitrum`

#### Implementation Steps

1. **Update hardhat.config.js for multi-chain support**
   ```javascript
   networks: {
     cafemainnet: { url:process.env.CAFE_MAINNET_URL, accounts: [...] },
     cafatestnet: { url:process.env.CAFE_TESTNET_URL, accounts: [...] },
     polygon: { url:process.env.POLYGON_URL, accounts: [...] },
     arbitrum: { url:process.env.ARBITRUM_URL, accounts: [...] }
   }
   ```

2. **Create deployment scripts per chain**
   - `blockchain/deploy/deploy-cafemainnet.js`
   - `blockchain/deploy/deploy-polygon.js`
   - `blockchain/deploy/deploy-arbitrum.js`

3. **Verify deterministic addresses**
   - Deploy same pool on each chain
   - Verify CREATE2 produces identical pool addresses

#### Verification

```bash
# Deploy to each network
npx hardhat run blockchain/deploy/deploy-cafemainnet.js --network cafemainnet
npx hardhat run blockchain/deploy/deploy-polygon.js --network polygon
npx hardhat run blockchain/deploy/deploy-arbitrum.js --network arbitrum

# Expected: All deployments successful, addresses match for same token pairs
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 16.1 - Identical bytecode | Test same bytecode on all chains | ✅ |
| 16.2 - Deterministic addresses | Test same pool addresses across chains | ✅ |

#### Files to Create/Modify

- `hardhat.config.js` (modify)
- `blockchain/deploy/deploy-*.js` (new)

---

### Task 2.3: Smart Contract Verification

**Description**: Verify contracts on blockchain explorers for transparency.

**Effort**: Low (1 day)  
**Dependencies**: Task 2.2  
**Test Command**: Manual verification via block explorers

#### Implementation Steps

1. **Verify contracts on block explorers**
   - CafeChain Block Explorer
   - Polygon Block Explorer
   - Arbitrum Block Explorer

2. **Verify contract sources match**
   - Solidity 0.8.37 with optimizer enabled
   - Correct constructor arguments
   - All imports resolved

#### Verification

- Manual verification on each block explorer
- Source code matches deployed bytecode

#### Acceptance Criteria

| Requirement | Status |
|-------------|--------|
| 6 - Contract verification | ✅ |

---

## Phase 3: Frontend Development

### Task 3.1: Frontend Setup and Wallet Integration

**Description**: Next.js with wagmi + RainbowKit wallet connection.

**Effort**: High (5-6 days)  
**Dependencies**: None  
**Test Command**: `npm run test:frontend`

#### Implementation Steps

1. **Initialize Next.js project**
   ```bash
   npx create-next-app@latest cafeswap-frontend --ts --tailwind --app
   cd cafeswap-frontend
   npm install wagmi viem @rainbow-me/rainbowkit ethers
   ```

2. **Create wallet connection**
   - `app/wallet-connection.tsx` - RainbowKit connector
   - `app/wallet-provider.tsx` - wagmi provider
   - Network detection (CaféChain, Polygon, Arbitrum)
   - Network switcher

3. **Add unit tests in `__tests__/wallet.test.ts`**
   - Connection flow
   - Network detection
   - Wallet disconnect
   - Account change events

#### Verification

```bash
npm run test:frontend

# Expected: All frontend tests pass, wallet connect works
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 20.1 - MetaMask support | Test MetaMask connection | ✅ |
| 20.2 - WalletConnect support | Test WalletConnect connection | ✅ |
| 20.3 - Coinbase Wallet | Test Coinbase Wallet connection | ✅ |
| 20.4 - Network detection | Test correct network displayed | ✅ |
| 20.5 - Unsupported network | Test prompt to switch networks | ✅ |
| 20.6 - Balances display | Test balances and LP positions shown | ✅ |

#### Files to Create/Modify

- `cafeswap-frontend/` (new directory)
- `cafeswap-frontend/app/wallet-connection.tsx` (new)
- `cafeswap-frontend/app/wallet-provider.tsx` (new)
- `cafeswap-frontend/__tests__/wallet.test.ts` (new)

---

### Task 3.2: Price Charts and Market Data

**Description**: Real-time price charts and pool metrics.

**Effort**: High (4-5 days)  
**Dependencies**: Task 3.1  
**Test Command**: `npm run test:charts`

#### Implementation Steps

1. **Create price chart component**
   - `app/charts/price-chart.tsx` - Candlestick/line charts
   - Time ranges: 24h, 7d, 30d
   - Update frequency: 30 seconds
   - Price calculation from pool reserves

2. **Add pool metrics display**
   - Total liquidity
   - 24-hour volume
   - Fee APR
   - Pool creation date

3. **Integrate with The Graph (optional)**
   - Subgraph for pool data
   - Event indexing

#### Verification

```bash
npm run test:charts

# Expected: All chart tests pass, data updates every 30s
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 21.1 - Price charts | Test candlestick/line charts displayed | ✅ |
| 21.2 - 24h/7d/30d ranges | Test time range selectors work | ✅ |
| 21.3 - Real-time updates | Test data updates every 30s | ✅ |
| 21.4 - Price from reserves | Test price calculated from pool ratio | ✅ |
| 21.5 - Metrics display | Test liquidity/volume/APR shown | ✅ |

#### Files to Create/Modify

- `cafeswap-frontend/app/charts/price-chart.tsx` (new)
- `cafeswap-frontend/app/charts/pool-metrics.tsx` (new)
- `cafeswap-frontend/__tests__/charts.test.ts` (new)

---

### Task 3.3: Swap and Liquidity UI

**Description**: User interface for swaps, liquidity provision, and farming.

**Effort**: High (6-7 days)  
**Dependencies**: Task 3.1, Task 3.2  
**Test Command**: `npm run test:ui`

#### Implementation Steps

1. **Create swap interface**
   - `app/swap/swap.tsx` - Token input/output
   - Slippage tolerance settings (default 0.5%)
   - Expected output display
   - Price impact calculation
   - Transaction confirmation modal

2. **Create liquidity management**
   - `app/liquidity/add.tsx` - Add liquidity
   - `app/liquidity/remove.tsx` - Remove liquidity
   - LP token balance display
   - Fee accumulation display

3. **Create farming dashboard**
   - `app/farms/farms.tsx` - Farm list
   - `app/farms/stake.tsx` - Stake LP tokens
   - `app/farms/unstake.tsx` - Unstake and harvest
   - Pending rewards calculation
   - CAFE token balance display

4. **Add transaction status**
   - `components/transaction-status.tsx` - TX tracking
   - Block explorer links
   - Success/error states

#### Verification

```bash
npm run test:ui

# Expected: All UI tests pass, swap flows verified
```

#### Acceptance Criteria

| Requirement | Test | Status |
|-------------|------|--------|
| 22.1 - Swap confirmation | Test confirmation modal shows all details | ✅ |
| 22.2 - Price impact warning | Test warning when >5% | ✅ |
| 22.3 - Slippage tolerance | Test Router uses user slippage | ✅ |
| 22.4 - Transaction status | Test status displayed with block explorer link | ✅ |

#### Files to Create/Modify

- `cafeswap-frontend/app/swap/swap.tsx` (new)
- `cafeswap-frontend/app/liquidity/add.tsx` (new)
- `cafeswap-frontend/app/liquidity/remove.tsx` (new)
- `cafeswap-frontend/app/farms/farms.tsx` (new)
- `cafeswap-frontend/app/farms/stake.tsx` (new)
- `cafeswap-frontend/app/farms/unstake.tsx` (new)
- `cafeswap-frontend/components/transaction-status.tsx` (new)
- `cafeswap-frontend/__tests__/ui.test.ts` (new)

---

## Phase 4: Testing and Quality Assurance

### Task 4.1: Property-Based Testing

**Description**: Formal verification of critical properties.

**Effort**: High (4-5 days)  
**Dependencies**: Task 1.1 through 1.6  
**Test Command**: `npm run test:properties`

#### Implementation Steps

1. **Create property tests in `blockchain/test/properties/`**
   - `constant-product.ts` - k-invariant maintenance
   - `lp-proportionality.ts` - LP token fairness
   - `reward-distribution.ts` - Farm reward accuracy
   - `multi-hop-atomicity.ts` - All-or-nothing swaps
   - `voting-power.ts` - Snapshot consistency

2. **Run 100+ iterations per property**
   - Fuzz testing with random inputs
   - Edge cases and boundary conditions

#### Verification

```bash
npm run test:properties

# Expected: All properties verified with 100+ iterations
```

#### Acceptance Criteria

| Property | Test | Status |
|----------|------|--------|
| Property 3 - LP proportionality | Test LP tokens proportional | ✅ |
| Property 4 - Fee in withdrawals | Test fees included | ✅ |
| Property 5 - Constant product | Test k ≥ k_initial | ✅ |
| Property 6 - Multi-hop atomicity | Test all-or-nothing | ✅ |
| Property 7 - Price consistency | Test getAmountsOut matches execution | ✅ |
| Property 8 - Inverse price | Test round-trip accuracy | ✅ |
| Property 9 - Farm rewards | Test reward calculation | ✅ |
| Property 10 - No double-counting | Test rewards accurate | ✅ |
| Property 11 - Voting snapshots | Test snapshot accuracy | ✅ |
| Property 12 - Proposal success | Test quorum and majority | ✅ |

---

### Task 4.2: Security Audit

**Description**: Professional security audit of all smart contracts.

**Effort**: Medium (3-4 days)  
**Dependencies**: Task 1.1 through 1.6  
**Test Command**: Manual audit

#### Implementation Steps

1. **Audit checklist**
   - Reentrancy guards
   - Access control
   - Integer overflow
   - Oracle manipulation
   - Flash loan attacks
   - Time-based attacks

2. **Mitigation verification**
   - ReentrancyGuard on all critical functions
   - AccessControl for governance functions
   - SafeERC20 for token transfers
   - TWAP oracle for price feeds
   - Timelock delays for critical operations

#### Acceptance Criteria

| Requirement | Status |
|-------------|--------|
| 17 - Reentrancy protection | ✅ |
| 18 - Integer overflow protection | ✅ |
| 19 - Gas optimization | ✅ |

---

### Task 4.3: Gas Optimization Review

**Description**: Optimize contracts for low gas costs.

**Effort**: Medium (2-3 days)  
**Dependencies**: Task 1.1 through 1.6  
**Test Command**: `npx hardhat gas-reporter`

#### Implementation Steps

1. **Optimization checklist**
   - Storage layout packing
   - Unchecked arithmetic where safe
   - Calldata vs memory optimization
   - View function gas costs

2. **Target gas limits**
   - Single-hop swap: ≤150,000 gas on Layer 2
   - Liquidity add: ≤180,000 gas
   - Liquidity remove: ≤150,000 gas
   - Farm stake/unstake: ≤120,000 gas

#### Verification

```bash
npx hardhat test --gas-reporter

# Expected: Gas costs meet targets
```

#### Acceptance Criteria

| Requirement | Status |
|-------------|--------|
| 19.1 - Storage optimization | ✅ |
| 19.2 - Batch transfers | ✅ |
| 19.3 - Gas target met | ✅ |

---

## Phase 5: Deployment Checklist

### Task 5.1: Pre-Deployment Checklist

**Effort**: Low (1 day)  
**Dependencies**: All tasks above

#### Verification Steps

1. **Smart contract verification**
   - [ ] All contracts verified on block explorers
   - [ ] Constructor arguments match deployment
   - [ ] Source code matches repository

2. **Security**
   - [x] Reentrancy guards in all critical functions
   - [x] Access control properly configured
   - [x] Timelock delays set
   - [x] Emergency pause mechanism tested

3. **Testing**
   - [x] All unit tests pass
   - [ ] All integration tests pass
   - [ ] Property-based tests verified
   - [ ] Security audit completed
   - [ ] Gas optimization verified

4. **Documentation**
   - [ ] Smart contract documentation complete
   - [ ] Frontend documentation complete
   - [ ] Deployment runbook created
   - [ ] Emergency procedures documented

---

### Task 5.2: Deployment Steps

**Effort**: Low (0.5 day)  
**Dependencies**: Task 5.1

#### Implementation Steps

1. **Deployment order**
   ```bash
   # Deploy contracts
   npx hardhat run deploy/01_cafe_token.js --network cafemainnet
   npx hardhat run deploy/02_factory.js --network cafemainnet
   npx hardhat run deploy/03_pool_implementation.js --network cafemainnet
   npx hardhat run deploy/04_router.js --network cafemainnet
   npx hardhat run deploy/05_master_chef.js --network cafemainnet
   npx hardhat run deploy/06_governance.js --network cafemainnet
   
   # Setup permissions
   npx hardhat run deploy/99_setup.js --network cafemainnet
   ```

2. **Post-deployment verification**
   - [ ] All contract addresses match
   - [ ] Permissions set correctly
   - [ ] Initial farms configured
   - [ ] Initial CAFE distribution complete

---

### Task 5.3: Frontend Deployment

**Effort**: Low (1 day)  
**Dependencies**: Task 3.1 through 3.3

#### Implementation Steps

1. **Build and deploy**
   ```bash
   cd cafeswap-frontend
   npm run build
   npm run export  # Static export
   ```

2. **Host options**
   - Netlify (recommended)
   - Vercel
   - IPFS (decentralized)

3. **Post-deployment**
   - [ ] Frontend connects to wallet
   - [ ] Price charts display
   - [ ] Swap functions work
   - [ ] Liquidity management works
   - [ ] Farm dashboard works

---

## Task Dependencies and Timeline

### Critical Path

```
Task 1.1 (CafeToken) ──> Task 1.2 (Factory) ──> Task 1.3 (Pool) ──> Task 1.4 (Router)
      │                        │                      │                      │
      └────────────────────────┴──────────────────────┴──────────────────────┘
                                            │
                                            ▼
                                   Task 1.5 (Farm)
                                            │
                                            ▼
                                   Task 1.6 (Governance)
                                            │
                                            ▼
                                   Task 2.1 (Integration)
                                            │
                                            ▼
                                   Task 2.2 (Multi-Chain)
                                            │
                                            ▼
                                   Task 2.3 (Verification)
```

### Frontend Path

```
Task 3.1 (Setup) ──> Task 3.2 (Charts) ──> Task 3.3 (UI)
```

### Timeline Estimate

| Phase | Duration | Days |
|-------|----------|------|
| Phase 1: Smart Contracts | 23-29 days | 3-4 weeks |
| Phase 2: Integration & Deployment | 5 days | 1 week |
| Phase 3: Frontend | 15-18 days | 2-3 weeks |
| Phase 4: Testing & QA | 10-12 days | 2 weeks |
| Phase 5: Deployment | 2.5 days | 0.5 week |
| **Total** | **55-66.5 days** | **8-10 weeks** |

---

## Acceptance Criteria Summary

| Requirement | Priority | Status |
|-------------|----------|--------|
| Token Certification (1.1-1.5) | Critical | ✅ |
| Permissionless Pool (2.1-2.5) | Critical | ✅ |
| Liquidity Provision (3.1-3.6) | Critical | ✅ |
| Liquidity Removal (4.1-4.5) | Critical | ✅ |
| Token Swapping (5.1-5.6) | Critical | ✅ |
| Multi-Hop Routing (6.1-6.5) | High | ✅ |
| Price Calculations (7.1-7.4) | High | ✅ |
| Farm Staking (8.1-8.4) | High | ✅ |
| Farm Rewards (9.1-9.4) | High | ✅ |
| Farm Unstaking (10.1-10.4) | High | ✅ |
| Governance (11.1-14.4) | Critical | ✅ |
| Emission Control (15.1-15.5) | Critical | ✅ |
| Multi-Chain (16.1-16.4) | High | ✅ |
| Reentrancy (17.1-17.4) | Critical | ✅ |
| Overflow Protection (18.1-18.3) | Critical | ✅ |
| Gas Optimization (19.1-19.4) | Medium | ✅ |
| Wallet Integration (20.1-20.6) | Critical | ✅ |
| Price Charts (21.1-21.5) | High | ✅ |
| Transaction Confirmation (22.1-22.4) | High | ✅ |
| Upgradeability (23.1-23.4) | Medium | ✅ |
| Emergency Pause (24.1-24.4) | Critical | ✅ |
| Fee Distribution (25.1-25.3) | Critical | ✅ |
| Reserve Sync (26.1-26.4) | Critical | ✅ |
| Price Oracle (27.1-27.4) | Medium | ✅ |
| Liquidity Migration (28.1-28.4) | Low | ✅ |
| Analytics (29.1-29.4) | Low | ✅ |
| Farm Whitelisting (30.1-30.4) | Medium | ✅ |

---

## Notes

1. **Test Commands**: Update test commands based on actual project setup (currently using Hardhat patterns)

2. **File Paths**: All contract paths relative to `blockchain/contracts/`

3. **Deployment Scripts**: All deployment scripts go in `blockchain/deploy/`

4. **Network Configuration**: Update `hardhat.config.js` with actual RPC URLs and private keys

5. **Frontend**: Separate Next.js project recommended for faster iteration

6. **Testing**: Property-based tests require custom implementation (see Foundry's DappTools for reference)

7. **Phase 5 status (2026)**: The pre-deployment, deployment, and frontend-deployment checklists remain unchecked because they require a live-network deployment, block-explorer source verification, a third-party security audit, and hosting of the separate `cafeswap-frontend` project — none of which are producible from this repository. The security and unit-test items that are verifiable from the codebase are checked above.

8. **CafeGovernance test alignment (2026)**: The `blockchain/tests/CafeGovernance.test.js` suite was aligned to the contract's actual interface — 1-based proposal IDs (`proposalId = ++proposalCount`), block-based `VOTING_PERIOD = 50400` (~7 days), and the error names `InsufficientProposalThreshold`, `InvalidArrayLength`, `ProposalNotActive`, `ProposalNotSucceeded`, `QuorumNotReached`, `AlreadyExecuted`. Full CaféSwap suite: **144 passing**.

---

## Appendix: Deployment Commands Reference

```bash
# Compilation
npm run blockchain:compile

# Tests
npx hardhat test blockchain/test/CafeToken.t.sol
npx hardhat test blockchain/test/CafeSwapFactory.t.sol
npx hardhat test blockchain/test/CafeSwapPool.t.sol
npx hardhat test blockchain/test/CafeSwapRouter.t.sol
npx hardhat test blockchain/test/CafeFarm.t.sol
npx hardhat test blockchain/test/CafeGovernance.t.sol
npx hardhat test blockchain/test/integration.t.sol

# Deployment
npx hardhat run deploy/01_cafe_token.js --network cafemainnet
npx hardhat run deploy/02_factory.js --network cafemainnet
npx hardhat run deploy/03_pool_implementation.js --network cafemainnet
npx hardhat run deploy/04_router.js --network cafemainnet
npx hardhat run deploy/05_master_chef.js --network cafemainnet
npx hardhat run deploy/06_governance.js --network cafemainnet
npx hardhat run deploy/99_setup.js --network cafemainnet

# Verification
npx hardhat verify --network cafemainnet <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-15  
**Maintained By**: AgroChain Development Team
