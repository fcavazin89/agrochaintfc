// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CafeGovernance
/// @notice On-chain governance contract for the Coffee/Cacao protocol with timelock
/// @dev Implements voting on proposals with 7-day voting period and 48-hour timelock
/// @custom:requirements FEAT-004: CafeGovernance with timelock and deployment script
contract CafeGovernance is ReentrancyGuard {
    // Constants
    uint256 public constant VOTING_PERIOD = 7 days;
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    uint256 public constant PROPOSAL_THRESHOLD = 1_000_000e18;  // 1M CAFE
    uint256 public constant QUORUM_PERCENTAGE = 10;  // 10% of total supply

    // Proposal state enum
    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Canceled
    }

    // Vote type constants
    uint8 public constant VOTE_FOR = 1;
    uint8 public constant VOTE_AGAINST = 2;
    uint8 public constant VOTE_ABSTAIN = 3;

    // Proposal struct
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        uint256 startBlock;
        uint256 endBlock;
        uint256 creationTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
        address[] targets;
        bytes[] calldatas;
        uint256[] values;
    }

    // State variables
    ICafeToken public cafe;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // Custom errors
    error InsufficientVotingPower();
    error InvalidProposal();
    error ArrayLengthMismatch();
    error EmptyProposal();
    error NotInVotingPeriod();
    error AlreadyVoted();
    error VotingNotEnded();
    error NotSucceeded();
    error QuorumNotMet();
    error TimelockNotElapsed();
    error ExecutionFailed();
    error OnlyProposer();
    error InvalidVoteType();
    error OnlyExecuteAfterEnd();

    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        bytes[] calldatas,
        string description
    );

    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 support,
        uint256 votes,
        string reason
    );

    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);

    /// @notice Initializes the governance contract
    /// @param _cafe Address of the CAFE governance token
    constructor(address _cafe) {
        cafe = ICafeToken(_cafe);
    }

    /// @notice Creates a new proposal
    /// @param targets Array of target addresses to call
    /// @param values Array of ETH values to send with each call
    /// @param calldatas Array of call data for each target
    /// @param description Description of the proposal
    /// @return proposalId The ID of the created proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256) {
        // Check voting power threshold
        if (cafe.balanceOf(msg.sender) < PROPOSAL_THRESHOLD) {
            revert InsufficientVotingPower();
        }

        // Check array lengths match and are not empty
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert ArrayLengthMismatch();
        }
        if (targets.length == 0) {
            revert EmptyProposal();
        }

        uint256 proposalId = proposalCount++;
        uint256 startBlock = block.number;
        uint256 endBlock = startBlock + (VOTING_PERIOD / 12);  // ~12s per block

        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.startBlock = startBlock;
        proposal.endBlock = endBlock;
        proposal.creationTime = block.timestamp;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;

        emit ProposalCreated(proposalId, msg.sender, targets, values, calldatas, description);

        return proposalId;
    }

    /// @notice Casts a vote on a proposal
    /// @param proposalId The ID of the proposal to vote on
    /// @param voteType 1=For, 2=Against, 3=Abstain
    function vote(uint256 proposalId, uint8 voteType) external {
        Proposal storage proposal = proposals[proposalId];

        // Check voting period
        if (block.number < proposal.startBlock || block.number > proposal.endBlock) {
            revert NotInVotingPeriod();
        }

        // Check vote type
        if (voteType != VOTE_FOR && voteType != VOTE_AGAINST && voteType != VOTE_ABSTAIN) {
            revert InvalidVoteType();
        }

        // Check not already voted
        if (hasVoted[proposalId][msg.sender]) {
            revert AlreadyVoted();
        }

        // Get voting power at startBlock
        uint256 votes = cafe.getPastVotes(msg.sender, proposal.startBlock);
        if (votes == 0) {
            revert InsufficientVotingPower();
        }

        // Record vote
        hasVoted[proposalId][msg.sender] = true;

        if (voteType == VOTE_FOR) {
            proposal.forVotes += votes;
        } else if (voteType == VOTE_AGAINST) {
            proposal.againstVotes += votes;
        } else {
            proposal.abstainVotes += votes;
        }

        emit VoteCast(msg.sender, proposalId, voteType, votes, "");
    }

    /// @notice Executes a proposal after voting ends and timelock expires
    /// @param proposalId The ID of the proposal to execute
    function execute(uint256 proposalId) external nonReentrant {
        Proposal storage proposal = proposals[proposalId];

        // Check voting has ended
        if (block.number <= proposal.endBlock) {
            revert OnlyExecuteAfterEnd();
        }

        // Check not already executed or canceled
        if (proposal.executed || proposal.canceled) {
            revert InvalidProposal();
        }

        // Check proposal succeeded (for > against)
        if (proposal.forVotes <= proposal.againstVotes) {
            revert NotSucceeded();
        }

        // Check quorum met (forVotes >= 10% of totalSupply)
        uint256 totalSupply = cafe.totalSupply();
        uint256 quorumVotes = (totalSupply * QUORUM_PERCENTAGE) / 100;
        if (proposal.forVotes < quorumVotes) {
            revert QuorumNotMet();
        }

        // Check timelock has elapsed (48 hours)
        if (block.timestamp < proposal.creationTime + TIMELOCK_DELAY) {
            revert TimelockNotElapsed();
        }

        // Execute all calls
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, ) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            if (!success) {
                revert ExecutionFailed();
            }
        }

        proposal.executed = true;
        emit ProposalExecuted(proposalId);
    }

    /// @notice Cancels a proposal (only by proposer)
    /// @param proposalId The ID of the proposal to cancel
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        if (msg.sender != proposal.proposer) {
            revert OnlyProposer();
        }

        if (proposal.executed) {
            revert InvalidProposal();
        }

        proposal.canceled = true;
        emit ProposalCanceled(proposalId);
    }

    /// @notice Returns the current state of a proposal
    /// @param proposalId The ID of the proposal
    /// @return The current state of the proposal
    function state(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.canceled) {
            return ProposalState.Canceled;
        }

        if (proposal.executed) {
            return ProposalState.Executed;
        }

        if (block.number < proposal.startBlock) {
            return ProposalState.Pending;
        }

        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }

        // Voting has ended
        if (proposal.forVotes <= proposal.againstVotes) {
            return ProposalState.Defeated;
        }

        uint256 totalSupply = cafe.totalSupply();
        uint256 quorumVotes = (totalSupply * QUORUM_PERCENTAGE) / 100;
        if (proposal.forVotes < quorumVotes) {
            return ProposalState.Defeated;
        }

        return ProposalState.Succeeded;
    }

    /// @notice Returns proposal details
    /// @param proposalId The ID of the proposal
    /// @return The proposal struct
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }
}

/// @notice Interface for CAFE token
interface ICafeToken {
    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
}
