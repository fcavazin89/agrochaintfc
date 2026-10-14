'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import type { Lot } from '@/types/agrochain';
// import { obterCorStatus, obterStatusCertificacaoAgregado } from '@/lib/lotUtils';
// import { DESIGN_TOKENS, LotStatus, CertificationType } from '@/lib/lotConstants';

// Funções auxiliares locais
const obterCorStatus = (status: string) => {
  if (status === 'Ativo') return 'var(--verde-profundo)';
  if (status === 'Transferindo') return '#f59e0b';
  return '#6b7280';
};

const obterStatusCertificacaoAgregado = (certificacoes: any[]) => {
  const certificado = certificacoes.some(c => c.status === 'Certificado');
  const pendente = certificacoes.some(c => c.status === 'Pendente');
  if (certificado && !pendente) return 'Certificado';
  if (pendente) return 'Parcial';
  return 'Nenhum';
};

const DESIGN_TOKENS = {
  typography: {
    titleFont: 'Georgia, serif',
    bodyFont: 'system-ui, -apple-system, sans-serif',
  },
  colors: {
    verde600: 'var(--verde-profundo)',
    texto1: '#1e2a22',
    texto2: '#495649',
    texto3: '#6b7d6b',
    fundo: '#f5f1e7',
  },
};

// Mock data de lotes do produtor logado
const MOCK_LOTS: Lot[] = [
  {
    loteId: 'LOT-2026-001',
    produtor: 'Fazenda São Benedito',
    safra: '2025/2026',
    origem: 'Minas Gerais - MG',
    área: 15.5,
    dataPlantio: Math.floor(Date.now() / 1000) - 8640000, // 100 dias atrás
    dataColheita: Math.floor(Date.now() / 1000) - 1080000, // 12.5 dias atrás
    certificações: [
      { tipo: 'NFT', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 864000, dataVencimento: Math.floor(Date.now() / 1000) + 15552000 },
      { tipo: 'ZK', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 864000, dataVencimento: Math.floor(Date.now() / 1000) + 15552000 },
      { tipo: 'EUDR', status: 'Pendente', dataEmissão: 0, dataVencimento: 0 },
    ],
    eventos: [
      { tipo: 'Plantio', data: Math.floor(Date.now() / 1000) - 8640000, descrição: 'Plantio de mudas selecionadas', localização: 'Talhão A', responsável: 'João Silva' },
      { tipo: 'Colheita', data: Math.floor(Date.now() / 1000) - 1080000, descrição: 'Colheita manual realizada', localização: 'Talhão A', responsável: 'Equipe de colheita' },
    ],
    status: 'Ativo',
  },
  {
    loteId: 'LOT-2026-002',
    produtor: 'Fazenda São Benedito',
    safra: '2025/2026',
    origem: 'São Paulo - SP',
    área: 22.0,
    dataPlantio: Math.floor(Date.now() / 1000) - 12960000, // 150 dias atrás
    dataColheita: Math.floor(Date.now() / 1000) - 5184000, // 60 dias atrás
    certificações: [
      { tipo: 'NFT', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 4320000, dataVencimento: Math.floor(Date.now() / 1000) + 15552000 },
      { tipo: 'ZK', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 4320000, dataVencimento: Math.floor(Date.now() / 1000) + 15552000 },
      { tipo: 'EUDR', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 2592000, dataVencimento: Math.floor(Date.now() / 1000) + 31536000 },
      { tipo: 'ESG', status: 'Pendente', dataEmissão: 0, dataVencimento: 0 },
    ],
    eventos: [
      { tipo: 'Plantio', data: Math.floor(Date.now() / 1000) - 12960000, descrição: 'Plantio iniciado', localização: 'Talhão B-C', responsável: 'Gerente de Operações' },
      { tipo: 'Colheita', data: Math.floor(Date.now() / 1000) - 5184000, descrição: 'Colheita concluída', localização: 'Talhão B-C', responsável: 'Equipe de colheita' },
      { tipo: 'Armazenamento', data: Math.floor(Date.now() / 1000) - 3024000, descrição: 'Grãos armazenados em silos climatizados', localização: 'Galpão principal', responsável: 'José Pereira' },
    ],
    status: 'Ativo',
  },
  {
    loteId: 'LOT-2025-015',
    produtor: 'Fazenda São Benedito',
    safra: '2024/2025',
    origem: 'Espírito Santo - ES',
    área: 18.7,
    dataPlantio: Math.floor(Date.now() / 1000) - 31536000, // 1 ano atrás
    dataColheita: Math.floor(Date.now() / 1000) - 23328000, // 270 dias atrás
    certificações: [
      { tipo: 'NFT', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 21600000, dataVencimento: Math.floor(Date.now() / 1000) - 2592000 },
      { tipo: 'ZK', status: 'Revogado', dataEmissão: Math.floor(Date.now() / 1000) - 21600000, dataVencimento: Math.floor(Date.now() / 1000) - 7776000 },
    ],
    eventos: [
      { tipo: 'Plantio', data: Math.floor(Date.now() / 1000) - 31536000, descrição: 'Plantio realizado', localização: 'Talhão D', responsável: 'Supervisor de Campo' },
      { tipo: 'Colheita', data: Math.floor(Date.now() / 1000) - 23328000, descrição: 'Colheita mecanizada', localização: 'Talhão D', responsável: 'Equipe mecanizada' },
      { tipo: 'Processamento', data: Math.floor(Date.now() / 1000) - 21600000, descrição: 'Processamento em cooperativa', localização: 'Cooperativa Local', responsável: 'Técnico de Processamento' },
    ],
    status: 'Transferido',
  },
];

interface FilterState {
  safra: string;
  status: string;
  certificacao: string;
}

export default function LoteListing() {
  const { address, isConnected } = useAccount();
  const [filterState, setFilterState] = useState<FilterState>({
    safra: '',
    status: '',
    certificacao: '',
  });
  const [showModal, setShowModal] = useState(false);
  const [newLotForm, setNewLotForm] = useState({
    loteId: '',
    origem: '',
    área: '',
    safra: '',
  });

  // Filtrar lotes baseado no estado
  const filteredLotes = useMemo(() => {
    return MOCK_LOTS.filter(lot => {
      if (filterState.safra && lot.safra !== filterState.safra) return false;
      if (filterState.status && lot.status !== filterState.status) return false;
      if (filterState.certificacao) {
        const certStatus = obterStatusCertificacaoAgregado(lot.certificações);
        if (certStatus !== filterState.certificacao) return false;
      }
      return true;
    });
  }, [filterState]);

  // Obter valores únicos para filtros
  const safras = useMemo(() => Array.from(new Set(MOCK_LOTS.map(l => l.safra))), []);
  const statusOptions = useMemo(() => Array.from(new Set(MOCK_LOTS.map(l => l.status))), []);
  const certStatusOptions = useMemo(
    () => Array.from(new Set(MOCK_LOTS.map(l => obterStatusCertificacaoAgregado(l.certificações)))),
    []
  );

  const handleFilterChange = (field: keyof FilterState, value: string) => {
    setFilterState(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateLot = () => {
    if (!newLotForm.loteId || !newLotForm.origem) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    alert(`Lote ${newLotForm.loteId} criado (mock apenas)`);
    setShowModal(false);
    setNewLotForm({ loteId: '', origem: '', área: '', safra: '' });
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Cabeçalho da tela */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          margin: '0 0 8px 0',
          fontFamily: DESIGN_TOKENS.typography.titleFont,
          fontSize: '28px',
          fontWeight: 600,
          color: DESIGN_TOKENS.colors.texto1,
        }}>
          Lotes
        </h1>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: DESIGN_TOKENS.colors.texto2,
        }}>
          Gestão de lotes do produtor
        </p>
      </div>

      {/* Card de ações e filtros */}
      <div style={{
        background: DESIGN_TOKENS.colors.fundo,
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        border: `1px solid #e6ddc9`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '16px',
        flexWrap: 'wrap',
      }}>
        {/* Filtros */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
              Safra
            </label>
            <select
              value={filterState.safra}
              onChange={(e) => handleFilterChange('safra', e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid #e6ddc9`,
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: '#fff',
                color: DESIGN_TOKENS.colors.texto1,
                minWidth: '140px',
              }}
            >
              <option value="">Todas as safras</option>
              {safras.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
              Status
            </label>
            <select
              value={filterState.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid #e6ddc9`,
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: '#fff',
                color: DESIGN_TOKENS.colors.texto1,
                minWidth: '140px',
              }}
            >
              <option value="">Todos os status</option>
              {statusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
              Certificação
            </label>
            <select
              value={filterState.certificacao}
              onChange={(e) => handleFilterChange('certificacao', e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: `1px solid #e6ddc9`,
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                background: '#fff',
                color: DESIGN_TOKENS.colors.texto1,
                minWidth: '140px',
              }}
            >
              <option value="">Todos</option>
              {certStatusOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Botão Criar Novo Lote */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px',
            background: `linear-gradient(135deg, ${DESIGN_TOKENS.colors.verde600}, #195236)`,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          + Criar Novo Lote
        </button>
      </div>

      {/* Tabela de lotes */}
      <div style={{
        background: '#fffdf8',
        borderRadius: '12px',
        overflow: 'hidden',
        border: `1px solid #e6ddc9`,
        boxShadow: '0 1px 2px rgba(31,42,34,.06)',
      }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: DESIGN_TOKENS.typography.bodyFont,
        }}>
          <thead>
            <tr style={{ background: '#f2ecdd', borderBottom: `1px solid #e6ddc9` }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lote ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Safra</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Origem</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Área (ha)</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Certificação</th>
            </tr>
          </thead>
          <tbody>
            {filteredLotes.map((lot, idx) => (
              <tr key={lot.loteId} style={{
                borderBottom: `1px solid #e6ddc9`,
                background: idx % 2 === 0 ? '#fffdf8' : '#f2ecdd',
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0faf4'}
              onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fffdf8' : '#f2ecdd'}
              >
                <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 500 }}>
                  <Link
                    href={`/lote/${lot.loteId}`}
                    style={{
                      color: DESIGN_TOKENS.colors.verde600,
                      textDecoration: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {lot.loteId}
                  </Link>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{lot.safra}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{lot.origem}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1, textAlign: 'right' }}>{lot.área.toFixed(2)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: lot.status === 'Ativo' ? '#e8f2ea' : '#f5f1e7',
                    color: obterCorStatus(lot.status),
                  }}>
                    {lot.status}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '14px',
                    fontSize: '12px',
                    fontWeight: 600,
                    backgroundColor: obterStatusCertificacaoAgregado(lot.certificações) === 'Certificado' ? '#e8f2ea' : '#f5f1e7',
                    color: obterCorStatus(obterStatusCertificacaoAgregado(lot.certificações)),
                  }}>
                    {obterStatusCertificacaoAgregado(lot.certificações)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLotes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '48px 24px',
          color: DESIGN_TOKENS.colors.texto2,
        }}>
          <p style={{ fontSize: '14px', margin: 0 }}>Nenhum lote encontrado com os filtros selecionados</p>
        </div>
      )}

      {/* Modal Criar Novo Lote */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: '#fffdf8',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 26px 64px -26px rgba(13,51,34,.45)',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              fontSize: '20px',
              fontWeight: 600,
              color: DESIGN_TOKENS.colors.texto1,
            }}>
              Criar Novo Lote
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Lote ID *
                </label>
                <input
                  type="text"
                  placeholder="LOT-2026-XXX"
                  value={newLotForm.loteId}
                  onChange={(e) => setNewLotForm(prev => ({ ...prev, loteId: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid #e6ddc9`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Origem *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Minas Gerais - MG"
                  value={newLotForm.origem}
                  onChange={(e) => setNewLotForm(prev => ({ ...prev, origem: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid #e6ddc9`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Área (ha)
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={newLotForm.área}
                  onChange={(e) => setNewLotForm(prev => ({ ...prev, área: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid #e6ddc9`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Safra
                </label>
                <select
                  value={newLotForm.safra}
                  onChange={(e) => setNewLotForm(prev => ({ ...prev, safra: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid #e6ddc9`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Selecione uma safra</option>
                  {safras.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                  <option value="2025/2026">2025/2026</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: '#f2ecdd',
                    color: DESIGN_TOKENS.colors.texto1,
                    border: `1px solid #e6ddc9`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e8e0cd'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#f2ecdd'}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateLot}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: `linear-gradient(135deg, ${DESIGN_TOKENS.colors.verde600}, #195236)`,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Criar Lote
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
