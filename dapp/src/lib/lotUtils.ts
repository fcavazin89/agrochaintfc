import { STATUS_COLORS } from './lotConstants';
import type { LotStatus, LotEvent, LotCertification } from '@/types/agrochain';

/**
 * Formata um timestamp UNIX em formato de data legível (DD/MM/YYYY HH:mm)
 */
export function formatarData(timestamp: number): string {
  if (!timestamp || timestamp === 0) return '';
  const date = new Date(timestamp * 1000); // timestamp em segundos
  const dia = String(date.getDate()).padStart(2, '0');
  const mês = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  const hora = String(date.getHours()).padStart(2, '0');
  const minuto = String(date.getMinutes()).padStart(2, '0');
  return `${dia}/${mês}/${ano} ${hora}:${minuto}`;
}

/**
 * Gera uma URI QR Code a partir de dados de lote
 * Retorna uma URL que pode ser usada em tags <img src={uri} />
 */
export function gerarUriQRCode(loteId: string): string {
  // Usando QR Server API para gerar QR code
  const encodedData = encodeURIComponent(loteId);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedData}`;
}

/**
 * Obtém a cor correspondente a um status de lote ou certificação
 */
export function obterCorStatus(status: string): string {
  return STATUS_COLORS[status] || '#1e2a22'; // padrão: texto principal
}

/**
 * Formata uma área em hectares com unidade apropriada
 */
export function formatarArea(areaHectares: number): string {
  if (!areaHectares || areaHectares === 0) return '0 ha';
  
  if (areaHectares >= 1000) {
    return `${(areaHectares / 1000).toFixed(2)} mil ha`;
  }
  
  return `${areaHectares.toFixed(2)} ha`;
}

/**
 * Calcula o status agregado de certificação de um lote
 * Retorna 'Revogado' se alguma for, 'Certificado' se todas forem, caso contrário 'Pendente'
 */
export function obterStatusCertificacaoAgregado(certificacoes: LotCertification[]): string {
  if (certificacoes.length === 0) return 'Pendente';
  
  const temRevogado = certificacoes.some(cert => cert.status === 'Revogado');
  if (temRevogado) return 'Revogado';
  
  const todoCertificado = certificacoes.every(cert => cert.status === 'Certificado');
  if (todoCertificado) return 'Certificado';
  
  return 'Pendente';
}

/**
 * Valida se uma data de vencimento está próxima (dentro de 30 dias)
 */
export function certificacaoVencendoEmBreve(dataVencimento: number): boolean {
  const agora = Math.floor(Date.now() / 1000); // timestamp em segundos
  const diasEmSegundos = 30 * 24 * 60 * 60;
  return dataVencimento > agora && dataVencimento - agora <= diasEmSegundos;
}

/**
 * Formata um evento de lote para exibição
 */
export function formatarEvento(evento: LotEvent): string {
  const data = formatarData(evento.data);
  return `${evento.tipo} - ${data} - ${evento.localização} (${evento.responsável})`;
}

/**
 * Ordena eventos por data descendente (mais recentes primeiro)
 */
export function ordenarEventosPorData(eventos: LotEvent[]): LotEvent[] {
  return [...eventos].sort((a, b) => b.data - a.data);
}

/**
 * Filtra certificações válidas (não revogadas e não vencidas)
 */
export function obterCertificacoesValidas(certificacoes: LotCertification[]): LotCertification[] {
  const agora = Math.floor(Date.now() / 1000); // timestamp em segundos
  return certificacoes.filter(
    cert => cert.status !== 'Revogado' && cert.dataVencimento > agora
  );
}

/**
 * Gera um sumário do lote em texto para logs/relatórios
 */
export function gerarSumarioLote(
  loteId: string,
  produtor: string,
  origem: string,
  status: LotStatus
): string {
  return `Lote ${loteId} | Produtor: ${produtor} | Origem: ${origem} | Status: ${status}`;
}
