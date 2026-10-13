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
