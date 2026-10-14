/**
 * Utilities TypeScript para CarbonCredits — ABIs e helpers de contrato
 * Extraído de: blockchain/contracts/CarbonCredits.sol
 *
 * Este arquivo exporta:
 * - CARBONCREDITS_ABI: ABI do contrato CarbonCredits
 * - CONTRACT_ADDRESS_CARBONCREDITS: endereço do contrato (via env)
 * - issueCredits: helper para emitir créditos (onlyOwner)
 * - transferCredits: helper para transferir créditos
 * - getCredits: helper para consultar créditos de um lote
 */

import { readContract, writeContract } from '@wagmi/core';
import type { Config } from 'wagmi';

/**
 * ABI do contrato CarbonCredits
 * Gerado a partir de blockchain/contracts/CarbonCredits.sol
 */
export const CARBONCREDITS_ABI = [
  // ---- Erros ----
  {
    inputs: [],
    name: 'HectaresInvalidos',
    type: 'error',
  },
  {
    inputs: [],
    name: 'LoteJaEmitido',
    type: 'error',
  },
  {
    inputs: [],
    name: 'SaldoInsuficiente',
    type: 'error',
  },
  {
    inputs: [],
    name: 'DestinatarioInvalido',
    type: 'error',
  },
  // ---- Eventos ----
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'produtor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'creditos',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'CreditIssued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'de',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'para',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'quantidade',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'CreditTransferred',
    type: 'event',
  },
  // ---- Funções ----
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'hectares',
        type: 'uint256',
      },
      {
        internalType: 'address',
        name: 'produtor',
        type: 'address',
      },
    ],
    name: 'issueCredits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'destinatario',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: 'quantidade',
        type: 'uint256',
      },
    ],
    name: 'transferCredits',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
    ],
    name: 'getCredits',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'lotCredits',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    name: 'balances',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

/**
 * Endereço do contrato CarbonCredits
 * Carregado via variável de ambiente ou localStorage
 */
export const CONTRACT_ADDRESS_CARBONCREDITS = {
  carbonCredits: (process.env.NEXT_PUBLIC_CARBONCREDITS_ADDRESS || '') as `0x${string}`,
};

/**
 * Obtém endereço do CarbonCredits do localStorage ou env
 */
export function getCarbonCreditsAddress(): `0x${string}` {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('carboncredits_address');
    if (stored && stored.startsWith('0x')) return stored as `0x${string}`;
  }
  return CONTRACT_ADDRESS_CARBONCREDITS.carbonCredits;
}

/**
 * Emite créditos de carbono para um lote (onlyOwner).
 * @param config  Wagmi Config
 * @param loteId  ID do lote como bytes32 hex string
 * @param hectares Área em hectares (1 crédito por hectare)
 * @param produtor Endereço do produtor
 */
export async function issueCredits(
  config: Config,
  loteId: `0x${string}`,
  hectares: bigint,
  produtor: `0x${string}`
) {
  return writeContract(config, {
    address: getCarbonCreditsAddress(),
    abi: CARBONCREDITS_ABI,
    functionName: 'issueCredits',
    args: [loteId, hectares, produtor],
  });
}

/**
 * Transfere créditos de carbono de um lote para um destinatário.
 * @param config      Wagmi Config
 * @param loteId      ID do lote como bytes32 hex string
 * @param destinatario Endereço do destinatário
 * @param quantidade   Quantidade de créditos a transferir
 */
export async function transferCredits(
  config: Config,
  loteId: `0x${string}`,
  destinatario: `0x${string}`,
  quantidade: bigint
) {
  return writeContract(config, {
    address: getCarbonCreditsAddress(),
    abi: CARBONCREDITS_ABI,
    functionName: 'transferCredits',
    args: [loteId, destinatario, quantidade],
  });
}

/**
 * Consulta a quantidade de créditos emitidos para um lote.
 * @param config  Wagmi Config
 * @param address Endereço do contrato (opcional, usa getCarbonCreditsAddress se omitido)
 * @param loteId  ID do lote como bytes32 hex string
 */
export async function getCredits(
  config: Config,
  address: `0x${string}` | undefined,
  loteId: `0x${string}`
): Promise<bigint> {
  return readContract(config, {
    address: address ?? getCarbonCreditsAddress(),
    abi: CARBONCREDITS_ABI,
    functionName: 'getCredits',
    args: [loteId],
  }) as Promise<bigint>;
}
