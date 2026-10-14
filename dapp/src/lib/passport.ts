import React from 'react';
import type { PassportData } from '@/types/agrochain';
import { getMockLotById } from './mockLotData';
import QRCodeDisplay from '@/components/QRCodeDisplay';

/**
 * Constrói dados completos de passaporte a partir de um lote mock
 * 
 * @param lotId - ID do lote
 * @returns PassportData completo com todos os dados do lote
 */
export function buildPassportData(lotId: string): PassportData | null {
  const mockLot = getMockLotById(lotId);
  
  if (!mockLot) {
    return null;
  }

  return {
    loteId: mockLot.loteId,
    produtor: mockLot.produtor,
    safra: mockLot.safra,
    origem: mockLot.origem,
    area: mockLot.área,
    dataPlantio: mockLot.dataPlantio,
    dataColheita: mockLot.dataColheita,
    eventos: mockLot.eventos,
    certificacoes: mockLot.certificações,
    status: mockLot.status,
  };
}

/**
 * Gera o componente de código QR para um lote
 * 
 * @param lotId - ID do lote
 * @param size - Tamanho do QR: 'small', 'medium', 'large'
 * @returns Componente React do QR Code
 */
export function generatePassportQR(
  lotId: string,
  size: 'small' | 'medium' | 'large' = 'medium'
): React.ReactNode {
  return React.createElement(QRCodeDisplay, {
    lotId,
    size,
  });
}

/**
 * Verifica a autenticidade de um lote no blockchain (mock)
 * Em produção, integraria com verificação real via smart contract
 * 
 * @param lotId - ID do lote a verificar
 * @returns Promise com resultado de autenticidade
 */
export async function verifyLotAuthenticity(lotId: string): Promise<{
  authentic: boolean;
  message: string;
}> {
  // Mock: sempre retorna autêntico
  // Em produção, faria verificação contra blockchain via wagmi/viem
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        authentic: true,
        message: 'Lote autêntico no blockchain',
      });
    }, 500);
  });
}
