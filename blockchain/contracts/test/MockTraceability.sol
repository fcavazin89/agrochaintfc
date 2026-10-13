// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/// @title MockTraceability
/// @notice Mock contract for testing CoffeeCacaoSwapFactory
contract MockTraceability {
    mapping(bytes32 => mapping(bool => bool)) private batchCertifications;
    
    /// @notice Set batch certification status for testing
    function setBatchCertification(bytes32 batchId, bool isCoffee, bool isCertified) external {
        batchCertifications[batchId][isCoffee] = isCertified;
    }
    
    /// @notice Mock implementation of isBatchCertified for testing
    function isBatchCertified(bytes32 batchId, bool isCoffee) external view returns (bool) {
        return batchCertifications[batchId][isCoffee];
    }
}