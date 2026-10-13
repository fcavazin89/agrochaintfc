// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title EUDRVerifier - Verificação de Conformidade EUDR (Deforestation Regulation)
/// @notice Contrato para analisar conformidade com EUDR usando dados de satélite
/// @dev Implementa verificação de desmatamento e cálculo de confiança da análise
contract EUDRVerifier is Ownable, ReentrancyGuard {
    
    /// @notice Status possível de uma verificação EUDR
    enum VerificationStatus {
        NOT_STARTED,    // 0: Não iniciada
        IN_REVIEW,      // 1: Em revisão
        APPROVED,       // 2: Aprovada
        REJECTED        // 3: Rejeitada
    }

    /// @notice Estrutura de dados para uma análise de conformidade EUDR
    struct EUDRCompliance {
        bytes32 eudrId;                  // ID único da análise EUDR
        bytes32 loteId;                  // ID único do lote
        uint256 dataVerificacao;         // Timestamp da verificação
        bool desmatamentoDetectado;      // true se desmatamento foi detectado
        uint256 confianca;               // Nível de confiança (0-100)
        string sateliteProva;            // Referência da prova de satélite (IPFS hash, etc)
        VerificationStatus status;       // Status atual
        address analistAddress;          // Endereço do analista que submeteu
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    /// @notice Mapeamento de eudrId para dados da análise
    mapping(bytes32 => EUDRCompliance) public compliancesById;

    /// @notice Mapeamento de loteId para eudrId (um lote tem uma análise)
    mapping(bytes32 => bytes32) public complianceByLote;

    /// @notice Contador de análises EUDR realizadas
    uint256 public eudrCounter;

    /// @notice Endereço do proprietário que pode aprovar/rejeitar análises
    address public analista;

    /// @notice Confiança mínima aceitável para uma análise (0-100, ex: 70)
    uint256 public minimumConfidenceLevel = 70;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando uma análise EUDR é submetida
    event EUDRAnalysisSubmitted(
        bytes32 indexed eudrId,
        bytes32 indexed loteId,
        address indexed submitter,
        bool desmatamentoDetectado,
        uint256 confianca,
        string sateliteProva,
        uint256 timestamp
    );

    /// @notice Emitido quando uma análise EUDR é aprovada
    event EUDRAnalysisApproved(
        bytes32 indexed eudrId,
        bytes32 indexed loteId,
        address indexed aprovador,
        uint256 timestamp
    );

    /// @notice Emitido quando uma análise EUDR é rejeitada
    event EUDRAnalysisRejected(
        bytes32 indexed eudrId,
        bytes32 indexed loteId,
        address indexed rejeitador,
        uint256 timestamp
    );

    /// @notice Emitido quando o nível mínimo de confiança é alterado
    event MinimumConfidenceLevelUpdated(uint256 newLevel, uint256 timestamp);

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    /// @notice Valida que apenas o analista pode executar
    modifier onlyAnalista() {
        require(
            msg.sender == owner() || msg.sender == analista,
            "EUDRVerifier: Apenas o analista pode executar"
        );
        _;
    }

    /// @notice Valida que uma análise existe
    modifier complianceExists(bytes32 _eudrId) {
        require(
            compliancesById[_eudrId].eudrId != bytes32(0),
            "EUDRVerifier: Analise EUDR nao existe"
        );
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    /// @notice Inicializa o contrato EUDRVerifier
    constructor() Ownable(msg.sender) {}

    /// @notice Define o endereço do analista (pode ser atualizado)
    /// @param _analista Endereço do novo analista
    function setAnalista(address _analista) external onlyOwner {
        require(_analista != address(0), "EUDRVerifier: Endereco invalido");
        analista = _analista;
    }

    /// @notice Define o nível mínimo de confiança aceitável
    /// @param _level Novo nível (0-100)
    function setMinimumConfidenceLevel(uint256 _level) external onlyOwner {
        require(_level <= 100, "EUDRVerifier: Nivel deve estar entre 0 e 100");
        minimumConfidenceLevel = _level;
        emit MinimumConfidenceLevelUpdated(_level, block.timestamp);
    }

    // =====================================================================
    // SUBMIT FUNCTIONS
    // =====================================================================

    /// @notice Submete uma nova análise de conformidade EUDR para um lote
    /// @param _loteId ID único do lote
    /// @param _desmatamentoDetectado true se desmatamento foi detectado
    /// @param _confianca Nível de confiança da análise (0-100)
    /// @param _sateliteProva Referência da prova de satélite (IPFS hash, etc)
    /// @return eudrId ID único da análise EUDR criada
    function submitEUDRAnalysis(
        bytes32 _loteId,
        bool _desmatamentoDetectado,
        uint256 _confianca,
        string calldata _sateliteProva
    ) external nonReentrant returns (bytes32) {
        require(_loteId != bytes32(0), "EUDRVerifier: LoteId invalido");
        require(_confianca <= 100, "EUDRVerifier: Confianca deve estar entre 0 e 100");
        require(bytes(_sateliteProva).length > 0, "EUDRVerifier: Prova de satelite nao pode estar vazia");

        // Verifica se já existe análise para este lote
        require(complianceByLote[_loteId] == bytes32(0), "EUDRVerifier: Lote ja possui analise EUDR");

        // Gera ID único para a análise
        bytes32 eudrId = keccak256(
            abi.encodePacked(_loteId, msg.sender, block.timestamp, eudrCounter)
        );

        eudrCounter++;

        // Cria nova análise com status IN_REVIEW
        compliancesById[eudrId] = EUDRCompliance({
            eudrId: eudrId,
            loteId: _loteId,
            dataVerificacao: block.timestamp,
            desmatamentoDetectado: _desmatamentoDetectado,
            confianca: _confianca,
            sateliteProva: _sateliteProva,
            status: VerificationStatus.IN_REVIEW,
            analistAddress: msg.sender
        });

        complianceByLote[_loteId] = eudrId;

        emit EUDRAnalysisSubmitted(
            eudrId,
            _loteId,
            msg.sender,
            _desmatamentoDetectado,
            _confianca,
            _sateliteProva,
            block.timestamp
        );

        return eudrId;
    }

    // =====================================================================
    // APPROVAL FUNCTIONS
    // =====================================================================

    /// @notice Aprova uma análise EUDR (apenas analista)
    /// @param _eudrId ID da análise a aprovar
    function approveAnalysis(bytes32 _eudrId)
        external
        onlyAnalista
        complianceExists(_eudrId)
        nonReentrant
    {
        EUDRCompliance storage compliance = compliancesById[_eudrId];
        require(
            compliance.status == VerificationStatus.IN_REVIEW,
            "EUDRVerifier: Apenas analises IN_REVIEW podem ser aprovadas"
        );

        // Se desmatamento foi detectado com baixa confiança, não aprova
        if (compliance.desmatamentoDetectado && compliance.confianca < minimumConfidenceLevel) {
            revert("EUDRVerifier: Desmatamento detectado com confianca abaixo do minimo");
        }

        compliance.status = VerificationStatus.APPROVED;

        emit EUDRAnalysisApproved(
            _eudrId,
            compliance.loteId,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Rejeita uma análise EUDR (apenas analista)
    /// @param _eudrId ID da análise a rejeitar
    function rejectAnalysis(bytes32 _eudrId)
        external
        onlyAnalista
        complianceExists(_eudrId)
        nonReentrant
    {
        EUDRCompliance storage compliance = compliancesById[_eudrId];
        require(
            compliance.status == VerificationStatus.IN_REVIEW,
            "EUDRVerifier: Apenas analises IN_REVIEW podem ser rejeitadas"
        );

        compliance.status = VerificationStatus.REJECTED;

        emit EUDRAnalysisRejected(
            _eudrId,
            compliance.loteId,
            msg.sender,
            block.timestamp
        );
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /// @notice Retorna dados completos de uma análise EUDR
    /// @param _eudrId ID da análise
    /// @return Estrutura EUDRCompliance com todos os dados
    function getCompliance(bytes32 _eudrId)
        external
        view
        complianceExists(_eudrId)
        returns (EUDRCompliance memory)
    {
        return compliancesById[_eudrId];
    }

    /// @notice Retorna a análise EUDR associada a um lote
    /// @param _loteId ID do lote
    /// @return ID da análise ou bytes32(0) se não existe
    function getComplianceByLote(bytes32 _loteId) external view returns (bytes32) {
        return complianceByLote[_loteId];
    }

    /// @notice Retorna o status de uma análise EUDR
    /// @param _eudrId ID da análise
    /// @return Status atual (0-3)
    function getAnalysisStatus(bytes32 _eudrId)
        external
        view
        complianceExists(_eudrId)
        returns (VerificationStatus)
    {
        return compliancesById[_eudrId].status;
    }

    /// @notice Verifica se uma análise foi aprovada
    /// @param _eudrId ID da análise
    /// @return true se status é APPROVED, false caso contrário
    function isApproved(bytes32 _eudrId)
        external
        view
        complianceExists(_eudrId)
        returns (bool)
    {
        return compliancesById[_eudrId].status == VerificationStatus.APPROVED;
    }

    /// @notice Verifica se desmatamento foi detectado em uma análise
    /// @param _eudrId ID da análise
    /// @return true se desmatamento foi detectado
    function hasDeforestationDetected(bytes32 _eudrId)
        external
        view
        complianceExists(_eudrId)
        returns (bool)
    {
        return compliancesById[_eudrId].desmatamentoDetectado;
    }

    /// @notice Retorna o nível de confiança de uma análise
    /// @param _eudrId ID da análise
    /// @return Confiança (0-100)
    function getConfidenceLevel(bytes32 _eudrId)
        external
        view
        complianceExists(_eudrId)
        returns (uint256)
    {
        return compliancesById[_eudrId].confianca;
    }
}
