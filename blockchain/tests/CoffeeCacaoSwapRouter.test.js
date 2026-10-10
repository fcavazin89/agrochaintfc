import { expect } from "chai";
import hre from "hardhat";

describe("CoffeeCacaoSwapRouter", function () {
  let ethers;
  let owner, alice, bob;
  let factory, router;
  let tokenA, tokenB, tokenC; // certified tokens (two coffee + one cacao)
  let uncertifiedToken;
  let poolAB, poolBC;

  const COFFEE_BATCH_ID = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const CACAO_BATCH_ID  = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";

  // Return a deadline 600 s in the future
  async function futureDeadline() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp + 600;
  }

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const t1 = await MockERC20.deploy("Coffee Arabica", "CARAB");
    const t2 = await MockERC20.deploy("Coffee Robusta", "CROB");
    const t3 = await MockERC20.deploy("Cacao Trinitario", "CTRIN");
    const t4 = await MockERC20.deploy("Uncertified", "UCT");
    uncertifiedToken = t4;

    // Deploy mock traceability
    const MockTraceability = await ethers.getContractFactory("MockTraceability");
    const mockTrace = await MockTraceability.deploy();
    await mockTrace.setBatchCertification(COFFEE_BATCH_ID, true, true);
    await mockTrace.setBatchCertification(CACAO_BATCH_ID, false, true);

    // Deploy factory
    const CoffeeCacaoSwapFactory = await ethers.getContractFactory("CoffeeCacaoSwapFactory");
    factory = await CoffeeCacaoSwapFactory.deploy(await mockTrace.getAddress());

    // Certify tokens
    await factory.addCertifiedCoffeeToken(await t1.getAddress(), COFFEE_BATCH_ID);
    await factory.addCertifiedCoffeeToken(await t2.getAddress(), COFFEE_BATCH_ID);
    await factory.addCertifiedCacaoToken(await t3.getAddress(), CACAO_BATCH_ID);

    // Order tokens canonically to avoid routing surprises in tests
    const addrs = [
      { t: t1, a: await t1.getAddress() },
      { t: t2, a: await t2.getAddress() },
      { t: t3, a: await t3.getAddress() },
    ].sort((x, y) => BigInt(x.a) < BigInt(y.a) ? -1 : 1);

    tokenA = addrs[0].t;
    tokenB = addrs[1].t;
    tokenC = addrs[2].t;

    // Deploy router
    const CoffeeCacaoSwapRouter = await ethers.getContractFactory("CoffeeCacaoSwapRouter");
    router = await CoffeeCacaoSwapRouter.deploy(await factory.getAddress());

    // Mint tokens to alice and bob
    const BIG = ethers.parseEther("1000000");
    for (const tk of [tokenA, tokenB, tokenC]) {
      await tk.mint(alice.address, BIG);
      await tk.mint(bob.address, BIG);
    }
    await t4.mint(alice.address, BIG);
    await t4.mint(bob.address, BIG);

    // Approve router for all tokens
    const routerAddr = await router.getAddress();
    const APPROVE = ethers.MaxUint256;
    for (const tk of [tokenA, tokenB, tokenC, t4]) {
      await tk.connect(alice).approve(routerAddr, APPROVE);
      await tk.connect(bob).approve(routerAddr, APPROVE);
    }
  });

  // Helper: add liquidity to a pair via the router
  async function addLiquidity(caller, tA, tB, amtA, amtB) {
    const deadline = await futureDeadline();
    return router.connect(caller).addLiquidity(
      await tA.getAddress(),
      await tB.getAddress(),
      amtA,
      amtB,
      0n,
      0n,
      caller.address,
      deadline
    );
  }

  // Helper: get pool address for pair
  async function getPool(tA, tB) {
    return factory.getPool(await tA.getAddress(), await tB.getAddress());
  }

  describe("addLiquidity", function () {
    it("creates pool on first addLiquidity and mints LP tokens", async function () {
      const a = ethers.parseEther("100");
      const b = ethers.parseEther("200");
      const tx = await addLiquidity(alice, tokenA, tokenB, a, b);
      const receipt = await tx.wait();

      const poolAddr = await getPool(tokenA, tokenB);
      expect(poolAddr).to.not.equal(ethers.ZeroAddress);

      // LP tokens minted to alice
      const CoffeeCacaoSwapPool = await ethers.getContractFactory("CoffeeCacaoSwapPool");
      const poolContract = CoffeeCacaoSwapPool.attach(poolAddr);
      expect(await poolContract.balanceOf(alice.address)).to.be.gt(0n);
    });

    it("reverts with TokenNotCertified for uncertified tokenA", async function () {
      const deadline = await futureDeadline();
      await expect(
        router.connect(alice).addLiquidity(
          await uncertifiedToken.getAddress(),
          await tokenB.getAddress(),
          ethers.parseEther("1"),
          ethers.parseEther("1"),
          0n, 0n,
          alice.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "TokenNotCertified");
    });

    it("reverts with TokenNotCertified for uncertified tokenB", async function () {
      const deadline = await futureDeadline();
      await expect(
        router.connect(alice).addLiquidity(
          await tokenA.getAddress(),
          await uncertifiedToken.getAddress(),
          ethers.parseEther("1"),
          ethers.parseEther("1"),
          0n, 0n,
          alice.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "TokenNotCertified");
    });

    it("mints proportional LP on second addLiquidity", async function () {
      const a = ethers.parseEther("100");
      const b = ethers.parseEther("200");
      await addLiquidity(alice, tokenA, tokenB, a, b);

      const poolAddr = await getPool(tokenA, tokenB);
      const CoffeeCacaoSwapPool = await ethers.getContractFactory("CoffeeCacaoSwapPool");
      const poolContract = CoffeeCacaoSwapPool.attach(poolAddr);

      const lpBefore = await poolContract.balanceOf(bob.address);
      await addLiquidity(bob, tokenA, tokenB, a / 2n, b / 2n);
      const lpAfter = await poolContract.balanceOf(bob.address);
      expect(lpAfter - lpBefore).to.be.gt(0n);
    });
  });

  describe("removeLiquidity", function () {
    it("burns LP tokens and returns proportional amounts", async function () {
      const a = ethers.parseEther("100");
      const b = ethers.parseEther("200");
      await addLiquidity(alice, tokenA, tokenB, a, b);

      const poolAddr = await getPool(tokenA, tokenB);
      const CoffeeCacaoSwapPool = await ethers.getContractFactory("CoffeeCacaoSwapPool");
      const poolContract = CoffeeCacaoSwapPool.attach(poolAddr);

      const lp = await poolContract.balanceOf(alice.address);
      await poolContract.connect(alice).approve(await router.getAddress(), lp);

      const deadline = await futureDeadline();
      const tAAddr = await tokenA.getAddress();
      const tBAddr = await tokenB.getAddress();

      const tABefore = await tokenA.balanceOf(alice.address);
      const tBBefore = await tokenB.balanceOf(alice.address);

      await router.connect(alice).removeLiquidity(
        tAAddr, tBAddr, lp, 0n, 0n, alice.address, deadline
      );

      const tAAfter = await tokenA.balanceOf(alice.address);
      const tBAfter = await tokenB.balanceOf(alice.address);
      expect(tAAfter - tABefore).to.be.gt(0n);
      expect(tBAfter - tBBefore).to.be.gt(0n);
    });

    it("reverts when returned amount is below amountAMin", async function () {
      const a = ethers.parseEther("100");
      const b = ethers.parseEther("200");
      await addLiquidity(alice, tokenA, tokenB, a, b);

      const poolAddr = await getPool(tokenA, tokenB);
      const CoffeeCacaoSwapPool = await ethers.getContractFactory("CoffeeCacaoSwapPool");
      const poolContract = CoffeeCacaoSwapPool.attach(poolAddr);

      const lp = await poolContract.balanceOf(alice.address);
      await poolContract.connect(alice).approve(await router.getAddress(), lp);

      const deadline = await futureDeadline();
      // Demand way more than what will be returned
      await expect(
        router.connect(alice).removeLiquidity(
          await tokenA.getAddress(),
          await tokenB.getAddress(),
          lp,
          ethers.parseEther("99999"), // impossible amountAMin
          0n,
          alice.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientAAmount");
    });
  });

  describe("swapExactTokensForTokens — single hop", function () {
    beforeEach(async function () {
      // Seed A/B pool with 1000:1000 liquidity
      await addLiquidity(alice, tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));
    });

    it("swaps exact input for output with 0.3% fee", async function () {
      const amountIn = ethers.parseEther("1");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const [, amountOutExpected] = await router.getAmountsOut(amountIn, path);

      const tBBefore = await tokenB.balanceOf(bob.address);
      const deadline = await futureDeadline();
      await router.connect(bob).swapExactTokensForTokens(
        amountIn,
        amountOutExpected,
        path,
        bob.address,
        deadline
      );
      const tBAfter = await tokenB.balanceOf(bob.address);
      expect(tBAfter - tBBefore).to.equal(amountOutExpected);
    });

    it("reverts with InsufficientOutputAmount when amountOutMin not met", async function () {
      const amountIn = ethers.parseEther("1");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = await futureDeadline();

      await expect(
        router.connect(bob).swapExactTokensForTokens(
          amountIn,
          ethers.parseEther("9999"), // way too high
          path,
          bob.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "InsufficientOutputAmount");
    });

    it("reverts with Expired when deadline is in the past", async function () {
      const block = await ethers.provider.getBlock("latest");
      const pastDeadline = block.timestamp - 1;
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      await expect(
        router.connect(bob).swapExactTokensForTokens(
          ethers.parseEther("1"),
          0n,
          path,
          bob.address,
          pastDeadline
        )
      ).to.be.revertedWithCustomError(router, "Expired");
    });

    it("reverts with TokenNotCertified when path contains uncertified token", async function () {
      const deadline = await futureDeadline();
      const path = [await tokenA.getAddress(), await uncertifiedToken.getAddress()];
      await expect(
        router.connect(bob).swapExactTokensForTokens(
          ethers.parseEther("1"),
          0n,
          path,
          bob.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "TokenNotCertified");
    });
  });

  describe("swapExactTokensForTokens — multi-hop (A → B → C)", function () {
    beforeEach(async function () {
      // Seed A/B and B/C pools
      await addLiquidity(alice, tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));
      await addLiquidity(alice, tokenB, tokenC, ethers.parseEther("1000"), ethers.parseEther("1000"));
    });

    it("executes multi-hop swap through two pools", async function () {
      const amountIn = ethers.parseEther("1");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
      ];

      const amounts = await router.getAmountsOut(amountIn, path);
      const amountOutExpected = amounts[amounts.length - 1];

      const tCBefore = await tokenC.balanceOf(bob.address);
      const deadline = await futureDeadline();
      await router.connect(bob).swapExactTokensForTokens(
        amountIn,
        amountOutExpected,
        path,
        bob.address,
        deadline
      );
      const tCAfter = await tokenC.balanceOf(bob.address);
      expect(tCAfter - tCBefore).to.equal(amountOutExpected);
    });

    it("getAmountsOut matches actual swap execution within 1 wei", async function () {
      const amountIn = ethers.parseEther("2");
      const path = [
        await tokenA.getAddress(),
        await tokenB.getAddress(),
        await tokenC.getAddress(),
      ];
      const amounts = await router.getAmountsOut(amountIn, path);
      const expected = amounts[amounts.length - 1];

      const tCBefore = await tokenC.balanceOf(bob.address);
      const deadline = await futureDeadline();
      await router.connect(bob).swapExactTokensForTokens(
        amountIn,
        0n,
        path,
        bob.address,
        deadline
      );
      const tCAfter = await tokenC.balanceOf(bob.address);
      const diff = tCAfter - tCBefore > expected
        ? tCAfter - tCBefore - expected
        : expected - (tCAfter - tCBefore);
      expect(diff).to.be.lte(1n);
    });
  });

  describe("swapTokensForExactTokens", function () {
    beforeEach(async function () {
      await addLiquidity(alice, tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));
    });

    it("receives exact output amount with correct input", async function () {
      const amountOut = ethers.parseEther("0.5");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const amounts = await router.getAmountsIn(amountOut, path);
      const amountInMax = amounts[0];

      const tBBefore = await tokenB.balanceOf(bob.address);
      const deadline = await futureDeadline();
      await router.connect(bob).swapTokensForExactTokens(
        amountOut,
        amountInMax,
        path,
        bob.address,
        deadline
      );
      const tBAfter = await tokenB.balanceOf(bob.address);
      expect(tBAfter - tBBefore).to.equal(amountOut);
    });

    it("reverts with ExcessiveInputAmount when amountInMax too low", async function () {
      const amountOut = ethers.parseEther("1");
      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = await futureDeadline();
      await expect(
        router.connect(bob).swapTokensForExactTokens(
          amountOut,
          1n, // way too low
          path,
          bob.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "ExcessiveInputAmount");
    });
  });

  describe("pause / unpause", function () {
    it("owner can pause and unpause", async function () {
      await router.connect(owner).pause();
      expect(await router.paused()).to.be.true;
      await router.connect(owner).unpause();
      expect(await router.paused()).to.be.false;
    });

    it("swapExactTokensForTokens reverts when paused", async function () {
      await addLiquidity(alice, tokenA, tokenB, ethers.parseEther("1000"), ethers.parseEther("1000"));
      await router.connect(owner).pause();

      const path = [await tokenA.getAddress(), await tokenB.getAddress()];
      const deadline = await futureDeadline();
      await expect(
        router.connect(bob).swapExactTokensForTokens(
          ethers.parseEther("1"),
          0n,
          path,
          bob.address,
          deadline
        )
      ).to.be.revertedWithCustomError(router, "EnforcedPause");
    });

    it("only owner can pause", async function () {
      await expect(router.connect(alice).pause())
        .to.be.revertedWithCustomError(router, "OwnableUnauthorizedAccount");
    });
  });
});
