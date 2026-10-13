// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {AgroChainPayments} from "./AgroChainPayments.sol";

/// @title SmartLot - Gestão on-chain de lotes agrícolas
/// @notice Contrato para registro, rastreamento e transferência de lotes com certificações
/// @dev Integrado com AgroChainPayments para validação de pagamento em transferências
contract SmartLot {
    
    /// @notice Status possíveis de um lote
    enum LotStatus {
        REGISTERED,     // 0: Lote registrado
        CERTIFIED,      // 1: Lote com certificações
        TRANSFERRED,    // 2: Lote transferido
        ARCHIVED        // 3: Lote arquivado
    }

    /// @notice Estrutura que representa um evento do lote (plantio, colheita, etc)
    struct LotEvent {
        bytes32 eventId;
        string eventType;           // ex: "Plantio", "Colheita", "Aplicacao Agroquimico"
        string description;
        string location;
        uint256 timestamp;
        address recorder;
    }

    /// @notice Estrutura que representa uma certificação do lote
    struct LotCertification {
        bytes32 certificationId;
        string certificationType;   // ex: "Organico", "Sustentavel", "Fair Trade"
        string proofHash;           // Hash do documento comprovante
        uint256 issuedAt;
        address issuer;
        bool active;
    }

    /// @notice Estrutura que representa um lote
    struct Lot {
        bytes32 loteId;
        address produtor;           // Endereço do produtor proprietário
        string safra;               // Ex: "2024/2025"
        string origem;              // Localização/propriedade
        uint256 area;               // Área em metros quadrados
        uint256 dataPlantio;        // Timestamp do plantio
        uint256 dataColheita;       // Timestamp da colheita
        LotStatus status;
        LotEvent[] eventos;
        LotCertification[] certificacoes;
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    /// @notice Referência para o contrato de pagamentos
    AgroChainPayments public agroChainPayments;

    /// @notice Mapeamento de loteId para dados do lote
    mapping(bytes32 => Lot) public lotes;

    /// @notice Contador para gerar IDs únicos de eventos
    uint256 private eventCounter;

    /// @notice Contador para gerar IDs únicos de certificações
    uint256 private certificationCounter;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando um novo lote é registrado
    event LotRegistered(
        bytes32 indexed loteId,
        address indexed produtor,
        string safra,
        string origem,
        uint256 area,
        uint256 dataPlantio,
        uint256 timestamp
    );

    /// @notice Emitido quando um evento é adicionado ao lote
    event LotEventAdded(
        bytes32 indexed loteId,
        bytes32 indexed eventId,
        string eventType,
        string description,
        string location,
        uint256 timestamp,
        address indexed recorder
    );

    /// @notice Emitido quando uma certificação é adicionada ao lote
    event CertificationAdded(
        bytes32 indexed loteId,
        bytes32 indexed certificationId,
        string certificationType,
        string proofHash,
        uint256 issuedAt,
        address indexed issuer
    );

    /// @notice Emitido quando um lote é transferido para novo produtor
    event LotTransferred(
        bytes32 indexed loteId,
        address indexed anteriorProdutor,
        address indexed novoProdutor,
        uint256 orderId,
        uint256 timestamp
    );

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    /// @notice Valida que apenas o produtor atual do lote pode chamar a função
    modifier onlyLotProducer(bytes32 _loteId) {
        require(lotes[_loteId].produtor == msg.sender, "SmartLot: Apenas o produtor pode executar esta acao");
        _;
    }

    /// @notice Valida que o lote existe
    modifier lotExists(bytes32 _loteId) {
        require(lotes[_loteId].produtor != address(0), "SmartLot: Lote nao existe");
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    /// @notice Inicializa o contrato SmartLot com referência ao contrato de pagamentos
    /// @param _agroChainPayments Endereço do contrato AgroChainPayments
    constructor(address _agroChainPayments) {
        require(_agroChainPayments != address(0), "SmartLot: Endereco invalido para AgroChainPayments");
        agroChainPayments = AgroChainPayments(_agroChainPayments);
    }

    // =====================================================================
    // FUNCTIONS
    // =====================================================================

    /// @notice Registra um novo lote
    /// @param _safra Identificação da safra (ex: "2024/2025")
    /// @param _origem Localização/propriedade do lote
    /// @param _area Área do lote em metros quadrados
    /// @param _dataPlantio Timestamp do plantio
    /// @return loteId ID único do lote criado
    function registerLot(
        string calldata _safra,
        string calldata _origem,
        uint256 _area,
        uint256 _dataPlantio
    ) external returns (bytes32) {
        require(bytes(_safra).length > 0, "SmartLot: Safra nao pode estar vazia");
        require(bytes(_origem).length > 0, "SmartLot: Origem nao pode estar vazia");
        require(_area > 0, "SmartLot: Area deve ser maior que zero");
        require(_dataPlantio > 0, "SmartLot: Data de plantio invalida");
        require(_dataPlantio <= block.timestamp, "SmartLot: Data de plantio nao pode ser no futuro");

        // Gera loteId único como hash dos parâmetros e timestamp
        bytes32 loteId = keccak256(abi.encodePacked(
            msg.sender,
            _safra,
            _origem,
            _area,
            _dataPlantio,
            block.timestamp
        ));

        // Verifica se lote já existe
        require(lotes[loteId].produtor == address(0), "SmartLot: Lote ja existe");

        // Cria novo lote
        Lot storage novoLote = lotes[loteId];
        novoLote.loteId = loteId;
        novoLote.produtor = msg.sender;
        novoLote.safra = _safra;
        novoLote.origem = _origem;
        novoLote.area = _area;
        novoLote.dataPlantio = _dataPlantio;
        novoLote.dataColheita = 0; // Será preenchido posteriormente
        novoLote.status = LotStatus.REGISTERED;

        emit LotRegistered(
            loteId,
            msg.sender,
            _safra,
            _origem,
            _area,
            _dataPlantio,
            block.timestamp
        );

        return loteId;
    }

    /// @notice Adiciona um evento (rastreamento) ao lote
    /// @param _loteId ID do lote
    /// @param _tipo Tipo de evento (ex: "Plantio", "Colheita", "Pulverizacao")
    /// @param _descricao Descrição detalhada do evento
    /// @param _localizacao Localização do evento
    function addEvent(
        bytes32 _loteId,
        string calldata _tipo,
        string calldata _descricao,
        string calldata _localizacao
    ) external lotExists(_loteId) onlyLotProducer(_loteId) {
        require(bytes(_tipo).length > 0, "SmartLot: Tipo de evento nao pode estar vazio");
        require(bytes(_descricao).length > 0, "SmartLot: Descricao nao pode estar vazia");
        require(bytes(_localizacao).length > 0, "SmartLot: Localizacao nao pode estar vazia");

        bytes32 eventId = keccak256(abi.encodePacked(
            _loteId,
            eventCounter++,
            block.timestamp
        ));

        LotEvent memory novoEvento = LotEvent({
            eventId: eventId,
            eventType: _tipo,
            description: _descricao,
            location: _localizacao,
            timestamp: block.timestamp,
            recorder: msg.sender
        });

        lotes[_loteId].eventos.push(novoEvento);

        emit LotEventAdded(
            _loteId,
            eventId,
            _tipo,
            _descricao,
            _localizacao,
            block.timestamp,
            msg.sender
        );
    }

    /// @notice Adiciona uma certificação ao lote
    /// @param _loteId ID do lote
    /// @param _tipo Tipo de certificação (ex: "Organico", "Sustentavel")
    /// @param _comprovante Hash ou referência do documento comprovante
    function addCertification(
        bytes32 _loteId,
        string calldata _tipo,
        string calldata _comprovante
    ) external lotExists(_loteId) {
        require(bytes(_tipo).length > 0, "SmartLot: Tipo de certificacao nao pode estar vazio");
        require(bytes(_comprovante).length > 0, "SmartLot: Comprovante nao pode estar vazio");

        bytes32 certificationId = keccak256(abi.encodePacked(
            _loteId,
            certificationCounter++,
            msg.sender,
            block.timestamp
        ));

        LotCertification memory novaCertificacao = LotCertification({
            certificationId: certificationId,
            certificationType: _tipo,
            proofHash: _comprovante,
            issuedAt: block.timestamp,
            issuer: msg.sender,
            active: true
        });

        lotes[_loteId].certificacoes.push(novaCertificacao);

        // Atualiza status do lote se ainda não tem certificação
        if (lotes[_loteId].status == LotStatus.REGISTERED) {
            lotes[_loteId].status = LotStatus.CERTIFIED;
        }

        emit CertificationAdded(
            _loteId,
            certificationId,
            _tipo,
            _comprovante,
            block.timestamp,
            msg.sender
        );
    }

    /// @notice Transfere propriedade do lote para novo produtor após validação de pagamento
    /// @param _loteId ID do lote a transferir
    /// @param _novoProdutor Endereço do novo produtor
    /// @param _orderId ID da ordem de pagamento no AgroChainPayments
    function transferLot(
        bytes32 _loteId,
        address _novoProdutor,
        uint256 _orderId
    ) external lotExists(_loteId) onlyLotProducer(_loteId) {
        require(_novoProdutor != address(0), "SmartLot: Novo produtor endereco invalido");
        require(_novoProdutor != msg.sender, "SmartLot: Novo produtor nao pode ser igual ao atual");
        require(_orderId > 0, "SmartLot: ID da ordem invalido");

        // Valida o status do pagamento no contrato AgroChainPayments
        AgroChainPayments.OrderStatus orderStatus = agroChainPayments.getOrderStatus(_orderId);
        require(
            orderStatus == AgroChainPayments.OrderStatus.ACCEPTED,
            "SmartLot: Pagamento nao foi aceito. Apenas ordens ACCEPTED podem transferir lotes"
        );

        // Armazena endereço anterior
        address anteriorProdutor = lotes[_loteId].produtor;

        // Transfere propriedade do lote
        lotes[_loteId].produtor = _novoProdutor;
        lotes[_loteId].status = LotStatus.TRANSFERRED;

        emit LotTransferred(
            _loteId,
            anteriorProdutor,
            _novoProdutor,
            _orderId,
            block.timestamp
        );
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /// @notice Retorna todas as certificações de um lote
    /// @param _loteId ID do lote
    /// @return Array de certificações do lote
    function getCertifications(bytes32 _loteId) external view lotExists(_loteId) returns (LotCertification[] memory) {
        return lotes[_loteId].certificacoes;
    }

    /// @notice Retorna os dados completos de um lote
    /// @param _loteId ID do lote
    /// @return Estrutura Lot contendo todos os dados do lote
    function getLot(bytes32 _loteId) external view lotExists(_loteId) returns (Lot memory) {
        return lotes[_loteId];
    }

    /// @notice Retorna o número total de eventos de um lote
    /// @param _loteId ID do lote
    /// @return Número de eventos registrados
    function getEventCount(bytes32 _loteId) external view lotExists(_loteId) returns (uint256) {
        return lotes[_loteId].eventos.length;
    }

    /// @notice Retorna um evento específico do lote
    /// @param _loteId ID do lote
    /// @param _eventIndex Índice do evento no array
    /// @return Estrutura LotEvent do evento solicitado
    function getEvent(bytes32 _loteId, uint256 _eventIndex) external view lotExists(_loteId) returns (LotEvent memory) {
        require(_eventIndex < lotes[_loteId].eventos.length, "SmartLot: Indice do evento invalido");
        return lotes[_loteId].eventos[_eventIndex];
    }

    /// @notice Retorna o número total de certificações de um lote
    /// @param _loteId ID do lote
    /// @return Número de certificações registradas
    function getCertificationCount(bytes32 _loteId) external view lotExists(_loteId) returns (uint256) {
        return lotes[_loteId].certificacoes.length;
    }
}
