import type { Lot, LotEvent, LotCertification } from '@/types/agrochain';

/**
 * Dados mock para teste e demonstração
 * Contém 6 lotes com diferentes status, eventos e certificações
 */
export const MOCK_LOTS: Lot[] = [
  {
    loteId: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    produtor: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    safra: '2024/2025',
    origem: 'Minas Gerais - Região do Cerrado',
    área: 150.5,
    dataPlantio: Math.floor(new Date('2024-03-15').getTime() / 1000),
    dataColheita: Math.floor(new Date('2024-08-20').getTime() / 1000),
    status: 'Ativo',
    certificações: [
      {
        tipo: 'EUDR',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-06-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-06-01').getTime() / 1000),
      },
      {
        tipo: 'ESG',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-07-10').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-07-10').getTime() / 1000),
      },
    ],
    eventos: [
      {
        tipo: 'Plantio',
        data: Math.floor(new Date('2024-03-15').getTime() / 1000),
        descrição: 'Sementes plantadas em campo',
        localização: 'Fazenda Santa Rita, Região do Cerrado',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmPlantio2024',
      },
      {
        tipo: 'Desenvolvimento',
        data: Math.floor(new Date('2024-05-20').getTime() / 1000),
        descrição: 'Plantas em fase de desenvolvimento',
        localização: 'Fazenda Santa Rita',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmDesen2024',
      },
      {
        tipo: 'Colheita',
        data: Math.floor(new Date('2024-08-20').getTime() / 1000),
        descrição: 'Colheita realizada com sucesso',
        localização: 'Fazenda Santa Rita',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmColheita2024',
      },
    ],
  },
  {
    loteId: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e',
    produtor: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    safra: '2024/2025',
    origem: 'São Paulo - Região de Ribeirão Preto',
    área: 230.0,
    dataPlantio: Math.floor(new Date('2024-04-01').getTime() / 1000),
    dataColheita: Math.floor(new Date('2024-09-15').getTime() / 1000),
    status: 'Transferindo',
    certificações: [
      {
        tipo: 'NFT',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-08-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2027-08-01').getTime() / 1000),
      },
    ],
    eventos: [
      {
        tipo: 'Plantio',
        data: Math.floor(new Date('2024-04-01').getTime() / 1000),
        descrição: 'Início do plantio em grande escala',
        localização: 'Fazenda Bom Retiro, Ribeirão Preto',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmPlantioRPreto',
      },
      {
        tipo: 'Colheita Iniciada',
        data: Math.floor(new Date('2024-09-15').getTime() / 1000),
        descrição: 'Colheita iniciada',
        localização: 'Fazenda Bom Retiro',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmColheitaRPreto',
      },
      {
        tipo: 'Emissão de Ordem de Compra',
        data: Math.floor(new Date('2024-09-20').getTime() / 1000),
        descrição: 'Ordem de compra #OC-2024-001 criada',
        localização: 'Sistema',
        responsável: '0x70997970C51812e339D9B73b0245Ad59cc5fAEf0',
        comprovante: 'https://ipfs.io/ipfs/QmOrdemCompra001',
      },
    ],
  },
  {
    loteId: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f',
    produtor: '0x70997970C51812e339D9B73b0245Ad59cc5fAEf0',
    safra: '2024/2025',
    origem: 'Espírito Santo - Região do Vale do Rio Doce',
    área: 180.75,
    dataPlantio: Math.floor(new Date('2024-02-10').getTime() / 1000),
    dataColheita: Math.floor(new Date('2024-07-25').getTime() / 1000),
    status: 'Transferido',
    certificações: [
      {
        tipo: 'EUDR',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-05-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-05-01').getTime() / 1000),
      },
      {
        tipo: 'ESG',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-06-15').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-06-15').getTime() / 1000),
      },
      {
        tipo: 'NFT',
        status: 'Revogado',
        dataEmissão: Math.floor(new Date('2024-04-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-04-01').getTime() / 1000),
      },
    ],
    eventos: [
      {
        tipo: 'Plantio',
        data: Math.floor(new Date('2024-02-10').getTime() / 1000),
        descrição: 'Plantio realizado',
        localização: 'Fazenda Vale Verde, Vale do Rio Doce',
        responsável: '0x70997970C51812e339D9B73b0245Ad59cc5fAEf0',
        comprovante: 'https://ipfs.io/ipfs/QmPlantioVale',
      },
      {
        tipo: 'Colheita',
        data: Math.floor(new Date('2024-07-25').getTime() / 1000),
        descrição: 'Colheita concluída',
        localização: 'Fazenda Vale Verde',
        responsável: '0x70997970C51812e339D9B73b0245Ad59cc5fAEf0',
        comprovante: 'https://ipfs.io/ipfs/QmColheitaVale',
      },
      {
        tipo: 'Processamento',
        data: Math.floor(new Date('2024-08-05').getTime() / 1000),
        descrição: 'Produto em processamento',
        localização: 'Cooperativa de Processamento Vale Verde',
        responsável: '0x3C44CdDdB6a900c2f0151c37d0b6E49A0dD23dE8',
        comprovante: 'https://ipfs.io/ipfs/QmProcessamento',
      },
      {
        tipo: 'Transferência de Produtor',
        data: Math.floor(new Date('2024-08-15').getTime() / 1000),
        descrição: 'Transferência concluída para novo produtor',
        localização: 'Sistema',
        responsável: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        comprovante: 'https://ipfs.io/ipfs/QmTransferencia001',
      },
    ],
  },
  {
    loteId: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a',
    produtor: '0x3C44CdDdB6a900c2f0151c37d0b6E49A0dD23dE8',
    safra: '2023/2024',
    origem: 'Bahia - Região de Ilhéus',
    área: 320.0,
    dataPlantio: Math.floor(new Date('2023-05-20').getTime() / 1000),
    dataColheita: Math.floor(new Date('2023-10-30').getTime() / 1000),
    status: 'Transferido',
    certificações: [
      {
        tipo: 'ESG',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2023-08-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2024-08-01').getTime() / 1000),
      },
      {
        tipo: 'ZK',
        status: 'Pendente',
        dataEmissão: Math.floor(new Date('2024-01-15').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-01-15').getTime() / 1000),
      },
    ],
    eventos: [
      {
        tipo: 'Plantio',
        data: Math.floor(new Date('2023-05-20').getTime() / 1000),
        descrição: 'Plantio inicial',
        localização: 'Fazenda Cacau Premium, Ilhéus',
        responsável: '0x3C44CdDdB6a900c2f0151c37d0b6E49A0dD23dE8',
        comprovante: 'https://ipfs.io/ipfs/QmPlantioIlhus',
      },
      {
        tipo: 'Colheita',
        data: Math.floor(new Date('2023-10-30').getTime() / 1000),
        descrição: 'Colheita de safra anterior',
        localização: 'Fazenda Cacau Premium',
        responsável: '0x3C44CdDdB6a900c2f0151c37d0b6E49A0dD23dE8',
        comprovante: 'https://ipfs.io/ipfs/QmColheitaIlhus',
      },
      {
        tipo: 'Certificação ESG',
        data: Math.floor(new Date('2023-08-01').getTime() / 1000),
        descrição: 'Lote certificado com padrões ESG',
        localização: 'Organismo Certificador Brasil',
        responsável: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        comprovante: 'https://ipfs.io/ipfs/QmCertificacaoESG',
      },
      {
        tipo: 'Negociação Mercado',
        data: Math.floor(new Date('2024-01-10').getTime() / 1000),
        descrição: 'Lote negociado no mercado de commodities',
        localização: 'Bolsa de Mercadorias',
        responsável: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        comprovante: 'https://ipfs.io/ipfs/QmNegociacao',
      },
    ],
  },
  {
    loteId: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    produtor: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
    safra: '2024/2025',
    origem: 'Rio Grande do Sul - Região da Fronteira',
    área: 275.25,
    dataPlantio: Math.floor(new Date('2024-03-01').getTime() / 1000),
    dataColheita: Math.floor(new Date('2024-08-10').getTime() / 1000),
    status: 'Ativo',
    certificações: [
      {
        tipo: 'EUDR',
        status: 'Pendente',
        dataEmissão: Math.floor(new Date('2024-09-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-09-01').getTime() / 1000),
      },
    ],
    eventos: [
      {
        tipo: 'Plantio',
        data: Math.floor(new Date('2024-03-01').getTime() / 1000),
        descrição: 'Plantio em sistema de rotação',
        localização: 'Fazenda Fronteira Sul, RS',
        responsável: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        comprovante: 'https://ipfs.io/ipfs/QmPlantioRS',
      },
      {
        tipo: 'Inspeção Agronômica',
        data: Math.floor(new Date('2024-05-15').getTime() / 1000),
        descrição: 'Inspeção realizada - resultado positivo',
        localização: 'Fazenda Fronteira Sul',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmInspecao',
      },
      {
        tipo: 'Colheita em Andamento',
        data: Math.floor(new Date('2024-08-10').getTime() / 1000),
        descrição: 'Colheita iniciada',
        localização: 'Fazenda Fronteira Sul',
        responsável: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        comprovante: 'https://ipfs.io/ipfs/QmColheitaRS',
      },
    ],
  },
  {
    loteId: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
    produtor: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    safra: '2024/2025',
    origem: 'Goiás - Região do Planalto',
    área: 400.0,
    dataPlantio: Math.floor(new Date('2024-02-20').getTime() / 1000),
    dataColheita: Math.floor(new Date('2024-07-30').getTime() / 1000),
    status: 'Ativo',
    certificações: [
      {
        tipo: 'ESG',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-05-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-05-01').getTime() / 1000),
      },
      {
        tipo: 'EUDR',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-06-15').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2025-06-15').getTime() / 1000),
      },
      {
        tipo: 'NFT',
        status: 'Certificado',
        dataEmissão: Math.floor(new Date('2024-07-01').getTime() / 1000),
        dataVencimento: Math.floor(new Date('2027-07-01').getTime() / 1000),
      },
    ],
    eventos: [
      {
        tipo: 'Plantio Mecanizado',
        data: Math.floor(new Date('2024-02-20').getTime() / 1000),
        descrição: 'Plantio mecanizado de grande volume',
        localização: 'Fazenda Planalto Ouro, Goiás',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmPlantioGO',
      },
      {
        tipo: 'Pulverização Controlada',
        data: Math.floor(new Date('2024-04-10').getTime() / 1000),
        descrição: 'Aplicação de insumos com tecnologia de precisão',
        localização: 'Fazenda Planalto Ouro',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmPulverizacao',
      },
      {
        tipo: 'Colheita Mecanizada',
        data: Math.floor(new Date('2024-07-30').getTime() / 1000),
        descrição: 'Colheita realizada com máquinas modernas',
        localização: 'Fazenda Planalto Ouro',
        responsável: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        comprovante: 'https://ipfs.io/ipfs/QmColheitaGO',
      },
      {
        tipo: 'Análise de Qualidade',
        data: Math.floor(new Date('2024-08-05').getTime() / 1000),
        descrição: 'Produto aprovado em análise de qualidade',
        localização: 'Laboratório de Qualidade',
        responsável: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
        comprovante: 'https://ipfs.io/ipfs/QmAnaliseQualidade',
      },
    ],
  },
];

/**
 * Filtra lotes mock por endereço do produtor
 * @param producerAddress - Endereço da carteira do produtor
 * @returns Array de lotes pertencentes ao produtor
 */
export function getMockLotsForProducer(producerAddress: string): Lot[] {
  return MOCK_LOTS.filter(
    lot => lot.produtor.toLowerCase() === producerAddress.toLowerCase()
  );
}

/**
 * Obtém um lote mock específico por ID
 * @param loteId - ID do lote
 * @returns Lote encontrado ou undefined
 */
export function getMockLotById(loteId: string): Lot | undefined {
  return MOCK_LOTS.find(lot => lot.loteId.toLowerCase() === loteId.toLowerCase());
}

/**
 * Filtra lotes por status
 * @param status - Status desejado ('Ativo', 'Transferindo', 'Transferido')
 * @returns Array de lotes com o status especificado
 */
export function getMockLotsByStatus(status: 'Ativo' | 'Transferindo' | 'Transferido'): Lot[] {
  return MOCK_LOTS.filter(lot => lot.status === status);
}
