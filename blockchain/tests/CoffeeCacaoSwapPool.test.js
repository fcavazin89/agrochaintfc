import { expect } from "chai";
import hre from "hardhat";

// Helper: compute floor sqrt
function sqrt(value) {
  if (value === 0n) return 0n;
  let z = value;
  let x = value / 2n + 1n;
  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }
  return z;
}

describe("CoffeeCacaoSwapPool", function () {
  let ethers;
  let owner, alice, bob;
  let coffee, cacao;
  let pool;

  const MINIMUM_LIQUIDITY = 1000n;

  // Convenience: get pool contract attached to a signer
  async function poolAs(signer) {
    const CoffeeCacaoSwapPool = await ethers.getContractFactory("CoffeeCacaoSwapPool");
    return CoffeeCacaoSwapPool.attach(await pool.getAddress()).connect(signer);
  }

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    coffee = await MockERC20.deploy("Coffee Token", "COFF");
    cacao = await MockERC20.deploy("Cacao Token", "CACAO");

    // Ensure canonical ordering: token0 < token1
    const coffeeAddr = await coffee.getAddress();
    const cacaoAddr = await cacao.getAddress();
    let token0Addr, token1Addr, token0Contract, token1Contract;
    if (BigInt(coffeeAddr) < BigInt(cacaoAddr)) {
      token0Addr = coffeeAddr;
      token1Addr = cacaoAddr;
      token0Contract = coffee;
      token1Contract = cacao;
    } else {
      token0Addr = cacaoAddr;
      token1Addr = coffeeAddr;
      token0Contract = cacao;
      token1Contract = coffee;
    }

    // Deploy pool directly (simulating what factory does via CREATE2)
    const CoffeeCacaoSwapPool = await ethers.getContractFactory("CoffeeCacaoSwapPool");
    pool = await CoffeeCacaoSwapPool.deploy(token0Addr, token1Addr);

    // Store canonical references as module-level vars for tests
    coffee = token0Contract;
    cacao = token1Contract;

    // Mint tokens to alice and bob
    const BIG = ethers.parseEther("1000000");
    await coffee.mint(alice.address, BIG);
    await cacao.mint(alice.address, BIG);
    await coffee.mint(bob.address, BIG);
    await cacao.mint(bob.address, BIG);
  });

  // --- Helper to add initial liquidity ---
  async function addInitialLiquidity(amount0, amount1, recipient) {
    const poolAddr = await pool.getAddress();
    await coffee.connect(alice).transfer(poolAddr, amount0);
    await cacao.connect(alice).transfer(poolAddr, amount1);
    return pool.connect(alice).mint(recipient ?? alice.address);
  }

  describe("mint — first deposit", function () {
    it("locks MINIMUM_LIQUIDITY (1000) at dead address on first deposit", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      // OZ v5 disallows minting to address(0); MINIMUM_LIQUIDITY is locked at 0x000...dEaD
      const DEAD = "0x000000000000000000000000000000000000dEaD";
      const lockedLiquidity = await pool.balanceOf(DEAD);
      expect(lockedLiquidity).to.equal(MINIMUM_LIQUIDITY);
    });

    it("mints liquidity = sqrt(amount0*amount1) - MINIMUM_LIQUIDITY to recipient", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      const expected = sqrt(a0 * a1) - MINIMUM_LIQUIDITY;
      expect(await pool.balanceOf(alice.address)).to.equal(expected);
    });
  });

  describe("mint — subsequent deposits", function () {
    it("uses proportional (min) formula for subsequent mints", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      const totalSupply0 = await pool.totalSupply();
      const [reserve0, reserve1] = await pool.getReserves();

      // Bob deposits the same ratio
      const b0 = ethers.parseEther("5");
      const b1 = ethers.parseEther("20");
      const poolAddr = await pool.getAddress();
      await coffee.connect(bob).transfer(poolAddr, b0);
      await cacao.connect(bob).transfer(poolAddr, b1);
      await pool.connect(bob).mint(bob.address);

      const expectedLp = b0 * totalSupply0 / reserve0 < b1 * totalSupply0 / reserve1
        ? b0 * totalSupply0 / reserve0
        : b1 * totalSupply0 / reserve1;

      expect(await pool.balanceOf(bob.address)).to.equal(expectedLp);
    });
  });

  describe("burn", function () {
    it("returns proportional token0 and token1 on burn", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      const lpBalance = await pool.balanceOf(alice.address);
      const totalSupply = await pool.totalSupply();
      const poolAddr = await pool.getAddress();
      const bal0 = await coffee.balanceOf(poolAddr);
      const bal1 = await cacao.balanceOf(poolAddr);

      const expected0 = (lpBalance * bal0) / totalSupply;
      const expected1 = (lpBalance * bal1) / totalSupply;

      // Transfer LP to pool then burn
      await pool.connect(alice).transfer(poolAddr, lpBalance);
      const tx = await pool.connect(alice).burn(alice.address);
      const receipt = await tx.wait();

      // Check Burn event
      const burnEvent = receipt.logs.find(l => l.fragment?.name === "Burn");
      expect(burnEvent).to.exist;
      expect(burnEvent.args.amount0).to.equal(expected0);
      expect(burnEvent.args.amount1).to.equal(expected1);
    });

    it("reverts with InsufficientLiquidity when no LP tokens sent", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      // Do NOT transfer LP to pool — burn should revert
      await expect(pool.connect(alice).burn(alice.address))
        .to.be.revertedWithCustomError(pool, "InsufficientLiquidity");
    });
  });

  describe("swap", function () {
    it("maintains k invariant with 0.3% fee (single hop swap)", async function () {
      const a0 = ethers.parseEther("100");
      const a1 = ethers.parseEther("100");
      await addInitialLiquidity(a0, a1, alice.address);

      const [r0Before, r1Before] = await pool.getReserves();
      const kBefore = r0Before * r1Before;

      // Bob swaps amountIn of token0 for token1
      const amountIn = ethers.parseEther("1");
      // Compute expected out: amountInWithFee = amountIn * 997; out = amountInWithFee*r1/(r0*1000+amountInWithFee)
      const amountInWithFee = amountIn * 997n;
      const amountOut = (amountInWithFee * r1Before) / (r0Before * 1000n + amountInWithFee);

      const poolAddr = await pool.getAddress();
      await coffee.connect(bob).transfer(poolAddr, amountIn);
      await pool.connect(bob).swap(0n, amountOut, bob.address);

      const [r0After, r1After] = await pool.getReserves();
      // k should be >= kBefore (fees stay in pool)
      expect(r0After * r1After).to.be.gte(kBefore);
    });

    it("reverts with InsufficientOutputAmount when both amounts are zero", async function () {
      const a0 = ethers.parseEther("100");
      const a1 = ethers.parseEther("100");
      await addInitialLiquidity(a0, a1, alice.address);

      await expect(pool.connect(bob).swap(0n, 0n, bob.address))
        .to.be.revertedWithCustomError(pool, "InsufficientOutputAmount");
    });

    it("reverts when attempting to drain pool without paying in any tokens", async function () {
      const a0 = ethers.parseEther("100");
      const a1 = ethers.parseEther("100");
      await addInitialLiquidity(a0, a1, alice.address);

      // Try to take 1 token0 out without sending anything in — no amountIn → InsufficientInputAmount
      await expect(pool.connect(bob).swap(ethers.parseEther("1"), 0n, bob.address))
        .to.be.revertedWithCustomError(pool, "InsufficientInputAmount");
    });

    it("reverts with InvalidTo when to == token0", async function () {
      const a0 = ethers.parseEther("100");
      const a1 = ethers.parseEther("100");
      await addInitialLiquidity(a0, a1, alice.address);

      // Send input first, then try to swap to token0 address
      await coffee.connect(bob).transfer(await pool.getAddress(), ethers.parseEther("1"));
      const token0Addr = await pool.token0();
      await expect(pool.connect(bob).swap(0n, ethers.parseEther("0.99"), token0Addr))
        .to.be.revertedWithCustomError(pool, "InvalidTo");
    });

    it("reverts with InvalidTo when to == token1", async function () {
      const a0 = ethers.parseEther("100");
      const a1 = ethers.parseEther("100");
      await addInitialLiquidity(a0, a1, alice.address);

      await coffee.connect(bob).transfer(await pool.getAddress(), ethers.parseEther("1"));
      const token1Addr = await pool.token1();
      await expect(pool.connect(bob).swap(0n, ethers.parseEther("0.99"), token1Addr))
        .to.be.revertedWithCustomError(pool, "InvalidTo");
    });
  });

  describe("sync", function () {
    it("updates reserves to match current balances after direct transfer", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      // Direct transfer to pool without going through mint
      const bonus = ethers.parseEther("5");
      await coffee.connect(alice).transfer(await pool.getAddress(), bonus);

      // Before sync: reserve0 is still old value
      const [r0Before] = await pool.getReserves();
      expect(r0Before).to.equal(a0);

      await pool.sync();

      const [r0After] = await pool.getReserves();
      expect(r0After).to.equal(a0 + bonus);
    });
  });

  describe("getReserves", function () {
    it("returns initial reserves after first mint", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      const [r0, r1] = await pool.getReserves();
      expect(r0).to.equal(a0);
      expect(r1).to.equal(a1);
    });
  });

  describe("skim", function () {
    it("sends excess tokens above reserves to recipient", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      await addInitialLiquidity(a0, a1, alice.address);

      // Transfer excess token0 directly
      const excess = ethers.parseEther("3");
      await coffee.connect(alice).transfer(await pool.getAddress(), excess);

      const bobCoffee0 = await coffee.balanceOf(bob.address);
      await pool.connect(alice).skim(bob.address);
      const bobCoffee1 = await coffee.balanceOf(bob.address);
      expect(bobCoffee1 - bobCoffee0).to.equal(excess);
    });
  });

  describe("Sync event", function () {
    it("emits Sync event on mint", async function () {
      const a0 = ethers.parseEther("10");
      const a1 = ethers.parseEther("40");
      const poolAddr = await pool.getAddress();
      await coffee.connect(alice).transfer(poolAddr, a0);
      await cacao.connect(alice).transfer(poolAddr, a1);

      await expect(pool.connect(alice).mint(alice.address))
        .to.emit(pool, "Sync");
    });
  });
});
