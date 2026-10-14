import { expect } from "chai";
import hre from "hardhat";

describe("CafeSwapPool (cafeswap)", function () {
  let ethers;
  let factory, pool;
  let mockCertificacoes;
  let tokenA, tokenB;
  let owner, user1, user2;

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    const MockCertificacoes = await ethers.getContractFactory("MockAgroChainCertificacoes");
    mockCertificacoes = await MockCertificacoes.deploy();
    await mockCertificacoes.waitForDeployment();

    const Factory = await ethers.getContractFactory("CafeSwapFactory");
    factory = await Factory.deploy(await mockCertificacoes.getAddress());
    await factory.waitForDeployment();

    const MockToken = await ethers.getContractFactory("MockERC20");
    tokenA = await MockToken.deploy("Token A", "TKA");
    await tokenA.waitForDeployment();
    tokenB = await MockToken.deploy("Token B", "TKB");
    await tokenB.waitForDeployment();

    const certIdA = ethers.id("cert-a");
    const certIdB = ethers.id("cert-b");
    await mockCertificacoes.addValidCert(certIdA);
    await mockCertificacoes.addValidCert(certIdB);
    await factory.addCertifiedToken(await tokenA.getAddress(), certIdA);
    await factory.addCertifiedToken(await tokenB.getAddress(), certIdB);

    await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress());

    const [token0Addr, token1Addr] =
      (await tokenA.getAddress()) < (await tokenB.getAddress())
        ? [await tokenA.getAddress(), await tokenB.getAddress()]
        : [await tokenB.getAddress(), await tokenA.getAddress()];

    const poolAddress = await factory.getPair(token0Addr, token1Addr);
    pool = await ethers.getContractAt("CafeSwapPool", poolAddress);

    // Mint tokens to user1 and user2
    await tokenA.mint(user1.address, ethers.parseEther("10000"));
    await tokenB.mint(user1.address, ethers.parseEther("10000"));
    await tokenA.mint(user2.address, ethers.parseEther("10000"));
    await tokenB.mint(user2.address, ethers.parseEther("10000"));
  });

  describe("Liquidity - First Mint", function () {
    it("Should burn MINIMUM_LIQUIDITY on first mint", async function () {
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      await tokenA.connect(user1).transfer(await pool.getAddress(), amount0);
      await tokenB.connect(user1).transfer(await pool.getAddress(), amount1);

      await pool.mint(user1.address);

      const MINIMUM_LIQUIDITY = await pool.MINIMUM_LIQUIDITY();
      const totalSupply = await pool.totalSupply();

      expect(totalSupply).to.be.gt(MINIMUM_LIQUIDITY);
      expect(await pool.balanceOf(ethers.ZeroAddress)).to.equal(MINIMUM_LIQUIDITY);
    });
  });

  describe("Liquidity - Subsequent Mints", function () {
    beforeEach(async function () {
      await tokenA.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await pool.mint(user1.address);
    });

    it("Should mint proportional LP tokens", async function () {
      const [reserve0Before, reserve1Before] = await pool.getReserves();
      const totalSupplyBefore = await pool.totalSupply();

      const amount0 = ethers.parseEther("500");
      const amount1 = ethers.parseEther("500");

      await tokenA.connect(user1).transfer(await pool.getAddress(), amount0);
      await tokenB.connect(user1).transfer(await pool.getAddress(), amount1);

      const user1BalanceBefore = await pool.balanceOf(user1.address);
      await pool.mint(user1.address);
      const user1BalanceAfter = await pool.balanceOf(user1.address);

      const liquidityMinted = user1BalanceAfter - user1BalanceBefore;
      const expectedLiquidity = (amount0 * totalSupplyBefore) / reserve0Before;

      expect(liquidityMinted).to.be.closeTo(expectedLiquidity, ethers.parseEther("0.01"));
    });
  });

  describe("Liquidity - Burn", function () {
    beforeEach(async function () {
      await tokenA.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await pool.mint(user1.address);
    });

    it("Should return proportional token amounts", async function () {
      const liquidity = await pool.balanceOf(user1.address);
      const [reserve0, reserve1] = await pool.getReserves();
      const totalSupply = await pool.totalSupply();

      await pool.connect(user1).transfer(await pool.getAddress(), liquidity);

      const user1Token0Before = await tokenA.balanceOf(user1.address);
      const user1Token1Before = await tokenB.balanceOf(user1.address);

      await pool.burn(user1.address);

      const amount0Received = (await tokenA.balanceOf(user1.address)) - user1Token0Before;
      const amount1Received = (await tokenB.balanceOf(user1.address)) - user1Token1Before;

      const expectedAmount0 = (liquidity * reserve0) / totalSupply;
      const expectedAmount1 = (liquidity * reserve1) / totalSupply;

      expect(amount0Received).to.be.closeTo(expectedAmount0, ethers.parseEther("0.01"));
      expect(amount1Received).to.be.closeTo(expectedAmount1, ethers.parseEther("0.01"));
    });
  });

  describe("Swaps", function () {
    beforeEach(async function () {
      await tokenA.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await pool.mint(user1.address);
    });

    it("Should execute swap and maintain k-invariant", async function () {
      const [reserve0Before, reserve1Before] = await pool.getReserves();
      const kBefore = reserve0Before * reserve1Before;

      const swapAmount = ethers.parseEther("100");
      await tokenA.connect(user1).transfer(await pool.getAddress(), swapAmount);

      const amountInWithFee = (swapAmount * 997n) / 1000n;
      const amountOut = (amountInWithFee * reserve1Before) / (reserve0Before + amountInWithFee);

      await pool.swap(0, amountOut, user1.address, "0x");

      const [reserve0After, reserve1After] = await pool.getReserves();
      const kAfter = reserve0After * reserve1After;

      expect(kAfter).to.be.gte(kBefore);
    });

    it("Should apply 0.3% fee", async function () {
      const [reserve0, reserve1] = await pool.getReserves();
      const swapAmount = ethers.parseEther("100");

      await tokenA.connect(user1).transfer(await pool.getAddress(), swapAmount);

      const amountInWithFee = (swapAmount * 997n) / 1000n;
      const expectedOut = (amountInWithFee * reserve1) / (reserve0 + amountInWithFee);

      const user1Token1Before = await tokenB.balanceOf(user1.address);
      await pool.swap(0, expectedOut, user1.address, "0x");
      const user1Token1After = await tokenB.balanceOf(user1.address);

      expect(user1Token1After - user1Token1Before).to.equal(expectedOut);
    });
  });

  describe("Sync", function () {
    it("Should update reserves to match balances", async function () {
      const amount0 = ethers.parseEther("1000");
      const amount1 = ethers.parseEther("1000");

      await tokenA.mint(await pool.getAddress(), amount0);
      await tokenB.mint(await pool.getAddress(), amount1);

      await pool.sync();

      const [reserve0, reserve1] = await pool.getReserves();
      expect(reserve0).to.equal(amount0);
      expect(reserve1).to.equal(amount1);
    });
  });

  describe("TWAP (getPriceCumulatives)", function () {
    it("Should return cumulative prices via getPriceCumulatives", async function () {
      await tokenA.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await tokenB.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("1000"));
      await pool.mint(user1.address);

      const [price0, price1] = await pool.getPriceCumulatives(3600);
      expect(price0).to.be.gte(0);
      expect(price1).to.be.gte(0);
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow feeToSetter to withdraw stuck tokens", async function () {
      const MockToken = await ethers.getContractFactory("MockERC20");
      const stuckToken = await MockToken.deploy("Stuck", "STK");
      await stuckToken.waitForDeployment();

      const stuckAmount = ethers.parseEther("100");
      await stuckToken.mint(await pool.getAddress(), stuckAmount);

      const ownerBefore = await stuckToken.balanceOf(owner.address);
      await pool.emergencyWithdraw(await stuckToken.getAddress(), owner.address);
      const ownerAfter = await stuckToken.balanceOf(owner.address);

      expect(ownerAfter - ownerBefore).to.equal(stuckAmount);
    });

    it("Should revert when trying to withdraw pool tokens", async function () {
      // Add liquidity first so tokenA is a pool token
      await tokenA.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("100"));
      await tokenB.connect(user1).transfer(await pool.getAddress(), ethers.parseEther("100"));
      await pool.mint(user1.address);

      await expect(
        pool.emergencyWithdraw(await tokenA.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(pool, "Forbidden");
    });
  });
});
