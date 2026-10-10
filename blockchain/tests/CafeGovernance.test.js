import { expect } from "chai";
import hre from "hardhat";

describe("CafeGovernance", function () {
  let ethers;
  let owner, alice, bob, charlie;
  let cafe, governance;

  // Constants
  const QUORUM_PERCENTAGE = 10;
  const TIMELOCK_DELAY = 48 * 60 * 60;  // 48 hours in seconds

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    // Deploy CAFE token
    const CafeToken = await ethers.getContractFactory("CafeToken");
    cafe = await CafeToken.deploy();

    // Delegate votes to users (required for getPastVotes to work)
    await cafe.delegate(owner.address);

    // Deploy governance
    const CafeGovernance = await ethers.getContractFactory("CafeGovernance");
    governance = await CafeGovernance.deploy(await cafe.getAddress());

    // Mint tokens to users
    const MINTER_ROLE = await cafe.MINTER_ROLE();
    await cafe.grantRole(MINTER_ROLE, owner.address);

    // Mint enough tokens to pass threshold
    await cafe.mint(alice.address, ethers.parseEther("2000000"));  // 2M
    await cafe.mint(bob.address, ethers.parseEther("5000000"));    // 5M
    await cafe.mint(charlie.address, ethers.parseEther("3000000")); // 3M

    // Delegate votes
    await cafe.connect(alice).delegate(alice.address);
    await cafe.connect(bob).delegate(bob.address);
    await cafe.connect(charlie).delegate(charlie.address);

    // Mine a block so votes are available
    await ethers.provider.send("hardhat_mine", ["0x1"]);
  });

  describe("propose", function () {
    it("requires >= 1M CAFE balance to propose", async function () {
      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      // Alice has 2M, should pass
      const tx = governance.connect(alice).propose(targets, values, calldatas, description);
      await expect(tx).to.emit(governance, "ProposalCreated");
    });

    it("reverts with insufficient CAFE balance", async function () {
      // Deploy new user with no tokens
      const poorUser = (await ethers.getSigners())[5];

      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      await expect(
        governance.connect(poorUser).propose(targets, values, calldatas, description)
      ).to.be.revertedWithCustomError(governance, "InsufficientVotingPower");
    });

    it("reverts when arrays have different lengths", async function () {
      const targets = [owner.address];
      const values = [0, 1];  // Mismatched length
      const calldatas = ["0x"];
      const description = "Test proposal";

      await expect(
        governance.connect(alice).propose(targets, values, calldatas, description)
      ).to.be.revertedWithCustomError(governance, "ArrayLengthMismatch");
    });

    it("reverts with empty proposal", async function () {
      const targets = [];
      const values = [];
      const calldatas = [];
      const description = "Empty proposal";

      await expect(
        governance.connect(alice).propose(targets, values, calldatas, description)
      ).to.be.revertedWithCustomError(governance, "EmptyProposal");
    });

    it("successfully creates a proposal and emits event", async function () {
      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      await expect(
        governance.connect(alice).propose(targets, values, calldatas, description)
      ).to.emit(governance, "ProposalCreated");

      expect(await governance.proposalCount()).to.equal(1);
    });
  });

  describe("vote", function () {
    beforeEach(async function () {
      // Create a proposal
      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      await governance.connect(alice).propose(targets, values, calldatas, description);
    });

    it("records votes correctly", async function () {
      await governance.connect(alice).vote(0, 1);  // FOR

      const proposal = await governance.getProposal(0);
      expect(proposal.forVotes).to.be.gt(0);
    });

    it("prevents double voting", async function () {
      await governance.connect(alice).vote(0, 1);

      await expect(
        governance.connect(alice).vote(0, 2)
      ).to.be.revertedWithCustomError(governance, "AlreadyVoted");
    });

    it("supports voteType 1 (FOR)", async function () {
      await expect(
        governance.connect(alice).vote(0, 1)
      ).to.emit(governance, "VoteCast");

      const proposal = await governance.getProposal(0);
      expect(proposal.forVotes).to.be.gt(0);
    });

    it("supports voteType 2 (AGAINST)", async function () {
      await expect(
        governance.connect(bob).vote(0, 2)
      ).to.emit(governance, "VoteCast");

      const proposal = await governance.getProposal(0);
      expect(proposal.againstVotes).to.be.gt(0);
    });

    it("supports voteType 3 (ABSTAIN)", async function () {
      await expect(
        governance.connect(charlie).vote(0, 3)
      ).to.emit(governance, "VoteCast");

      const proposal = await governance.getProposal(0);
      expect(proposal.abstainVotes).to.be.gt(0);
    });

    it("reverts on invalid voteType", async function () {
      await expect(
        governance.connect(alice).vote(0, 4)
      ).to.be.revertedWithCustomError(governance, "InvalidVoteType");
    });

    it("reverts when not in voting period", async function () {
      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;

      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      await expect(
        governance.connect(alice).vote(0, 1)
      ).to.be.revertedWithCustomError(governance, "NotInVotingPeriod");
    });
  });

  describe("execute", function () {
    let mockFarm;

    beforeEach(async function () {
      // Deploy a mock farm
      const MockFarm = await ethers.getContractFactory("MockCoffeeCacaoFarm");
      mockFarm = await MockFarm.deploy();

      // Create a proposal that calls setRewardRate
      const targets = [await mockFarm.getAddress()];
      const values = [0];
      const cafePerSecond = ethers.parseEther("2");
      const calldatas = [
        mockFarm.interface.encodeFunctionData("setRewardRate", [cafePerSecond])
      ];
      const description = "Set reward rate to 2 CAFE/second";

      await governance.connect(alice).propose(targets, values, calldatas, description);
    });

    it("reverts when voting period has not ended", async function () {
      await governance.connect(alice).vote(0, 1);

      await expect(
        governance.connect(owner).execute(0)
      ).to.be.revertedWithCustomError(governance, "OnlyExecuteAfterEnd");
    });

    it("reverts when forVotes <= againstVotes", async function () {
      // Alice votes FOR (2M), Bob votes AGAINST (5M)
      await governance.connect(alice).vote(0, 1);
      await governance.connect(bob).vote(0, 2);

      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY + 1]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await expect(
        governance.connect(owner).execute(0)
      ).to.be.revertedWithCustomError(governance, "NotSucceeded");
    });

    it("reverts when quorum not met", async function () {
      // Create new scenario with low votes
      const poorAlice = (await ethers.getSigners())[6];
      await cafe.mint(poorAlice.address, ethers.parseEther("100000"));
      await cafe.connect(poorAlice).delegate(poorAlice.address);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Low vote proposal";

      await governance.connect(alice).propose(targets, values, calldatas, description);
      const proposalId = 1;

      // Only poor alice votes (100k < 1M quorum from 10M total)
      await governance.connect(poorAlice).vote(proposalId, 1);

      const proposal = await governance.getProposal(proposalId);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY + 1]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await expect(
        governance.connect(owner).execute(proposalId)
      ).to.be.revertedWithCustomError(governance, "QuorumNotMet");
    });

    it("reverts when timelock has not elapsed", async function () {
      await governance.connect(alice).vote(0, 1);
      await governance.connect(bob).vote(0, 1);

      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      // Try to execute without waiting for timelock
      await expect(
        governance.connect(owner).execute(0)
      ).to.be.revertedWithCustomError(governance, "TimelockNotElapsed");
    });

    it("succeeds after timelock elapsed and conditions met", async function () {
      // Get enough votes to pass and meet quorum
      await governance.connect(alice).vote(0, 1);
      await governance.connect(bob).vote(0, 1);

      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY + 1]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await expect(
        governance.connect(owner).execute(0)
      ).to.emit(governance, "ProposalExecuted");

      const executedProposal = await governance.getProposal(0);
      expect(executedProposal.executed).to.be.true;
    });

    it("can execute proposals that call setRewardRate on farm", async function () {
      await governance.connect(alice).vote(0, 1);
      await governance.connect(bob).vote(0, 1);

      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY + 1]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      const newRate = ethers.parseEther("2");
      await governance.connect(owner).execute(0);

      // Verify the reward rate was changed
      const updatedRate = await mockFarm.cafePerSecond();
      expect(updatedRate).to.equal(newRate);
    });
  });

  describe("cancel", function () {
    beforeEach(async function () {
      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      await governance.connect(alice).propose(targets, values, calldatas, description);
    });

    it("only proposer can cancel", async function () {
      await expect(
        governance.connect(bob).cancel(0)
      ).to.be.revertedWithCustomError(governance, "OnlyProposer");
    });

    it("proposer can cancel", async function () {
      await expect(
        governance.connect(alice).cancel(0)
      ).to.emit(governance, "ProposalCanceled");
    });

    it("reverts when trying to cancel executed proposal", async function () {
      // Get enough votes
      await governance.connect(alice).vote(0, 1);
      await governance.connect(bob).vote(0, 1);

      // Mine past voting period
      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      // Increase time and execute
      await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY + 1]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await governance.connect(owner).execute(0);

      // Try to cancel executed proposal
      await expect(
        governance.connect(alice).cancel(0)
      ).to.be.revertedWithCustomError(governance, "InvalidProposal");
    });
  });

  describe("state", function () {
    beforeEach(async function () {
      const targets = [owner.address];
      const values = [0];
      const calldatas = ["0x"];
      const description = "Test proposal";

      await governance.connect(alice).propose(targets, values, calldatas, description);
    });

    it("returns Pending or Active state right after proposal", async function () {
      const state = await governance.state(0);
      // Could be either Pending (0) or Active (1) depending on exact block timing
      expect([0n, 1n]).to.include(state);
    });

    it("returns Active state during voting period", async function () {
      await governance.connect(alice).vote(0, 1);

      const state = await governance.state(0);
      expect(state).to.equal(1);  // Active
    });

    it("returns Succeeded when forVotes > againstVotes and quorum met", async function () {
      await governance.connect(alice).vote(0, 1);
      await governance.connect(bob).vote(0, 1);

      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      const state = await governance.state(0);
      expect(state).to.equal(2);  // Succeeded
    });

    it("returns Defeated when forVotes <= againstVotes", async function () {
      await governance.connect(alice).vote(0, 1);  // 2M
      await governance.connect(bob).vote(0, 2);    // 5M against

      const proposal = await governance.getProposal(0);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      const state = await governance.state(0);
      expect(state).to.equal(3);  // Defeated
    });

    it("returns Executed when proposal is executed", async function () {
      const MockFarm = await ethers.getContractFactory("MockCoffeeCacaoFarm");
      const mockFarm = await MockFarm.deploy();

      const targets = [await mockFarm.getAddress()];
      const values = [0];
      const calldatas = [
        mockFarm.interface.encodeFunctionData("setRewardRate", [ethers.parseEther("2")])
      ];
      const description = "Execute proposal";

      await governance.connect(alice).propose(targets, values, calldatas, description);
      const proposalId = 1;

      await governance.connect(alice).vote(proposalId, 1);
      await governance.connect(bob).vote(proposalId, 1);

      const proposal = await governance.getProposal(proposalId);
      const blocksToMine = Number(proposal.endBlock) - (await ethers.provider.getBlockNumber()) + 1;
      await ethers.provider.send("hardhat_mine", [`0x${blocksToMine.toString(16)}`]);

      await ethers.provider.send("evm_increaseTime", [TIMELOCK_DELAY + 1]);
      await ethers.provider.send("hardhat_mine", ["0x1"]);

      await governance.connect(owner).execute(proposalId);

      const state = await governance.state(proposalId);
      expect(state).to.equal(4);  // Executed
    });

    it("returns Canceled when proposal is canceled", async function () {
      await governance.connect(alice).cancel(0);

      const state = await governance.state(0);
      expect(state).to.equal(5);  // Canceled
    });
  });

  describe("Constants", function () {
    it("defines correct VOTING_PERIOD", async function () {
      const votingPeriod = await governance.VOTING_PERIOD();
      expect(votingPeriod).to.equal(7n * 24n * 60n * 60n);  // 7 days in seconds
    });

    it("defines correct TIMELOCK_DELAY", async function () {
      expect(await governance.TIMELOCK_DELAY()).to.equal(TIMELOCK_DELAY);
    });

    it("defines correct PROPOSAL_THRESHOLD", async function () {
      expect(await governance.PROPOSAL_THRESHOLD()).to.equal(ethers.parseEther("1000000"));
    });

    it("defines correct QUORUM_PERCENTAGE", async function () {
      expect(await governance.QUORUM_PERCENTAGE()).to.equal(QUORUM_PERCENTAGE);
    });
  });
});
