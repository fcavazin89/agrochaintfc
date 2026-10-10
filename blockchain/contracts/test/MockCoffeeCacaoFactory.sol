// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/// @title MockCoffeeCacaoFactory
/// @notice Mock factory for testing CoffeeCacaoFarm; allows any token to be added as valid
contract MockCoffeeCacaoFactory {
    mapping(address => bool) public validPools;

    /// @notice Add a token as a valid pool for testing
    function addValidPool(address token) external {
        validPools[token] = true;
    }

    /// @notice Check if a token is a valid Coffee/Cacao pool
    function isCertifiedCoffeeOrCacao(address token) external view returns (bool) {
        return validPools[token];
    }
}
