// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICafeToken {
    function getVotes(address account) external view returns (uint256);
    function getPastVotes(address account, uint256 blockNumber) external view returns (uint256);
    function totalSupply() external view returns (uint256);
}

/// @title CafeGovernance
/// @notice On-chain governance for CaféSwap protocol with timelock
/// @dev Token holders can create proposals, vote, and execute after timelock period
contract CafeGovernance {
    /// @notice Proposal states
    enum ProposalState {
        Pending,
        Active,
        Succeeded,
        Defeated,
        Executed,
        Canceled
    }
    
    /// @notice Proposal data structure
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        address[] targets;
        uint256[] values;
        bytes[] calldatas;
        uint256 startBlock;
        uint256 endBlock;
        uint256 creationTime;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 abstainVotes;
        bool executed;
        bool canceled;
    }
    
    /// @notice CAFE token address
    address public immutable cafe;
    
    /// @notice Mapping from proposal ID to proposal
    mapping(uint256 => Proposal) public proposals;
    
    /// @notice Mapping from proposal ID to voter to whether they voted
    mapping(uint256 => mapping(address => bool)) public hasVoted;
    
    /// @notice Mapping from proposal ID to voter to vote type (1=For, 2=Against, 3=Abstain)
    mapping(uint256 => mapping(address => uint8)) public voteChoice;
    
    /// @notice Total number of proposals created
    uint256 public proposalCount;
    
    /// @notice Minimum CAFE tokens required to create a proposal (1% of 100M)
    uint256 public constant PROPOSAL_THRESHOLD = 1_000_000 * 10**18;
    
    /// @notice Voting period duration (7 days in blocks, ~12s per block)
    uint256 public constant VOTING_PERIOD = 50400; // ~7 days
    
    /// @notice Timelock delay before execution (48 hours)
    uint256 public constant TIMELOCK_DELAY = 48 hours;
    
    /// @notice Quorum percentage required (10% of total supply)
    uint256 public constant QUORUM_PERCENTAGE = 10;
    
    error InsufficientProposalThreshold();
    error InvalidArrayLength();
    error ProposalNotActive();
    error AlreadyVoted();
    error InvalidVoteType();
    error ProposalNotSucceeded();
    error TimelockNotElapsed();
    error AlreadyExecuted();
    error QuorumNotReached();
    error OnlyProposer();
    error ProposalAlreadyCanceled();
    error ExecutionFailed(uint256 callIndex, bytes returnData);
    
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string description,
        uint256 startBlock,
        uint256 endBlock,
        uint256 creationTime
    );
    event VoteCast(
        address indexed voter,
        uint256 indexed proposalId,
        uint8 voteType,
        uint256 votes
    );
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCanceled(uint256 indexed proposalId);
    
    constructor(address _cafe) {
        cafe = _cafe;
    }
    
    /// @notice Creates a new proposal
    /// @dev Requires proposer to have >= PROPOSAL_THRESHOLD tokens
    /// @param targets Array of target contract addresses
    /// @param values Array of ETH values to send
    /// @param calldatas Array of function call data
    /// @param description Proposal description
    /// @return proposalId The ID of the created proposal
    function propose(
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas,
        string memory description
    ) external returns (uint256 proposalId) {
        // Check proposer has enough voting power
        if (ICafeToken(cafe).getVotes(msg.sender) < PROPOSAL_THRESHOLD) {
            revert InsufficientProposalThreshold();
        }
        
        // Validate arrays
        if (targets.length != values.length || targets.length != calldatas.length) {
            revert InvalidArrayLength();
        }
        if (targets.length == 0) revert InvalidArrayLength();
        
        proposalId = ++proposalCount;
        
        Proposal storage proposal = proposals[proposalId];
        proposal.id = proposalId;
        proposal.proposer = msg.sender;
        proposal.description = description;
        proposal.targets = targets;
        proposal.values = values;
        proposal.calldatas = calldatas;
        proposal.startBlock = block.number;
        proposal.endBlock = block.number + VOTING_PERIOD;
        proposal.creationTime = block.timestamp;
        proposal.executed = false;
        proposal.canceled = false;
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            targets,
            values,
            description,
            proposal.startBlock,
            proposal.endBlock,
            proposal.creationTime
        );
    }
    
    /// @notice Casts a vote on a proposal
    /// @param proposalId The proposal ID
    /// @param voteType Vote type: 1=For, 2=Against, 3=Abstain
    function vote(uint256 proposalId, uint8 voteType) external {
        Proposal storage proposal = proposals[proposalId];
        
        // Check proposal is active
        if (block.number > proposal.endBlock) revert ProposalNotActive();
        if (proposal.canceled) revert ProposalNotActive();
        
        // Check voter hasn't voted
        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();
        
        // Validate vote type
        if (voteType < 1 || voteType > 3) revert InvalidVoteType();
        
        // Get voting power at proposal start block
        uint256 votes = ICafeToken(cafe).getPastVotes(msg.sender, proposal.startBlock);
        
        // Record vote
        hasVoted[proposalId][msg.sender] = true;
        voteChoice[proposalId][msg.sender] = voteType;
        
        if (voteType == 1) {
            proposal.forVotes += votes;
        } else if (voteType == 2) {
            proposal.againstVotes += votes;
        } else if (voteType == 3) {
            proposal.abstainVotes += votes;
        }
        
        emit VoteCast(msg.sender, proposalId, voteType, votes);
    }
    
    /// @notice Executes a successful proposal after timelock
    /// @param proposalId The proposal ID to execute
    function execute(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        // Check voting period has ended
        if (block.number <= proposal.endBlock) revert ProposalNotActive();
        
        // Check not already executed
        if (proposal.executed) revert AlreadyExecuted();
        
        // Check not canceled
        if (proposal.canceled) revert ProposalAlreadyCanceled();
        
        // Check proposal succeeded (more for than against)
        if (proposal.forVotes <= proposal.againstVotes) revert ProposalNotSucceeded();
        
        // Check quorum
        uint256 totalSupply = ICafeToken(cafe).totalSupply();
        uint256 quorum = (totalSupply * QUORUM_PERCENTAGE) / 100;
        if (proposal.forVotes < quorum) revert QuorumNotReached();
        
        // Check timelock has elapsed
        if (block.timestamp < proposal.creationTime + TIMELOCK_DELAY) {
            revert TimelockNotElapsed();
        }
        
        // Mark as executed
        proposal.executed = true;
        
        // Execute all calls
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            (bool success, bytes memory returnData) = proposal.targets[i].call{value: proposal.values[i]}(
                proposal.calldatas[i]
            );
            if (!success) revert ExecutionFailed(i, returnData);
        }
        
        emit ProposalExecuted(proposalId);
    }
    
    /// @notice Cancels a proposal (only by proposer)
    /// @param proposalId The proposal ID to cancel
    function cancel(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        
        if (msg.sender != proposal.proposer) revert OnlyProposer();
        if (proposal.executed) revert AlreadyExecuted();
        if (proposal.canceled) revert ProposalAlreadyCanceled();
        
        proposal.canceled = true;
        
        emit ProposalCanceled(proposalId);
    }
    
    /// @notice Returns the state of a proposal
    /// @param proposalId The proposal ID
    /// @return The current state of the proposal
    function state(uint256 proposalId) external view returns (ProposalState) {
        Proposal storage proposal = proposals[proposalId];
        
        if (proposal.canceled) {
            return ProposalState.Canceled;
        }
        
        if (proposal.executed) {
            return ProposalState.Executed;
        }
        
        if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        }
        
        // Voting ended
        uint256 totalSupply = ICafeToken(cafe).totalSupply();
        uint256 quorum = (totalSupply * QUORUM_PERCENTAGE) / 100;
        
        if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < quorum) {
            return ProposalState.Defeated;
        }
        
        return ProposalState.Succeeded;
    }
    
    /// @notice Returns proposal details
    function getProposal(uint256 proposalId) external view returns (
        address proposer,
        string memory description,
        uint256 startBlock,
        uint256 endBlock,
        uint256 creationTime,
        uint256 forVotes,
        uint256 againstVotes,
        uint256 abstainVotes,
        bool executed,
        bool canceled
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (
            proposal.proposer,
            proposal.description,
            proposal.startBlock,
            proposal.endBlock,
            proposal.creationTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.abstainVotes,
            proposal.executed,
            proposal.canceled
        );
    }
    
    /// @notice Returns proposal actions
    function getProposalActions(uint256 proposalId) external view returns (
        address[] memory targets,
        uint256[] memory values,
        bytes[] memory calldatas
    ) {
        Proposal storage proposal = proposals[proposalId];
        return (proposal.targets, proposal.values, proposal.calldatas);
    }
}
