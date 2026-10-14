# CaféSwap Phase 1 Contract Review

Implements a certification-gated DEX with liquidity mining and governance for AgroChain. The protocol consists of six contracts following the Uniswap v2 pattern with modifications for AgroChain's certification system. The implementation addresses all critical design fixes from DESIGN-FIXES.md and includes comprehensive testing. Integration tests pass, demonstrating end-to-end functionality from certification through swapping, farming, and governance.

**Watch for:** Token whitelist admin centralization (confirmed), TWAP oracle returns cumulative values without window calculation (confirmed), router creates pools without explicit user consent (confirmed), governance execution lacks explicit call success validation on individual targets (confirmed).

**Verdict**: CHANGES_REQUESTED

## High-level view

The certification integration works as designed: the Factory maintains a whitelist that the owner populates by calling `addCertifiedToken()`, which verifies the certification ID against AgroChainCertificacoes before whitelisting. This is the correct approach given the interface constraint, but it introduces an admin trust dependency that differs from fully decentralized DEXes.

The AMM implementation follows Uniswap v2 mechanics faithfully. Pools use the constant product formula with 0.3% fees, burn MINIMUM_LIQUIDITY on first mint, and perform k-invariant validation on every swap. The canonical ordering requirement is met: Factory creates pools with sorted addresses, and Router canonicalizes token order before every pool lookup.

The liquidity mining contract implements the critical reward debt fix correctly. The stake() function updates the farm accumulator, calculates pending rewards, updates the user's staked amount, and only then sets rewardDebt based on the new amount. This ordering prevents the reward loss that would occur if debt were set before the amount update.

Governance stores creationTime on proposal creation and enforces the 48-hour timelock before execution. The timelock check uses block.timestamp comparison, and execution requires both voting period completion and timelock expiry. Quorum is set at 10% of total supply, with a 1M token proposal threshold.

The TWAP implementation exposes cumulative price values but doesn't calculate averages over a window. The getCurrentTWAP() function takes a windowSize parameter but ignores it, returning only the current cumulative values. External contracts must store prior values and compute differences themselves.

The router automatically creates pools during addLiquidity() if they don't exist. This convenience feature means a user approving the router for liquidity provision may inadvertently create a pool if one doesn't exist, even if their primary intent was only to add liquidity.

Access control relies heavily on the Factory owner for token certification and the governance role for Farm and Router configuration. The owner is set to msg.sender on deployment without immediate transfer to governance or multisig, creating a window where protocol control is centralized.

## Details

<details>
<summary>Details</summary>

### Certification verification delegates trust to Factory owner

The Factory's `addCertifiedToken()` function is the sole entry point for token whitelisting. The owner calls it with a token address and certification ID, the Factory queries `AgroChainCertificacoes.certificacaoValida(certId)`, and if valid, the token is whitelisted. This is the correct approach given that AgroChainCertificacoes doesn't expose an `isCertified(address)` method.

The trust dependency is that the owner must correctly associate tokens with their certification IDs. A malicious or compromised owner could whitelist an uncertified token by passing a valid but unrelated certId. The on-chain verification happens at the certId level, not the token-to-certId mapping level.

The whitelist is immutable once set—there's no `removeCertifiedToken()` function. If a certification is revoked or expires, the Factory has no mechanism to delist the token. Pools with delisted tokens would continue operating.

**Confirmed:** The Factory owner is set to msg.sender on deployment and not immediately transferred to governance. The deployment script doesn't transfer ownership. This means the deployer retains full certification control until ownership is manually transferred post-deployment.

### Pool creation uses CREATE2 with correct salt but embeds bytecode inline

The Factory deploys pools via CREATE2 using `keccak256(abi.encodePacked(token0, token1))` as the salt, producing deterministic addresses for cross-chain compatibility.

The CREATE2 assembly includes `type(CafeSwapPool).creationCode`, which embeds the entire Pool contract bytecode into the Factory's bytecode. This inflates the Factory's deployment cost and size compared to Uniswap v2's separate factory and pool contracts.

### AMM mechanics follow Uniswap v2 with correct fee application

The Pool's swap() function validates the k-invariant with fee adjustment:

```solidity
uint256 balance0Adjusted = (balance0 * 1000) - (amount0In * 3);
uint256 balance1Adjusted = (balance1 * 1000) - (amount1In * 3);

if (balance0Adjusted * balance1Adjusted < uint256(_reserve0) * uint256(_reserve1) * (1000**2)) {
    revert InvariantK();
}
```

This correctly applies the 0.3% fee by reducing the input amount by 3/1000 before the invariant check. The fee stays in the pool—there's no protocol fee extraction.

The first mint burns MINIMUM_LIQUIDITY (1000 wei) to address(0) to prevent inflation attacks. Subsequent mints use the proportional formula preventing value extraction via imbalanced deposits.

**Confirmed:** The Pool has no slippage protection—it accepts whatever amounts are sent and mints/burns accordingly. Slippage protection is entirely the Router's responsibility via amountMin parameters.

### TWAP oracle exposes cumulative prices but doesn't calculate averages

The Pool tracks `price0CumulativeLast` and `price1CumulativeLast`, updating them in _update():

```solidity
if (timeElapsed > 0 && _reserve0 != 0 && _reserve1 != 0) {
    unchecked {
        price0CumulativeLast += uint256((uint224(_reserve1) << 112) / _reserve0) * timeElapsed;
        price1CumulativeLast += uint256((uint224(_reserve0) << 112) / _reserve1) * timeElapsed;
    }
}
```

This accumulates price × time, which is the standard TWAP mechanism. However, `getCurrentTWAP(uint32 windowSize)` returns the cumulative values directly:

```solidity
function getCurrentTWAP(uint32 windowSize) external view returns (uint256 price0Average, uint256 price1Average) {
    price0Average = price0CumulativeLast;
    price1Average = price1CumulativeLast;
}
```

The windowSize parameter is ignored. To compute a TWAP over a window, the caller must:
1. Store (price0CumulativeLast, timestamp) at T0
2. Query (price0CumulativeLast, timestamp) at T1
3. Calculate TWAP = (cumulative1 - cumulative0) / (T1 - T0)

The function name suggests it calculates an average, but it doesn't. This is a documentation gap—the function should be named `getPriceCumulatives()` or the implementation should actually compute the average.

**Possible:** Oracle manipulation via single-block sandwich attacks. The price accumulator updates after every swap, so an attacker who controls the last transaction in block N and the first transaction in block N+1 can manipulate the accumulated price for one block interval. This is inherent to single-block TWAP and requires multi-block TWAPs to mitigate.

### Emergency withdrawal protects pool tokens but lacks timelock

The Pool's `emergencyWithdraw()` function allows the Factory's feeToSetter to extract tokens sent to the pool by mistake. The check `token != token0 && token != token1` prevents extraction of pool reserves. The function transfers the entire balance with no amount parameter.

**Confirmed:** There's no timelock or governance requirement for emergency withdrawal. The feeToSetter (initially the deployer) can extract stuck tokens immediately. This is appropriate for genuine stuck-token recovery but could be misused if the feeToSetter role is compromised.

### Router canonical ordering fixes multi-hop lookup

The Router canonicalizes token order before every pool lookup, ensuring it finds pools regardless of path token order. The swap direction is determined by comparing the original path token to canonical token0.

**Confirmed:** Events emitted by the Pool during swaps use canonical (amount0In, amount1In, amount0Out, amount1Out) ordering, not the user's path order. Off-chain systems reconstructing swap paths from events must canonicalize addresses to match events to paths.

### Router creates pools during addLiquidity without explicit opt-in

The `addLiquidity()` function checks if a pool exists and creates one if it doesn't. This convenience feature means a user who approves the Router and calls addLiquidity() may inadvertently create a pool, incurring the gas cost of pool deployment.

**Confirmed:** There's no pool creation cap or rate limit. Anyone can create pools for any certified token pair, potentially creating spam pools. This is consistent with Uniswap v2 behavior.

### Farm reward debt ordering prevents reward loss

The `stake()` function implements the critical ordering fix: updatePool(), calculate pending before amount update, update user.amount, then set rewardDebt after. If rewardDebt were set before the amount update, users would lose rewards earned between stakes.

The stake() function automatically harvests pending rewards—there's no way to stake without harvesting.

**Confirmed:** If pending is 0, no Harvest event is emitted even though Deposit is emitted. Off-chain systems tracking harvests must check both Harvest events and Deposit events with pending > 0.

### Farm allocation point updates can cause reward miscalculation

The `setAllocPoint()` function changes a pool's share of future emissions. If withUpdate is true, all pools are updated before the change, distributing rewards up to this moment based on old allocation points—allocation changes aren't retroactive.

If withUpdate is false, pools aren't updated first. The next updatePool() for any pool will distribute rewards covering the time span before and after the allocation change, using the allocation point at the time of the update, causing miscalculation for the period before the change.

**Confirmed:** The governance role can set allocation points to 0, freezing new reward accrual for a pool. Users can still unstake and receive already-accrued rewards. There's no minimum allocation point enforced.

### Governance proposal execution fails atomically on any call failure

The `execute()` function loops through all proposal calls and reverts with ExecutionFailed on any failure. Multi-call proposals with one bad call fail completely—earlier calls are reverted. This prevents partial execution but means proposal authors must carefully test all calls.

The ExecutionFailed error doesn't include the call index or revert reason from the failed call, making post-mortem debugging harder.

**Confirmed:** Anyone can execute a successful proposal by calling execute()—there's no restriction to proposer or governance role. This is consistent with trustless execution but means a malicious actor could front-run the intended executor.

### Governance timelock uses timestamp but voting uses block numbers

Proposals use block.number for voting periods (VOTING_PERIOD = 50400 blocks) and block.timestamp for timelocks (TIMELOCK_DELAY = 48 hours). Block-based voting resists timestamp manipulation; timestamp-based timelocks are easier to reason about in real time.

VOTING_PERIOD assumes 12-second blocks = 7 days. If block times drift, the voting period duration changes while the timelock remains exactly 48 hours.

**Possible:** On chains with irregular block times, voting might end significantly before or after 7 days while the timelock is unaffected, causing user confusion if voting ends early but the timelock has 2 days remaining.

### CafeToken supply cap breaks Farm at exhaustion

The mint function enforces MAX_SUPPLY, reverting if totalSupply + amount exceeds 100M tokens. There's no warning mechanism as the supply approaches the cap.

**Confirmed:** Once the supply cap is hit, the Farm becomes non-functional—users can't harvest, stake, or unstake because safeCafeTransfer() calls mint(), which reverts. Users can only use emergencyWithdraw() to recover LP tokens without rewards. The protocol has no mechanism to reduce emission rates or handle supply exhaustion gracefully.

### Test coverage validates critical fixes but lacks edge cases

The test suite covers:
- CafeToken: minting, transfers, voting, delegation, permit
- Factory: certification, pool creation, duplicate prevention
- Pool: liquidity provision, swaps, k-invariant, TWAP, emergency withdrawal
- Router: add/remove liquidity, single-hop swaps, multi-hop swaps, quotes
- Farm: staking, unstaking, harvesting, reward debt ordering, allocation points
- Governance: proposal creation, voting, execution, timelock, quorum

The critical reward debt ordering test exists and passes. The timelock test verifies execution reverts before 48 hours. Canonical ordering is tested for single and multi-hop swaps.

Tests don't extensively cover adversarial scenarios: pool creation spam, oracle manipulation, Farm after supply cap, governance execution with failing calls, front-running execution, extreme liquidity imbalance.

**Confirmed:** Tests use Hardhat's evm_increaseTime which doesn't advance block.number. Some tests mine blocks separately. This correctly tests mixed time domains but could miss block/time desync issues.

</details>

<details>
<summary>Issues (8)</summary>

1. **TWAP oracle function name misleading** (confirmed) — getCurrentTWAP() ignores windowSize parameter and returns cumulative values, not averages. Rename to getPriceCumulatives() or implement actual window-based averaging.

2. **Farm becomes non-functional at supply cap** (confirmed) — Once MAX_SUPPLY is reached, all harvest/stake/unstake operations revert because safeCafeTransfer() calls mint(). Implement supply cap handling: reduce emission rates, allow operations without minting, or set cafePerSecond to 0.

3. **Governance ExecutionFailed lacks diagnostic info** (confirmed) — execute() loops through calls and reverts with ExecutionFailed on any failure, but doesn't include which call index failed or the revert reason. Bubble up revert data or emit an event with call index before reverting.

4. **Factory owner centralization without deployment transition** (confirmed) — Factory owner (deployer) controls certification whitelist indefinitely. Deployment script should transfer ownership to governance or multisig immediately after setup.

5. **No mechanism to delist revoked certifications** (confirmed) — addCertifiedToken() whitelists tokens permanently; no removeCertifiedToken() exists. If AgroChainCertificacoes revokes a certification, the Factory can't delist it. Add governance-controlled delisting or periodic re-verification.

6. **setAllocPoint without massUpdatePools causes reward miscalculation** (confirmed) — setAllocPoint(withUpdate=false) changes allocPoint without updating pools first. The next pool update distributes rewards across the time span before and after the change using the current allocPoint, not the historical one. Enforce withUpdate=true or document the risk.

7. **Emergency withdraw by feeToSetter lacks timelock** (confirmed) — Pool.emergencyWithdraw() allows immediate extraction by feeToSetter. While appropriate for genuine stuck tokens, it's a centralization vector. Consider adding a timelock or requiring governance approval for amounts above a threshold.

8. **Router creates pools without explicit user consent** (confirmed) — addLiquidity() calls createPool() if the pool doesn't exist, potentially incurring deployment costs the user didn't expect. Add a createPoolIfNeeded boolean parameter to require explicit consent.

</details>

<details>
<summary>File map</summary>

- **CafeToken.sol** — ERC20 governance token with 100M supply cap, MINTER_ROLE restriction, ERC20Votes delegation
- **CafeSwapFactory.sol** — Pool factory with certification whitelist, CREATE2 deployment, fee management
- **CafeSwapPool** (embedded in Factory file) — AMM pool with LP token, swap, mint, burn, TWAP oracle, emergency withdrawal
- **CafeSwapRouter.sol** — Liquidity and swap router with canonical ordering, multi-hop routing, deadline protection
- **CafeFarm.sol** — MasterChef liquidity mining with per-second emissions, allocation points, reward debt fix
- **CafeGovernance.sol** — On-chain governance with proposals, voting, 48-hour timelock, quorum enforcement
- **MockAgroChainCertificacoes.sol** — Test mock for certification verification
- **Test files** — CafeToken.test.js, CafeSwapFactory.test.js, CafeSwapPool.test.js, CafeSwapRouter.test.js, CafeFarm.test.js, CafeGovernance.test.js
- **Deployment** — deploy-cafeswap.mjs, test-cafeswap.mjs integration test

Full diff: see git log and `git diff main` for line-level changes.

</details>