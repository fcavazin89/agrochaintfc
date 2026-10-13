export type BatchType = 'Coffee' | 'Cacao';
export type CertStatus = 'PENDING' | 'CERTIFIED' | 'REJECTED' | 'PROCESSING';
export type CoffeeVariety = 'Arabica' | 'Robusta' | 'Conilon';
export type CacaoVariety = 'Forastero' | 'Criollo' | 'Trinitario' | 'Nacional';

export interface CoffeeBatch {
  batchId: string;
  variety: CoffeeVariety;
  weightKg: number;
  origin: string;
  producerAddress: string;
  certStatus: CertStatus;
  timestamp: number;
  complianceScore?: number;
}

export interface CacaoBatch {
  batchId: string;
  variety: CacaoVariety;
  weightKg: number;
  origin: string;
  producerAddress: string;
  certStatus: CertStatus;
  timestamp: number;
  complianceScore?: number;
}

export interface TraceNode {
  id: string;
  label: string;
  stage: 'ORIGINATION' | 'BLOCKCHAIN' | 'COMPLIANCE' | 'VALIDATION';
  status: 'DONE' | 'ACTIVE' | 'PENDING';
  timestamp?: number;
  coordinates?: [number, number, number];
}

export interface FarmPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: BatchType;
  certCount: number;
}

export interface ComplianceResult {
  batchId: string;
  batchType: BatchType;
  overallScore: number;
  eudrScore: number;
  qualityScore: number;
  originScore: number;
  sustainabilityScore: number;
  recommendation: string;
  details: string[];
  isRealData?: boolean;
}

export interface PoolInfo {
  id: string;
  tokenA: string;
  tokenB: string;
  reserveA: number;
  reserveB: number;
  fee: number;
  volume24h: number;
  tvl: number;
}

export interface ProducerBatch {
  id: string;
  name: string;
  type: BatchType;
  weightKg: number;
  status: 'Disponível' | 'Vendendo' | 'Vendido';
  pricePerKg: number;
}

export interface ActiveSale {
  id: string;
  buyer: string;
  token: string;
  amount: number;
  status: 'Escrow' | 'Aceito' | 'Rejeitado';
}

export type LotStatus = 'Ativo' | 'Transferindo' | 'Transferido';

export interface LotEvent {
  tipo: string;
  data: number; // timestamp
  descrição: string;
  localização: string;
  responsável: string;
  comprovante?: string;
}

export interface LotCertification {
  tipo: 'NFT' | 'ZK' | 'EUDR' | 'ESG';
  status: 'Pendente' | 'Certificado' | 'Revogado';
  dataEmissão: number; // timestamp
  dataVencimento: number; // timestamp
}

export interface Lot {
  loteId: string;
  produtor: string;
  safra: string;
  origem: string;
  área: number; // hectares
  dataPlantio: number; // timestamp
  dataColheita: number; // timestamp
  certificações: LotCertification[];
  eventos: LotEvent[];
  status: LotStatus;
}

// =====================================================================
// MARKETPLACE TYPES
// =====================================================================

export enum MarketplaceListingStatus {
  Active = 'Active',
  Sold = 'Sold',
  Cancelled = 'Cancelled',
}

export enum MarketplaceOfferStatus {
  Pending = 'Pending',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export interface MarketplaceListing {
  listingId: string;
  seller: string;
  lotId: string;
  batchType: BatchType;
  weightKg: number;
  weightAvailableKg: number; // weightKg - weightSoldKg
  pricePerKg: number;
  tokenAddress: string;
  status: MarketplaceListingStatus;
  createdAt: number;
  updatedAt: number;
  origin: string;
  safra: string;
  sellerName?: string; // truncated address ou nome
}

export interface MarketplaceOffer {
  offerId: string;
  listingId: string;
  buyer: string;
  quantityKg: number;
  pricePerKg: number;
  totalPrice: number; // quantityKg * pricePerKg
  status: MarketplaceOfferStatus;
  createdAt: number;
  expiresAt: number;
  orderId?: string; // quando aceito, referência a Order em AgroChainPayments
}

export interface MarketplaceFilter {
  batchType?: BatchType;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'price-asc' | 'price-desc' | 'recent' | 'oldest';
  searchSeller?: string; // address ou nome
}

export interface MarketplaceStats {
  totalListings: number;
  totalSold: number;
  averagePrice: number;
  mostCommon: BatchType;
}

// =====================================================================
// BUYER TYPES
// =====================================================================

export enum DeliveryStatus {
  Aguardando = 'Aguardando',
  Emitido = 'Emitido',
  Transportando = 'Transportando',
  Entregue = 'Entregue',
  Rejeitado = 'Rejeitado',
}

export interface BuyerProfile {
  buyerId: string;
  nome: string;
  empresa: string;
  país: string;
  reputação: number; // Valor entre 0-100 (average rating)
  lotesComprados: number;
  endereco?: string; // wallet address
  dataRegistro?: number; // timestamp
  email?: string;
}

export interface PurchaseOrder {
  orderId: string;
  listingId: string;
  loteId: string;
  produtor: string; // endereço do produtor
  dataCompra: number; // timestamp
  dataEntrega: number; // timestamp (data esperada)
  status: DeliveryStatus;
  quantidadeKg?: number;
  precoUnitario?: number;
  precoTotal?: number;
  comprador?: string; // endereço do comprador
  origem?: string;
  observacoes?: string;
}

// =====================================================================
// REVIEWS & REPUTATION TYPES
// =====================================================================

export interface ProducerReview {
  produtor: string; // endereço do produtor
  nome: string;
  empresa: string;
  reputacao: number; // média de ratings (0-100)
  ratingMedio: number; // média de ratings (1-5)
  totalTransacoes: number;
  reviews: Review[];
}

export interface Review {
  id: string;
  orderId: string;
  dataEnvio: number; // timestamp
  rating: number; // 1-5
  texto: string; // até 300 caracteres
  status: 'Enviado' | 'Pendente' | 'Rejeitado';
}
