import { expect } from "chai";
import hre from "hardhat";

describe("CafeFarm", function () {
  let cafe, farm;
  let lpToken1, lpToken2;
  let owner, user1, user2;
  
  beforeEach(async function () {
    [owner, user1, user2] = await hre.ethers.getSigners();
    
    // Deploy CAFE token
    const CafeToken = await hre.ethers.getContractFactory("CafeToken");
    cafe = await CafeToken.deploy();
    await cafe.waitForDeployment();
    
    // Deploy farm with 1 CAFE per second
    const Farm = await hre.ethers.getContractFactory("CafeFarm");
    farm = await Farm.deploy(await cafe.getAddress(), hre.ethers.parseEther("1"));
    await farm.waitForDeployment();
    
    // Grant minter role to farm
    const MINTER_ROLE = await cafe.MINTER_ROLE();
    await cafe.grantRole(MINTER_ROLE, await farm.getAddress());
    
    // Deploy mock LP tokens
    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    lpToken1 = await MockToken.deploy("LP Token 1", "LP1");
    await lpToken1.waitForDeployment();
    
    lpToken2 = await MockToken.deploy("LP Token 2", "LP2");
    await lpToken2.waitForDeployment();
    
    // Transfer LP tokens to users
    await lpToken1.transfer(user1.address, hre.ethers.parseEther("1000"));
    await lpToken1.transfer(user2.address, hre.ethers.parseEther("1000"));
    await lpToken2.transfer(user1.address, hre.ethers.parseEther("1000"));
    
    // Approve farm
    await lpToken1.connect(user1).approve(await farm.getAddress(), hre.ethers.MaxUint256);
    await lpToken1.connect(user2).approve(await farm.getAddress(), hre.ethers.MaxUint256);
    await lpToken2.connect(user1).approve(await farm.getAddress(), hre.ethers.MaxUint256);
  });
  
  describe("Pool Management", function () {
    it("Should add pool", async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      
      expect(await farm.poolLength()).to.equal(1);
      expect(await farm.totalAllocPoint()).to.equal(100);
    });
    
    it("Should update allocation points", async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.setAllocPoint(0, 200, false);
      
      expect(await farm.totalAllocPoint()).to.equal(200);
    });
    
    it("Should revert when non-governance tries to add pool", async function () {
      await expect(
        farm.connect(user1).addPool(await lpToken1.getAddress(), 100, false)
      ).to.be.revertedWithCustomError(farm, "OnlyGovernance");
    });
    
    it("Should enforce MAX_POOLS limit", async function () {
      // Add 50 pools
      for (let i = 0; i < 50; i++) {
        const MockToken = await hre.ethers.getContractFactory("MockERC20");
        const token = await MockToken.deploy(`LP${i}`, `LP${i}`);
        await token.waitForDeployment();
        await farm.addPool(await token.getAddress(), 10, false);
      }
      
      expect(await farm.poolLength()).to.equal(50);
      
      const MockToken = await hre.ethers.getContractFactory("MockERC20");
      const extraToken = await MockToken.deploy("Extra", "EXT");
      await extraToken.waitForDeployment();
      
      await expect(
        farm.addPool(await extraToken.getAddress(), 10, false)
      ).to.be.revertedWithCustomError(farm, "MaxPoolsReached");
    });
  });
  
  describe("Staking - Reward Debt Order", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
    });
    
    it("CRITICAL: Should set reward debt AFTER amount update", async function () {
      // User stakes at T0
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
      
      // Wait some time
      await hre.network.provider.send("hardhat_mine", ["0xa"]); // Mine 10 blocks
      await hre.network.provider.send("evm_increaseTime", [100]);
      
      // Check pending rewards
      const pendingBefore = await farm.pendingCafe(0, user1.address);
      expect(pendingBefore).to.be.gt(0);
      
      // User stakes more
      await farm.connect(user1).stake(0, hre.ethers.parseEther("50"));
      
      // Pending should be 0 now (rewards were harvested)
      const pendingAfter = await farm.pendingCafe(0, user1.address);
      expect(pendingAfter).to.equal(0);
      
      // User should have received CAFE rewards
      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pendingBefore, hre.ethers.parseEther("10"));
    });
    
    it("Should accumulate rewards correctly with multiple stakes", async function () {
      // First stake
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
      
      // Wait
      await hre.network.provider.send("evm_increaseTime", [10]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      const pending1 = await farm.pendingCafe(0, user1.address);
      
      // Second stake (should harvest first)
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
      
      const cafeAfterSecondStake = await cafe.balanceOf(user1.address);
      expect(cafeAfterSecondStake).to.be.closeTo(pending1, hre.ethers.parseEther("10"));
      
      // Wait again
      await hre.network.provider.send("evm_increaseTime", [10]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      // Pending should accumulate on new amount (200)
      const pending2 = await farm.pendingCafe(0, user1.address);
      expect(pending2).to.be.gt(0);
    });
  });
  
  describe("Harvesting", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
    });
    
    it("Should mint CAFE on harvest", async function () {
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      const pending = await farm.pendingCafe(0, user1.address);
      
      await farm.connect(user1).harvest(0);
      
      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pending, hre.ethers.parseEther("10"));
    });
    
    it("Should update reward debt after harvest", async function () {
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      await farm.connect(user1).harvest(0);
      
      const pendingAfter = await farm.pendingCafe(0, user1.address);
      expect(pendingAfter).to.equal(0);
    });
  });
  
  describe("Unstaking", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
    });
    
    it("Should auto-harvest on unstake", async function () {
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      const pending = await farm.pendingCafe(0, user1.address);
      
      await farm.connect(user1).unstake(0, hre.ethers.parseEther("50"));
      
      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pending, hre.ethers.parseEther("10"));
    });
    
    it("Should return LP tokens", async function () {
      const lpBefore = await lpToken1.balanceOf(user1.address);
      
      await farm.connect(user1).unstake(0, hre.ethers.parseEther("50"));
      
      const lpAfter = await lpToken1.balanceOf(user1.address);
      expect(lpAfter - lpBefore).to.equal(hre.ethers.parseEther("50"));
    });
    
    it("Should revert when unstaking more than staked", async function () {
      await expect(
        farm.connect(user1).unstake(0, hre.ethers.parseEther("200"))
      ).to.be.revertedWithCustomError(farm, "InsufficientBalance");
    });
  });
  
  describe("Emergency Withdraw", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
    });
    
    it("Should withdraw without rewards", async function () {
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      const lpBefore = await lpToken1.balanceOf(user1.address);
      const cafeBefore = await cafe.balanceOf(user1.address);
      
      await farm.connect(user1).emergencyWithdraw(0);
      
      const lpAfter = await lpToken1.balanceOf(user1.address);
      const cafeAfter = await cafe.balanceOf(user1.address);
      
      expect(lpAfter - lpBefore).to.equal(hre.ethers.parseEther("100"));
      expect(cafeAfter).to.equal(cafeBefore); // No rewards
    });
  });
  
  describe("Multiple Pools", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 70, false);
      await farm.addPool(await lpToken2.getAddress(), 30, false);
    });
    
    it("Should distribute rewards proportionally", async function () {
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
      await farm.connect(user1).stake(1, hre.ethers.parseEther("100"));
      
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      const pending0 = await farm.pendingCafe(0, user1.address);
      const pending1 = await farm.pendingCafe(1, user1.address);
      
      // Pool 0 has 70% allocation, pool 1 has 30%
      expect(pending0).to.be.gt(pending1);
      
      const ratio = Number(pending0) / Number(pending1);
      expect(ratio).to.be.closeTo(70 / 30, 0.5);
    });
  });
  
  describe("Reward Rate", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
    });
    
    it("Should update reward rate", async function () {
      await farm.setRewardRate(hre.ethers.parseEther("2"));
      expect(await farm.cafePerSecond()).to.equal(hre.ethers.parseEther("2"));
    });
  });
  
  describe("PendingCafe View", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, hre.ethers.parseEther("100"));
    });
    
    it("Should match actual harvest amount", async function () {
      await hre.network.provider.send("evm_increaseTime", [100]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      const pending = await farm.pendingCafe(0, user1.address);
      
      await farm.connect(user1).harvest(0);
      
      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pending, hre.ethers.parseEther("10"));
    });
  });
});
