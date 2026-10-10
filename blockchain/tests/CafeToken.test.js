import { expect } from "chai";
import hre from "hardhat";

describe("CafeToken", function () {
  let ethers;
  let networkHelpers;
  let CafeToken;
  let cafeToken;
  let owner;
  let minter;
  let addr1;
  let addr2;

  const MAX_SUPPLY = 100000000n * 10n ** 18n; // 100M CAFE
  const MINT_AMOUNT = 1000n * 10n ** 18n;

  before(async function () {
    ({ ethers, networkHelpers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, minter, addr1, addr2] = await ethers.getSigners();

    CafeToken = await ethers.getContractFactory("CafeToken");
    cafeToken = await CafeToken.deploy();

    // Grant minter role to minter address
    await cafeToken.connect(owner).grantRole(await cafeToken.MINTER_ROLE(), minter.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await cafeToken.name()).to.equal("Cafe Token");
      expect(await cafeToken.symbol()).to.equal("CAFE");
    });

    it("Should have 18 decimals", async function () {
      expect(await cafeToken.decimals()).to.equal(18);
    });

    it("Should have correct MAX_SUPPLY constant", async function () {
      expect(await cafeToken.MAX_SUPPLY()).to.equal(MAX_SUPPLY);
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      expect(await cafeToken.hasRole(await cafeToken.DEFAULT_ADMIN_ROLE(), owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow minter to mint tokens", async function () {
      await cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT);

      expect(await cafeToken.balanceOf(addr1.address)).to.equal(MINT_AMOUNT);
      expect(await cafeToken.totalSupply()).to.equal(MINT_AMOUNT);
    });

    it("Should emit TokensMinted event", async function () {
      await expect(cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT))
        .to.emit(cafeToken, "TokensMinted")
        .withArgs(addr1.address, MINT_AMOUNT);
    });

    it("Should revert when non-minter tries to mint", async function () {
      await expect(
        cafeToken.connect(addr1).mint(addr1.address, MINT_AMOUNT)
      ).to.be.revertedWithCustomError(cafeToken, "OnlyMinter");
    });

    it("Should enforce MAX_SUPPLY limit", async function () {
      // Mint up to max supply
      await cafeToken.connect(minter).mint(addr1.address, MAX_SUPPLY);

      // Try to mint one more token
      await expect(
        cafeToken.connect(minter).mint(addr1.address, 1n)
      ).to.be.revertedWithCustomError(cafeToken, "MaxSupplyExceeded");
    });

    it("Should allow multiple mints up to MAX_SUPPLY", async function () {
      const halfSupply = MAX_SUPPLY / 2n;

      await cafeToken.connect(minter).mint(addr1.address, halfSupply);
      await cafeToken.connect(minter).mint(addr2.address, halfSupply);

      expect(await cafeToken.totalSupply()).to.equal(MAX_SUPPLY);
      expect(await cafeToken.balanceOf(addr1.address)).to.equal(halfSupply);
      expect(await cafeToken.balanceOf(addr2.address)).to.equal(halfSupply);
    });
  });

  describe("Voting and Delegation", function () {
    it("Should update voting power on transfer", async function () {
      await cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT);

      const initialVotes = await cafeToken.getVotes(addr1.address);
      expect(initialVotes).to.equal(0n); // Not delegated yet

      // Delegate to self
      await cafeToken.connect(addr1).delegate(addr1.address);

      expect(await cafeToken.getVotes(addr1.address)).to.equal(MINT_AMOUNT);
    });

    it("Should allow delegation to another address", async function () {
      await cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT);

      await cafeToken.connect(addr1).delegate(addr2.address);

      expect(await cafeToken.getVotes(addr1.address)).to.equal(0n);
      expect(await cafeToken.getVotes(addr2.address)).to.equal(MINT_AMOUNT);
    });

    it("Should update voting power on transfer after delegation", async function () {
      await cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT);
      await cafeToken.connect(addr1).delegate(addr1.address);

      // Transfer half to addr2
      const transferAmount = MINT_AMOUNT / 2n;
      await cafeToken.connect(addr1).transfer(addr2.address, transferAmount);

      // Delegate addr2 to self
      await cafeToken.connect(addr2).delegate(addr2.address);

      expect(await cafeToken.getVotes(addr1.address)).to.equal(MINT_AMOUNT - transferAmount);
      expect(await cafeToken.getVotes(addr2.address)).to.equal(transferAmount);
    });

    it("Should get votes at past block", async function () {
      await cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT);
      await cafeToken.connect(addr1).delegate(addr1.address);

      const blockNumber1 = await ethers.provider.getBlockNumber();

      // Transfer some tokens
      const transferAmount = MINT_AMOUNT / 2n;
      await cafeToken.connect(addr1).transfer(addr2.address, transferAmount);
      await cafeToken.connect(addr2).delegate(addr2.address);

      // Check votes at previous block
      const votesAtBlock1 = await cafeToken.getPastVotes(addr1.address, blockNumber1);
      expect(votesAtBlock1).to.equal(MINT_AMOUNT);

      // Check current votes
      expect(await cafeToken.getVotes(addr1.address)).to.equal(MINT_AMOUNT - transferAmount);
      expect(await cafeToken.getVotes(addr2.address)).to.equal(transferAmount);
    });
  });

  describe("Permit (EIP-2612)", function () {
    it("Should work with permit for allowance", async function () {
      await cafeToken.connect(minter).mint(addr1.address, MINT_AMOUNT);

      const nonce = await cafeToken.nonces(addr1.address);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      // Create signature
      const domain = {
        name: "Cafe Token",
        version: "1",
        chainId: await ethers.provider.getNetwork().then(n => n.chainId),
        verifyingContract: await cafeToken.getAddress()
      };

      const types = {
        Permit: [
          { name: "owner", type: "address" },
          { name: "spender", type: "address" },
          { name: "value", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" }
        ]
      };

      const value = {
        owner: addr1.address,
        spender: addr2.address,
        value: MINT_AMOUNT,
        nonce: nonce,
        deadline: deadline
      };

      const signature = await addr1.signTypedData(domain, types, value);
      const { v, r, s } = ethers.Signature.from(signature);

      // Use permit to set allowance
      await cafeToken.connect(addr2).permit(
        addr1.address,
        addr2.address,
        MINT_AMOUNT,
        deadline,
        v,
        r,
        s
      );

      // Check allowance was set
      expect(await cafeToken.allowance(addr1.address, addr2.address)).to.equal(MINT_AMOUNT);

      // Use the allowance
      await cafeToken.connect(addr2).transferFrom(addr1.address, addr2.address, MINT_AMOUNT);

      expect(await cafeToken.balanceOf(addr1.address)).to.equal(0n);
      expect(await cafeToken.balanceOf(addr2.address)).to.equal(MINT_AMOUNT);
    });
  });

  describe("Clock and CLOCK_MODE", function () {
    it("Should return block number for clock()", async function () {
      const blockNumber = await ethers.provider.getBlockNumber();
      const clockValue = await cafeToken.clock();

      // Allow ±1 block tolerance
      expect(Number(clockValue)).to.be.within(blockNumber - 1, blockNumber + 1);
    });

    it("Should return correct CLOCK_MODE", async function () {
      expect(await cafeToken.CLOCK_MODE()).to.equal("mode=blocknumber&from=default");
    });
  });
});
