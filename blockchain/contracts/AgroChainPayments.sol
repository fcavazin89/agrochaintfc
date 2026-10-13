// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AgroChain Payments - Sistema de Escrow
/// @notice Sistema de pagamento em escrow para transações entre produtor e comprador
/// @dev Implementa contratos de venda com depósito de tokens em escrow e liberação condicional
contract AgroChainPayments {
    using SafeERC20 for IERC20;

    /// @notice Status possíveis de uma ordem
    enum OrderStatus {
        PENDING,        // 0: Ordem criada, aguardando depósito
        ESCROW,         // 1: Tokens em escrow (comprador depositou)
        ACCEPTED,       // 2: Ordem aceita pelo comprador, fundos liberados ao vendedor
        REJECTED,       // 3: Ordem rejeitada, fundos devolvidos ao comprador
        COMPLETED       // 4: Transação finalizada
    }

    /// @notice Estrutura que representa uma ordem de compra/venda
    struct Order {
        uint256 orderId;            // ID único da ordem
        address seller;             // Endereço do vendedor (produtor)
        address buyer;              // Endereço do comprador
        string productId;           // ID do produto/lote (referência externa)
        address tokenAddress;       // Endereço do token ERC20 (ex: USDC)
        uint256 amount;             // Quantidade de tokens em escrow
        OrderStatus status;         // Status atual da ordem
        uint256 createdAt;          // Timestamp de criação
        uint256 completedAt;        // Timestamp de conclusão (0 se pendente)
    }

    // =====================================================================
    // STATE VARIABLES
    // =====================================================================

    mapping(uint256 => Order) public orders;
    uint256 public orderCounter;

    // =====================================================================
    // EVENTS
    // =====================================================================

    /// @notice Emitido quando uma nova ordem é criada
    event OrderCreated(
        uint256 indexed orderId,
        address indexed seller,
        address indexed buyer,
        string productId,
        address tokenAddress,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitido quando o comprador deposita tokens no escrow
    event Deposited(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitido quando a ordem é aceita e fundos são liberados ao vendedor
    event Accepted(
        uint256 indexed orderId,
        address indexed seller,
        uint256 amount,
        uint256 timestamp
    );

    /// @notice Emitido quando a ordem é rejeitada e fundos devolvidos ao comprador
    event Rejected(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    // =====================================================================
    // FUNCTIONS
    // =====================================================================

    /// @notice Cria uma nova ordem de compra/venda
    /// @param _seller Endereço do vendedor (produtor)
    /// @param _productId ID do produto/lote
    /// @param _amount Quantidade de tokens a serem depositados em escrow
    /// @param _tokenAddress Endereço do token ERC20
    /// @return orderId ID da ordem criada
    function createOrder(
        address _seller,
        string calldata _productId,
        uint256 _amount,
        address _tokenAddress
    ) external returns (uint256) {
        require(_seller != address(0), "AgroChainPayments: Invalid seller address");
        require(_seller != msg.sender, "AgroChainPayments: Seller cannot be buyer");
        require(_amount > 0, "AgroChainPayments: Amount must be greater than zero");
        require(_tokenAddress != address(0), "AgroChainPayments: Invalid token address");
        require(bytes(_productId).length > 0, "AgroChainPayments: Product ID required");

        uint256 orderId = ++orderCounter;

        orders[orderId] = Order({
            orderId: orderId,
            seller: _seller,
            buyer: msg.sender,
            productId: _productId,
            tokenAddress: _tokenAddress,
            amount: _amount,
            status: OrderStatus.PENDING,
            createdAt: block.timestamp,
            completedAt: 0
        });

        emit OrderCreated(
            orderId,
            _seller,
            msg.sender,
            _productId,
            _tokenAddress,
            _amount,
            block.timestamp
        );

        return orderId;
    }

    /// @notice Comprador deposita tokens no escrow da ordem
    /// @param _orderId ID da ordem
    function depositEscrow(uint256 _orderId) external {
        Order storage order = orders[_orderId];

        require(order.seller != address(0), "AgroChainPayments: Order not found");
        require(order.buyer == msg.sender, "AgroChainPayments: Only buyer can deposit");
        require(order.status == OrderStatus.PENDING, "AgroChainPayments: Order not in PENDING status");

        // Transfere tokens do comprador para este contrato
        IERC20(order.tokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            order.amount
        );

        order.status = OrderStatus.ESCROW;

        emit Deposited(
            _orderId,
            msg.sender,
            order.amount,
            block.timestamp
        );
    }

    /// @notice Comprador aceita a ordem - libera fundos ao vendedor
    /// @param _orderId ID da ordem
    function acceptOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];

        require(order.seller != address(0), "AgroChainPayments: Order not found");
        require(order.buyer == msg.sender, "AgroChainPayments: Only buyer can accept");
        require(order.status == OrderStatus.ESCROW, "AgroChainPayments: Order not in ESCROW status");

        order.status = OrderStatus.ACCEPTED;
        order.completedAt = block.timestamp;

        // Transfere tokens do escrow ao vendedor
        IERC20(order.tokenAddress).safeTransfer(
            order.seller,
            order.amount
        );

        emit Accepted(
            _orderId,
            order.seller,
            order.amount,
            block.timestamp
        );
    }

    /// @notice Comprador rejeita a ordem - devolve fundos ao comprador
    /// @param _orderId ID da ordem
    function rejectOrder(uint256 _orderId) external {
        Order storage order = orders[_orderId];

        require(order.seller != address(0), "AgroChainPayments: Order not found");
        require(order.buyer == msg.sender, "AgroChainPayments: Only buyer can reject");
        require(order.status == OrderStatus.ESCROW, "AgroChainPayments: Order not in ESCROW status");

        order.status = OrderStatus.REJECTED;
        order.completedAt = block.timestamp;

        // Devolve tokens do escrow ao comprador
        IERC20(order.tokenAddress).safeTransfer(
            msg.sender,
            order.amount
        );

        emit Rejected(
            _orderId,
            msg.sender,
            order.amount,
            block.timestamp
        );
    }

    // =====================================================================
    // VIEW FUNCTIONS
    // =====================================================================

    /// @notice Retorna os dados completos de uma ordem
    /// @param _orderId ID da ordem
    /// @return Order struct contendo todos os dados
    function getOrder(uint256 _orderId) external view returns (Order memory) {
        require(orders[_orderId].seller != address(0), "AgroChainPayments: Order not found");
        return orders[_orderId];
    }

    /// @notice Retorna o status atual de uma ordem
    /// @param _orderId ID da ordem
    /// @return OrderStatus atual
    function getOrderStatus(uint256 _orderId) external view returns (OrderStatus) {
        require(orders[_orderId].seller != address(0), "AgroChainPayments: Order not found");
        return orders[_orderId].status;
    }
}
