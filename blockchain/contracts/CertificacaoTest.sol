// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

/**
 * @dev Minimal test contract for /certificacao page MetaMask integration testing
 * Simulates the verifier contract interface expected by the DApp
 */
contract CertificacaoTest {
    event CertificadoEmitido(bytes32 indexed batchId, address indexed farmer, uint256 weight, string tipoProto);

    mapping(bytes32 => bool) public certificados;

    /**
     * @dev Emitir certificado (matches DApp's expected function)
     * @param batchId ID do lote (32 bytes)
     * @param weight Peso em KG
     * @param tipoProto Tipo de produto (Coffee/Cacao)
     */
    function emitirCertificado(
        bytes32 batchId,
        uint256 weight,
        string memory tipoProto
    ) external returns (bool) {
        require(weight > 0, "Weight must be > 0");
        require(bytes(tipoProto).length > 0, "Type required");

        certificados[batchId] = true;
        emit CertificadoEmitido(batchId, msg.sender, weight, tipoProto);

        return true;
    }

    /**
     * @dev Verificar se certificado foi emitido
     */
    function verificarCertificado(bytes32 batchId) external view returns (bool) {
        return certificados[batchId];
    }

    /**
     * @dev Test fallback - matches function selector from DApp (0x89c67d02)
     * This matches the selector the /certificacao page sends
     */
    fallback() external {
        // Accept any call silently for testing
    }

    receive() external payable {
        // Accept ETH
    }
}
