// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CarbonCredits
/// @notice Emissão e transferência de créditos de carbono por lote agrícola.
///         1 crédito por hectare; apenas o proprietário pode emitir.
contract CarbonCredits is Ownable {
    /// @dev Créditos emitidos por loteId (bytes32)
    mapping(bytes32 => uint256) public lotCredits;

    /// @dev Saldo de créditos por endereço
    mapping(address => uint256) public balances;

    event CreditIssued(
        bytes32 indexed loteId,
        address indexed produtor,
        uint256 creditos,
        uint256 timestamp
    );

    event CreditTransferred(
        bytes32 indexed loteId,
        address indexed de,
        address indexed para,
        uint256 quantidade,
        uint256 timestamp
    );

    error HectaresInvalidos();
    error LoteJaEmitido();
    error SaldoInsuficiente();
    error DestinatarioInvalido();

    constructor() Ownable(msg.sender) {}

    /// @notice Emite créditos de carbono para um lote (1 crédito por hectare).
    /// @param loteId  Identificador do lote (bytes32)
    /// @param hectares Área do lote em hectares
    /// @param produtor Endereço do produtor que receberá os créditos
    function issueCredits(
        bytes32 loteId,
        uint256 hectares,
        address produtor
    ) external onlyOwner {
        if (hectares == 0) revert HectaresInvalidos();
        if (lotCredits[loteId] > 0) revert LoteJaEmitido();
        if (produtor == address(0)) revert DestinatarioInvalido();

        uint256 creditos = hectares; // 1 crédito por hectare
        lotCredits[loteId] = creditos;
        balances[produtor] += creditos;

        emit CreditIssued(loteId, produtor, creditos, block.timestamp);
    }

    /// @notice Transfere créditos de carbono de um lote para um destinatário.
    /// @param loteId      Identificador do lote
    /// @param destinatario Endereço do destinatário
    /// @param quantidade   Quantidade de créditos a transferir
    function transferCredits(
        bytes32 loteId,
        address destinatario,
        uint256 quantidade
    ) external {
        if (destinatario == address(0)) revert DestinatarioInvalido();
        if (balances[msg.sender] < quantidade) revert SaldoInsuficiente();

        balances[msg.sender] -= quantidade;
        balances[destinatario] += quantidade;

        emit CreditTransferred(loteId, msg.sender, destinatario, quantidade, block.timestamp);
    }

    /// @notice Retorna o número de créditos emitidos para um lote.
    /// @param loteId Identificador do lote
    /// @return Quantidade de créditos emitidos para o lote
    function getCredits(bytes32 loteId) external view returns (uint256) {
        return lotCredits[loteId];
    }
}
