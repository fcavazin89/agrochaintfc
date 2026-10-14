import { expect } from "chai";
import hre from "hardhat";

describe("CafeGovernance (cafeswap)", function () {
  let ethers;
  let cafe, governance, farm;
  let owner, proposer, voter1, voter2;

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, proposer, voter1, voter2] = await ethers.getSigners();

    const CafeToken = await ethers.getContractFactory("CafeToken");
    cafe = await CafeToken.deploy();
    await cafe.waitForDeployment();

    const Governance = await ethers.getContractFactory("CafeGovernance");
    governance = await Governance.deploy(await cafe.getAddress());
    await governance.waitForDeployment();

    const Farm = await ethers.getContractFactory("CafeFarm");
    farm = await Farm.deploy(await cafe.getAddress(), ethers.parseEther("1"));
    await farm.waitForDeployment();

    const MINTER_ROLE = await cafe.MINTER_ROLE();
    await cafe.grantRole(MINTER_ROLE, owner.address);

    await cafe.mint(proposer.address, ethers.parseEther("2000000"));
    await cafe.mint(voter1.address, ethers.parseEther("10000000"));
    await cafe.mint(voter2.address, ethers.parseEther("5000000"));

    await cafe.connect(proposer).delegate(proposer.address);
    await cafe.connect(voter1).delegate(voter1.address);
    await cafe.connect(voter2).delegate(voter2.address);

    await ethers.provider.send("hardhat_mine", ["0x1"]);
  });

  // Helper: create a proposal
  async function createProposal(description = "Test proposal") {
    const targets = [await farm.getAddress()];
    const values = [0];
    const calldatas = [
      farm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("2")])
    ];
    await governance.connect(proposer).propose(targets, values, calldatas, description);
    return 1; // first proposal
  }

  describe("Proposal Creation", function () {
    it("Should create proposal with sufficient tokens", async function () {
      const proposalId = await createProposal();
      expect(await governance.proposalCount()).to.equal(1);
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.proposer).to.equal(proposer.address);
    });

    it("Should revert when proposer has insufficient tokens", async function () {
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("2")])
      ];
      // voter2 has 5M which IS above threshold - use a fresh account instead
      const [, , , , noTokens] = await ethers.getSigners();
      await expect(
        governance.connect(noTokens).propose(targets, values, calldatas, "Test")
      ).to.be.revertedWithCustomError(governance, "InsufficientProposalThreshold");
    });

    it("Should store creation time for timelock", async function () {
      const blockBefore = await ethers.provider.getBlock("latest");
      const proposalId = await createProposal();
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.creationTime).to.be.gte(blockBefore.timestamp);
    });
  });

  describe("Voting", function () {
    let proposalId;

    beforeEach(async function () {
      proposalId = await createProposal();
    });

    it("Should cast vote For", async function () {
      await governance.connect(voter1).vote(proposalId, 1);
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.forVotes).to.be.gt(0);
    });

    it("Should cast vote Against", async function () {
      await governance.connect(voter1).vote(proposalId, 2);
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.againstVotes).to.be.gt(0);
    });

    it("Should cast vote Abstain", async function () {
      await governance.connect(voter1).vote(proposalId, 3);
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.abstainVotes).to.be.gt(0);
    });

    it("Should use voting power snapshot", async function () {
      const p = await governance.proposals(proposalId);
      // Mine one more block so startBlock is in the past (ERC5805 requires it)
      await ethers.provider.send("hardhat_mine", ["0x1"]);
      const voter1Votes = await cafe.getPastVotes(voter1.address, p.startBlock);

      await governance.connect(voter1).vote(proposalId, 1);

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.forVotes).to.equal(voter1Votes);
    });

    it("Should revert on double vote", async function () {
      await governance.connect(voter1).vote(proposalId, 1);
      await expect(
        governance.connect(voter1).vote(proposalId, 1)
      ).to.be.revertedWithCustomError(governance, "AlreadyVoted");
    });

    it("Should revert on invalid vote type", async function () {
      await expect(
        governance.connect(voter1).vote(proposalId, 0)
      ).to.be.revertedWithCustomError(governance, "InvalidVoteType");
      await expect(
        governance.connect(voter1).vote(proposalId, 4)
      ).to.be.revertedWithCustomError(governance, "InvalidVoteType");
    });
  });

  describe("Execution", function () {
    let proposalId;

    beforeEach(async function () {
      const GOVERNANCE_ROLE = await farm.GOVERNANCE_ROLE();
      await farm.grantRole(GOVERNANCE_ROLE, await governance.getAddress());

      proposalId = await createProposal();
      await governance.connect(voter1).vote(proposalId, 1);
    });

    it("Should revert when timelock not elapsed", async function () {
      // Mine past voting period (VOTING_PERIOD = 50400 blocks)
      await ethers.provider.send("hardhat_mine", ["0xc4f1"]); // 50417 blocks
      await expect(
        governance.execute(proposalId)
      ).to.be.revertedWithCustomError(governance, "TimelockNotElapsed");
    });

    it("Should execute after timelock", async function () {
      await ethers.provider.send("hardhat_mine", ["0xc4f1"]);
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await governance.execute(proposalId);

      const proposal = await governance.getProposal(proposalId);
      expect(proposal.executed).to.be.true;
      expect(await farm.cafePerSecond()).to.equal(ethers.parseEther("2"));
    });

    it("Should revert when quorum not reached", async function () {
      // Mint a small amount to a new signer for a separate proposal
      const [, , , , smallHolder] = await ethers.getSigners();
      // Mint just 500k (well below 10% quorum of 17M = 1.7M)
      await cafe.mint(smallHolder.address, ethers.parseEther("500000"));
      await cafe.connect(smallHolder).delegate(smallHolder.address);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("3")])
      ];
      // smallHolder can propose (500k < threshold of 1M) — use proposer for creation
      // Actually 500k < PROPOSAL_THRESHOLD so use proposer to create
      await governance.connect(proposer).propose(targets, values, calldatas, "Quorum test");
      const newProposalId = 2;

      // Only smallHolder votes - 500k < 10% of ~17.5M total
      await governance.connect(smallHolder).vote(newProposalId, 1);

      await ethers.provider.send("hardhat_mine", ["0xc4f1"]);
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await expect(
        governance.execute(newProposalId)
      ).to.be.revertedWithCustomError(governance, "QuorumNotReached");
    });

    it("Should revert when proposal defeated", async function () {
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("3")])
      ];
      await governance.connect(proposer).propose(targets, values, calldatas, "Test");
      const newProposalId = 2;

      await governance.connect(voter1).vote(newProposalId, 2); // Against

      await ethers.provider.send("hardhat_mine", ["0xc4f1"]);
      await ethers.provider.send("evm_increaseTime", [48 * 3600]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await expect(
        governance.execute(newProposalId)
      ).to.be.revertedWithCustomError(governance, "ProposalNotSucceeded");
    });

    it("Should revert when voting period not ended", async function () {
      await expect(
        governance.execute(proposalId)
      ).to.be.revertedWithCustomError(governance, "ProposalNotActive");
    });
  });

  describe("Cancel", function () {
    let proposalId;

    beforeEach(async function () {
      proposalId = await createProposal();
    });

    it("Should allow proposer to cancel", async function () {
      await governance.connect(proposer).cancel(proposalId);
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.canceled).to.be.true;
    });

    it("Should revert when non-proposer tries to cancel", async function () {
      await expect(
        governance.connect(voter1).cancel(proposalId)
      ).to.be.revertedWithCustomError(governance, "OnlyProposer");
    });
  });

  describe("State", function () {
    let proposalId;

    beforeEach(async function () {
      proposalId = await createProposal();
    });

    it("Should return Active during voting", async function () {
      expect(await governance.state(proposalId)).to.equal(1); // Active
    });

    it("Should return Succeeded after voting with majority", async function () {
      await governance.connect(voter1).vote(proposalId, 1);
      await ethers.provider.send("hardhat_mine", ["0xc4f1"]);
      expect(await governance.state(proposalId)).to.equal(2); // Succeeded
    });

    it("Should return Defeated when no quorum", async function () {
      // Vote with only proposer (2M tokens). Total minted = 17M, quorum = 1.7M
      // proposer (2M) > 1.7M so would pass quorum. We need a fresh voter with < 1.7M
      // Create a fresh proposal voted only by a small holder (500k < 1.7M quorum)
      const [, , , , smallHolder] = await ethers.getSigners();
      await cafe.mint(smallHolder.address, ethers.parseEther("500000"));
      await cafe.connect(smallHolder).delegate(smallHolder.address);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("3")])
      ];
      await governance.connect(proposer).propose(targets, values, calldatas, "No quorum");
      const noQuorumId = 2;
      await governance.connect(smallHolder).vote(noQuorumId, 1);

      await ethers.provider.send("hardhat_mine", ["0xc4f1"]);
      expect(await governance.state(noQuorumId)).to.equal(3); // Defeated
    });

    it("Should return Canceled after cancel", async function () {
      await governance.connect(proposer).cancel(proposalId);
      expect(await governance.state(proposalId)).to.equal(5); // Canceled
    });
  });
});
