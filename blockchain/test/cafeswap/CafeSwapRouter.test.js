import { expect } from "chai";
import hre from "hardhat";

describe("CafeSwapRouter", function () {
  let factory, router;
  let mockCertificacoes;
  let tokenA, tokenB, tokenC;
  let owner, user1;
  
  beforeEach(async function () {
    [owner, user1] = await hre.ethers.getSigners();
    
    // Deploy contracts
    const MockCertificacoes = await hre.ethers.getContractFactory("MockAgroChainCertificacoes");
    mockCertificacoes = await MockCertificacoes.deploy();
    await mockCertificacoes.waitForDeployment();
    
    const Factory = await hre.ethers.getContractFactory("CafeSwapFactory");
    factory = await Factory.deploy(await mockCertificacoes.getAddress());
    await factory.waitForDeployment();
    
    const Router = await hre.ethers.getContractFactory("CafeSwapRouter");
    router = await Router.deploy(await factory.getAddress());
    await router.waitForDeployment();
    
    // Deploy tokens
    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    tokenA = await MockToken.deploy("Token A", "TKA");
    await tokenA.waitForDeployment();
    
    tokenB = await MockToken.deploy("Token B", "TKB");
    await tokenB.waitForDeployment();
    
    tokenC = await MockToken.deploy("Token C", "TKC");
    await tokenC.waitForDeployment();
    
    // Certify tokens
    const certIdA = hre.ethers.id("cert-a");
    const certIdB = hre.ethers.id("cert-b");
    const certIdC = hre.ethers.id("cert-c");
    await mockCertificacoes.addValidCert(certIdA);
    await mockCertificacoes.addValidCert(certIdB);
    await mockCertificacoes.addValidCert(certIdC);
    await factory.addCertifiedToken(await tokenA.getAddress(), certIdA);
    await factory.addCertifiedToken(await tokenB.getAddress(), certIdB);
    await factory.addCertifiedToken(await tokenC.getAddress(), certIdC);
    
    // Transfer tokens to user1
    await tokenA.transfer(user1.address, hre.ethers.parseEther("10000"));
    await tokenB.transfer(user1.address, hre.ethers.parseEther("10000"));
    await tokenC.transfer(user1.address, hre.ethers.parseEther("10000"));
    
    // Approve router
    await tokenA.connect(user1).approve(await router.getAddress(), hre.ethers.MaxUint256);
    await tokenB.connect(user1).approve(await router.getAddress(), hre.ethers.MaxUint256);
    await tokenC.connect(user1).approve(await router.getAddress(), hre.ethers.MaxUint256);
  });
  
  describe("Add Liquidity", function () {
    it("Should add liquidity to new pool", async function () {
      const amount0 = hre.ethers.parseEther("1000");
      const amount1 = hre.ethers.parseEther("1000");
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        amount0,
        amount1,
        0,
        0,
        user1.address,
        deadline
      );
      
      const token0 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenA.getAddress()
        : await tokenB.getAddress();
      const token1 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenB.getAddress()
        : await tokenA.getAddress();
      
      const poolAddress = await factory.getPair(token0, token1);
      expect(poolAddress).to.not.equal(hre.ethers.ZeroAddress);
    });
    
    it("Should add liquidity to existing pool with optimal amounts", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // First deposit
      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        hre.ethers.parseEther("1000"),
        hre.ethers.parseEther("1000"),
        0,
        0,
        user1.address,
        deadline
      );
      
      // Second deposit with different ratio
      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        hre.ethers.parseEther("500"),
        hre.ethers.parseEther("600"),
        hre.ethers.parseEther("490"),
        hre.ethers.parseEther("490"),
        user1.address,
        deadline
      );
      
      // Should succeed with optimal amounts
    });
    
    it("Should revert on expired deadline", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
      
      await expect(
        router.connect(user1).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          hre.ethers.parseEther("1000"),
          hre.ethers.parseEther("1000"),
          0,
          0,
          user1.address,
          expiredDeadline
        )
      ).to.be.revertedWithCustomError(router, "Expired");
    });
  });
  
  describe("Remove Liquidity", function () {
    let poolAddress;
    
    beforeEach(async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        hre.ethers.parseEther("1000"),
        hre.ethers.parseEther("1000"),
        0,
        0,
        user1.address,
        deadline
      );
      
      const token0 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenA.getAddress()
        : await tokenB.getAddress();
      const token1 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenB.getAddress()
        : await tokenA.getAddress();
      
      poolAddress = await factory.getPair(token0, token1);
    });
    
    it("Should remove liquidity", async function () {
      const pool = await hre.ethers.getContractAt("CafeSwapPool", poolAddress);
      const liquidity = await pool.balanceOf(user1.address);
      
      await pool.connect(user1).approve(await router.getAddress(), liquidity);
      
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await router.connect(user1).removeLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        liquidity,
        0,
        0,
        user1.address,
        deadline
      );
      
      expect(await pool.balanceOf(user1.address)).to.equal(0);
    });
    
    it("Should revert when output below minimum", async function () {
      const pool = await hre.ethers.getContractAt("CafeSwapPool", poolAddress);
      const liquidity = await pool.balanceOf(user1.address);
      
      await pool.connect(user1).approve(await router.getAddress(), liquidity);
      
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await expect(
        router.connect(user1).removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          liquidity,
          hre.ethers.parseEther("10000"), // Too high
          hre.ethers.parseEther("10000"), // Too high
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAmount");
    });
  });
  
  describe("Swap", function () {
    beforeEach(async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      // Create pools A-B and B-C
      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        hre.ethers.parseEther("1000"),
        hre.ethers.parseEther("1000"),
        0,
        0,
        user1.address,
        deadline
      );
      
      await router.connect(user1).addLiquidity(
        await tokenB.getAddress(),
        await tokenC.getAddress(),
        hre.ethers.parseEther("1000"),
        hre.ethers.parseEther("1000"),
        0,
        0,
        user1.address,
        deadline
      );
    });
    
    it("Should execute single-hop swap", async function () {
      const amountIn = hre.ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      const user1TokenBBefore = await tokenB.balanceOf(user1.address);
      
      await router.connect(user1).swap(
        amountIn,
        0,
        path,
        user1.address,
        deadline
      );
      
      const user1TokenBAfter = await tokenB.balanceOf(user1.address);
      expect(user1TokenBAfter).to.be.gt(user1TokenBBefore);
    });
    
    it("Should execute multi-hop swap", async function () {
      const amountIn = hre.ethers.parseEther("100");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      const user1TokenCBefore = await tokenC.balanceOf(user1.address);
      
      await router.connect(user1).swap(
        amountIn,
        0,
        path,
        user1.address,
        deadline
      );
      
      const user1TokenCAfter = await tokenC.balanceOf(user1.address);
      expect(user1TokenCAfter).to.be.gt(user1TokenCBefore);
    });
    
    it("Should revert when output below minimum", async function () {
      const amountIn = hre.ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      
      await expect(
        router.connect(user1).swap(
          amountIn,
          hre.ethers.parseEther("1000"), // Too high
          path,
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });
  });
  
  describe("Quote Functions", function () {
    it("Should calculate quote correctly", async function () {
      const amountA = hre.ethers.parseEther("100");
      const reserveA = hre.ethers.parseEther("1000");
      const reserveB = hre.ethers.parseEther("2000");
      
      const amountB = await router.quote(amountA, reserveA, reserveB);
      expect(amountB).to.equal(hre.ethers.parseEther("200"));
    });
    
    it("Should calculate amountOut with fee", async function () {
      const amountIn = hre.ethers.parseEther("100");
      const reserveIn = hre.ethers.parseEther("1000");
      const reserveOut = hre.ethers.parseEther("1000");
      
      const amountOut = await router.getAmountOut(amountIn, reserveIn, reserveOut);
      
      // With 0.3% fee: (100 * 997 * 1000) / (1000 * 1000 + 100 * 997) = ~90.66
      expect(amountOut).to.be.closeTo(
        hre.ethers.parseEther("90.66"),
        hre.ethers.parseEther("1")
      );
    });
  });
});
