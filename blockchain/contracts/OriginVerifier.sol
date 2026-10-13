// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title OriginVerifier - Verificação de Origem de Lotes com Prova Geolocalizada
/// @notice Contrato para registrar e verificar a origem geográfica de lotes agrícolas
/// @dev Implementa verificação com coordenadas geolocalizada e prova de origem
contract OriginVerifier is Ownable, ReentrancyGuard {
    
    /// @notice Status possível de uma verificação de origem
    enum VerificationStatus {
        NOT_STARTED,    // 0: Não iniciada
        IN_REVIEW,      // 1: Em revisão
        APPROVED,       // 2: Aprovada
        REJECTED        // 3: Rejeitada
    }

    /// @notice Estrutura de dados para uma verificação de origem
    struct OriginVerification {
        bytes32 verificacaoId;           // ID único da verificação
        bytes32 loteId;                  // ID único do lote
        string pais;                     // País de origem
        string regiao;                   // Região/estado de origem
        uint256 latitude;                // Latitude em formato de uint256 (multiplicado por 1e6)
        uint256 longitude;               // Longitude em formato de uint256 (multiplicado por 1e6)
        string provaDeOrigem;            // Hash ou referência da prova (ex: IPFS hash)
        uint256 dataVerificacao;         // Timestamp da verificação
        VerificationStatus status;       // Status atual
        address verificadorAddress;      // Endereço do verificador
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    /// @notice Mapeamento de verificacaoId para dados da verificação
    mapping(bytes32 => OriginVerification) public verificationsById;

    /// @notice Mapeamento de loteId para verificacaoId (um lote tem uma verificação)
    mapping(bytes32 => bytes32) public verificacaoByLote;

    /// @notice Contador de verificações realizadas
    uint256 public verificacaoCounter;

    /// @notice Endereço do proprietário que pode aprovar/rejeitar verificações
    address public verificador;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando uma verificação de origem é submetida
    event OriginVerificationSubmitted(
        bytes32 indexed verificacaoId,
        bytes32 indexed loteId,
        address indexed submitter,
        string pais,
        string regiao,
        uint256 latitude,
        uint256 longitude,
        string provaDeOrigem,
        uint256 timestamp
    );

    /// @notice Emitido quando uma verificação é aprovada
    event OriginVerificationApproved(
        bytes32 indexed verificacaoId,
        bytes32 indexed loteId,
        address indexed aprovador,
        uint256 timestamp
    );

    /// @notice Emitido quando uma verificação é rejeitada
    event OriginVerificationRejected(
        bytes32 indexed verificacaoId,
        bytes32 indexed loteId,
        address indexed rejeitador,
        uint256 timestamp
    );

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    /// @notice Valida que apenas o verificador pode executar
    modifier onlyVerificador() {
        require(
            msg.sender == owner() || msg.sender == verificador,
            "OriginVerifier: Apenas o verificador pode executar"
        );
        _;
    }

    /// @notice Valida que uma verificação existe
    modifier verificacaoExists(bytes32 _verificacaoId) {
        require(
            verificationsById[_verificacaoId].verificacaoId != bytes32(0),
            "OriginVerifier: Verificacao nao existe"
        );
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    /// @notice Inicializa o contrato OriginVerifier
    constructor() Ownable(msg.sender) {}

    /// @notice Define o endereço do verificador (pode ser atualizado)
    /// @param _verificador Endereço do novo verificador
    function setVerificador(address _verificador) external onlyOwner {
        require(_verificador != address(0), "OriginVerifier: Endereco invalido");
        verificador = _verificador;
    }

    // =====================================================================
    // SUBMIT FUNCTIONS
    // =====================================================================

    /// @notice Submete uma nova verificação de origem para um lote
    /// @param _loteId ID único do lote
    /// @param _pais País de origem
    /// @param _regiao Região/estado de origem
    /// @param _latitude Latitude multiplicada por 1e6 (ex: -23.550520 = -23550520)
    /// @param _longitude Longitude multiplicada por 1e6 (ex: -46.633308 = -46633308)
    /// @param _provaDeOrigem Hash ou referência da prova (IPFS hash, etc)
    /// @return verificacaoId ID único da verificação criada
    function submitOriginVerification(
        bytes32 _loteId,
        string calldata _pais,
        string calldata _regiao,
        uint256 _latitude,
        uint256 _longitude,
        string calldata _provaDeOrigem
    ) external nonReentrant returns (bytes32) {
        require(bytes(_pais).length > 0, "OriginVerifier: Pais nao pode estar vazio");
        require(bytes(_regiao).length > 0, "OriginVerifier: Regiao nao pode estar vazia");
        require(bytes(_provaDeOrigem).length > 0, "OriginVerifier: Prova de origem nao pode estar vazia");
        require(_loteId != bytes32(0), "OriginVerifier: LoteId invalido");

        // Verifica se já existe verificação para este lote
        require(verificacaoByLote[_loteId] == bytes32(0), "OriginVerifier: Lote ja possui verificacao");

        // Gera ID único para a verificação usando keccak256
        bytes32 verificacaoId = keccak256(
            abi.encodePacked(_loteId, msg.sender, block.timestamp, verificacaoCounter)
        );

        verificacaoCounter++;

        // Cria nova verificação com status NOT_STARTED
        verificationsById[verificacaoId] = OriginVerification({
            verificacaoId: verificacaoId,
            loteId: _loteId,
            pais: _pais,
            regiao: _regiao,
            latitude: _latitude,
            longitude: _longitude,
            provaDeOrigem: _provaDeOrigem,
            dataVerificacao: block.timestamp,
            status: VerificationStatus.IN_REVIEW,
            verificadorAddress: msg.sender
        });

        verificacaoByLote[_loteId] = verificacaoId;

        emit OriginVerificationSubmitted(
            verificacaoId,
            _loteId,
            msg.sender,
            _pais,
            _regiao,
            _latitude,
            _longitude,
            _provaDeOrigem,
            block.timestamp
        );

        return verificacaoId;
    }

    // =====================================================================
    // APPROVAL FUNCTIONS
    // =====================================================================

    /// @notice Aprova uma verificação de origem (apenas verificador)
    /// @param _verificacaoId ID da verificação a aprovar
    function approveVerification(bytes32 _verificacaoId)
        external
        onlyVerificador
        verificacaoExists(_verificacaoId)
        nonReentrant
    {
        OriginVerification storage verification = verificationsById[_verificacaoId];
        require(
            verification.status == VerificationStatus.IN_REVIEW,
            "OriginVerifier: Apenas verificacoes IN_REVIEW podem ser aprovadas"
        );

        verification.status = VerificationStatus.APPROVED;

        emit OriginVerificationApproved(
            _verificacaoId,
            verification.loteId,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Rejeita uma verificação de origem (apenas verificador)
    /// @param _verificacaoId ID da verificação a rejeitar
    function rejectVerification(bytes32 _verificacaoId)
        external
        onlyVerificador
        verificacaoExists(_verificacaoId)
        nonReentrant
    {
        OriginVerification storage verification = verificationsById[_verificacaoId];
        require(
            verification.status == VerificationStatus.IN_REVIEW,
            "OriginVerifier: Apenas verificacoes IN_REVIEW podem ser rejeitadas"
        );

        verification.status = VerificationStatus.REJECTED;

        emit OriginVerificationRejected(
            _verificacaoId,
            verification.loteId,
            msg.sender,
            block.timestamp
        );
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /// @notice Retorna dados completos de uma verificação
    /// @param _verificacaoId ID da verificação
    /// @return Estrutura OriginVerification com todos os dados
    function getVerification(bytes32 _verificacaoId)
        external
        view
        verificacaoExists(_verificacaoId)
        returns (OriginVerification memory)
    {
        return verificationsById[_verificacaoId];
    }

    /// @notice Retorna a verificação associada a um lote
    /// @param _loteId ID do lote
    /// @return ID da verificação ou bytes32(0) se não existe
    function getVerificationByLote(bytes32 _loteId) external view returns (bytes32) {
        return verificacaoByLote[_loteId];
    }

    /// @notice Retorna o status de uma verificação
    /// @param _verificacaoId ID da verificação
    /// @return Status atual (0-3)
    function getVerificationStatus(bytes32 _verificacaoId)
        external
        view
        verificacaoExists(_verificacaoId)
        returns (VerificationStatus)
    {
        return verificationsById[_verificacaoId].status;
    }

    /// @notice Verifica se uma verificação foi aprovada
    /// @param _verificacaoId ID da verificação
    /// @return true se status é APPROVED, false caso contrário
    function isApproved(bytes32 _verificacaoId)
        external
        view
        verificacaoExists(_verificacaoId)
        returns (bool)
    {
        return verificationsById[_verificacaoId].status == VerificationStatus.APPROVED;
    }
}
