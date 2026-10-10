// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title CafeToken
/// @notice Governance token for CoffeeCacaoSwap DEX with fixed supply and voting power
/// @dev ERC20 token with 100M max supply, voting capabilities, and restricted minting
/// @custom:requirements FEAT-001: Core token contracts for CoffeeCacaoSwap DEX
contract CafeToken is ERC20, ERC20Votes, ERC20Permit, AccessControl {
    /// @notice Maximum total supply of CAFE tokens (100 million)
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**18;
    
    /// @notice Role identifier for addresses authorized to mint tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    error MaxSupplyExceeded();
    error OnlyMinter();
    
    /// @notice Emitted when tokens are minted
    event TokensMinted(address indexed to, uint256 amount);
    
    /// @notice Deploys the CAFE token and grants admin role to deployer
    constructor() 
        ERC20("Cafe Token", "CAFE") 
        ERC20Permit("Cafe Token") 
    {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    /// @notice Mints new CAFE tokens to a specified address
    /// @dev Can only be called by addresses with MINTER_ROLE, respects MAX_SUPPLY
    /// @param to The address that will receive the minted tokens
    /// @param amount The amount of tokens to mint (in wei)
    function mint(address to, uint256 amount) external {
        if (!hasRole(MINTER_ROLE, msg.sender)) revert OnlyMinter();
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /// @notice Returns the current block number for voting snapshots
    /// @dev Required override for ERC20Votes
    function clock() public view override returns (uint48) {
        return uint48(block.number);
    }
    
    /// @notice Returns the clock mode for voting (block number based)
    /// @dev Required override for ERC20Votes
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=blocknumber&from=default";
    }
    
    /// @dev Required override due to multiple inheritance
    function _update(address from, address to, uint256 amount) 
        internal 
        override(ERC20, ERC20Votes) 
    {
        super._update(from, to, amount);
    }
    
    /// @dev Required override due to multiple inheritance
    function nonces(address owner) 
        public 
        view 
        override(ERC20Permit, Nonces) 
        returns (uint256) 
    {
        return super.nonces(owner);
    }
}
