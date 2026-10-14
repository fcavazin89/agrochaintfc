'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import type { Lot, LotEvent } from '@/types/agrochain';
import { getSmartLotContractAddress, DEFAULT_CONTRACT_ADDRESS } from '@/lib/contracts/smartlot';
// import { formatarData, gerarUriQRCode, ordenarEventosPorData, obterCorStatus } from '@/lib/lotUtils';
// import { DESIGN_TOKENS } from '@/lib/lotConstants';

// Constantes locais
const DESIGN_TOKENS = {
  typography: {
    titleFont: 'Georgia, serif',
    bodyFont: 'system-ui, -apple-system, sans-serif',
  },
  colors: {
    texto1: '#1e2a22',
    texto2: '#495649',
    texto3: '#6b7d6b',
    verde600: 'var(--verde-profundo)',
  },
};
const formatarData = (timestamp: number) => new Date(timestamp * 1000).toLocaleDateString('pt-BR');
const obterCorStatus = (status: string) => {
  if (status === 'Ativo') return DESIGN_TOKENS.colors.verde600;
  if (status === 'Transferindo') return '#f59e0b';
  return DESIGN_TOKENS.colors.texto2;
};

// Mock data
const MOCK_LOTS: Record<string, Lot> = {
  'LOT-2026-001': {
    loteId: 'LOT-2026-001',
    produtor: 'Fazenda São Benedito',
    safra: '2025/2026',
    origem: 'Minas Gerais - MG',
    área: 15.5,
    dataPlantio: Math.floor(Date.now() / 1000) - 8640000,
    dataColheita: Math.floor(Date.now() / 1000) - 1080000,
    certificações: [
      { tipo: 'NFT', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 864000, dataVencimento: Math.floor(Date.now() / 1000) + 15552000 },
      { tipo: 'ZK', status: 'Certificado', dataEmissão: Math.floor(Date.now() / 1000) - 864000, dataVencimento: Math.floor(Date.now() / 1000) + 15552000 },
      { tipo: 'EUDR', status: 'Pendente', dataEmissão: 0, dataVencimento: 0 },
      { tipo: 'ESG', status: 'Pendente', dataEmissão: 0, dataVencimento: 0 },
    ],
    eventos: [
      { tipo: 'Plantio', data: Math.floor(Date.now() / 1000) - 8640000, descrição: 'Plantio de mudas selecionadas', localização: 'Talhão A', responsável: 'João Silva' },
      { tipo: 'Colheita', data: Math.floor(Date.now() / 1000) - 1080000, descrição: 'Colheita manual realizada', localização: 'Talhão A', responsável: 'Equipe de colheita' },
      { tipo: 'Armazenamento', data: Math.floor(Date.now() / 1000) - 864000, descrição: 'Armazenamento em silos climatizados', localização: 'Galpão principal', responsável: 'José Pereira' },
    ],
    status: 'Ativo',
  },
  'LOT-2026-002': {
    loteId: 'LOT-2026-002',
    produtor: 'Fazenda São Benedito',
    safra: '2025/2026',
    origem: 'São Paulo - SP',
    área: 22.0,
    dataPlantio: Math.floor(Date.now() / 1000) - 12960000,
    dataColheita: Math.floor(Date.now() / 1000) - 5184000,
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
      { tipo: 'Processamento', data: Math.floor(Date.now() / 1000) - 1512000, descrição: 'Processamento iniciado', localização: 'Cooperativa Local', responsável: 'Técnico de Processamento' },
    ],
    status: 'Ativo',
  },
  'LOT-2025-015': {
    loteId: 'LOT-2025-015',
    produtor: 'Fazenda São Benedito',
    safra: '2024/2025',
    origem: 'Espírito Santo - ES',
    área: 18.7,
    dataPlantio: Math.floor(Date.now() / 1000) - 31536000,
    dataColheita: Math.floor(Date.now() / 1000) - 23328000,
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
};

export default function LoteDetalhes() {
  const params = useParams();
  const lotId = params?.lotId as string;
  const { address, isConnected } = useAccount();
  const [showAddEventForm, setShowAddEventForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    tipo: 'Colheita',
    descrição: '',
    localização: '',
    responsável: '',
  });

  const lot = MOCK_LOTS[lotId];

  // Verifica se o endereço do contrato SmartLot está configurado
  const contractAddress = getSmartLotContractAddress();
  const contratoNaoConfigurado = !contractAddress || contractAddress === DEFAULT_CONTRACT_ADDRESS;

  if (!lot) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22' }}>
          Detalhes do Lote
        </h1>
        <div style={{ background: '#f9f7f2', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#495649' }}>
          <p>Lote {lotId} não encontrado</p>
          <Link href="/lote" style={{ color: 'var(--verde-profundo)', textDecoration: 'none' }}>
            ← Voltar para Lotes
          </Link>
        </div>
      </div>
    );
  }

  const handleAddEvent = () => {
    if (!newEvent.descrição || !newEvent.localização || !newEvent.responsável) {
      alert('Preencha todos os campos');
      return;
    }
    alert(`Evento adicionado: ${newEvent.tipo} (mock apenas)`);
    setShowAddEventForm(false);
    setNewEvent({ tipo: 'Colheita', descrição: '', localização: '', responsável: '' });
  };

  const qrCodeUri = `/passport/${lot.loteId}`;
  const eventosSorteados = lot.eventos.sort((a, b) => b.data - a.data);

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Navegação */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/lote" style={{ color: DESIGN_TOKENS.colors.verde600, textDecoration: 'none', fontSize: '13px', fontWeight: 600 }}>
          ← Voltar para Lotes
        </Link>
      </div>

      {/* Aviso de contrato não configurado */}
      {contratoNaoConfigurado && (
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#856404',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠️</span>
          <span>
            Configure <strong>NEXT_PUBLIC_SMARTLOT_CONTRACT_ADDRESS</strong> para habilitar funcionalidades blockchain (registro, eventos e certificações on-chain).
          </span>
        </div>
      )}

      {/* Cabeçalho com dados do lote */}
      <div style={{
        background: '#fffdf8',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: `1px solid #e6ddc9`,
        boxShadow: '0 1px 2px rgba(31,42,34,.06)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'start' }}>
          <div>
            <h1 style={{
              margin: '0 0 16px 0',
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              fontSize: '28px',
              fontWeight: 600,
              color: DESIGN_TOKENS.colors.texto1,
            }}>
              {lot.loteId}
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px' }}>
              {/* Col 1 */}
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Produtor
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {lot.produtor}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Safra
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {lot.safra}
                </p>
              </div>

              {/* Col 2 */}
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Origem
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {lot.origem}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Área
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {lot.área.toFixed(2)} ha
                </p>
              </div>

              {/* Col 3 */}
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Data de Plantio
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {formatarData(lot.dataPlantio)}
                </p>
              </div>

              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Data de Colheita
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {formatarData(lot.dataColheita)}
                </p>
              </div>

              {/* Col 4 */}
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Status
                </p>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: lot.status === 'Ativo' ? '#e8f2ea' : '#f5f1e7',
                  color: obterCorStatus(lot.status),
                }}>
                  {lot.status}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Código de Rastreio
            </p>
            <img
              src={qrCodeUri}
              alt={`QR Code para ${lot.loteId}`}
              style={{ width: '140px', height: '140px', borderRadius: '8px', border: `1px solid #e6ddc9` }}
            />
          </div>
        </div>
      </div>

      {/* Seção de Certificações */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{
          margin: '0 0 16px 0',
          fontFamily: DESIGN_TOKENS.typography.titleFont,
          fontSize: '18px',
          fontWeight: 600,
          color: DESIGN_TOKENS.colors.texto1,
        }}>
          Certificações
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}>
          {lot.certificações.map(cert => (
            <div
              key={cert.tipo}
              style={{
                background: '#fffdf8',
                borderRadius: '12px',
                padding: '16px',
                border: cert.status === 'Certificado' ? `2px solid ${DESIGN_TOKENS.colors.verde600}` : `1px solid #e6ddc9`,
                boxShadow: '0 1px 2px rgba(31,42,34,.06)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <h3 style={{
                  margin: 0,
                  fontFamily: DESIGN_TOKENS.typography.titleFont,
                  fontSize: '15px',
                  fontWeight: 600,
                  color: DESIGN_TOKENS.colors.texto1,
                }}>
                  {cert.tipo}
                </h3>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: cert.status === 'Certificado' ? '#e8f2ea' : cert.status === 'Revogado' ? '#ffe6e6' : '#f5f1e7',
                  color: obterCorStatus(cert.status),
                }}>
                  {cert.status}
                </span>
              </div>

              {cert.status !== 'Pendente' && (
                <>
                  <p style={{ margin: '0 0 8px 0', fontSize: '11px', color: DESIGN_TOKENS.colors.texto3 }}>
                    <strong>Emissão:</strong> {formatarData(cert.dataEmissão)}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: DESIGN_TOKENS.colors.texto3 }}>
                    <strong>Vencimento:</strong> {formatarData(cert.dataVencimento)}
                  </p>
                </>
              )}
              {cert.status === 'Pendente' && (
                <p style={{ margin: 0, fontSize: '11px', color: DESIGN_TOKENS.colors.texto2 }}>
                  Aguardando processamento...
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Seção de Timeline de Eventos */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{
            margin: 0,
            fontFamily: DESIGN_TOKENS.typography.titleFont,
            fontSize: '18px',
            fontWeight: 600,
            color: DESIGN_TOKENS.colors.texto1,
          }}>
            Timeline de Eventos
          </h2>
          <button
            onClick={() => setShowAddEventForm(!showAddEventForm)}
            style={{
              padding: '8px 16px',
              background: DESIGN_TOKENS.colors.verde600,
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            + Adicionar Evento
          </button>
        </div>

        {/* Timeline visual */}
        <div style={{ position: 'relative', paddingLeft: '40px' }}>
          {eventosSorteados.map((evento, idx) => (
            <div key={idx} style={{ marginBottom: '24px', position: 'relative' }}>
              {/* Ponto na timeline */}
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '6px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: obterCorStatus(evento.tipo),
                  border: '3px solid #f5f1e7',
                }}
              />
              {/* Linha conectora */}
              {idx < eventosSorteados.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    left: '-22px',
                    top: '24px',
                    width: '2px',
                    height: '32px',
                    background: '#e6ddc9',
                  }}
                />
              )}

              {/* Conteúdo do evento */}
              <div style={{
                background: '#fffdf8',
                borderRadius: '8px',
                padding: '12px 16px',
                border: `1px solid #e6ddc9`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                  <h4 style={{
                    margin: 0,
                    fontSize: '13px',
                    fontWeight: 600,
                    color: DESIGN_TOKENS.colors.texto1,
                  }}>
                    {evento.tipo}
                  </h4>
                  <span style={{ fontSize: '11px', color: DESIGN_TOKENS.colors.texto3 }}>
                    {formatarData(evento.data)}
                  </span>
                </div>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: DESIGN_TOKENS.colors.texto2 }}>
                  {evento.descrição}
                </p>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: DESIGN_TOKENS.colors.texto3 }}>
                  <strong>Local:</strong> {evento.localização}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: DESIGN_TOKENS.colors.texto3 }}>
                  <strong>Responsável:</strong> {evento.responsável}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Adicionar Evento */}
      {showAddEventForm && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }} onClick={() => setShowAddEventForm(false)}>
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
              Adicionar Evento
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Tipo de Evento *
                </label>
                <select
                  value={newEvent.tipo}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, tipo: e.target.value }))}
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
                  <option value="Plantio">Plantio</option>
                  <option value="Colheita">Colheita</option>
                  <option value="Transferência">Transferência</option>
                  <option value="Certificação">Certificação</option>
                  <option value="Inspeção">Inspeção</option>
                  <option value="Armazenamento">Armazenamento</option>
                  <option value="Processamento">Processamento</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Descrição *
                </label>
                <textarea
                  placeholder="Descreva o evento em detalhes..."
                  value={newEvent.descrição}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, descrição: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid #e6ddc9`,
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    minHeight: '80px',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase' }}>
                  Localização *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Talhão A, Galpão principal"
                  value={newEvent.localização}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, localização: e.target.value }))}
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
                  Responsável *
                </label>
                <input
                  type="text"
                  placeholder="Nome de quem realizou a ação"
                  value={newEvent.responsável}
                  onChange={(e) => setNewEvent(prev => ({ ...prev, responsável: e.target.value }))}
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

              {!isConnected && (
                <div style={{
                  background: '#fff3cd',
                  border: `1px solid #ffc107`,
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px',
                  color: '#856404',
                }}>
                  Conecte sua carteira MetaMask para adicionar eventos ao blockchain.
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <button
                  onClick={() => setShowAddEventForm(false)}
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
                  onClick={handleAddEvent}
                  style={{
                    flex: 1,
                    padding: '10px 16px',
                    background: DESIGN_TOKENS.colors.verde600,
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
                  Adicionar Evento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
