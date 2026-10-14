import { expect } from "chai";
import hre from "hardhat";

describe("CafeToken", function () {
  let cafeToken;
  let owner, minter, user1, user2;
  
  beforeEach(async function () {
    [owner, minter, user1, user2] = await hre.ethers.getSigners();
    
    const CafeToken = await hre.ethers.getContractFactory("CafeToken");
    cafeToken = await CafeToken.deploy();
    await cafeToken.waitForDeployment();
    
    // Grant minter role
    const MINTER_ROLE = await cafeToken.MINTER_ROLE();
    await cafeToken.grantRole(MINTER_ROLE, minter.address);
  });
  
  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await cafeToken.name()).to.equal("Cafe Token");
      expect(await cafeToken.symbol()).to.equal("CAFE");
    });
    
    it("Should have correct max supply", async function () {
      const MAX_SUPPLY = await cafeToken.MAX_SUPPLY();
      expect(MAX_SUPPLY).to.equal(hre.ethers.parseEther("100000000"));
    });
  });
  
  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      const amount = hre.ethers.parseEther("1000");
      await cafeToken.connect(minter).mint(user1.address, amount);
      
      expect(await cafeToken.balanceOf(user1.address)).to.equal(amount);
    });
    
    it("Should revert when non-minter tries to mint", async function () {
      const amount = hre.ethers.parseEther("1000");
      await expect(
        cafeToken.connect(user1).mint(user2.address, amount)
      ).to.be.revertedWithCustomError(cafeToken, "OnlyMinter");
    });
    
    it("Should revert when minting exceeds max supply", async function () {
      const MAX_SUPPLY = await cafeToken.MAX_SUPPLY();
      const tooMuch = MAX_SUPPLY + 1n;
      
      await expect(
        cafeToken.connect(minter).mint(user1.address, tooMuch)
      ).to.be.revertedWithCustomError(cafeToken, "MaxSupplyExceeded");
    });
    
    it("Should allow minting up to max supply", async function () {
      const MAX_SUPPLY = await cafeToken.MAX_SUPPLY();
      await cafeToken.connect(minter).mint(user1.address, MAX_SUPPLY);
      
      expect(await cafeToken.totalSupply()).to.equal(MAX_SUPPLY);
    });
  });
  
  describe("Transfers", function () {
    beforeEach(async function () {
      const amount = hre.ethers.parseEther("1000");
      await cafeToken.connect(minter).mint(user1.address, amount);
    });
    
    it("Should transfer tokens between accounts", async function () {
      const amount = hre.ethers.parseEther("100");
      await cafeToken.connect(user1).transfer(user2.address, amount);
      
      expect(await cafeToken.balanceOf(user2.address)).to.equal(amount);
      expect(await cafeToken.balanceOf(user1.address)).to.equal(
        hre.ethers.parseEther("900")
      );
    });
  });
  
  describe("Voting", function () {
    beforeEach(async function () {
      const amount = hre.ethers.parseEther("1000");
      await cafeToken.connect(minter).mint(user1.address, amount);
    });
    
    it("Should delegate votes to self", async function () {
      await cafeToken.connect(user1).delegate(user1.address);
      
      expect(await cafeToken.getVotes(user1.address)).to.equal(
        hre.ethers.parseEther("1000")
      );
    });
    
    it("Should delegate votes to another account", async function () {
      await cafeToken.connect(user1).delegate(user2.address);
      
      expect(await cafeToken.getVotes(user2.address)).to.equal(
        hre.ethers.parseEther("1000")
      );
      expect(await cafeToken.getVotes(user1.address)).to.equal(0);
    });
    
    it("Should track voting power at past blocks", async function () {
      await cafeToken.connect(user1).delegate(user1.address);
      
      const currentBlock = await hre.ethers.provider.getBlockNumber();
      
      // Mine a few blocks
      await hre.network.provider.send("hardhat_mine", ["0x5"]);
      
      const pastVotes = await cafeToken.getPastVotes(user1.address, currentBlock);
      expect(pastVotes).to.equal(hre.ethers.parseEther("1000"));
    });
    
    it("Should update voting power after transfer", async function () {
      await cafeToken.connect(user1).delegate(user1.address);
      
      const transferAmount = hre.ethers.parseEther("300");
      await cafeToken.connect(user1).transfer(user2.address, transferAmount);
      
      expect(await cafeToken.getVotes(user1.address)).to.equal(
        hre.ethers.parseEther("700")
      );
    });
  });
  
  describe("Permit", function () {
    it("Should have correct domain separator", async function () {
      const domain = await cafeToken.DOMAIN_SEPARATOR();
      expect(domain).to.not.equal(hre.ethers.ZeroHash);
    });
  });
});
