import assert from "node:assert/strict";
import { network } from "hardhat";

const { ethers } = await network.connect();
const [owner, user1, user2] = await ethers.getSigners();

console.log("Testing CaféSwap Protocol...\n");

// 1. Deploy CafeToken
console.log("1. Deploying CafeToken...");
const CafeToken = await ethers.getContractFactory("CafeToken");
const cafe = await CafeToken.deploy();
await cafe.waitForDeployment();
console.log(`✓ CafeToken deployed at ${await cafe.getAddress()}`);

// Verify token properties
assert.equal(await cafe.name(), "Cafe Token");
assert.equal(await cafe.symbol(), "CAFE");
const MAX_SUPPLY = await cafe.MAX_SUPPLY();
assert.equal(MAX_SUPPLY, ethers.parseEther("100000000"));
console.log("✓ Token properties verified\n");

// 2. Deploy Mock Certificacoes
console.log("2. Deploying Mock AgroChainCertificacoes...");
const MockCert = await ethers.getContractFactory("MockAgroChainCertificacoes");
const mockCert = await MockCert.deploy();
await mockCert.waitForDeployment();
console.log(`✓ Mock Certificacoes deployed at ${await mockCert.getAddress()}\n`);

// 3. Deploy Factory
console.log("3. Deploying CafeSwapFactory...");
const Factory = await ethers.getContractFactory("CafeSwapFactory");
const factory = await Factory.deploy(await mockCert.getAddress());
await factory.waitForDeployment();
console.log(`✓ Factory deployed at ${await factory.getAddress()}\n`);

// 4. Deploy Router
console.log("4. Deploying CafeSwapRouter...");
const Router = await ethers.getContractFactory("CafeSwapRouter");
const router = await Router.deploy(await factory.getAddress());
await router.waitForDeployment();
console.log(`✓ Router deployed at ${await router.getAddress()}\n`);

// 5. Deploy Farm
console.log("5. Deploying CafeFarm...");
const Farm = await ethers.getContractFactory("CafeFarm");
const farm = await Farm.deploy(await cafe.getAddress(), ethers.parseEther("1"));
await farm.waitForDeployment();
console.log(`✓ Farm deployed at ${await farm.getAddress()}\n`);

// 6. Deploy Governance
console.log("6. Deploying CafeGovernance...");
const Governance = await ethers.getContractFactory("CafeGovernance");
const governance = await Governance.deploy(await cafe.getAddress());
await governance.waitForDeployment();
console.log(`✓ Governance deployed at ${await governance.getAddress()}\n`);

// 7. Setup permissions
console.log("7. Setting up permissions...");
const MINTER_ROLE = await cafe.MINTER_ROLE();
await (await cafe.grantRole(MINTER_ROLE, await farm.getAddress())).wait();
console.log("✓ Farm granted MINTER_ROLE\n");

// 8. Test token certification
console.log("8. Testing token certification...");
const MockToken = await ethers.getContractFactory("blockchain/contracts/test/MockERC20.sol:MockERC20");
const tokenA = await MockToken.deploy("Token A", "TKA");
await tokenA.waitForDeployment();
const tokenB = await MockToken.deploy("Token B", "TKB");
await tokenB.waitForDeployment();

const certIdA = ethers.id("cert-a");
const certIdB = ethers.id("cert-b");
await (await mockCert.addValidCert(certIdA)).wait();
await (await mockCert.addValidCert(certIdB)).wait();
await (await factory.addCertifiedToken(await tokenA.getAddress(), certIdA)).wait();
await (await factory.addCertifiedToken(await tokenB.getAddress(), certIdB)).wait();
console.log("✓ Tokens certified\n");

// 9. Create pool
console.log("9. Creating liquidity pool...");
await (await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress())).wait();
const token0 = await tokenA.getAddress() < await tokenB.getAddress() 
  ? await tokenA.getAddress() 
  : await tokenB.getAddress();
const token1 = await tokenA.getAddress() < await tokenB.getAddress()
  ? await tokenB.getAddress()
  : await tokenA.getAddress();
const poolAddr = await factory.getPair(token0, token1);
assert.notEqual(poolAddr, ethers.ZeroAddress);
console.log(`✓ Pool created at ${poolAddr}\n`);

// 10. Add liquidity
console.log("10. Adding liquidity...");
await (await tokenA.mint(user1.address, ethers.parseEther("10000"))).wait();
await (await tokenB.mint(user1.address, ethers.parseEther("10000"))).wait();
await (await tokenA.connect(user1).approve(await router.getAddress(), ethers.MaxUint256)).wait();
await (await tokenB.connect(user1).approve(await router.getAddress(), ethers.MaxUint256)).wait();

const deadline = Math.floor(Date.now() / 1000) + 3600;
await (await router.connect(user1).addLiquidity(
  await tokenA.getAddress(),
  await tokenB.getAddress(),
  ethers.parseEther("1000"),
  ethers.parseEther("1000"),
  0,
  0,
  user1.address,
  deadline
)).wait();
console.log("✓ Liquidity added\n");

// 11. Test swap
console.log("11. Testing swap...");
const balanceBefore = await tokenB.balanceOf(user1.address);
const path = [await tokenA.getAddress(), await tokenB.getAddress()];
await (await router.connect(user1).swap(
  ethers.parseEther("100"),
  0,
  path,
  user1.address,
  deadline
)).wait();
const balanceAfter = await tokenB.balanceOf(user1.address);
assert(balanceAfter > balanceBefore);
console.log(`✓ Swap executed (received ${ethers.formatEther(balanceAfter - balanceBefore)} Token B)\n`);

// 12. Test farming
console.log("12. Testing farming...");
const pool = await ethers.getContractAt("CafeSwapPool", poolAddr);
const lpBalance = await pool.balanceOf(user1.address);

const GOVERNANCE_ROLE = await farm.GOVERNANCE_ROLE();
await (await farm.grantRole(GOVERNANCE_ROLE, owner.address)).wait();
await (await farm.addPool(poolAddr, 100, false)).wait();
await (await pool.connect(user1).approve(await farm.getAddress(), lpBalance)).wait();
await (await farm.connect(user1).stake(0, lpBalance)).wait();
console.log("✓ LP tokens staked\n");

// Wait and harvest
console.log("13. Testing reward harvest...");
await ethers.provider.send("evm_increaseTime", [100]);
await ethers.provider.send("evm_mine");

const pending = await farm.pendingCafe(0, user1.address);
await (await farm.connect(user1).harvest(0)).wait();
const cafeBalance = await cafe.balanceOf(user1.address);
assert(cafeBalance > 0);
console.log(`✓ Harvested ${ethers.formatEther(cafeBalance)} CAFE tokens\n`);

// 14. Test governance proposal creation
console.log("14. Testing governance...");
await (await cafe.grantRole(MINTER_ROLE, owner.address)).wait();
await (await cafe.mint(user2.address, ethers.parseEther("20000000"))).wait();
await (await cafe.connect(user2).delegate(user2.address)).wait();
await ethers.provider.send("evm_mine");

await (await farm.grantRole(GOVERNANCE_ROLE, await governance.getAddress())).wait();

const targets = [await farm.getAddress()];
const values = [0];
const calldatas = [farm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("2")])];
const tx = await governance.connect(user2).propose(targets, values, calldatas, "Increase rewards");
await tx.wait();
console.log("✓ Proposal created");

// Vote
await (await governance.connect(user2).vote(1, 1)).wait();
console.log("✓ Vote cast");

console.log("✓ Governance proposal and voting works\n");
console.log("Note: Full execution test would require mining ~50400 blocks + 48h timelock\n");

console.log("═══════════════════════════════════════");
console.log("✓ All CaféSwap tests passed!");
console.log("═══════════════════════════════════════");
console.log("\nDeployed contracts:");
console.log(`  CafeToken:       ${await cafe.getAddress()}`);
console.log(`  Factory:         ${await factory.getAddress()}`);
console.log(`  Router:          ${await router.getAddress()}`);
console.log(`  Farm:            ${await farm.getAddress()}`);
console.log(`  Governance:      ${await governance.getAddress()}`);
console.log(`  Pool (A-B):      ${poolAddr}`);
