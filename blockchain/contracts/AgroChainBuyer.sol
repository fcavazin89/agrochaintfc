// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AgroChain Buyer - Gerenciamento de perfis e histórico de compras
/// @notice Módulo para registro e histórico de compradores, reputação e avaliações
/// @dev Contrato stub para estabelecer estrutura base de buyers
contract AgroChainBuyer {
    using SafeERC20 for IERC20;

    /// @notice Status possível de uma entrega
    enum DeliveryStatus {
        AWAITING,        // 0: Aguardando
        ISSUED,          // 1: Emitido
        SHIPPING,        // 2: Transportando
        DELIVERED,       // 3: Entregue
        REJECTED         // 4: Rejeitado
    }

    /// @notice Estrutura de perfil de comprador
    struct BuyerProfile {
        address buyerAddress;          // Endereço da carteira
        string name;                   // Nome completo ou empresa
        string companyName;            // Nome da empresa
        string country;                // País
        uint256 reputation;            // Reputação em pontos (0-10000, 100 = 1.0)
        uint256 batchesAcquired;       // Total de lotes comprados
        uint256 registeredAt;          // Timestamp de registro
        bool isActive;                 // Status ativo/inativo
    }

    /// @notice Estrutura de pedido de compra
    struct PurchaseOrder {
        uint256 orderId;               // ID único do pedido
        uint256 listingId;             // Referência à listagem
        bytes32 lotId;                 // ID do lote
        address producer;              // Endereço do produtor
        address buyer;                 // Endereço do comprador
        uint256 purchaseDate;          // Timestamp da compra
        uint256 deliveryDate;          // Timestamp esperado de entrega
        DeliveryStatus status;         // Status da entrega
        uint256 quantityKg;            // Quantidade em kg
        uint256 unitPrice;             // Preço por kg (scaled com 6 decimals)
        uint256 totalPrice;            // Preço total (scaled com 6 decimals)
        string origin;                 // Origem do lote
        string notes;                  // Observações
    }

    /// @notice Estrutura de avaliação/review de compra
    struct Review {
        uint256 reviewId;              // ID único da review
        uint256 orderId;               // Referência ao pedido
        address reviewer;              // Quem fez a review
        uint256 rating;                // Nota de 1-5
        string comment;                // Comentário
        uint256 createdAt;             // Timestamp
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    /// @notice Mapeamento de endereço para perfil de comprador
    mapping(address => BuyerProfile) public buyerProfiles;

    /// @notice Mapeamento de orderId para pedido de compra
    mapping(uint256 => PurchaseOrder) public purchaseOrders;

    /// @notice Mapeamento de reviewId para review
    mapping(uint256 => Review) public reviews;

    /// @notice Mapeamento de comprador para array de orderIds
    mapping(address => uint256[]) public buyerPurchaseHistory;

    /// @notice Mapeamento de comprador para array de reviewIds
    mapping(address => uint256[]) public buyerReviews;

    /// @notice Contador para gerar IDs únicos de pedidos
    uint256 public orderCounter;

    /// @notice Contador para gerar IDs únicos de reviews
    uint256 public reviewCounter;

    /// @notice Endereço do admin do contrato
    address public admin;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando um novo comprador é registrado
    event BuyerRegistered(
        address indexed buyerAddress,
        string name,
        string companyName,
        string country,
        uint256 timestamp
    );

    /// @notice Emitido quando um novo pedido é criado
    event PurchaseOrderCreated(
        uint256 indexed orderId,
        address indexed buyer,
        address indexed producer,
        uint256 listingId,
        uint256 quantityKg,
        uint256 totalPrice,
        uint256 timestamp
    );

    /// @notice Emitido quando status de entrega muda
    event DeliveryStatusChanged(
        uint256 indexed orderId,
        address indexed buyer,
        DeliveryStatus newStatus,
        uint256 timestamp
    );

    /// @notice Emitido quando uma review é feita
    event ReviewSubmitted(
        uint256 indexed reviewId,
        uint256 indexed orderId,
        address indexed reviewer,
        uint256 rating,
        uint256 timestamp
    );

    /// @notice Emitido quando reputação é atualizada
    event ReputationUpdated(
        address indexed buyer,
        uint256 newReputation,
        uint256 timestamp
    );

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    /// @notice Restringe chamadas apenas ao admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "AgroChainBuyer: Apenas admin pode executar");
        _;
    }

    /// @notice Valida que um comprador está registrado
    modifier buyerExists(address _buyer) {
        require(buyerProfiles[_buyer].buyerAddress != address(0), "AgroChainBuyer: Comprador nao registrado");
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    /// @notice Inicializa o contrato
    constructor() {
        admin = msg.sender;
    }

    // =====================================================================
    // BUYER REGISTRATION
    // =====================================================================

    /// @notice Registra um novo comprador no sistema
    /// @param _name Nome completo ou empresa
    /// @param _companyName Nome da empresa
    /// @param _country País
    function registerBuyer(
        string calldata _name,
        string calldata _companyName,
        string calldata _country
    ) external {
        require(bytes(_name).length > 0, "AgroChainBuyer: Nome nao pode estar vazio");
        require(buyerProfiles[msg.sender].buyerAddress == address(0), "AgroChainBuyer: Comprador ja registrado");

        buyerProfiles[msg.sender] = BuyerProfile({
            buyerAddress: msg.sender,
            name: _name,
            companyName: _companyName,
            country: _country,
            reputation: 0,
            batchesAcquired: 0,
            registeredAt: block.timestamp,
            isActive: true
        });

        emit BuyerRegistered(msg.sender, _name, _companyName, _country, block.timestamp);
    }

    // =====================================================================
    // PURCHASE ORDER MANAGEMENT
    // =====================================================================

    /// @notice Cria um novo pedido de compra
    /// @param _buyer Endereço do comprador
    /// @param _producer Endereço do produtor
    /// @param _listingId ID da listagem
    /// @param _lotId ID do lote
    /// @param _quantityKg Quantidade em kg
    /// @param _unitPrice Preço por kg
    /// @param _origin Origem do lote
    /// @return orderId ID do pedido criado
    function createPurchaseOrder(
        address _buyer,
        address _producer,
        uint256 _listingId,
        bytes32 _lotId,
        uint256 _quantityKg,
        uint256 _unitPrice,
        string calldata _origin
    ) external onlyAdmin returns (uint256) {
        require(_buyer != address(0), "AgroChainBuyer: Endereco do comprador invalido");
        require(_producer != address(0), "AgroChainBuyer: Endereco do produtor invalido");
        require(_quantityKg > 0, "AgroChainBuyer: Quantidade deve ser maior que zero");
        require(_unitPrice > 0, "AgroChainBuyer: Preco deve ser maior que zero");

        uint256 totalPrice = _quantityKg * _unitPrice;
        uint256 orderId = ++orderCounter;
        uint256 deliveryDate = block.timestamp + (7 days); // 7 dias de prazo padrão

        purchaseOrders[orderId] = PurchaseOrder({
            orderId: orderId,
            listingId: _listingId,
            lotId: _lotId,
            producer: _producer,
            buyer: _buyer,
            purchaseDate: block.timestamp,
            deliveryDate: deliveryDate,
            status: DeliveryStatus.AWAITING,
            quantityKg: _quantityKg,
            unitPrice: _unitPrice,
            totalPrice: totalPrice,
            origin: _origin,
            notes: ""
        });

        buyerPurchaseHistory[_buyer].push(orderId);

        // Incrementa contador de lotes comprados
        buyerProfiles[_buyer].batchesAcquired += 1;

        emit PurchaseOrderCreated(
            orderId,
            _buyer,
            _producer,
            _listingId,
            _quantityKg,
            totalPrice,
            block.timestamp
        );

        return orderId;
    }

    /// @notice Atualiza status de entrega de um pedido
    /// @param _orderId ID do pedido
    /// @param _newStatus Novo status de entrega
    function updateDeliveryStatus(uint256 _orderId, DeliveryStatus _newStatus) external onlyAdmin {
        require(purchaseOrders[_orderId].buyer != address(0), "AgroChainBuyer: Pedido nao existe");

        PurchaseOrder storage order = purchaseOrders[_orderId];
        order.status = _newStatus;

        emit DeliveryStatusChanged(_orderId, order.buyer, _newStatus, block.timestamp);
    }

    // =====================================================================
    // PURCHASE HISTORY VIEW
    // =====================================================================

    /// @notice Retorna histórico de compras de um comprador
    /// @param _buyer Endereço do comprador
    /// @return Array de IDs de pedidos
    function getPurchaseHistory(address _buyer) external view buyerExists(_buyer) returns (uint256[] memory) {
        return buyerPurchaseHistory[_buyer];
    }

    /// @notice Retorna um pedido específico
    /// @param _orderId ID do pedido
    /// @return PurchaseOrder struct com todos os dados
    function getPurchaseOrder(uint256 _orderId) external view returns (PurchaseOrder memory) {
        require(purchaseOrders[_orderId].buyer != address(0), "AgroChainBuyer: Pedido nao existe");
        return purchaseOrders[_orderId];
    }

    /// @notice Retorna perfil de um comprador
    /// @param _buyer Endereço do comprador
    /// @return BuyerProfile struct com todos os dados
    function getBuyerProfile(address _buyer) external view buyerExists(_buyer) returns (BuyerProfile memory) {
        return buyerProfiles[_buyer];
    }

    // =====================================================================
    // RATING AND REVIEW
    // =====================================================================

    /// @notice Calcula reputação média de um comprador
    /// @param _buyer Endereço do comprador
    /// @return Reputação média (0-100)
    function calculateReputation(address _buyer) external view buyerExists(_buyer) returns (uint256) {
        uint256[] memory reviewIds = buyerReviews[_buyer];

        if (reviewIds.length == 0) {
            return 0;
        }

        uint256 totalRating = 0;
        for (uint256 i = 0; i < reviewIds.length; i++) {
            totalRating += reviews[reviewIds[i]].rating * 20; // 5-star to 100-point scale
        }

        return totalRating / reviewIds.length;
    }

    /// @notice Retorna reputação atual de um comprador
    /// @param _buyer Endereço do comprador
    /// @return Reputação em pontos
    function getRating(address _buyer) external view buyerExists(_buyer) returns (uint256) {
        return buyerProfiles[_buyer].reputation;
    }

    /// @notice Submete uma avaliação de compra
    /// @param _orderId ID do pedido
    /// @param _rating Nota de 1-5
    /// @param _comment Comentário
    /// @return reviewId ID da review criada
    function submitReview(
        uint256 _orderId,
        uint256 _rating,
        string calldata _comment
    ) external returns (uint256) {
        require(purchaseOrders[_orderId].buyer != address(0), "AgroChainBuyer: Pedido nao existe");
        require(_rating >= 1 && _rating <= 5, "AgroChainBuyer: Nota deve estar entre 1 e 5");

        address buyer = purchaseOrders[_orderId].buyer;
        require(msg.sender == buyer, "AgroChainBuyer: Apenas o comprador pode avaliar");

        uint256 reviewId = ++reviewCounter;

        reviews[reviewId] = Review({
            reviewId: reviewId,
            orderId: _orderId,
            reviewer: msg.sender,
            rating: _rating,
            comment: _comment,
            createdAt: block.timestamp
        });

        buyerReviews[msg.sender].push(reviewId);

        // Atualiza reputação do comprador
        uint256 newReputation = (_rating * 20); // Conversão de 1-5 para 20-100 scale
        buyerProfiles[buyer].reputation = newReputation;

        emit ReviewSubmitted(reviewId, _orderId, msg.sender, _rating, block.timestamp);
        emit ReputationUpdated(buyer, newReputation, block.timestamp);

        return reviewId;
    }

    /// @notice Retorna reviews de um comprador
    /// @param _buyer Endereço do comprador
    /// @return Array de IDs de reviews
    function getBuyerReviews(address _buyer) external view buyerExists(_buyer) returns (uint256[] memory) {
        return buyerReviews[_buyer];
    }

    /// @notice Retorna uma review específica
    /// @param _reviewId ID da review
    /// @return Review struct com todos os dados
    function getReview(uint256 _reviewId) external view returns (Review memory) {
        require(reviews[_reviewId].reviewer != address(0), "AgroChainBuyer: Review nao existe");
        return reviews[_reviewId];
    }
}
