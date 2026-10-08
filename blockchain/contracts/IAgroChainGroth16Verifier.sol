// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Interface implemented by the verifier generated from the Circom
/// circuit. Public inputs: [score commitment, minimum score, lot, standard,
/// laboratory-report hash], represented in the BN254 scalar field.
interface IAgroChainGroth16Verifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[5] calldata publicSignals
    ) external view returns (bool);
}
