export enum LotEventType {
  PLANTIO = 'Plantio',
  COLHEITA = 'Colheita',
  TRANSFERENCIA = 'Transferência',
  CERTIFICACAO = 'Certificação',
  INSPECAO = 'Inspeção',
  ARMAZENAMENTO = 'Armazenamento',
  PROCESSAMENTO = 'Processamento',
}

export enum CertificationType {
  NFT = 'NFT',
  ZK = 'ZK',
  EUDR = 'EUDR',
  ESG = 'ESG',
}

export enum LotStatus {
  ATIVO = 'Ativo',
  TRANSFERINDO = 'Transferindo',
  TRANSFERIDO = 'Transferido',
}

export enum CertificationStatus {
  PENDENTE = 'Pendente',
  CERTIFICADO = 'Certificado',
  REVOGADO = 'Revogado',
}

// Design tokens de cores conforme design.md
export const STATUS_COLORS: Record<string, string> = {
  // Lot status colors
  'Ativo': '#1f6440', // verde
  'Transferindo': '#b8912a', // ouro (atenção)
  'Transferido': '#1f6440', // verde

  // Certification status colors
  'Pendente': '#b8912a', // ouro (atenção)
  'Certificado': '#1f6440', // verde
  'Revogado': '#c43c2c', // vermelho

  // Event type colors
  'Plantio': '#1f6440', // verde
  'Colheita': '#b8912a', // ouro
  'Transferência': '#2563eb', // azul
  'Certificação': '#1f6440', // verde
  'Inspeção': '#2563eb', // azul
  'Armazenamento': '#6b7280', // cinza
  'Processamento': '#059669', // verde claro
};

// Design tokens básicos
export const DESIGN_TOKENS = {
  colors: {
    fundo: '#f5f1e7', // kraft paper
    texto1: '#1e2a22', // texto principal
    texto2: '#4a6fa5', // texto secundário
    verde600: '#1f6440',
    ouro: '#b8912a',
    vermelho: '#c43c2c',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  typography: {
    titleFont: 'Georgia, serif',
    bodyFont: 'system-ui, sans-serif',
  },
};
