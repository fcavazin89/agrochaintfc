import { expect } from "chai";
import hre from "hardhat";

describe("CafeSwapFactory (cafeswap)", function () {
  let ethers;
  let factory;
  let mockCertificacoes;
  let owner, user1;
  let tokenA, tokenB, tokenC;

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

    const MockToken = await ethers.getContractFactory("MockERC20");
    tokenA = await MockToken.deploy("Token A", "TKA");
    await tokenA.waitForDeployment();
    tokenB = await MockToken.deploy("Token B", "TKB");
    await tokenB.waitForDeployment();
    tokenC = await MockToken.deploy("Token C", "TKC");
    await tokenC.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct certificacoes address", async function () {
      expect(await factory.agroChainCertificacoes()).to.equal(
        await mockCertificacoes.getAddress()
      );
    });

    it("Should set owner as feeToSetter", async function () {
      expect(await factory.feeToSetter()).to.equal(owner.address);
    });
  });

  describe("Token Certification", function () {
    it("Should add certified token with valid cert", async function () {
      const certId = ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);

      await factory.addCertifiedToken(await tokenA.getAddress(), certId);

      expect(await factory.certifiedTokens(await tokenA.getAddress())).to.be.true;
      expect(await factory.tokenToCertId(await tokenA.getAddress())).to.equal(certId);
    });

    it("Should revert when adding token with invalid cert", async function () {
      const invalidCertId = ethers.id("invalid-cert");
      await expect(
        factory.addCertifiedToken(await tokenA.getAddress(), invalidCertId)
      ).to.be.revertedWithCustomError(factory, "InvalidCertification");
    });

    it("Should revert when non-owner tries to add certified token", async function () {
      const certId = ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      await expect(
        factory.connect(user1).addCertifiedToken(await tokenA.getAddress(), certId)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });

    it("Should revert when adding zero address token", async function () {
      const certId = ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      await expect(
        factory.addCertifiedToken(ethers.ZeroAddress, certId)
      ).to.be.revertedWithCustomError(factory, "InvalidToken");
    });
  });

  describe("Pool Creation", function () {
    beforeEach(async function () {
      const certIdA = ethers.id("cert-a");
      const certIdB = ethers.id("cert-b");
      await mockCertificacoes.addValidCert(certIdA);
      await mockCertificacoes.addValidCert(certIdB);
      await factory.addCertifiedToken(await tokenA.getAddress(), certIdA);
      await factory.addCertifiedToken(await tokenB.getAddress(), certIdB);
    });

    it("Should create pool for certified token pair", async function () {
      const tx = await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PoolCreated"
      );
      expect(event).to.not.be.undefined;

      const [token0, token1] =
        (await tokenA.getAddress()) < (await tokenB.getAddress())
          ? [await tokenA.getAddress(), await tokenB.getAddress()]
          : [await tokenB.getAddress(), await tokenA.getAddress()];
      const poolAddress = await factory.getPair(token0, token1);
      expect(poolAddress).to.not.equal(ethers.ZeroAddress);
    });

    it("Should create pool with canonical ordering", async function () {
      await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress());

      const [token0, token1] =
        (await tokenA.getAddress()) < (await tokenB.getAddress())
          ? [await tokenA.getAddress(), await tokenB.getAddress()]
          : [await tokenB.getAddress(), await tokenA.getAddress()];

      const poolAddress = await factory.getPair(token0, token1);
      const poolAddressReverse = await factory.getPair(token1, token0);
      expect(poolAddress).to.equal(poolAddressReverse);
    });

    it("Should revert when creating pool with uncertified token", async function () {
      await expect(
        factory.createPool(await tokenA.getAddress(), await tokenC.getAddress())
      ).to.be.revertedWithCustomError(factory, "TokenNotCertified");
    });

    it("Should revert when creating duplicate pool", async function () {
      await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      await expect(
        factory.createPool(await tokenA.getAddress(), await tokenB.getAddress())
      ).to.be.revertedWithCustomError(factory, "PairExists");
    });

    it("Should revert when creating pool with identical addresses", async function () {
      await expect(
        factory.createPool(await tokenA.getAddress(), await tokenA.getAddress())
      ).to.be.revertedWithCustomError(factory, "IdenticalAddresses");
    });

    it("Should increment allPairs array", async function () {
      expect(await factory.allPairsLength()).to.equal(0);
      await factory.createPool(await tokenA.getAddress(), await tokenB.getAddress());
      expect(await factory.allPairsLength()).to.equal(1);
    });
  });

  describe("Fee Management", function () {
    it("Should allow feeToSetter to set feeTo", async function () {
      await factory.setFeeTo(user1.address);
      expect(await factory.feeTo()).to.equal(user1.address);
    });

    it("Should allow feeToSetter to change feeToSetter", async function () {
      await factory.setFeeToSetter(user1.address);
      expect(await factory.feeToSetter()).to.equal(user1.address);
    });
  });

  describe("Token Delisting", function () {
    it("Should remove certified token", async function () {
      const certId = ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      await factory.addCertifiedToken(await tokenA.getAddress(), certId);

      expect(await factory.certifiedTokens(await tokenA.getAddress())).to.be.true;

      await factory.removeCertifiedToken(await tokenA.getAddress());

      expect(await factory.certifiedTokens(await tokenA.getAddress())).to.be.false;
      expect(await factory.tokenToCertId(await tokenA.getAddress())).to.equal(ethers.ZeroHash);
    });

    it("Should revert when removing uncertified token", async function () {
      await expect(
        factory.removeCertifiedToken(await tokenA.getAddress())
      ).to.be.revertedWithCustomError(factory, "TokenNotCertified");
    });

    it("Should prevent new pools after delisting", async function () {
      const certIdA = ethers.id("cert-a");
      const certIdB = ethers.id("cert-b");
      await mockCertificacoes.addValidCert(certIdA);
      await mockCertificacoes.addValidCert(certIdB);
      await factory.addCertifiedToken(await tokenA.getAddress(), certIdA);
      await factory.addCertifiedToken(await tokenB.getAddress(), certIdB);

      await factory.removeCertifiedToken(await tokenA.getAddress());

      await expect(
        factory.createPool(await tokenA.getAddress(), await tokenB.getAddress())
      ).to.be.revertedWithCustomError(factory, "TokenNotCertified");
    });

    it("Should revert when non-owner tries to remove token", async function () {
      const certId = ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      await factory.addCertifiedToken(await tokenA.getAddress(), certId);

      await expect(
        factory.connect(user1).removeCertifiedToken(await tokenA.getAddress())
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
  });
});
