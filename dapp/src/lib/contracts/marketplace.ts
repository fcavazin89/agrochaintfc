import {
  MarketplaceListing,
  MarketplaceOffer,
  MarketplaceFilter,
  MarketplaceListingStatus,
  MarketplaceOfferStatus,
  BatchType,
} from '@/types/agrochain';

/**
 * ABI do contrato AgroChainMarketplace
 * Exportado após deploy do contrato
 */
export const AGROCHAIN_MARKETPLACE_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_agroChainPayments', type: 'address' },
      { name: '_smartLot', type: 'address' },
      { name: '_feeRecipient', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'createListing',
    inputs: [
      { name: '_lotId', type: 'bytes32' },
      { name: '_batchType', type: 'uint8' },
      { name: '_weightKg', type: 'uint256' },
      { name: '_pricePerKg', type: 'uint256' },
      { name: '_tokenAddress', type: 'address' },
      { name: '_origin', type: 'string' },
      { name: '_safra', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelListing',
    inputs: [{ name: '_listingId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'makeOffer',
    inputs: [
      { name: '_listingId', type: 'uint256' },
      { name: '_quantityKg', type: 'uint256' },
      { name: '_pricePerKg', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'acceptOffer',
    inputs: [{ name: '_offerId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'rejectOffer',
    inputs: [{ name: '_offerId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'cancelOffer',
    inputs: [{ name: '_offerId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getListing',
    inputs: [{ name: '_listingId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'listingId', type: 'uint256' },
          { name: 'seller', type: 'address' },
          { name: 'lotId', type: 'bytes32' },
          { name: 'batchType', type: 'uint8' },
          { name: 'weightKg', type: 'uint256' },
          { name: 'weightSoldKg', type: 'uint256' },
          { name: 'pricePerKg', type: 'uint256' },
          { name: 'tokenAddress', type: 'address' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'updatedAt', type: 'uint256' },
          { name: 'origin', type: 'string' },
          { name: 'safra', type: 'string' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getOffer',
    inputs: [{ name: '_offerId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'offerId', type: 'uint256' },
          { name: 'listingId', type: 'uint256' },
          { name: 'buyer', type: 'address' },
          { name: 'quantityKg', type: 'uint256' },
          { name: 'pricePerKg', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'expiresAt', type: 'uint256' },
          { name: 'orderId', type: 'uint256' },
          { name: 'totalPrice', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getListingOffers',
    inputs: [{ name: '_listingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getSellerListings',
    inputs: [{ name: '_seller', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getAvailableWeight',
    inputs: [{ name: '_listingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'listingCounter',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ListingCreated',
    inputs: [
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: true, name: 'lotId', type: 'bytes32' },
      { indexed: false, name: 'batchType', type: 'uint8' },
      { indexed: false, name: 'weightKg', type: 'uint256' },
      { indexed: false, name: 'pricePerKg', type: 'uint256' },
      { indexed: false, name: 'tokenAddress', type: 'address' },
      { indexed: false, name: 'origin', type: 'string' },
      { indexed: false, name: 'safra', type: 'string' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ListingCancelled',
    inputs: [
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'ListingCompleted',
    inputs: [
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'seller', type: 'address' },
      { indexed: false, name: 'totalWeightSold', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OfferMade',
    inputs: [
      { indexed: true, name: 'offerId', type: 'uint256' },
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'quantityKg', type: 'uint256' },
      { indexed: false, name: 'pricePerKg', type: 'uint256' },
      { indexed: false, name: 'totalPrice', type: 'uint256' },
      { indexed: false, name: 'expiresAt', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OfferAccepted',
    inputs: [
      { indexed: true, name: 'offerId', type: 'uint256' },
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'quantityKg', type: 'uint256' },
      { indexed: false, name: 'totalPrice', type: 'uint256' },
      { indexed: false, name: 'orderId', type: 'uint256' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OfferRejected',
    inputs: [
      { indexed: true, name: 'offerId', type: 'uint256' },
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'OfferCancelled',
    inputs: [
      { indexed: true, name: 'offerId', type: 'uint256' },
      { indexed: true, name: 'listingId', type: 'uint256' },
      { indexed: true, name: 'buyer', type: 'address' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
  },
];

/**
 * Endereço do contrato Marketplace (carregar de variáveis de ambiente)
 */
export const MARKETPLACE_ADDRESS = process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS || '';

/**
 * Endereço do contrato AgroChainPayments (carregar de variáveis de ambiente)
 */
export const PAYMENTS_ADDRESS = process.env.NEXT_PUBLIC_PAYMENTS_ADDRESS || '';

/**
 * Endereço do contrato SmartLot (carregar de variáveis de ambiente)
 */
export const SMARTLOT_ADDRESS = process.env.NEXT_PUBLIC_SMARTLOT_ADDRESS || '';

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Calcula o preço total de uma oferta
 * @param quantityKg Quantidade em kg
 * @param pricePerKg Preço por kg (scaled para 6 decimals)
 * @returns Preço total em tokens (scaled)
 */
export function calculateTotal(quantityKg: number, pricePerKg: number): number {
  return quantityKg * pricePerKg;
}

/**
 * Converte preço do contrato (scaled com 6 decimals) para número legível
 * @param scaledPrice Preço escalado do contrato
 * @returns Preço em formato legível
 */
export function formatPrice(scaledPrice: bigint | number): number {
  const price = typeof scaledPrice === 'bigint' ? Number(scaledPrice) : scaledPrice;
  return price / 1e6; // Divide por 1 milhão (6 decimals USDC)
}

/**
 * Converte número legível para preço do contrato (scaled com 6 decimals)
 * @param price Preço legível
 * @returns Preço escalado para o contrato
 */
export function scalePrice(price: number): bigint {
  return BigInt(Math.floor(price * 1e6));
}

/**
 * Mapeia status de número para enum legível (Listing)
 */
function mapListingStatus(statusCode: number): MarketplaceListingStatus {
  const statuses: Record<number, MarketplaceListingStatus> = {
    0: MarketplaceListingStatus.Active,
    1: MarketplaceListingStatus.Sold,
    2: MarketplaceListingStatus.Cancelled,
  };
  return statuses[statusCode] || MarketplaceListingStatus.Active;
}

/**
 * Mapeia status de número para enum legível (Offer)
 */
function mapOfferStatus(statusCode: number): MarketplaceOfferStatus {
  const statuses: Record<number, MarketplaceOfferStatus> = {
    0: MarketplaceOfferStatus.Pending,
    1: MarketplaceOfferStatus.Accepted,
    2: MarketplaceOfferStatus.Rejected,
    3: MarketplaceOfferStatus.Cancelled,
  };
  return statuses[statusCode] || MarketplaceOfferStatus.Pending;
}

/**
 * Mapeia tipo de batch de número para enum legível
 */
function mapBatchType(batchTypeCode: number): BatchType {
  return batchTypeCode === 0 ? 'Coffee' : 'Cacao';
}

/**
 * Transforma dados brutos do contrato em MarketplaceListing formatada
 */
export function formatListing(rawListing: any): MarketplaceListing {
  const availableKg = Number(rawListing.weightKg) - Number(rawListing.weightSoldKg);

  return {
    listingId: String(rawListing.listingId),
    seller: rawListing.seller,
    lotId: rawListing.lotId,
    batchType: mapBatchType(rawListing.batchType),
    weightKg: Number(rawListing.weightKg),
    weightAvailableKg: availableKg,
    pricePerKg: formatPrice(rawListing.pricePerKg),
    tokenAddress: rawListing.tokenAddress,
    status: mapListingStatus(rawListing.status),
    createdAt: Number(rawListing.createdAt),
    updatedAt: Number(rawListing.updatedAt),
    origin: rawListing.origin,
    safra: rawListing.safra,
  };
}

/**
 * Transforma dados brutos do contrato em MarketplaceOffer formatada
 */
export function formatOffer(rawOffer: any): MarketplaceOffer {
  return {
    offerId: String(rawOffer.offerId),
    listingId: String(rawOffer.listingId),
    buyer: rawOffer.buyer,
    quantityKg: Number(rawOffer.quantityKg),
    pricePerKg: formatPrice(rawOffer.pricePerKg),
    totalPrice: formatPrice(rawOffer.totalPrice),
    status: mapOfferStatus(rawOffer.status),
    createdAt: Number(rawOffer.createdAt),
    expiresAt: Number(rawOffer.expiresAt),
    orderId: rawOffer.orderId ? String(rawOffer.orderId) : undefined,
  };
}

/**
 * Trunca um endereço para exibição (ex: 0x1234...5678)
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// =====================================================================
// MOCK DATA (para desenvolvimento sem contrato deployado)
// =====================================================================

/**
 * Dados mock de listagens para testes/desenvolvimento
 */
export const MOCK_LISTINGS: MarketplaceListing[] = [
  {
    listingId: '1',
    seller: '0x1234567890123456789012345678901234567890',
    lotId: '0x0000000000000000000000000000000000000000000000000000000000000001',
    batchType: 'Coffee',
    weightKg: 500,
    weightAvailableKg: 350,
    pricePerKg: 3.5,
    tokenAddress: '0x1111111111111111111111111111111111111111',
    status: MarketplaceListingStatus.Active,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
    origin: 'Minas Gerais',
    safra: '2024/2025',
    sellerName: 'Produtor João Silva',
  },
  {
    listingId: '2',
    seller: '0x2234567890123456789012345678901234567890',
    lotId: '0x0000000000000000000000000000000000000000000000000000000000000002',
    batchType: 'Cacao',
    weightKg: 1000,
    weightAvailableKg: 1000,
    pricePerKg: 5.2,
    tokenAddress: '0x1111111111111111111111111111111111111111',
    status: MarketplaceListingStatus.Active,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 7200000,
    origin: 'Bahia',
    safra: '2024/2025',
    sellerName: 'Fazenda Cacau Doce',
  },
  {
    listingId: '3',
    seller: '0x3234567890123456789012345678901234567890',
    lotId: '0x0000000000000000000000000000000000000000000000000000000000000003',
    batchType: 'Coffee',
    weightKg: 250,
    weightAvailableKg: 0,
    pricePerKg: 4.1,
    tokenAddress: '0x1111111111111111111111111111111111111111',
    status: MarketplaceListingStatus.Sold,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 172800000,
    origin: 'São Paulo',
    safra: '2024/2025',
    sellerName: 'Café Premium',
  },
];

/**
 * Dados mock de ofertas para testes/desenvolvimento
 */
export const MOCK_OFFERS: MarketplaceOffer[] = [
  {
    offerId: '1',
    listingId: '1',
    buyer: '0xabcd567890123456789012345678901234567890',
    quantityKg: 100,
    pricePerKg: 3.4,
    totalPrice: 340,
    status: MarketplaceOfferStatus.Pending,
    createdAt: Date.now() - 3600000,
    expiresAt: Date.now() + 82800000,
  },
  {
    offerId: '2',
    listingId: '1',
    buyer: '0xbcde567890123456789012345678901234567890',
    quantityKg: 150,
    pricePerKg: 3.5,
    totalPrice: 525,
    status: MarketplaceOfferStatus.Accepted,
    createdAt: Date.now() - 7200000,
    expiresAt: Date.now() + 79200000,
    orderId: '1',
  },
];

/**
 * Filtra e ordena listagens de acordo com critérios
 */
export function filterListings(
  listings: MarketplaceListing[],
  filter?: MarketplaceFilter
): MarketplaceListing[] {
  let result = [...listings];

  if (!filter) return result;

  // Filtrar por tipo de lote
  if (filter.batchType) {
    result = result.filter(l => l.batchType === filter.batchType);
  }

  // Filtrar por preço mínimo
  if (filter.minPrice !== undefined) {
    result = result.filter(l => l.pricePerKg >= filter.minPrice!);
  }

  // Filtrar por preço máximo
  if (filter.maxPrice !== undefined) {
    result = result.filter(l => l.pricePerKg <= filter.maxPrice!);
  }

  // Filtrar por vendedor (busca em endereço ou nome)
  if (filter.searchSeller) {
    const search = filter.searchSeller.toLowerCase();
    result = result.filter(
      l =>
        l.seller.toLowerCase().includes(search) ||
        (l.sellerName && l.sellerName.toLowerCase().includes(search))
    );
  }

  // Filtrar apenas listagens ativas
  result = result.filter(l => l.status === MarketplaceListingStatus.Active);

  // Ordenar
  if (filter.sortBy) {
    switch (filter.sortBy) {
      case 'price-asc':
        result.sort((a, b) => a.pricePerKg - b.pricePerKg);
        break;
      case 'price-desc':
        result.sort((a, b) => b.pricePerKg - a.pricePerKg);
        break;
      case 'recent':
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'oldest':
        result.sort((a, b) => a.createdAt - b.createdAt);
        break;
    }
  }

  return result;
}
