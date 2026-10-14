import { expect } from "chai";
import hre from "hardhat";

describe("CafeSwapFactory", function () {
  let factory;
  let mockCertificacoes;
  let owner, user1;
  let tokenA, tokenB, tokenC;
  
  beforeEach(async function () {
    [owner, user1] = await hre.ethers.getSigners();
    
    // Deploy mock certificacoes contract
    const MockCertificacoes = await hre.ethers.getContractFactory("MockAgroChainCertificacoes");
    mockCertificacoes = await MockCertificacoes.deploy();
    await mockCertificacoes.waitForDeployment();
    
    // Deploy factory
    const Factory = await hre.ethers.getContractFactory("CafeSwapFactory");
    factory = await Factory.deploy(await mockCertificacoes.getAddress());
    await factory.waitForDeployment();
    
    // Deploy mock tokens
    const MockToken = await hre.ethers.getContractFactory("MockERC20");
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
      const certId = hre.ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      
      await factory.addCertifiedToken(await tokenA.getAddress(), certId);
      
      expect(await factory.certifiedTokens(await tokenA.getAddress())).to.be.true;
      expect(await factory.tokenToCertId(await tokenA.getAddress())).to.equal(certId);
    });
    
    it("Should revert when adding token with invalid cert", async function () {
      const invalidCertId = hre.ethers.id("invalid-cert");
      
      await expect(
        factory.addCertifiedToken(await tokenA.getAddress(), invalidCertId)
      ).to.be.revertedWithCustomError(factory, "InvalidCertification");
    });
    
    it("Should revert when non-owner tries to add certified token", async function () {
      const certId = hre.ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      
      await expect(
        factory.connect(user1).addCertifiedToken(await tokenA.getAddress(), certId)
      ).to.be.revertedWithCustomError(factory, "OwnableUnauthorizedAccount");
    });
    
    it("Should revert when adding zero address token", async function () {
      const certId = hre.ethers.id("valid-cert-1");
      await mockCertificacoes.addValidCert(certId);
      
      await expect(
        factory.addCertifiedToken(hre.ethers.ZeroAddress, certId)
      ).to.be.revertedWithCustomError(factory, "InvalidToken");
    });
  });
  
  describe("Pool Creation", function () {
    beforeEach(async function () {
      // Certify tokens
      const certIdA = hre.ethers.id("cert-a");
      const certIdB = hre.ethers.id("cert-b");
      await mockCertificacoes.addValidCert(certIdA);
      await mockCertificacoes.addValidCert(certIdB);
      
      await factory.addCertifiedToken(await tokenA.getAddress(), certIdA);
      await factory.addCertifiedToken(await tokenB.getAddress(), certIdB);
    });
    
    it("Should create pool for certified token pair", async function () {
      const tx = await factory.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "PoolCreated"
      );
      
      expect(event).to.not.be.undefined;
      
      // Verify pool exists
      const token0 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenA.getAddress()
        : await tokenB.getAddress();
      const token1 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenB.getAddress()
        : await tokenA.getAddress();
      
      const poolAddress = await factory.getPair(token0, token1);
      expect(poolAddress).to.not.equal(hre.ethers.ZeroAddress);
    });
    
    it("Should create pool with canonical ordering", async function () {
      await factory.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
      const token0 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenA.getAddress()
        : await tokenB.getAddress();
      const token1 = await tokenA.getAddress() < await tokenB.getAddress()
        ? await tokenB.getAddress()
        : await tokenA.getAddress();
      
      const poolAddress = await factory.getPair(token0, token1);
      const poolAddressReverse = await factory.getPair(token1, token0);
      
      expect(poolAddress).to.equal(poolAddressReverse);
    });
    
    it("Should revert when creating pool with uncertified token", async function () {
      await expect(
        factory.createPool(
          await tokenA.getAddress(),
          await tokenC.getAddress()
        )
      ).to.be.revertedWithCustomError(factory, "TokenNotCertified");
    });
    
    it("Should revert when creating duplicate pool", async function () {
      await factory.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
      await expect(
        factory.createPool(
          await tokenA.getAddress(),
          await tokenB.getAddress()
        )
      ).to.be.revertedWithCustomError(factory, "PairExists");
    });
    
    it("Should revert when creating pool with identical addresses", async function () {
      await expect(
        factory.createPool(
          await tokenA.getAddress(),
          await tokenA.getAddress()
        )
      ).to.be.revertedWithCustomError(factory, "IdenticalAddresses");
    });
    
    it("Should increment allPairs array", async function () {
      expect(await factory.allPairsLength()).to.equal(0);
      
      await factory.createPool(
        await tokenA.getAddress(),
        await tokenB.getAddress()
      );
      
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
});

// Mock contracts
contract MockAgroChainCertificacoes {
  mapping(bytes32 => bool) public validCerts;
  
  function addValidCert(bytes32 certId) external {
    validCerts[certId] = true;
  }
  
  function certificacaoValida(bytes32 id) external view returns (bool) {
    return validCerts[id];
  }
}

contract MockERC20 {
  string public name;
  string public symbol;
  uint8 public decimals = 18;
  uint256 public totalSupply;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;
  
  constructor(string memory _name, string memory _symbol) {
    name = _name;
    symbol = _symbol;
    totalSupply = 1000000 * 10**18;
    balanceOf[msg.sender] = totalSupply;
  }
  
  function transfer(address to, uint256 amount) external returns (bool) {
    balanceOf[msg.sender] -= amount;
    balanceOf[to] += amount;
    return true;
  }
  
  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    return true;
  }
  
  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    allowance[from][msg.sender] -= amount;
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    return true;
  }
}
