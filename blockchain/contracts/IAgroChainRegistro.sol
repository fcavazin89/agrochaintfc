// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgroChainRegistro {
    function BN254_ESCALAR() external pure returns (uint256);

    function registrarCertificacaoZK(
        bytes32 id,
        bytes32 loteId,
        string calldata tipo,
        bytes32 hashLaudo,
        uint256 validoAte,
        bytes32 compromissoScore,
        uint8 notaMinima,
        address titular,
        address emissor
    ) external;

    function revogarCertificacaoZK(bytes32 id, bytes32 motivoHash, address responsavel) external;
}
