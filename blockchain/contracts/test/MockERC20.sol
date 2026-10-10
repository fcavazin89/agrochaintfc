// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockERC20
/// @notice Full ERC20 mock token for testing, supports minting by anyone
contract MockERC20 is ERC20 {
    uint8 private _decimals;

    /// @notice Deploy mock token with name and symbol
    constructor(string memory _name, string memory _symbol) ERC20(_name, _symbol) {
        _decimals = 18;
    }

    /// @notice Mint tokens to any address (test helper)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}
