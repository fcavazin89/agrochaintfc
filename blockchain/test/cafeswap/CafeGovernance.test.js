import { expect } from "chai";
import hre from "hardhat";

describe("CafeGovernance", function () {
  let cafe, governance, farm;
  let owner, proposer, voter1, voter2;
  
  beforeEach(async function () {
    [owner, proposer, voter1, voter2] = await hre.ethers.getSigners();
    
    // Deploy CAFE token
    const CafeToken = await hre.ethers.getContractFactory("CafeToken");
    cafe = await CafeToken.deploy();
    await cafe.waitForDeployment();
    
    // Deploy governance
    const Governance = await hre.ethers.getContractFactory("CafeGovernance");
    governance = await Governance.deploy(await cafe.getAddress());
    await governance.waitForDeployment();
    
    // Deploy farm for testing governance calls
    const Farm = await hre.ethers.getContractFactory("CafeFarm");
    farm = await Farm.deploy(await cafe.getAddress(), hre.ethers.parseEther("1"));
    await farm.waitForDeployment();
    
    // Mint tokens and delegate
    const MINTER_ROLE = await cafe.MINTER_ROLE();
    await cafe.grantRole(MINTER_ROLE, owner.address);
    
    // Mint enough for proposal threshold (1M tokens)
    await cafe.mint(proposer.address, hre.ethers.parseEther("2000000"));
    await cafe.mint(voter1.address, hre.ethers.parseEther("10000000"));
    await cafe.mint(voter2.address, hre.ethers.parseEther("5000000"));
    
    // Delegate to self
    await cafe.connect(proposer).delegate(proposer.address);
    await cafe.connect(voter1).delegate(voter1.address);
    await cafe.connect(voter2).delegate(voter2.address);
    
    // Mine a block to capture voting power
    await hre.network.provider.send("hardhat_mine", ["0x1"]);
  });
  
  describe("Proposal Creation", function () {
    it("Should create proposal with sufficient tokens", async function () {
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      const description = "Increase reward rate to 2 CAFE/s";
      
      const tx = await governance.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      const receipt = await tx.wait();
      const event = receipt.logs.find(
        log => log.fragment && log.fragment.name === "ProposalCreated"
      );
      
      expect(event).to.not.be.undefined;
      expect(await governance.proposalCount()).to.equal(1);
    });
    
    it("Should revert when proposer has insufficient tokens", async function () {
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      const description = "Test";
      
      await expect(
        governance.connect(voter2).propose(targets, values, calldatas, description)
      ).to.be.revertedWithCustomError(governance, "InsufficientProposalThreshold");
    });
    
    it("Should store creation time for timelock", async function () {
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      const description = "Test";
      
      const blockBefore = await hre.ethers.provider.getBlock("latest");
      
      await governance.connect(proposer).propose(targets, values, calldatas, description);
      
      const proposal = await governance.getProposal(1);
      expect(proposal.creationTime).to.be.gte(blockBefore.timestamp);
    });
  });
  
  describe("Voting", function () {
    let proposalId;
    
    beforeEach(async function () {
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      const description = "Increase reward rate";
      
      const tx = await governance.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      proposalId = 1;
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
      const voter1Votes = await cafe.getPastVotes(
        voter1.address,
        (await governance.proposals(proposalId)).startBlock
      );
      
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
      
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      const description = "Increase reward rate";
      
      await governance.connect(proposer).propose(
        targets,
        values,
        calldatas,
        description
      );
      
      proposalId = 1;
      
      // Vote For with majority
      await governance.connect(voter1).vote(proposalId, 1);
    });
    
    it("Should revert when timelock not elapsed", async function () {
      // Wait for voting period
      await hre.network.provider.send("hardhat_mine", ["0xc3f1"]); // ~50400 blocks
      
      await expect(
        governance.execute(proposalId)
      ).to.be.revertedWithCustomError(governance, "TimelockNotElapsed");
    });
    
    it("Should execute after timelock", async function () {
      // Wait for voting period
      await hre.network.provider.send("hardhat_mine", ["0xc3f1"]);
      
      // Wait for timelock (48 hours)
      await hre.network.provider.send("evm_increaseTime", [48 * 3600]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      await governance.execute(proposalId);
      
      const proposal = await governance.getProposal(proposalId);
      expect(proposal.executed).to.be.true;
      
      // Verify the call was executed
      expect(await farm.cafePerSecond()).to.equal(hre.ethers.parseEther("2"));
    });
    
    it("Should revert when quorum not reached", async function () {
      // Create new proposal
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("3")])
      ];
      
      await governance.connect(proposer).propose(targets, values, calldatas, "Test");
      
      const newProposalId = 2;
      
      // Vote with proposer only (not enough for quorum)
      await governance.connect(proposer).vote(newProposalId, 1);
      
      // Wait for voting and timelock
      await hre.network.provider.send("hardhat_mine", ["0xc3f1"]);
      await hre.network.provider.send("evm_increaseTime", [48 * 3600]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
      await expect(
        governance.execute(newProposalId)
      ).to.be.revertedWithCustomError(governance, "QuorumNotReached");
    });
    
    it("Should revert when proposal defeated", async function () {
      // Create new proposal
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("3")])
      ];
      
      await governance.connect(proposer).propose(targets, values, calldatas, "Test");
      
      const newProposalId = 2;
      
      // Vote against
      await governance.connect(voter1).vote(newProposalId, 2);
      
      // Wait for voting and timelock
      await hre.network.provider.send("hardhat_mine", ["0xc3f1"]);
      await hre.network.provider.send("evm_increaseTime", [48 * 3600]);
      await hre.network.provider.send("hardhat_mine", ["0x1"]);
      
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
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      
      await governance.connect(proposer).propose(targets, values, calldatas, "Test");
      proposalId = 1;
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
      const targets = [await farm.getAddress()];
      const values = [0];
      const calldatas = [
        farm.interface.encodeFunctionData("setRewardRate", [hre.ethers.parseEther("2")])
      ];
      
      await governance.connect(proposer).propose(targets, values, calldatas, "Test");
      proposalId = 1;
    });
    
    it("Should return Active during voting", async function () {
      expect(await governance.state(proposalId)).to.equal(1); // Active
    });
    
    it("Should return Succeeded after voting with majority", async function () {
      await governance.connect(voter1).vote(proposalId, 1);
      
      await hre.network.provider.send("hardhat_mine", ["0xc3f1"]);
      
      expect(await governance.state(proposalId)).to.equal(2); // Succeeded
    });
    
    it("Should return Defeated when no quorum", async function () {
      await governance.connect(proposer).vote(proposalId, 1);
      
      await hre.network.provider.send("hardhat_mine", ["0xc3f1"]);
      
      expect(await governance.state(proposalId)).to.equal(3); // Defeated
    });
    
    it("Should return Canceled after cancel", async function () {
      await governance.connect(proposer).cancel(proposalId);
      
      expect(await governance.state(proposalId)).to.equal(5); // Canceled
    });
  });
});
