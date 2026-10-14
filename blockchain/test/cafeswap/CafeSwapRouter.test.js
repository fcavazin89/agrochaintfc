import { expect } from "chai";
import hre from "hardhat";

describe("CafeSwapRouter (cafeswap)", function () {
  let ethers;
  let factory, router;
  let mockCertificacoes;
  let tokenA, tokenB, tokenC;
  let owner, user1;

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    const MockCertificacoes = await ethers.getContractFactory("MockAgroChainCertificacoes");
    mockCertificacoes = await MockCertificacoes.deploy();
    await mockCertificacoes.waitForDeployment();

    const Factory = await ethers.getContractFactory("CafeSwapFactory");
    factory = await Factory.deploy(await mockCertificacoes.getAddress());
    await factory.waitForDeployment();

    const Router = await ethers.getContractFactory("CafeSwapRouter");
    router = await Router.deploy(await factory.getAddress());
    await router.waitForDeployment();

    const MockToken = await ethers.getContractFactory("MockERC20");
    tokenA = await MockToken.deploy("Token A", "TKA");
    await tokenA.waitForDeployment();
    tokenB = await MockToken.deploy("Token B", "TKB");
    await tokenB.waitForDeployment();
    tokenC = await MockToken.deploy("Token C", "TKC");
    await tokenC.waitForDeployment();

    const certIdA = ethers.id("cert-a");
    const certIdB = ethers.id("cert-b");
    const certIdC = ethers.id("cert-c");
    await mockCertificacoes.addValidCert(certIdA);
    await mockCertificacoes.addValidCert(certIdB);
    await mockCertificacoes.addValidCert(certIdC);
    await factory.addCertifiedToken(await tokenA.getAddress(), certIdA);
    await factory.addCertifiedToken(await tokenB.getAddress(), certIdB);
    await factory.addCertifiedToken(await tokenC.getAddress(), certIdC);

    await tokenA.mint(user1.address, ethers.parseEther("10000"));
    await tokenB.mint(user1.address, ethers.parseEther("10000"));
    await tokenC.mint(user1.address, ethers.parseEther("10000"));

    const routerAddress = await router.getAddress();
    await tokenA.connect(user1).approve(routerAddress, ethers.MaxUint256);
    await tokenB.connect(user1).approve(routerAddress, ethers.MaxUint256);
    await tokenC.connect(user1).approve(routerAddress, ethers.MaxUint256);
  });

  // Helper
  async function addLiq(tA, tB, amtA, amtB, createPool = true) {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    return router.connect(user1).addLiquidity(
      await tA.getAddress(),
      await tB.getAddress(),
      amtA,
      amtB,
      0,
      0,
      user1.address,
      deadline,
      createPool
    );
  }

  describe("Add Liquidity", function () {
    it("Should add liquidity to new pool (createPoolIfNeeded=true)", async function () {
      await addLiq(tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));

      const [token0, token1] =
        (await tokenA.getAddress()) < (await tokenB.getAddress())
          ? [await tokenA.getAddress(), await tokenB.getAddress()]
          : [await tokenB.getAddress(), await tokenA.getAddress()];

      const poolAddress = await factory.getPair(token0, token1);
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should add liquidity to existing pool with optimal amounts", async function () {
      await addLiq(tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));

      // Second add with slightly different ratio - uses optimal amounts
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await router.connect(user1).addLiquidity(
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        ethers.parseEther("500"),
        ethers.parseEther("600"),
        ethers.parseEther("490"),
        ethers.parseEther("490"),
        user1.address,
        deadline,
        false  // pool already exists
      );
    });

    it("Should revert addLiquidity when pool absent and createPoolIfNeeded=false", async function () {
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        router.connect(user1).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("100"),
          ethers.parseEther("100"),
          0,
          0,
          user1.address,
          deadline,
          false
        )
      ).to.be.revertedWithCustomError(router, "InsufficientLiquidity");
    });

    it("Should revert on expired deadline", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600;
      await expect(
        router.connect(user1).addLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("1000"),
          ethers.parseEther("1000"),
          0,
          0,
          user1.address,
          expiredDeadline,
          true
        )
      ).to.be.revertedWithCustomError(router, "Expired");
    });
  });

  describe("Remove Liquidity", function () {
    let poolAddress;

    beforeEach(async function () {
      await addLiq(tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));

      const [token0, token1] =
        (await tokenA.getAddress()) < (await tokenB.getAddress())
          ? [await tokenA.getAddress(), await tokenB.getAddress()]
          : [await tokenB.getAddress(), await tokenA.getAddress()];

      poolAddress = await factory.getPair(token0, token1);
    });

    it("Should remove liquidity", async function () {
      const pool = await ethers.getContractAt("CafeSwapPool", poolAddress);
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
      const pool = await ethers.getContractAt("CafeSwapPool", poolAddress);
      const liquidity = await pool.balanceOf(user1.address);

      await pool.connect(user1).approve(await router.getAddress(), liquidity);

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      await expect(
        router.connect(user1).removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          liquidity,
          ethers.parseEther("10000"),
          ethers.parseEther("10000"),
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAmount");
    });
  });

  describe("Swap", function () {
    beforeEach(async function () {
      await addLiq(tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));
      await addLiq(tokenB, tokenC, ethers.parseEther("1000"), ethers.parseEther("1000"));
    });

    it("Should execute single-hop swap", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const user1TokenBBefore = await tokenB.balanceOf(user1.address);
      await router.connect(user1).swap(amountIn, 0, path, user1.address, deadline);
      const user1TokenBAfter = await tokenB.balanceOf(user1.address);

      expect(user1TokenBAfter).to.be.gt(user1TokenBBefore);
    });

    it("Should execute multi-hop swap", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress()
      ];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const user1TokenCBefore = await tokenC.balanceOf(user1.address);
      await router.connect(user1).swap(amountIn, 0, path, user1.address, deadline);
      const user1TokenCAfter = await tokenC.balanceOf(user1.address);

      expect(user1TokenCAfter).to.be.gt(user1TokenCBefore);
    });

    it("Should revert when output below minimum", async function () {
      const amountIn = ethers.parseEther("100");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        router.connect(user1).swap(
          amountIn,
          ethers.parseEther("1000"),
          path,
          user1.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });
  });

  describe("Quote Functions", function () {
    it("Should calculate quote correctly", async function () {
      const amountA = ethers.parseEther("100");
      const reserveA = ethers.parseEther("1000");
      const reserveB = ethers.parseEther("2000");

      const amountB = await router.quote(amountA, reserveA, reserveB);
      expect(amountB).to.equal(ethers.parseEther("200"));
    });

    it("Should calculate amountOut with fee", async function () {
      const amountIn = ethers.parseEther("100");
      const reserveIn = ethers.parseEther("1000");
      const reserveOut = ethers.parseEther("1000");

      const amountOut = await router.getAmountOut(amountIn, reserveIn, reserveOut);
      expect(amountOut).to.be.closeTo(ethers.parseEther("90.66"), ethers.parseEther("1"));
    });
  });
});
