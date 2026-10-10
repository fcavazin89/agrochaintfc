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
