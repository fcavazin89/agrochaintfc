// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AgroChainPayments} from "./AgroChainPayments.sol";
import {SmartLot} from "./SmartLot.sol";

/// @title AgroChain Marketplace - Marketplace de lotes agrícolas
/// @notice Plataforma de venda de lotes certificados entre produtores e compradores
/// @dev Integrado com AgroChainPayments para escrow e SmartLot para rastreabilidade
contract AgroChainMarketplace {
    using SafeERC20 for IERC20;

    /// @notice Status possível de uma listagem
    enum ListingStatus {
        ACTIVE,      // 0: Ativa para venda
        SOLD,        // 1: Completamente vendida
        CANCELLED    // 2: Cancelada pelo produtor
    }

    /// @notice Status possível de uma oferta
    /// @dev Os valores 0-3 são estáveis (consumidos pelo frontend); novos
    ///      estados são anexados ao final para não quebrar mapeamentos.
    enum OfferStatus {
        PENDING,     // 0: Aguardando resposta do produtor
        ACCEPTED,    // 1: Aceita pelo produtor, aguardando financiamento do escrow
        REJECTED,    // 2: Rejeitada pelo produtor
        CANCELLED,   // 3: Cancelada pelo comprador
        FUNDED,      // 4: Escrow financiado pelo comprador
        COMPLETED,   // 5: Escrow liberado ao vendedor
        REFUNDED     // 6: Escrow devolvido ao comprador
    }

    /// @notice Tipo de lote: Coffee ou Cacao
    enum BatchType {
        COFFEE,      // 0
        CACAO        // 1
    }

    /// @notice Estrutura de uma listagem (anúncio de venda)
    struct Listing {
        uint256 listingId;
        address seller;              // Endereço do produtor vendedor
        bytes32 lotId;               // Referência ao lote em SmartLot
        BatchType batchType;         // Tipo de produto: Coffee ou Cacao
        uint256 weightKg;            // Peso total disponível em kg
        uint256 weightSoldKg;        // Peso já vendido em kg
        uint256 pricePerKg;          // Preço por kg em tokens (scaled para 6 decimals)
        address tokenAddress;        // Endereço do token de pagamento (ex: MockUSDC)
        ListingStatus status;        // Status atual
        uint256 createdAt;           // Timestamp de criação
        uint256 updatedAt;           // Timestamp da última atualização
        string origin;               // Origem do lote (região)
        string safra;                // Identificação da safra
    }

    /// @notice Estrutura de uma oferta de compra
    struct Offer {
        uint256 offerId;
        uint256 listingId;           // Referência à listagem
        address buyer;               // Endereço do comprador
        uint256 quantityKg;          // Quantidade em kg da oferta
        uint256 pricePerKg;          // Preço por kg da oferta (pode ser menor que listagem)
        OfferStatus status;          // Status da oferta
        uint256 createdAt;           // Timestamp de criação
        uint256 expiresAt;           // Timestamp de expiração (48h depois de criação)
        uint256 orderId;             // ID da ordem em AgroChainPayments (quando aceita)
        uint256 totalPrice;          // Preço total da oferta em tokens
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    /// @notice Referência para o contrato de pagamentos
    AgroChainPayments public agroChainPayments;

    /// @notice Referência para o contrato de lotes
    SmartLot public smartLot;

    /// @notice Mapeamento de listingId para dados da listagem
    mapping(uint256 => Listing) public listings;

    /// @notice Mapeamento de offerId para dados da oferta
    mapping(uint256 => Offer) public offers;

    /// @notice Mapeamento de listingId para array de offerIds
    mapping(uint256 => uint256[]) public listingOffers;

    /// @notice Contador para gerar IDs únicos de listagens
    uint256 public listingCounter;

    /// @notice Contador para gerar IDs únicos de ofertas
    uint256 public offerCounter;

    /// @notice Tempo de expiração de uma oferta em segundos (48 horas)
    uint256 public constant OFFER_EXPIRATION_TIME = 48 hours;

    /// @notice Teto de quantidade aceitável por listagem/oferta (1 bilhão de kg)
    uint256 public constant MAX_QUANTITY_KG = 1_000_000_000;

    /// @notice Teto de preço por kg em unidades do token (ex: 1e18 = 1 token com 18 decimals)
    uint256 public constant MAX_PRICE_PER_KG = 1e18;

    /// @notice Comissão do marketplace em basis points (ex: 250 = 2.5%)
    uint256 public marketplaceFeePercentage = 250; // 2.5%

    /// @notice Endereço que recebe as comissões do marketplace
    address public feeRecipient;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando uma nova listagem é criada
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        bytes32 indexed lotId,
        BatchType batchType,
        uint256 weightKg,
        uint256 pricePerKg,
        address tokenAddress,
        string origin,
        string safra,
        uint256 timestamp
    );

    /// @notice Emitido quando uma listagem é cancelada
    event ListingCancelled(
        uint256 indexed listingId,
        address indexed seller,
        uint256 timestamp
    );

    /// @notice Emitido quando uma listagem é marcada como vendida
    event ListingCompleted(
        uint256 indexed listingId,
        address indexed seller,
        uint256 totalWeightSold,
        uint256 timestamp
    );

    /// @notice Emitido quando uma nova oferta é criada
    event OfferMade(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 quantityKg,
        uint256 pricePerKg,
        uint256 totalPrice,
        uint256 expiresAt,
        uint256 timestamp
    );

    /// @notice Emitido quando uma oferta é aceita
    event OfferAccepted(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 quantityKg,
        uint256 totalPrice,
        uint256 orderId,
        uint256 timestamp
    );

    /// @notice Emitido quando o comprador financia o escrow de uma oferta aceita
    event OfferEscrowDeposited(
        uint256 indexed offerId,
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitido quando o escrow é liberado ao vendedor
    event OfferEscrowReleased(
        uint256 indexed offerId,
        uint256 indexed orderId,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitido quando o escrow é devolvido ao comprador
    event OfferEscrowRefunded(
        uint256 indexed offerId,
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitido quando o peso reservado por uma oferta é liberado
    event OfferWeightReleased(
        uint256 indexed offerId,
        uint256 indexed listingId,
        uint256 quantityKg,
        uint256 timestamp
    );

    /// @notice Emitido quando uma oferta é rejeitada
    event OfferRejected(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 timestamp
    );

    /// @notice Emitido quando uma oferta expira
    event OfferExpired(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 timestamp
    );

    /// @notice Emitido quando uma oferta é cancelada pelo comprador
    event OfferCancelled(
        uint256 indexed offerId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 timestamp
    );

    // =====================================================================
    // MODIFIERS
    // =====================================================================

    /// @notice Valida que apenas o vendedor de uma listagem pode chamar
    modifier onlyListingSeller(uint256 _listingId) {
        require(listings[_listingId].seller != address(0), "AgroChainMarketplace: Listagem nao existe");
        require(listings[_listingId].seller == msg.sender, "AgroChainMarketplace: Apenas o vendedor pode executar");
        _;
    }

    /// @notice Valida que apenas o comprador de uma oferta pode chamar
    modifier onlyOfferBuyer(uint256 _offerId) {
        require(offers[_offerId].buyer != address(0), "AgroChainMarketplace: Oferta nao existe");
        require(offers[_offerId].buyer == msg.sender, "AgroChainMarketplace: Apenas o comprador pode executar");
        _;
    }

    /// @notice Valida que uma listagem existe
    modifier listingExists(uint256 _listingId) {
        require(listings[_listingId].seller != address(0), "AgroChainMarketplace: Listagem nao existe");
        _;
    }

    /// @notice Valida que uma oferta existe
    modifier offerExists(uint256 _offerId) {
        require(offers[_offerId].buyer != address(0), "AgroChainMarketplace: Oferta nao existe");
        _;
    }

    // =====================================================================
    // CONSTRUCTOR
    // =====================================================================

    /// @notice Inicializa o contrato Marketplace
    /// @param _agroChainPayments Endereço do contrato AgroChainPayments
    /// @param _smartLot Endereço do contrato SmartLot
    /// @param _feeRecipient Endereço que recebe as comissões
    constructor(
        address _agroChainPayments,
        address _smartLot,
        address _feeRecipient
    ) {
        require(_agroChainPayments != address(0), "AgroChainMarketplace: Endereco AgroChainPayments invalido");
        require(_smartLot != address(0), "AgroChainMarketplace: Endereco SmartLot invalido");
        require(_feeRecipient != address(0), "AgroChainMarketplace: Endereco feeRecipient invalido");

        agroChainPayments = AgroChainPayments(_agroChainPayments);
        smartLot = SmartLot(_smartLot);
        feeRecipient = _feeRecipient;
    }

    // =====================================================================
    // LISTING FUNCTIONS
    // =====================================================================

    /// @notice Cria uma nova listagem para vender um lote
    /// @param _lotId ID do lote em SmartLot
    /// @param _batchType Tipo de produto (COFFEE ou CACAO)
    /// @param _weightKg Peso total disponível em kg
    /// @param _pricePerKg Preço por kg em tokens (com 6 decimals, ex: 1 USDC = 1000000)
    /// @param _tokenAddress Endereço do token de pagamento (ex: MockUSDC)
    /// @param _origin Origem/região do lote
    /// @param _safra Identificação da safra
    /// @return listingId ID único da listagem criada
    function createListing(
        bytes32 _lotId,
        BatchType _batchType,
        uint256 _weightKg,
        uint256 _pricePerKg,
        address _tokenAddress,
        string calldata _origin,
        string calldata _safra
    ) external returns (uint256) {
        require(_weightKg > 0, "AgroChainMarketplace: Peso deve ser maior que zero");
        require(_weightKg <= MAX_QUANTITY_KG, "AgroChainMarketplace: Peso excede o limite maximo");
        require(_pricePerKg > 0, "AgroChainMarketplace: Preco deve ser maior que zero");
        require(_pricePerKg <= MAX_PRICE_PER_KG, "AgroChainMarketplace: Preco excede o limite maximo");
        require(_tokenAddress != address(0), "AgroChainMarketplace: Endereco do token invalido");
        require(bytes(_origin).length > 0, "AgroChainMarketplace: Origem nao pode estar vazia");
        require(bytes(_safra).length > 0, "AgroChainMarketplace: Safra nao pode estar vazia");

        // Valida que o lote existe e pertence ao criador da listagem
        SmartLot.Lot memory lot = smartLot.getLot(_lotId);
        require(lot.produtor == msg.sender, "AgroChainMarketplace: Apenas o produtor do lote pode criar listagem");

        uint256 listingId = ++listingCounter;

        listings[listingId] = Listing({
            listingId: listingId,
            seller: msg.sender,
            lotId: _lotId,
            batchType: _batchType,
            weightKg: _weightKg,
            weightSoldKg: 0,
            pricePerKg: _pricePerKg,
            tokenAddress: _tokenAddress,
            status: ListingStatus.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            origin: _origin,
            safra: _safra
        });

        emit ListingCreated(
            listingId,
            msg.sender,
            _lotId,
            _batchType,
            _weightKg,
            _pricePerKg,
            _tokenAddress,
            _origin,
            _safra,
            block.timestamp
        );

        return listingId;
    }

    /// @notice Cancela uma listagem ativa
    /// @param _listingId ID da listagem a cancelar
    function cancelListing(uint256 _listingId) external onlyListingSeller(_listingId) listingExists(_listingId) {
        require(
            listings[_listingId].status == ListingStatus.ACTIVE,
            "AgroChainMarketplace: Apenas listagens ACTIVE podem ser canceladas"
        );

        listings[_listingId].status = ListingStatus.CANCELLED;
        listings[_listingId].updatedAt = block.timestamp;

        emit ListingCancelled(_listingId, msg.sender, block.timestamp);
    }

    // =====================================================================
    // OFFER FUNCTIONS
    // =====================================================================

    /// @notice Cria uma nova oferta de compra para uma listagem
    /// @param _listingId ID da listagem
    /// @param _quantityKg Quantidade em kg desejada
    /// @param _pricePerKg Preço por kg oferecido
    /// @return offerId ID único da oferta criada
    function makeOffer(
        uint256 _listingId,
        uint256 _quantityKg,
        uint256 _pricePerKg
    ) external listingExists(_listingId) returns (uint256) {
        Listing storage listing = listings[_listingId];

        require(listing.status == ListingStatus.ACTIVE, "AgroChainMarketplace: Listagem nao esta ACTIVE");
        require(_quantityKg > 0, "AgroChainMarketplace: Quantidade deve ser maior que zero");
        require(_quantityKg <= MAX_QUANTITY_KG, "AgroChainMarketplace: Quantidade excede o limite maximo");
        require(
            _quantityKg <= (listing.weightKg - listing.weightSoldKg),
            "AgroChainMarketplace: Quantidade nao disponivel"
        );
        require(_pricePerKg > 0, "AgroChainMarketplace: Preco deve ser maior que zero");
        require(_pricePerKg <= MAX_PRICE_PER_KG, "AgroChainMarketplace: Preco excede o limite maximo");
        require(msg.sender != listing.seller, "AgroChainMarketplace: Vendedor nao pode fazer oferta no seu proprio anuncio");

        uint256 totalPrice = _quantityKg * _pricePerKg;
        require(totalPrice > 0, "AgroChainMarketplace: Preco total deve ser maior que zero");

        uint256 offerId = ++offerCounter;
        uint256 expiresAt = block.timestamp + OFFER_EXPIRATION_TIME;

        offers[offerId] = Offer({
            offerId: offerId,
            listingId: _listingId,
            buyer: msg.sender,
            quantityKg: _quantityKg,
            pricePerKg: _pricePerKg,
            status: OfferStatus.PENDING,
            createdAt: block.timestamp,
            expiresAt: expiresAt,
            orderId: 0,
            totalPrice: totalPrice
        });

        listingOffers[_listingId].push(offerId);

        emit OfferMade(
            offerId,
            _listingId,
            msg.sender,
            _quantityKg,
            _pricePerKg,
            totalPrice,
            expiresAt,
            block.timestamp
        );

        return offerId;
    }

    /// @notice Aceita uma oferta - cria ordem de pagamento via AgroChainPayments
    /// @param _offerId ID da oferta a aceitar
    function acceptOffer(uint256 _offerId) external offerExists(_offerId) returns (uint256) {
        Offer storage offer = offers[_offerId];
        Listing storage listing = listings[offer.listingId];

        require(msg.sender == listing.seller, "AgroChainMarketplace: Apenas o vendedor pode aceitar ofertas");
        require(offer.status == OfferStatus.PENDING, "AgroChainMarketplace: Oferta nao esta PENDING");
        require(offer.expiresAt > block.timestamp, "AgroChainMarketplace: Oferta expirou");
        require(
            listing.status == ListingStatus.ACTIVE,
            "AgroChainMarketplace: Listagem nao esta ACTIVE"
        );

        // Cria ordem de pagamento em AgroChainPayments
        uint256 orderId = agroChainPayments.createOrder(
            listing.seller,
            string(abi.encodePacked("LOT_", offer.listingId, "_OFFER_", _offerId)),
            offer.totalPrice,
            listing.tokenAddress
        );

        offer.status = OfferStatus.ACCEPTED;
        offer.orderId = orderId;

        // Atualiza peso vendido
        listing.weightSoldKg += offer.quantityKg;
        listing.updatedAt = block.timestamp;

        // Se toda quantidade foi vendida, marca listagem como SOLD
        if (listing.weightSoldKg >= listing.weightKg) {
            listing.status = ListingStatus.SOLD;
            emit ListingCompleted(offer.listingId, listing.seller, listing.weightSoldKg, block.timestamp);
        }

        emit OfferAccepted(
            _offerId,
            offer.listingId,
            offer.buyer,
            offer.quantityKg,
            offer.totalPrice,
            orderId,
            block.timestamp
        );

        return orderId;
    }

    /// @notice Rejeita uma oferta (apenas vendedor)
    /// @param _offerId ID da oferta a rejeitar
    function rejectOffer(uint256 _offerId) external offerExists(_offerId) {
        Offer storage offer = offers[_offerId];
        Listing storage listing = listings[offer.listingId];

        require(msg.sender == listing.seller, "AgroChainMarketplace: Apenas o vendedor pode rejeitar ofertas");
        require(offer.status == OfferStatus.PENDING, "AgroChainMarketplace: Apenas ofertas PENDING podem ser rejeitadas");

        offer.status = OfferStatus.REJECTED;

        emit OfferRejected(_offerId, offer.listingId, offer.buyer, block.timestamp);
    }

    /// @notice Cancela uma oferta (apenas comprador)
    /// @param _offerId ID da oferta a cancelar
    function cancelOffer(uint256 _offerId) external onlyOfferBuyer(_offerId) offerExists(_offerId) {
        Offer storage offer = offers[_offerId];

        require(offer.status == OfferStatus.PENDING, "AgroChainMarketplace: Apenas ofertas PENDING podem ser canceladas");

        offer.status = OfferStatus.CANCELLED;

        emit OfferCancelled(_offerId, offer.listingId, msg.sender, block.timestamp);
    }

    // =====================================================================
    // ESCROW FUNCTIONS
    // =====================================================================

    /// @notice Comprador financia o escrow de uma oferta já aceita pelo vendedor.
    /// @dev O Marketplace atua como intermediário: puxa os tokens do comprador,
    ///      aprova o contrato de pagamentos e deposita no escrow. Como o
    ///      Marketplace é quem chama `AgroChainPayments.createOrder`, ele é o
    ///      `buyer` da ordem e por isso é o único autorizado a depositar.
    /// @param _offerId ID da oferta a financiar
    function depositOfferEscrow(uint256 _offerId) external offerExists(_offerId) {
        Offer storage offer = offers[_offerId];
        Listing storage listing = listings[offer.listingId];

        require(offer.status == OfferStatus.ACCEPTED, "AgroChainMarketplace: Oferta nao esta aguardando financiamento");
        require(msg.sender == offer.buyer, "AgroChainMarketplace: Apenas o comprador pode financiar o escrow");

        IERC20 token = IERC20(listing.tokenAddress);
        uint256 amount = offer.totalPrice;

        offer.status = OfferStatus.FUNDED;

        token.safeTransferFrom(offer.buyer, address(this), amount);
        token.forceApprove(address(agroChainPayments), amount);
        agroChainPayments.depositEscrow(offer.orderId);

        emit OfferEscrowDeposited(_offerId, offer.orderId, offer.buyer, amount, block.timestamp);
    }

    /// @notice Comprador libera o escrow financiado ao vendedor.
    /// @param _offerId ID da oferta financiada
    function releaseOfferEscrow(uint256 _offerId) external offerExists(_offerId) {
        Offer storage offer = offers[_offerId];
        Listing storage listing = listings[offer.listingId];

        require(offer.status == OfferStatus.FUNDED, "AgroChainMarketplace: Oferta nao esta financiada");
        require(msg.sender == offer.buyer, "AgroChainMarketplace: Apenas o comprador pode liberar o escrow");

        offer.status = OfferStatus.COMPLETED;

        agroChainPayments.acceptOrder(offer.orderId);

        emit OfferEscrowReleased(_offerId, offer.orderId, listing.seller, offer.totalPrice, block.timestamp);
    }

    /// @notice Comprador solicita o reembolso do escrow financiado.
    /// @dev O contrato de pagamentos devolve os tokens ao Marketplace (buyer da
    ///      ordem); o Marketplace repassa ao comprador real e libera o peso
    ///      reservado na listagem.
    /// @param _offerId ID da oferta a reembolsar
    function refundOfferEscrow(uint256 _offerId) external offerExists(_offerId) {
        Offer storage offer = offers[_offerId];
        Listing storage listing = listings[offer.listingId];

        require(offer.status == OfferStatus.FUNDED, "AgroChainMarketplace: Oferta nao esta financiada");
        require(msg.sender == offer.buyer, "AgroChainMarketplace: Apenas o comprador pode reembolsar o escrow");

        offer.status = OfferStatus.REFUNDED;
        _releaseReservedWeight(offer.listingId, offer.quantityKg);

        agroChainPayments.rejectOrder(offer.orderId);

        IERC20(listing.tokenAddress).safeTransfer(offer.buyer, offer.totalPrice);

        emit OfferEscrowRefunded(_offerId, offer.orderId, offer.buyer, offer.totalPrice, block.timestamp);
        emit OfferWeightReleased(_offerId, offer.listingId, offer.quantityKg, block.timestamp);
    }

    /// @notice Vendedor cancela uma oferta aceita que ainda não foi financiada.
    /// @dev Libera o peso reservado, permitindo que a listagem volte a ficar ACTIVE.
    /// @param _offerId ID da oferta aceita (e ainda não financiada)
    function cancelAcceptedOffer(uint256 _offerId) external offerExists(_offerId) {
        Offer storage offer = offers[_offerId];
        Listing storage listing = listings[offer.listingId];

        require(msg.sender == listing.seller, "AgroChainMarketplace: Apenas o vendedor pode cancelar a oferta aceita");
        require(offer.status == OfferStatus.ACCEPTED, "AgroChainMarketplace: Oferta nao esta aguardando financiamento");

        offer.status = OfferStatus.CANCELLED;
        _releaseReservedWeight(offer.listingId, offer.quantityKg);

        emit OfferCancelled(_offerId, offer.listingId, offer.buyer, block.timestamp);
        emit OfferWeightReleased(_offerId, offer.listingId, offer.quantityKg, block.timestamp);
    }

    /// @notice Libera o peso reservado por uma oferta e reativa a listagem se necessário
    /// @param _listingId ID da listagem
    /// @param _quantityKg Quantidade a liberar
    function _releaseReservedWeight(uint256 _listingId, uint256 _quantityKg) internal {
        Listing storage listing = listings[_listingId];
        listing.weightSoldKg -= _quantityKg;
        if (listing.status == ListingStatus.SOLD && listing.weightSoldKg < listing.weightKg) {
            listing.status = ListingStatus.ACTIVE;
        }
        listing.updatedAt = block.timestamp;
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /// @notice Retorna dados completos de uma listagem
    /// @param _listingId ID da listagem
    /// @return Listing struct com todos os dados
    function getListing(uint256 _listingId) external view listingExists(_listingId) returns (Listing memory) {
        return listings[_listingId];
    }

    /// @notice Retorna dados completos de uma oferta
    /// @param _offerId ID da oferta
    /// @return Offer struct com todos os dados
    function getOffer(uint256 _offerId) external view offerExists(_offerId) returns (Offer memory) {
        return offers[_offerId];
    }

    /// @notice Retorna todas as ofertas de uma listagem
    /// @param _listingId ID da listagem
    /// @return Array de IDs das ofertas
    function getListingOffers(uint256 _listingId) external view listingExists(_listingId) returns (uint256[] memory) {
        return listingOffers[_listingId];
    }

    /// @notice Retorna número de listagens ativas para um tipo de lote
    /// @param _batchType Tipo de lote (COFFEE ou CACAO)
    /// @return Número de listagens ativas
    function getActiveListingsCount(BatchType _batchType) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].batchType == _batchType && listings[i].status == ListingStatus.ACTIVE) {
                count++;
            }
        }
        return count;
    }

    /// @notice Retorna listagens de um produtor específico
    /// @param _seller Endereço do produtor
    /// @return Array com IDs das listagens do produtor
    function getSellerListings(address _seller) external view returns (uint256[] memory) {
        uint256[] memory result = new uint256[](listingCounter);
        uint256 count = 0;

        for (uint256 i = 1; i <= listingCounter; i++) {
            if (listings[i].seller == _seller) {
                result[count] = i;
                count++;
            }
        }

        // Redimensiona array para remover slots vazios
        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }

        return finalResult;
    }

    /// @notice Verifica se uma oferta expirou
    /// @param _offerId ID da oferta
    /// @return true se a oferta expirou, false caso contrário
    function hasOfferExpired(uint256 _offerId) external view offerExists(_offerId) returns (bool) {
        return offers[_offerId].expiresAt <= block.timestamp;
    }

    /// @notice Retorna o peso disponível para uma listagem
    /// @param _listingId ID da listagem
    /// @return Peso disponível em kg
    function getAvailableWeight(uint256 _listingId) external view listingExists(_listingId) returns (uint256) {
        return listings[_listingId].weightKg - listings[_listingId].weightSoldKg;
    }
}
