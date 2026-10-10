import { expect } from "chai";
import hre from "hardhat";

describe("CoffeeCacaoSwapFactory", function () {
  let ethers;
  let CoffeeCacaoSwapFactory;
  let factory;
  let mockTraceability;
  let owner;
  let addr1;
  let addr2;

  // Mock tokens for testing
  let coffeeToken1;
  let coffeeToken2;
  let cacaoToken1;
  let cacaoToken2;
  let nonCertifiedToken;

  // Batch IDs
  const COFFEE_BATCH_ID = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const CACAO_BATCH_ID = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const INVALID_BATCH_ID = "0x0000000000000000000000000000000000000000000000000000000000000000";

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock traceability contract
    const MockTraceabilityFactory = await ethers.getContractFactory("MockTraceability");
    mockTraceability = await MockTraceabilityFactory.deploy();

    // Deploy mock ERC20 tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    coffeeToken1 = await MockERC20.deploy("Coffee Token 1", "COFF1");
    coffeeToken2 = await MockERC20.deploy("Coffee Token 2", "COFF2");
    cacaoToken1 = await MockERC20.deploy("Cacao Token 1", "CACAO1");
    cacaoToken2 = await MockERC20.deploy("Cacao Token 2", "CACAO2");
    nonCertifiedToken = await MockERC20.deploy("Non-Certified Token", "NCT");

    // Deploy factory
    CoffeeCacaoSwapFactory = await ethers.getContractFactory("CoffeeCacaoSwapFactory");
    factory = await CoffeeCacaoSwapFactory.deploy(await mockTraceability.getAddress());

    // Set up mock traceability for tests
    await mockTraceability.setBatchCertification(COFFEE_BATCH_ID, true, true);  // Coffee certified
    await mockTraceability.setBatchCertification(CACAO_BATCH_ID, false, true);  // Cacao certified
  });

  describe("Deployment", function () {
    it("Should set correct traceability contract address", async function () {
      expect(await factory.traceabilityContract()).to.equal(await mockTraceability.getAddress());
    });

    it("Should set owner as feeToSetter", async function () {
      expect(await factory.feeToSetter()).to.equal(owner.address);
    });

    it("Should revert with zero address for traceability contract", async function () {
      await expect(
        CoffeeCacaoSwapFactory.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });

  describe("Adding Certified Coffee Tokens", function () {
    it("Should allow owner to add certified Coffee token", async function () {
      await factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID);

      expect(await factory.coffeeTokens(await coffeeToken1.getAddress())).to.be.true;
      expect(await factory.cacaoTokens(await coffeeToken1.getAddress())).to.be.false;
      expect(await factory.tokenToBatchId(await coffeeToken1.getAddress())).to.equal(COFFEE_BATCH_ID);
    });

    it("Should emit CertifiedCoffeeTokenAdded event", async function () {
      await expect(factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID))
        .to.emit(factory, "CertifiedCoffeeTokenAdded")
        .withArgs(await coffeeToken1.getAddress(), COFFEE_BATCH_ID);
    });

    it("Should revert when non-owner tries to add Coffee token", async function () {
      await expect(
        factory.connect(addr1).addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should revert when Coffee batch is not certified", async function () {
      await expect(
        factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), INVALID_BATCH_ID)
      ).to.be.revertedWithCustomError(factory, "NotCertifiedCoffee");
    });

    it("Should revert when token is already whitelisted", async function () {
      await factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID);

      await expect(
        factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID)
      ).to.be.revertedWithCustomError(factory, "TokenAlreadyWhitelisted");
    });
  });

  describe("Adding Certified Cacao Tokens", function () {
    it("Should allow owner to add certified Cacao token", async function () {
      await factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID);

      expect(await factory.coffeeTokens(await cacaoToken1.getAddress())).to.be.false;
      expect(await factory.cacaoTokens(await cacaoToken1.getAddress())).to.be.true;
      expect(await factory.tokenToBatchId(await cacaoToken1.getAddress())).to.equal(CACAO_BATCH_ID);
    });

    it("Should emit CertifiedCacaoTokenAdded event", async function () {
      await expect(factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID))
        .to.emit(factory, "CertifiedCacaoTokenAdded")
        .withArgs(await cacaoToken1.getAddress(), CACAO_BATCH_ID);
    });

    it("Should revert when non-owner tries to add Cacao token", async function () {
      await expect(
        factory.connect(addr1).addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should revert when Cacao batch is not certified", async function () {
      await expect(
        factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), INVALID_BATCH_ID)
      ).to.be.revertedWithCustomError(factory, "NotCertifiedCacao");
    });

    it("Should revert when token is already whitelisted", async function () {
      await factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID);

      await expect(
        factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID)
      ).to.be.revertedWithCustomError(factory, "TokenAlreadyWhitelisted");
    });
  });

  describe("Creating Pools", function () {
    beforeEach(async function () {
      // Add certified tokens
      await factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID);
      await factory.addCertifiedCoffeeToken(await coffeeToken2.getAddress(), COFFEE_BATCH_ID);
      await factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID);
      await factory.addCertifiedCacaoToken(await cacaoToken2.getAddress(), CACAO_BATCH_ID);
    });

    it("Should create Coffee/Coffee pool", async function () {
      const tx = await factory.createPool(
        await coffeeToken1.getAddress(),
        await coffeeToken2.getAddress()
      );

      const receipt = await tx.wait();

      // Check events
      const poolCreatedEvent = receipt.logs.find(
        log => log.fragment?.name === "PoolCreated"
      );

      expect(poolCreatedEvent).to.exist;

      const poolAddress = poolCreatedEvent.args[2];
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);

      // Check getPool mapping
      expect(await factory.getPool(
        await coffeeToken1.getAddress(),
        await coffeeToken2.getAddress()
      )).to.equal(poolAddress);

      expect(await factory.allPoolsLength()).to.equal(1);
    });

    it("Should create Coffee/Cacao pool", async function () {
      const tx = await factory.createPool(
        await coffeeToken1.getAddress(),
        await cacaoToken1.getAddress()
      );

      const receipt = await tx.wait();
      const poolCreatedEvent = receipt.logs.find(
        log => log.fragment?.name === "PoolCreated"
      );

      expect(poolCreatedEvent).to.exist;
      expect(await factory.allPoolsLength()).to.equal(1);
    });

    it("Should create Cacao/Cacao pool", async function () {
      const tx = await factory.createPool(
        await cacaoToken1.getAddress(),
        await cacaoToken2.getAddress()
      );

      const receipt = await tx.wait();
      const poolCreatedEvent = receipt.logs.find(
        log => log.fragment?.name === "PoolCreated"
      );

      expect(poolCreatedEvent).to.exist;
      expect(await factory.allPoolsLength()).to.equal(1);
    });

    it("Should revert when creating pool with non-certified token", async function () {
      await expect(
        factory.createPool(
          await coffeeToken1.getAddress(),
          await nonCertifiedToken.getAddress()
        )
      ).to.be.revertedWithCustomError(factory, "NotCoffeeOrCacaoToken");
    });

    it("Should revert when creating pool with identical addresses", async function () {
      await expect(
        factory.createPool(
          await coffeeToken1.getAddress(),
          await coffeeToken1.getAddress()
        )
      ).to.be.revertedWithCustomError(factory, "IdenticalAddresses");
    });

    it("Should revert when creating pool with zero address", async function () {
      await expect(
        factory.createPool(
          await coffeeToken1.getAddress(),
          ethers.ZeroAddress
        )
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });

    it("Should revert when creating duplicate pool", async function () {
      await factory.createPool(
        await coffeeToken1.getAddress(),
        await coffeeToken2.getAddress()
      );

      await expect(
        factory.createPool(
          await coffeeToken1.getAddress(),
          await coffeeToken2.getAddress()
        )
      ).to.be.revertedWithCustomError(factory, "PairExists");
    });

    it("Should produce deterministic pool addresses with CREATE2 (same pair, different token order)", async function () {
      const tokenA = await coffeeToken1.getAddress();
      const tokenB = await coffeeToken2.getAddress();

      // Create pool with tokenA, tokenB order
      const tx1 = await factory.createPool(tokenA, tokenB);
      const receipt1 = await tx1.wait();
      const poolEvent1 = receipt1.logs.find(log => log.fragment?.name === "PoolCreated");
      const poolAddress1 = poolEvent1.args[2];

      // Pool address from getPool should match regardless of argument order
      const poolFromAB = await factory.getPool(tokenA, tokenB);
      const poolFromBA = await factory.getPool(tokenB, tokenA);

      // Both orderings should return the same pool address
      expect(poolFromAB).to.equal(poolAddress1);
      expect(poolFromBA).to.equal(poolAddress1);
      expect(poolFromAB).to.equal(poolFromBA);
    });

    it("Should canonicalize token order (token0 < token1)", async function () {
      const tokenA = await coffeeToken1.getAddress();
      const tokenB = await coffeeToken2.getAddress();

      // Determine canonical ordering
      const tokenAInt = BigInt(tokenA);
      const tokenBInt = BigInt(tokenB);
      const [token0, token1] = tokenAInt < tokenBInt ? [tokenA, tokenB] : [tokenB, tokenA];

      const tx = await factory.createPool(tokenA, tokenB);
      const receipt = await tx.wait();
      const poolEvent = receipt.logs.find(log => log.fragment?.name === "PoolCreated");

      expect(poolEvent.args[0]).to.equal(token0);
      expect(poolEvent.args[1]).to.equal(token1);
    });
  });

  describe("Helper Functions", function () {
    beforeEach(async function () {
      await factory.addCertifiedCoffeeToken(await coffeeToken1.getAddress(), COFFEE_BATCH_ID);
      await factory.addCertifiedCacaoToken(await cacaoToken1.getAddress(), CACAO_BATCH_ID);
    });

    it("Should return correct token type for Coffee token", async function () {
      const tokenType = await factory.getTokenType(await coffeeToken1.getAddress());
      expect(tokenType).to.equal(0n); // TokenType.COFFEE = 0
    });

    it("Should return correct token type for Cacao token", async function () {
      const tokenType = await factory.getTokenType(await cacaoToken1.getAddress());
      expect(tokenType).to.equal(1n); // TokenType.CACAO = 1
    });

    it("Should revert when getting token type for non-whitelisted token", async function () {
      await expect(
        factory.getTokenType(await nonCertifiedToken.getAddress())
      ).to.be.revertedWithCustomError(factory, "InvalidToken");
    });

    it("Should check if token is certified Coffee or Cacao", async function () {
      expect(await factory.isCertifiedCoffeeOrCacao(await coffeeToken1.getAddress())).to.be.true;
      expect(await factory.isCertifiedCoffeeOrCacao(await cacaoToken1.getAddress())).to.be.true;
      expect(await factory.isCertifiedCoffeeOrCacao(await nonCertifiedToken.getAddress())).to.be.false;
    });
  });

  describe("feeToSetter Management", function () {
    it("Should allow feeToSetter to change feeToSetter", async function () {
      await factory.setFeeToSetter(addr1.address);

      expect(await factory.feeToSetter()).to.equal(addr1.address);
    });

    it("Should emit FeeToSetterChanged event", async function () {
      await expect(factory.setFeeToSetter(addr1.address))
        .to.emit(factory, "FeeToSetterChanged")
        .withArgs(addr1.address);
    });

    it("Should revert when non-feeToSetter tries to change feeToSetter", async function () {
      await expect(
        factory.connect(addr1).setFeeToSetter(addr2.address)
      ).to.be.revertedWithCustomError(factory, "NotAuthorized");
    });

    it("Should revert when setting feeToSetter to zero address", async function () {
      await expect(
        factory.setFeeToSetter(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(factory, "ZeroAddress");
    });
  });
});
