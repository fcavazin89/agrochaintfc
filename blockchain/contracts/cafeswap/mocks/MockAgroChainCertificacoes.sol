// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAgroChainCertificacoes {
    mapping(bytes32 => bool) public validCerts;
    
    function addValidCert(bytes32 certId) external {
        validCerts[certId] = true;
    }
    
    function certificacaoValida(bytes32 id) external view returns (bool) {
        return validCerts[id];
    }
}
