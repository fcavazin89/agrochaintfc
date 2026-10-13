import { writeContract, readContract } from 'wagmi/actions';
import type { Lot, LotEvent, LotCertification } from '@/types/agrochain';

/**
 * SMARTLOT_ABI - Interface de contrato inteligente para gerenciar lotes de produtos agrícolas
 * Inclui funções para registrar lotes, adicionar eventos, certificações e transferências
 */
export const SMARTLOT_ABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_agroChainPayments',
        type: 'address',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
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
        internalType: 'bytes32',
        name: 'certificationId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'certificationType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'proofHash',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'issuedAt',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'issuer',
        type: 'address',
      },
    ],
    name: 'CertificationAdded',
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
        internalType: 'bytes32',
        name: 'eventId',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'eventType',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'description',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'location',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'recorder',
        type: 'address',
      },
    ],
    name: 'LotEventAdded',
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
        name: 'produtor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'safra',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'origem',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'area',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'dataPlantio',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'LotRegistered',
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
        name: 'anteriorProdutor',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'novoProdutor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'orderId',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'LotTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_tipo',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_comprovante',
        type: 'string',
      },
    ],
    name: 'addCertification',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_tipo',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_descricao',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_localizacao',
        type: 'string',
      },
    ],
    name: 'addEvent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'agroChainPayments',
    outputs: [
      {
        internalType: 'contract AgroChainPayments',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getCertificationCount',
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
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getCertifications',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'certificationId',
            type: 'bytes32',
          },
          {
            internalType: 'string',
            name: 'certificationType',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'proofHash',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'issuedAt',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'issuer',
            type: 'address',
          },
          {
            internalType: 'bool',
            name: 'active',
            type: 'bool',
          },
        ],
        internalType: 'struct SmartLot.LotCertification[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_eventIndex',
        type: 'uint256',
      },
    ],
    name: 'getEvent',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'eventId',
            type: 'bytes32',
          },
          {
            internalType: 'string',
            name: 'eventType',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'description',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'location',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'timestamp',
            type: 'uint256',
          },
          {
            internalType: 'address',
            name: 'recorder',
            type: 'address',
          },
        ],
        internalType: 'struct SmartLot.LotEvent',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getEventCount',
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
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getLot',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'loteId',
            type: 'bytes32',
          },
          {
            internalType: 'address',
            name: 'produtor',
            type: 'address',
          },
          {
            internalType: 'string',
            name: 'safra',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'origem',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'area',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'dataPlantio',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'dataColheita',
            type: 'uint256',
          },
          {
            internalType: 'enum SmartLot.LotStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            components: [
              {
                internalType: 'bytes32',
                name: 'eventId',
                type: 'bytes32',
              },
              {
                internalType: 'string',
                name: 'eventType',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'description',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'location',
                type: 'string',
              },
              {
                internalType: 'uint256',
                name: 'timestamp',
                type: 'uint256',
              },
              {
                internalType: 'address',
                name: 'recorder',
                type: 'address',
              },
            ],
            internalType: 'struct SmartLot.LotEvent[]',
            name: 'eventos',
            type: 'tuple[]',
          },
          {
            components: [
              {
                internalType: 'bytes32',
                name: 'certificationId',
                type: 'bytes32',
              },
              {
                internalType: 'string',
                name: 'certificationType',
                type: 'string',
              },
              {
                internalType: 'string',
                name: 'proofHash',
                type: 'string',
              },
              {
                internalType: 'uint256',
                name: 'issuedAt',
                type: 'uint256',
              },
              {
                internalType: 'address',
                name: 'issuer',
                type: 'address',
              },
              {
                internalType: 'bool',
                name: 'active',
                type: 'bool',
              },
            ],
            internalType: 'struct SmartLot.LotCertification[]',
            name: 'certificacoes',
            type: 'tuple[]',
          },
        ],
        internalType: 'struct SmartLot.Lot',
        name: '',
        type: 'tuple',
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
    name: 'lotes',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: 'produtor',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'safra',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'origem',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'area',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'dataPlantio',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'dataColheita',
        type: 'uint256',
      },
      {
        internalType: 'enum SmartLot.LotStatus',
        name: 'status',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: '_safra',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_origem',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_area',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_dataPlantio',
        type: 'uint256',
      },
    ],
    name: 'registerLot',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'address',
        name: '_novoProdutor',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '_orderId',
        type: 'uint256',
      },
    ],
    name: 'transferLot',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

/**
 * Obtém endereço do contrato SmartLot
 */
export function getSmartLotContractAddress(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('smartlot_contract_address');
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_SMARTLOT_CONTRACT_ADDRESS || '0x';
}

/**
 * Define endereço do contrato SmartLot no localStorage
 */
export function setSmartLotContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('smartlot_contract_address', address);
  }
}

/**
 * Registra um novo lote na blockchain
 * @param config - Configuração wagmi para executar transações
 * @param loteData - Dados do lote: safra, origem, área e data de plantio
 * @returns Promise com ID do lote registrado
 */
export async function registerLot(
  config: any,
  loteData: {
    safra: string;
    origem: string;
    area: bigint;
    dataPlantio: bigint;
  }
): Promise<string> {
  const contractAddress = getSmartLotContractAddress() as `0x${string}`;
  
  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: SMARTLOT_ABI,
      functionName: 'registerLot',
      args: [loteData.safra, loteData.origem, loteData.area, loteData.dataPlantio],
    });
    return hash;
  } catch (error) {
    console.error('Erro ao registrar lote:', error);
    throw error;
  }
}

/**
 * Adiciona um evento a um lote
 * @param config - Configuração wagmi
 * @param loteId - ID do lote (bytes32)
 * @param eventData - Dados do evento: tipo, descrição, localização
 */
export async function addEvent(
  config: any,
  loteId: string,
  eventData: {
    tipo: string;
    descricao: string;
    localizacao: string;
  }
): Promise<string> {
  const contractAddress = getSmartLotContractAddress() as `0x${string}`;
  
  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: SMARTLOT_ABI,
      functionName: 'addEvent',
      args: [loteId as `0x${string}`, eventData.tipo, eventData.descricao, eventData.localizacao],
    });
    return hash;
  } catch (error) {
    console.error('Erro ao adicionar evento:', error);
    throw error;
  }
}

/**
 * Adiciona uma certificação a um lote
 * @param config - Configuração wagmi
 * @param loteId - ID do lote (bytes32)
 * @param certificationData - Tipo e comprovante da certificação
 */
export async function addCertification(
  config: any,
  loteId: string,
  certificationData: {
    tipo: string;
    comprovante: string;
  }
): Promise<string> {
  const contractAddress = getSmartLotContractAddress() as `0x${string}`;
  
  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: SMARTLOT_ABI,
      functionName: 'addCertification',
      args: [loteId as `0x${string}`, certificationData.tipo, certificationData.comprovante],
    });
    return hash;
  } catch (error) {
    console.error('Erro ao adicionar certificação:', error);
    throw error;
  }
}

/**
 * Transfere um lote para um novo produtor
 * @param config - Configuração wagmi
 * @param loteId - ID do lote
 * @param novoProdutor - Endereço do novo produtor
 * @param orderId - ID da ordem de compra
 */
export async function transferLot(
  config: any,
  loteId: string,
  novoProdutor: string,
  orderId: bigint
): Promise<string> {
  const contractAddress = getSmartLotContractAddress() as `0x${string}`;
  
  try {
    const hash = await writeContract(config, {
      address: contractAddress,
      abi: SMARTLOT_ABI,
      functionName: 'transferLot',
      args: [loteId as `0x${string}`, novoProdutor as `0x${string}`, orderId],
    });
    return hash;
  } catch (error) {
    console.error('Erro ao transferir lote:', error);
    throw error;
  }
}

/**
 * Obtém as certificações de um lote da blockchain
 * @param config - Configuração wagmi
 * @param loteId - ID do lote
 * @returns Promise com array de certificações
 */
export async function getCertifications(config: any, loteId: string): Promise<any[]> {
  const contractAddress = getSmartLotContractAddress() as `0x${string}`;
  
  try {
    const certs = await readContract(config, {
      address: contractAddress,
      abi: SMARTLOT_ABI,
      functionName: 'getCertifications',
      args: [loteId as `0x${string}`],
    });
    return certs as any[];
  } catch (error) {
    console.error('Erro ao obter certificações:', error);
    throw error;
  }
}

/**
 * Obtém dados completos de um lote da blockchain
 * @param config - Configuração wagmi
 * @param loteId - ID do lote
 * @returns Promise com dados formatados do lote
 */
export async function getLot(config: any, loteId: string): Promise<Lot> {
  const contractAddress = getSmartLotContractAddress() as `0x${string}`;
  
  try {
    const lotData = await readContract(config, {
      address: contractAddress,
      abi: SMARTLOT_ABI,
      functionName: 'getLot',
      args: [loteId as `0x${string}`],
    });

    if (!lotData) {
      throw new Error('Lote não encontrado');
    }

    // Mapear dados da blockchain para tipo TypeScript Lot
    const lotDataArray = lotData as any;
    const chainLoteId = lotDataArray[0];
    const produtor = lotDataArray[1];
    const safra = lotDataArray[2];
    const origem = lotDataArray[3];
    const area = lotDataArray[4];
    const dataPlantio = lotDataArray[5];
    const dataColheita = lotDataArray[6];
    const status = lotDataArray[7];
    const eventos = lotDataArray[8];
    const certificacoes = lotDataArray[9];

    const statusMap = ['Ativo', 'Transferindo', 'Transferido'] as const;
    const statusString = statusMap[status as number] || 'Ativo';

    // Mapear certificações da blockchain
    const mappedCerts: LotCertification[] = (certificacoes || []).map((cert: any) => ({
      tipo: cert.certificationType === 'NFT' ? 'NFT' : 
            cert.certificationType === 'ZK' ? 'ZK' :
            cert.certificationType === 'EUDR' ? 'EUDR' : 'ESG',
      status: cert.active ? 'Certificado' : 'Pendente',
      dataEmissão: Number(cert.issuedAt),
      dataVencimento: Number(cert.issuedAt) + (365 * 24 * 60 * 60), // 1 ano de validade padrão
    }));

    // Mapear eventos da blockchain
    const mappedEvents: LotEvent[] = (eventos || []).map((evt: any) => ({
      tipo: evt.eventType,
      data: Number(evt.timestamp),
      descrição: evt.description,
      localização: evt.location,
      responsável: evt.recorder,
      comprovante: '',
    }));

    return {
      loteId: chainLoteId,
      produtor,
      safra,
      origem,
      área: Number(area),
      dataPlantio: Number(dataPlantio),
      dataColheita: Number(dataColheita),
      certificações: mappedCerts,
      eventos: mappedEvents,
      status: statusString,
    };
  } catch (error) {
    console.error('Erro ao obter lote:', error);
    throw error;
  }
}
