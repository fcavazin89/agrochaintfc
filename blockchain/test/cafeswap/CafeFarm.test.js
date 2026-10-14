import { expect } from "chai";
import hre from "hardhat";

describe("CafeFarm (cafeswap)", function () {
  let ethers;
  let cafe, farm;
  let lpToken1, lpToken2;
  let owner, user1, user2;

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const CafeToken = await ethers.getContractFactory("CafeToken");
    cafe = await CafeToken.deploy();
    await cafe.waitForDeployment();

    const Farm = await ethers.getContractFactory("CafeFarm");
    farm = await Farm.deploy(await cafe.getAddress(), ethers.parseEther("1"));
    await farm.waitForDeployment();

    const MINTER_ROLE = await cafe.MINTER_ROLE();
    await cafe.grantRole(MINTER_ROLE, await farm.getAddress());

    const MockToken = await ethers.getContractFactory("MockERC20");
    lpToken1 = await MockToken.deploy("LP Token 1", "LP1");
    await lpToken1.waitForDeployment();
    lpToken2 = await MockToken.deploy("LP Token 2", "LP2");
    await lpToken2.waitForDeployment();

    await lpToken1.mint(user1.address, ethers.parseEther("1000"));
    await lpToken1.mint(user2.address, ethers.parseEther("1000"));
    await lpToken2.mint(user1.address, ethers.parseEther("1000"));

    const farmAddr = await farm.getAddress();
    await lpToken1.connect(user1).approve(farmAddr, ethers.MaxUint256);
    await lpToken1.connect(user2).approve(farmAddr, ethers.MaxUint256);
    await lpToken2.connect(user1).approve(farmAddr, ethers.MaxUint256);
  });

  describe("Pool Management", function () {
    it("Should add pool", async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      expect(await farm.poolLength()).to.equal(1);
      expect(await farm.totalAllocPoint()).to.equal(100);
    });

    it("Should update allocation points (always updates all pools)", async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.setAllocPoint(0, 200);
      expect(await farm.totalAllocPoint()).to.equal(200);
    });

    it("Should revert when non-governance tries to add pool", async function () {
      await expect(
        farm.connect(user1).addPool(await lpToken1.getAddress(), 100, false)
      ).to.be.revertedWithCustomError(farm, "OnlyGovernance");
    });

    it("Should enforce MAX_POOLS limit", async function () {
      const MockToken = await ethers.getContractFactory("MockERC20");
      for (let i = 0; i < 50; i++) {
        const token = await MockToken.deploy(`LP${i}`, `LP${i}`);
        await token.waitForDeployment();
        await farm.addPool(await token.getAddress(), 10, false);
      }
      expect(await farm.poolLength()).to.equal(50);

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
      await farm.connect(user1).stake(0, ethers.parseEther("100"));

      await ethers.provider.send("hardhat_mine", ["0xa"]);
      await ethers.provider.send("evm_increaseTime", [100]);

      const pendingBefore = await farm.pendingCafe(0, user1.address);
      expect(pendingBefore).to.be.gt(0);

      await farm.connect(user1).stake(0, ethers.parseEther("50"));

      const pendingAfter = await farm.pendingCafe(0, user1.address);
      expect(pendingAfter).to.equal(0);

      // After second stake, rewards up to that point were harvested
      const cafeBalance = await cafe.balanceOf(user1.address);
      // cafeBalance should be >= pendingBefore (one more second may have elapsed)
      expect(cafeBalance).to.be.gte(pendingBefore);
    });

    it("Should accumulate rewards correctly with multiple stakes", async function () {
      await farm.connect(user1).stake(0, ethers.parseEther("100"));

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const pending1 = await farm.pendingCafe(0, user1.address);

      await farm.connect(user1).stake(0, ethers.parseEther("100"));

      const cafeAfterSecondStake = await cafe.balanceOf(user1.address);
      expect(cafeAfterSecondStake).to.be.closeTo(pending1, ethers.parseEther("10"));

      await ethers.provider.send("evm_increaseTime", [10]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const pending2 = await farm.pendingCafe(0, user1.address);
      expect(pending2).to.be.gt(0);
    });
  });

  describe("Harvesting", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, ethers.parseEther("100"));
    });

    it("Should mint CAFE on harvest", async function () {
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const pending = await farm.pendingCafe(0, user1.address);
      await farm.connect(user1).harvest(0);

      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pending, ethers.parseEther("10"));
    });

    it("Should update reward debt after harvest", async function () {
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);
      await farm.connect(user1).harvest(0);

      const pendingAfter = await farm.pendingCafe(0, user1.address);
      expect(pendingAfter).to.equal(0);
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, ethers.parseEther("100"));
    });

    it("Should auto-harvest on unstake", async function () {
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const pending = await farm.pendingCafe(0, user1.address);
      await farm.connect(user1).unstake(0, ethers.parseEther("50"));

      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pending, ethers.parseEther("10"));
    });

    it("Should return LP tokens", async function () {
      const lpBefore = await lpToken1.balanceOf(user1.address);
      await farm.connect(user1).unstake(0, ethers.parseEther("50"));
      const lpAfter = await lpToken1.balanceOf(user1.address);
      expect(lpAfter - lpBefore).to.equal(ethers.parseEther("50"));
    });

    it("Should revert when unstaking more than staked", async function () {
      await expect(
        farm.connect(user1).unstake(0, ethers.parseEther("200"))
      ).to.be.revertedWithCustomError(farm, "InsufficientBalance");
    });
  });

  describe("Emergency Withdraw", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, ethers.parseEther("100"));
    });

    it("Should withdraw without rewards", async function () {
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const lpBefore = await lpToken1.balanceOf(user1.address);
      const cafeBefore = await cafe.balanceOf(user1.address);

      await farm.connect(user1).emergencyWithdraw(0);

      const lpAfter = await lpToken1.balanceOf(user1.address);
      const cafeAfter = await cafe.balanceOf(user1.address);

      expect(lpAfter - lpBefore).to.equal(ethers.parseEther("100"));
      expect(cafeAfter).to.equal(cafeBefore);
    });
  });

  describe("Multiple Pools", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 70, false);
      await farm.addPool(await lpToken2.getAddress(), 30, false);
    });

    it("Should distribute rewards proportionally", async function () {
      await farm.connect(user1).stake(0, ethers.parseEther("100"));
      await farm.connect(user1).stake(1, ethers.parseEther("100"));

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const pending0 = await farm.pendingCafe(0, user1.address);
      const pending1 = await farm.pendingCafe(1, user1.address);

      expect(pending0).to.be.gt(pending1);
      // Pool 0 has 70% allocation, pool 1 has 30% — ratio should be ~2.33
      // Use integer arithmetic: 7 * pending1 should be close to 3 * pending0
      const diff = pending0 * 3n > pending1 * 7n
        ? pending0 * 3n - pending1 * 7n
        : pending1 * 7n - pending0 * 3n;
      const tolerance = (pending1 * 7n) / 10n; // 10% tolerance
      expect(diff).to.be.lte(tolerance);
    });
  });

  describe("Reward Rate", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
    });

    it("Should update reward rate", async function () {
      await farm.setRewardRate(ethers.parseEther("2"));
      expect(await farm.cafePerSecond()).to.equal(ethers.parseEther("2"));
    });
  });

  describe("PendingCafe View", function () {
    beforeEach(async function () {
      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, ethers.parseEther("100"));
    });

    it("Should match actual harvest amount", async function () {
      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const pending = await farm.pendingCafe(0, user1.address);
      await farm.connect(user1).harvest(0);
      const cafeBalance = await cafe.balanceOf(user1.address);
      expect(cafeBalance).to.be.closeTo(pending, ethers.parseEther("10"));
    });
  });

  describe("Supply Cap Grace", function () {
    it("Should emit RewardSkipped and not revert when supply cap is hit", async function () {
      // Exhaust the supply cap
      const MINTER_ROLE = await cafe.MINTER_ROLE();
      await cafe.grantRole(MINTER_ROLE, owner.address);
      const maxSupply = await cafe.MAX_SUPPLY();
      const current = await cafe.totalSupply();
      await cafe.mint(owner.address, maxSupply - current);

      await farm.addPool(await lpToken1.getAddress(), 100, false);
      await farm.connect(user1).stake(0, ethers.parseEther("100"));

      await ethers.provider.send("evm_increaseTime", [100]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      // harvest should emit RewardSkipped instead of reverting
      const tx = await farm.connect(user1).harvest(0);
      const receipt = await tx.wait();

      const skipped = receipt.logs.find(
        log => log.fragment && log.fragment.name === "RewardSkipped"
      );
      expect(skipped).to.not.be.undefined;
    });
  });
});
