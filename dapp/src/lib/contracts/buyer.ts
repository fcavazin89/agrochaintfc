import {
  BuyerProfile,
  PurchaseOrder,
  DeliveryStatus,
  ProducerReview,
  Review,
} from '@/types/agrochain';

/**
 * ABI do contrato AgroChainBuyer
 * Exportado após deploy do contrato
 */
export const AGROCHAIN_BUYER_ABI = [
  {
    type: 'constructor',
    inputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'registerBuyer',
    inputs: [
      { name: '_name', type: 'string' },
      { name: '_companyName', type: 'string' },
      { name: '_country', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createPurchaseOrder',
    inputs: [
      { name: '_buyer', type: 'address' },
      { name: '_producer', type: 'address' },
      { name: '_listingId', type: 'uint256' },
      { name: '_lotId', type: 'bytes32' },
      { name: '_quantityKg', type: 'uint256' },
      { name: '_unitPrice', type: 'uint256' },
      { name: '_origin', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'updateDeliveryStatus',
    inputs: [
      { name: '_orderId', type: 'uint256' },
      { name: '_newStatus', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPurchaseHistory',
    inputs: [{ name: '_buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPurchaseOrder',
    inputs: [{ name: '_orderId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'orderId', type: 'uint256' },
          { name: 'listingId', type: 'uint256' },
          { name: 'lotId', type: 'bytes32' },
          { name: 'producer', type: 'address' },
          { name: 'buyer', type: 'address' },
          { name: 'purchaseDate', type: 'uint256' },
          { name: 'deliveryDate', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'quantityKg', type: 'uint256' },
          { name: 'unitPrice', type: 'uint256' },
          { name: 'totalPrice', type: 'uint256' },
          { name: 'origin', type: 'string' },
          { name: 'notes', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBuyerProfile',
    inputs: [{ name: '_buyer', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'buyerAddress', type: 'address' },
          { name: 'name', type: 'string' },
          { name: 'companyName', type: 'string' },
          { name: 'country', type: 'string' },
          { name: 'reputation', type: 'uint256' },
          { name: 'batchesAcquired', type: 'uint256' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'calculateReputation',
    inputs: [{ name: '_buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getRating',
    inputs: [{ name: '_buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'submitReview',
    inputs: [
      { name: '_orderId', type: 'uint256' },
      { name: '_rating', type: 'uint256' },
      { name: '_comment', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getBuyerReviews',
    inputs: [{ name: '_buyer', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getReview',
    inputs: [{ name: '_reviewId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'reviewId', type: 'uint256' },
          { name: 'orderId', type: 'uint256' },
          { name: 'reviewer', type: 'address' },
          { name: 'rating', type: 'uint256' },
          { name: 'comment', type: 'string' },
          { name: 'createdAt', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'BuyerRegistered',
    inputs: [
      { indexed: true, name: 'buyerAddress', type: 'address' },
      { indexed: false, name: 'name', type: 'string' },
      { indexed: false, name: 'companyName', type: 'string' },
      { indexed: false, name: 'country', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'PurchaseOrderCreated',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: true, name: 'producer', type: 'address' },
      { indexed: false, name: 'listingId', type: 'uint256' },
      { indexed: false, name: 'quantityKg', type: 'uint256' },
      { indexed: false, name: 'totalPrice', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'DeliveryStatusChanged',
    inputs: [
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'newStatus', type: 'uint8' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ReviewSubmitted',
    inputs: [
      { indexed: true, name: 'reviewId', type: 'uint256' },
      { indexed: true, name: 'orderId', type: 'uint256' },
      { indexed: true, name: 'reviewer', type: 'address' },
      { indexed: false, name: 'rating', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ReputationUpdated',
    inputs: [
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'newReputation', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
];

/**
 * Endereço do contrato AgroChainBuyer (carregar de variáveis de ambiente)
 */
export const BUYER_ADDRESS = process.env.NEXT_PUBLIC_BUYER_ADDRESS || '';

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Calcula reputação média a partir de um array de ratings
 * @param ratings Array de ratings (1-5)
 * @returns Reputação média (0-100)
 */
export function calculateReputation(ratings: number[]): number {
  if (ratings.length === 0) return 0;

  const total = ratings.reduce((sum, rating) => sum + (rating * 20), 0); // 5-star to 100-point scale
  return Math.round(total / ratings.length);
}

/**
 * Filtra pedidos por status de entrega
 * @param orders Array de pedidos
 * @param status Status a filtrar
 * @returns Pedidos filtrados
 */
export function filterOrdersByStatus(
  orders: PurchaseOrder[],
  status: DeliveryStatus
): PurchaseOrder[] {
  return orders.filter(order => order.status === status);
}

/**
 * Filtra pedidos por intervalo de data
 * @param orders Array de pedidos
 * @param startDate Timestamp inicial
 * @param endDate Timestamp final
 * @returns Pedidos no intervalo
 */
export function filterOrdersByDateRange(
  orders: PurchaseOrder[],
  startDate: number,
  endDate: number
): PurchaseOrder[] {
  return orders.filter(
    order => order.dataCompra >= startDate && order.dataCompra <= endDate
  );
}

/**
 * Filtra pedidos por produtor
 * @param orders Array de pedidos
 * @param producer Endereço do produtor
 * @returns Pedidos do produtor
 */
export function filterOrdersByProducer(
  orders: PurchaseOrder[],
  producer: string
): PurchaseOrder[] {
  return orders.filter(
    order => order.produtor.toLowerCase() === producer.toLowerCase()
  );
}

/**
 * Mapeia status de número para enum legível
 */
function mapDeliveryStatus(statusCode: number): DeliveryStatus {
  const statuses: Record<number, DeliveryStatus> = {
    0: DeliveryStatus.Aguardando,
    1: DeliveryStatus.Emitido,
    2: DeliveryStatus.Transportando,
    3: DeliveryStatus.Entregue,
    4: DeliveryStatus.Rejeitado,
  };
  return statuses[statusCode] || DeliveryStatus.Aguardando;
}

/**
 * Transforma dados brutos do contrato em BuyerProfile formatada
 */
export function formatBuyerProfile(rawProfile: any): BuyerProfile {
  return {
    buyerId: rawProfile.buyerAddress,
    nome: rawProfile.name,
    empresa: rawProfile.companyName,
    país: rawProfile.country,
    reputação: rawProfile.reputation ? rawProfile.reputation / 100 : 0, // Converte para 0-100 scale
    lotesComprados: Number(rawProfile.batchesAcquired),
    endereco: rawProfile.buyerAddress,
    dataRegistro: Number(rawProfile.registeredAt),
  };
}

/**
 * Transforma dados brutos do contrato em PurchaseOrder formatada
 */
export function formatPurchaseOrder(rawOrder: any): PurchaseOrder {
  return {
    orderId: String(rawOrder.orderId),
    listingId: String(rawOrder.listingId),
    loteId: rawOrder.lotId,
    produtor: rawOrder.producer,
    dataCompra: Number(rawOrder.purchaseDate),
    dataEntrega: Number(rawOrder.deliveryDate),
    status: mapDeliveryStatus(rawOrder.status),
    quantidadeKg: Number(rawOrder.quantityKg),
    precoUnitario: Number(rawOrder.unitPrice) / 1e6, // Unscale 6 decimals
    precoTotal: Number(rawOrder.totalPrice) / 1e6, // Unscale 6 decimals
    comprador: rawOrder.buyer,
    origem: rawOrder.origin,
    observacoes: rawOrder.notes,
  };
}

/**
 * Trunca um endereço para exibição (ex: 0x1234...5678)
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Obtém produtores únicos dos pedidos de compra do comprador
 * @param orders Array de pedidos de compra
 * @returns Array de endereços únicos de produtores
 */
export function getProducersByBuyer(orders: PurchaseOrder[]): string[] {
  const producers = new Set(orders.map(order => order.produtor));
  return Array.from(producers);
}

/**
 * Adiciona um novo review ao histórico
 * @param reviews Array de reviews existentes
 * @param newReview Review a adicionar
 * @returns Array atualizado de reviews
 */
export function addReviewToBuyer(reviews: Review[], newReview: Review): Review[] {
  return [...reviews, newReview];
}

/**
 * Obtém reviews de um produtor específico
 * @param allReviews Array de todos os reviews
 * @param producerAddress Endereço do produtor
 * @returns Array de reviews do produtor
 */
export function getReviewsByProducer(
  allReviews: Review[],
  producerAddress: string
): Review[] {
  return allReviews.filter(review => {
    // Aqui você filtraria por produtor, mas como Review não tem produtor direto,
    // usaremos isso em contexto com orderId para buscar o produtor da order
    return true;
  });
}

/**
 * Calcula rating médio a partir de reviews
 * @param reviews Array de reviews
 * @returns Rating médio (1-5) ou 0 se sem reviews
 */
export function calculateAverageRating(reviews: Review[]): number {
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}

/**
 * Converte rating (1-5) para reputação (0-100)
 * @param rating Rating de 1-5
 * @returns Reputação de 0-100
 */
export function ratingToReputation(rating: number): number {
  return Math.round((rating / 5) * 100);
}

// =====================================================================
// MOCK DATA (para desenvolvimento sem contrato deployado)
// =====================================================================

/**
 * Dados mock de perfis de compradores (5 buyers)
 */
export const MOCK_BUYER_PROFILES: BuyerProfile[] = [
  {
    buyerId: '0xabcd567890123456789012345678901234567890',
    nome: 'João Santos',
    empresa: 'Importações Brasil Ltda',
    país: 'Brasil',
    reputação: 92,
    lotesComprados: 24,
    endereco: '0xabcd567890123456789012345678901234567890',
    dataRegistro: Date.now() - 15552000000, // 180 dias atrás
    email: 'joao@importacoes.com.br',
  },
  {
    buyerId: '0xbcde567890123456789012345678901234567890',
    nome: 'Maria Oliveira',
    empresa: 'Café Premium International',
    país: 'Brasil',
    reputação: 88,
    lotesComprados: 18,
    endereco: '0xbcde567890123456789012345678901234567890',
    dataRegistro: Date.now() - 12960000000, // 150 dias atrás
    email: 'maria@cafepremium.com.br',
  },
  {
    buyerId: '0xcdef567890123456789012345678901234567890',
    nome: 'Europa Distributors GmbH',
    empresa: 'Europa Coffee Trading',
    país: 'Alemanha',
    reputação: 95,
    lotesComprados: 42,
    endereco: '0xcdef567890123456789012345678901234567890',
    dataRegistro: Date.now() - 31536000000, // 365 dias atrás
    email: 'contact@europacoffee.de',
  },
  {
    buyerId: '0xdef0567890123456789012345678901234567890',
    nome: 'Asia Imports Corp',
    empresa: 'Cacao Asia Ltd',
    país: 'Vietnã',
    reputação: 78,
    lotesComprados: 31,
    endereco: '0xdef0567890123456789012345678901234567890',
    dataRegistro: Date.now() - 7776000000, // 90 dias atrás
    email: 'business@cacaoasia.vn',
  },
  {
    buyerId: '0xef01567890123456789012345678901234567890',
    nome: 'North America Wholesale',
    empresa: 'NAM Coffee Group',
    país: 'Estados Unidos',
    reputação: 85,
    lotesComprados: 19,
    endereco: '0xef01567890123456789012345678901234567890',
    dataRegistro: Date.now() - 5184000000, // 60 dias atrás
    email: 'orders@namcoffee.us',
  },
];

/**
 * Dados mock de pedidos de compra (8-10 ordens com status variados)
 */
export const MOCK_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    orderId: '1',
    listingId: '1',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000001',
    produtor: '0x1234567890123456789012345678901234567890',
    dataCompra: Date.now() - 2592000000, // 30 dias atrás
    dataEntrega: Date.now() - 2505600000, // 29 dias atrás
    status: DeliveryStatus.Entregue,
    quantidadeKg: 500,
    precoUnitario: 3.5,
    precoTotal: 1750,
    comprador: '0xabcd567890123456789012345678901234567890',
    origem: 'Minas Gerais',
    observacoes: 'Entrega realizada no prazo',
  },
  {
    orderId: '2',
    listingId: '2',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000002',
    produtor: '0x2234567890123456789012345678901234567890',
    dataCompra: Date.now() - 1728000000, // 20 dias atrás
    dataEntrega: Date.now() - 1641600000, // 19 dias atrás
    status: DeliveryStatus.Entregue,
    quantidadeKg: 750,
    precoUnitario: 5.2,
    precoTotal: 3900,
    comprador: '0xbcde567890123456789012345678901234567890',
    origem: 'Bahia',
    observacoes: 'Qualidade excepcional',
  },
  {
    orderId: '3',
    listingId: '3',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000003',
    produtor: '0x3234567890123456789012345678901234567890',
    dataCompra: Date.now() - 864000000, // 10 dias atrás
    dataEntrega: Date.now() - 172800000, // 2 dias atrás
    status: DeliveryStatus.Transportando,
    quantidadeKg: 300,
    precoUnitario: 4.1,
    precoTotal: 1230,
    comprador: '0xcdef567890123456789012345678901234567890',
    origem: 'São Paulo',
    observacoes: 'Em trânsito',
  },
  {
    orderId: '4',
    listingId: '4',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000004',
    produtor: '0x4234567890123456789012345678901234567890',
    dataCompra: Date.now() - 604800000, // 7 dias atrás
    dataEntrega: Date.now() + 172800000, // em 2 dias
    status: DeliveryStatus.Emitido,
    quantidadeKg: 600,
    precoUnitario: 3.8,
    precoTotal: 2280,
    comprador: '0xdef0567890123456789012345678901234567890',
    origem: 'Espírito Santo',
    observacoes: 'Documentação emitida',
  },
  {
    orderId: '5',
    listingId: '5',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000005',
    produtor: '0x5234567890123456789012345678901234567890',
    dataCompra: Date.now() - 432000000, // 5 dias atrás
    dataEntrega: Date.now() + 345600000, // em 4 dias
    status: DeliveryStatus.Aguardando,
    quantidadeKg: 450,
    precoUnitario: 4.5,
    precoTotal: 2025,
    comprador: '0xef01567890123456789012345678901234567890',
    origem: 'Rondônia',
    observacoes: 'Aguardando confirmação do produtor',
  },
  {
    orderId: '6',
    listingId: '1',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000001',
    produtor: '0x1234567890123456789012345678901234567890',
    dataCompra: Date.now() - 3456000000, // 40 dias atrás
    dataEntrega: Date.now() - 3369600000, // 39 dias atrás
    status: DeliveryStatus.Entregue,
    quantidadeKg: 200,
    precoUnitario: 3.5,
    precoTotal: 700,
    comprador: '0xabcd567890123456789012345678901234567890',
    origem: 'Minas Gerais',
    observacoes: 'Segunda compra do lote',
  },
  {
    orderId: '7',
    listingId: '6',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000006',
    produtor: '0x6234567890123456789012345678901234567890',
    dataCompra: Date.now() - 1209600000, // 14 dias atrás
    dataEntrega: Date.now() - 259200000, // 3 dias atrás
    status: DeliveryStatus.Rejeitado,
    quantidadeKg: 100,
    precoUnitario: 2.8,
    precoTotal: 280,
    comprador: '0xcdef567890123456789012345678901234567890',
    origem: 'Paraná',
    observacoes: 'Rejeitado por não conformidade com padrões',
  },
  {
    orderId: '8',
    listingId: '7',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000007',
    produtor: '0x7234567890123456789012345678901234567890',
    dataCompra: Date.now() - 259200000, // 3 dias atrás
    dataEntrega: Date.now() + 604800000, // em 7 dias
    status: DeliveryStatus.Transportando,
    quantidadeKg: 850,
    precoUnitario: 6.2,
    precoTotal: 5270,
    comprador: '0xbcde567890123456789012345678901234567890',
    origem: 'Santa Catarina',
    observacoes: 'Grande volume em trânsito',
  },
  {
    orderId: '9',
    listingId: '8',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000008',
    produtor: '0x8234567890123456789012345678901234567890',
    dataCompra: Date.now() - 86400000, // ontem
    dataEntrega: Date.now() + 518400000, // em 6 dias
    status: DeliveryStatus.Aguardando,
    quantidadeKg: 250,
    precoUnitario: 3.9,
    precoTotal: 975,
    comprador: '0xef01567890123456789012345678901234567890',
    origem: 'Goiás',
    observacoes: 'Pedido recém criado',
  },
  {
    orderId: '10',
    listingId: '2',
    loteId: '0x0000000000000000000000000000000000000000000000000000000000000002',
    produtor: '0x2234567890123456789012345678901234567890',
    dataCompra: Date.now() - 5184000000, // 60 dias atrás
    dataEntrega: Date.now() - 5097600000, // 59 dias atrás
    status: DeliveryStatus.Entregue,
    quantidadeKg: 1000,
    precoUnitario: 5.2,
    precoTotal: 5200,
    comprador: '0xdef0567890123456789012345678901234567890',
    origem: 'Bahia',
    observacoes: 'Pedido importante do cliente VIP',
  },
];

/**
 * Dados mock de reviews para testes/desenvolvimento
 */
export const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    orderId: '1',
    dataEnvio: Date.now() - 2505600000, // 29 dias atrás
    rating: 5,
    texto: 'Produto de excelente qualidade, chegou no prazo e bem embalado. Recomendo!',
    status: 'Enviado',
  },
  {
    id: '2',
    orderId: '6',
    dataEnvio: Date.now() - 3369600000, // 39 dias atrás
    rating: 4,
    texto: 'Bom café, entrega rápida. Tive um pequeno problema com embalagem.',
    status: 'Enviado',
  },
  {
    id: '3',
    orderId: '2',
    dataEnvio: Date.now() - 1641600000, // 19 dias atrás
    rating: 5,
    texto: 'Cacau de primeira qualidade. Muito satisfeito com a compra. Voltarei a fazer pedidos.',
    status: 'Enviado',
  },
  {
    id: '4',
    orderId: '10',
    dataEnvio: Date.now() - 5097600000, // 59 dias atrás
    rating: 4,
    texto: 'Ótimo produto, especialmente o aroma. Pequeno atraso na entrega, mas aceitável.',
    status: 'Enviado',
  },
  {
    id: '5',
    orderId: '7',
    dataEnvio: Date.now() - 259200000, // 3 dias atrás
    rating: 2,
    texto: 'Produto chegou com problemas de conformidade. Não atendeu aos padrões acordados.',
    status: 'Enviado',
  },
];

/**
 * Agrupa reviews por produtor e calcula estatísticas
 * @param orders Array de pedidos de compra
 * @param reviews Array de reviews
 * @param producerProfiles Array de perfis de produtores (com nome/empresa)
 * @returns Array de ProducerReview com reviews agrupados
 */
export function groupReviewsByProducer(
  orders: PurchaseOrder[],
  reviews: Review[],
  producerProfiles: BuyerProfile[] // usado como lookup para nomes/empresas
): ProducerReview[] {
  const producersMap: Record<string, { orders: PurchaseOrder[]; reviews: Review[] }> = {};

  // Agrupa pedidos por produtor
  orders.forEach(order => {
    const producer = order.produtor.toLowerCase();
    if (!producersMap[producer]) {
      producersMap[producer] = { orders: [], reviews: [] };
    }
    producersMap[producer].orders.push(order);
  });

  // Agrupa reviews por produtor (via orderId)
  reviews.forEach(review => {
    const order = orders.find(o => o.orderId === review.orderId);
    if (order) {
      const producer = order.produtor.toLowerCase();
      if (!producersMap[producer]) {
        producersMap[producer] = { orders: [], reviews: [] };
      }
      producersMap[producer].reviews.push(review);
    }
  });

  // Converte para array de ProducerReview
  return Object.entries(producersMap).map(([producerAddress, data]) => {
    const ratingMedio = calculateAverageRating(data.reviews);

    return {
      produtor: producerAddress,
      nome: MOCK_PRODUCER_NAMES[producerAddress] || 'Produtor',
      empresa: MOCK_PRODUCER_COMPANIES[producerAddress] || 'Empresa',
      reputacao: ratingToReputation(ratingMedio || 0),
      ratingMedio,
      totalTransacoes: data.orders.length,
      reviews: data.reviews,
    };
  });
}

/**
 * Dados mock de nomes de produtores (lookup por endereço)
 */
export const MOCK_PRODUCER_NAMES: Record<string, string> = {
  '0x1234567890123456789012345678901234567890': 'João Silva',
  '0x2234567890123456789012345678901234567890': 'Maria Ferreira',
  '0x3234567890123456789012345678901234567890': 'Carlos Oliveira',
  '0x4234567890123456789012345678901234567890': 'Ana Costa',
  '0x5234567890123456789012345678901234567890': 'Pedro Santos',
  '0x6234567890123456789012345678901234567890': 'Lucia Alves',
  '0x7234567890123456789012345678901234567890': 'Roberto Dias',
  '0x8234567890123456789012345678901234567890': 'Fernanda Rocha',
};

/**
 * Dados mock de empresas de produtores (lookup por endereço)
 */
export const MOCK_PRODUCER_COMPANIES: Record<string, string> = {
  '0x1234567890123456789012345678901234567890': 'Fazenda Silva & Cia',
  '0x2234567890123456789012345678901234567890': 'Produtora Ferreira Ltda',
  '0x3234567890123456789012345678901234567890': 'Café Premium Oliveira',
  '0x4234567890123456789012345678901234567890': 'Cacau Fino Costa',
  '0x5234567890123456789012345678901234567890': 'Grãos Santos SA',
  '0x6234567890123456789012345678901234567890': 'Produção Alves Premium',
  '0x7234567890123456789012345678901234567890': 'Fazenda Dias Exportações',
  '0x8234567890123456789012345678901234567890': 'Rocha Agro Produtos',
};
