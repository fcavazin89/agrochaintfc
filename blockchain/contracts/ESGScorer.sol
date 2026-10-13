// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ESGScorer - Cálculo de Scores ESG (Environment, Social, Governance)
/// @notice Contrato para calcular e armazenar scores ESG com ponderação 40/30/30
/// @dev Implementa cálculo de scores ambientais, sociais e de governança
contract ESGScorer is Ownable, ReentrancyGuard {
    
    /// @notice Status possível de uma pontuação ESG
    enum VerificationStatus {
        NOT_STARTED,    // 0: Não iniciada
        IN_REVIEW,      // 1: Em revisão
        APPROVED,       // 2: Aprovada
        REJECTED        // 3: Rejeitada
    }

    /// @notice Estrutura de dados para um score ESG
    struct ESGScore {
        bytes32 esgId;                   // ID único do score ESG
        bytes32 loteId;                  // ID único do lote
        uint256 scoreAmbiental;          // Score ambiental (0-100)
        uint256 scoreSocial;             // Score social (0-100)
        uint256 scoreGovernanca;         // Score de governança (0-100)
        uint256 scoreFinal;              // Score final calculado (0-100) com ponderação 40/30/30
        uint256 dataCalculada;           // Timestamp do cálculo
        string metodologia;              // Descrição da metodologia usada
        VerificationStatus status;       // Status atual
        address calculadorAddress;       // Endereço de quem calculou
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    /// @notice Mapeamento de esgId para dados do score
    mapping(bytes32 => ESGScore) public scoresById;

    /// @notice Mapeamento de loteId para esgId (um lote tem um score)
    mapping(bytes32 => bytes32) public scoreByLote;

    /// @notice Contador de scores ESG calculados
    uint256 public esgCounter;

    /// @notice Endereço do calculador que pode aprovar/rejeitar scores
    address public calculador;

    /// @notice Ponderação para score ambiental em basis points (40% = 4000)
    uint256 public constant WEIGHT_ENVIRONMENTAL = 40;

    /// @notice Ponderação para score social em basis points (30% = 3000)
    uint256 public constant WEIGHT_SOCIAL = 30;

    /// @notice Ponderação para score de governança em basis points (30% = 3000)
    uint256 public constant WEIGHT_GOVERNANCE = 30;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando um score ESG é submetido
    event ESGScoreSubmitted(
        bytes32 indexed esgId,
        bytes32 indexed loteId,
        address indexed submitter,
        uint256 scoreAmbiental,
        uint256 scoreSocial,
        uint256 scoreGovernanca,
        uint256 scoreFinal,
        string metodologia,
        uint256 timestamp
    );

    /// @notice Emitido quando um score ESG é aprovado
    event ESGScoreApproved(
        bytes32 indexed esgId,
        bytes32 indexed loteId,
        address indexed aprovador,
        uint256 scoreFinal,
        uint256 timestamp
    );

    /// @notice Emitido quando um score ESG é rejeitado
    event ESGScoreRejected(
        bytes32 indexed esgId,
        bytes32 indexed loteId,
        address indexed rejeitador,
        uint256 timestamp
    );

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    /// @notice Valida que apenas o calculador pode executar
    modifier onlyCalculador() {
        require(
            msg.sender == owner() || msg.sender == calculador,
            "ESGScorer: Apenas o calculador pode executar"
        );
        _;
    }

    /// @notice Valida que um score existe
    modifier scoreExists(bytes32 _esgId) {
        require(
            scoresById[_esgId].esgId != bytes32(0),
            "ESGScorer: Score ESG nao existe"
        );
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    /// @notice Inicializa o contrato ESGScorer
    constructor() Ownable(msg.sender) {}

    /// @notice Define o endereço do calculador (pode ser atualizado)
    /// @param _calculador Endereço do novo calculador
    function setCalculador(address _calculador) external onlyOwner {
        require(_calculador != address(0), "ESGScorer: Endereco invalido");
        calculador = _calculador;
    }

    // =====================================================================
    // HELPER FUNCTIONS
    // =====================================================================

    /// @notice Calcula o score final a partir dos componentes individuais
    /// @param _ambiental Score ambiental (0-100)
    /// @param _social Score social (0-100)
    /// @param _governanca Score de governança (0-100)
    /// @return scoreFinal Score final com ponderação 40/30/30
    function calculateFinalScore(
        uint256 _ambiental,
        uint256 _social,
        uint256 _governanca
    ) public pure returns (uint256) {
        // Validação dos inputs
        require(_ambiental <= 100, "ESGScorer: Score ambiental deve estar entre 0 e 100");
        require(_social <= 100, "ESGScorer: Score social deve estar entre 0 e 100");
        require(_governanca <= 100, "ESGScorer: Score de governanca deve estar entre 0 e 100");

        // Calcula: (ambiental * 40 + social * 30 + governanca * 30) / 100
        uint256 scoreFinal = (
            (_ambiental * WEIGHT_ENVIRONMENTAL) +
            (_social * WEIGHT_SOCIAL) +
            (_governanca * WEIGHT_GOVERNANCE)
        ) / 100;

        return scoreFinal;
    }

    // =====================================================================
    // SUBMIT FUNCTIONS
    // =====================================================================

    /// @notice Submete um novo score ESG para um lote
    /// @param _loteId ID único do lote
    /// @param _scoreAmbiental Score ambiental (0-100)
    /// @param _scoreSocial Score social (0-100)
    /// @param _scoreGovernanca Score de governança (0-100)
    /// @param _metodologia Descrição da metodologia usada
    /// @return esgId ID único do score ESG criado
    function submitESGScore(
        bytes32 _loteId,
        uint256 _scoreAmbiental,
        uint256 _scoreSocial,
        uint256 _scoreGovernanca,
        string calldata _metodologia
    ) external nonReentrant returns (bytes32) {
        require(_loteId != bytes32(0), "ESGScorer: LoteId invalido");
        require(bytes(_metodologia).length > 0, "ESGScorer: Metodologia nao pode estar vazia");

        // Verifica se já existe score para este lote
        require(scoreByLote[_loteId] == bytes32(0), "ESGScorer: Lote ja possui score ESG");

        // Valida ranges (a validação é feita em calculateFinalScore também)
        require(_scoreAmbiental <= 100, "ESGScorer: Score ambiental deve estar entre 0 e 100");
        require(_scoreSocial <= 100, "ESGScorer: Score social deve estar entre 0 e 100");
        require(_scoreGovernanca <= 100, "ESGScorer: Score de governanca deve estar entre 0 e 100");

        // Calcula score final
        uint256 scoreFinal = calculateFinalScore(_scoreAmbiental, _scoreSocial, _scoreGovernanca);

        // Gera ID único para o score
        bytes32 esgId = keccak256(
            abi.encodePacked(_loteId, msg.sender, block.timestamp, esgCounter)
        );

        esgCounter++;

        // Cria novo score com status IN_REVIEW
        scoresById[esgId] = ESGScore({
            esgId: esgId,
            loteId: _loteId,
            scoreAmbiental: _scoreAmbiental,
            scoreSocial: _scoreSocial,
            scoreGovernanca: _scoreGovernanca,
            scoreFinal: scoreFinal,
            dataCalculada: block.timestamp,
            metodologia: _metodologia,
            status: VerificationStatus.IN_REVIEW,
            calculadorAddress: msg.sender
        });

        scoreByLote[_loteId] = esgId;

        emit ESGScoreSubmitted(
            esgId,
            _loteId,
            msg.sender,
            _scoreAmbiental,
            _scoreSocial,
            _scoreGovernanca,
            scoreFinal,
            _metodologia,
            block.timestamp
        );

        return esgId;
    }

    // =====================================================================
    // APPROVAL FUNCTIONS
    // =====================================================================

    /// @notice Aprova um score ESG (apenas calculador)
    /// @param _esgId ID do score a aprovar
    function approveScore(bytes32 _esgId)
        external
        onlyCalculador
        scoreExists(_esgId)
        nonReentrant
    {
        ESGScore storage score = scoresById[_esgId];
        require(
            score.status == VerificationStatus.IN_REVIEW,
            "ESGScorer: Apenas scores IN_REVIEW podem ser aprovados"
        );

        score.status = VerificationStatus.APPROVED;

        emit ESGScoreApproved(
            _esgId,
            score.loteId,
            msg.sender,
            score.scoreFinal,
            block.timestamp
        );
    }

    /// @notice Rejeita um score ESG (apenas calculador)
    /// @param _esgId ID do score a rejeitar
    function rejectScore(bytes32 _esgId)
        external
        onlyCalculador
        scoreExists(_esgId)
        nonReentrant
    {
        ESGScore storage score = scoresById[_esgId];
        require(
            score.status == VerificationStatus.IN_REVIEW,
            "ESGScorer: Apenas scores IN_REVIEW podem ser rejeitados"
        );

        score.status = VerificationStatus.REJECTED;

        emit ESGScoreRejected(
            _esgId,
            score.loteId,
            msg.sender,
            block.timestamp
        );
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /// @notice Retorna dados completos de um score ESG
    /// @param _esgId ID do score
    /// @return Estrutura ESGScore com todos os dados
    function getScore(bytes32 _esgId)
        external
        view
        scoreExists(_esgId)
        returns (ESGScore memory)
    {
        return scoresById[_esgId];
    }

    /// @notice Retorna o score ESG associado a um lote
    /// @param _loteId ID do lote
    /// @return ID do score ou bytes32(0) se não existe
    function getScoreByLote(bytes32 _loteId) external view returns (bytes32) {
        return scoreByLote[_loteId];
    }

    /// @notice Retorna o status de um score ESG
    /// @param _esgId ID do score
    /// @return Status atual (0-3)
    function getScoreStatus(bytes32 _esgId)
        external
        view
        scoreExists(_esgId)
        returns (VerificationStatus)
    {
        return scoresById[_esgId].status;
    }

    /// @notice Verifica se um score foi aprovado
    /// @param _esgId ID do score
    /// @return true se status é APPROVED, false caso contrário
    function isApproved(bytes32 _esgId)
        external
        view
        scoreExists(_esgId)
        returns (bool)
    {
        return scoresById[_esgId].status == VerificationStatus.APPROVED;
    }

    /// @notice Retorna o score final calculado
    /// @param _esgId ID do score
    /// @return Score final (0-100)
    function getFinalScore(bytes32 _esgId)
        external
        view
        scoreExists(_esgId)
        returns (uint256)
    {
        return scoresById[_esgId].scoreFinal;
    }

    /// @notice Retorna todos os componentes do score
    /// @param _esgId ID do score
    /// @return ambiental Score ambiental
    /// @return social Score social
    /// @return governanca Score de governança
    /// @return scoreFinalValue Score final
    function getScoreComponents(bytes32 _esgId)
        external
        view
        scoreExists(_esgId)
        returns (
            uint256 ambiental,
            uint256 social,
            uint256 governanca,
            uint256 scoreFinalValue
        )
    {
        ESGScore storage score = scoresById[_esgId];
        return (
            score.scoreAmbiental,
            score.scoreSocial,
            score.scoreGovernanca,
            score.scoreFinal
        );
    }
}
