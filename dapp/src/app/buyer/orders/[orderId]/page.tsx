'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import type { PurchaseOrder } from '@/types/agrochain';
import { DeliveryStatus } from '@/types/agrochain';

const MOCK_PURCHASES: Record<string, PurchaseOrder> = {
  'ORDER-001': {
    orderId: 'ORDER-001',
    listingId: '1',
    loteId: 'LOTE-001',
    produtor: '0x1234567890123456789012345678901234567890',
    dataCompra: Date.now() - 604800000,
    dataEntrega: Date.now() + 259200000,
    status: DeliveryStatus.Transportando,
    quantidadeKg: 100,
    precoUnitario: 3.5,
    precoTotal: 350,
    origem: 'Minas Gerais',
    observacoes: 'Café Arábica Premium',
    comprador: '0xabcd567890123456789012345678901234567890',
  },
  'ORDER-002': {
    orderId: 'ORDER-002',
    listingId: '2',
    loteId: 'LOTE-002',
    produtor: '0x2234567890123456789012345678901234567890',
    dataCompra: Date.now() - 1209600000,
    dataEntrega: Date.now() - 86400000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 250,
    precoUnitario: 5.2,
    precoTotal: 1300,
    origem: 'Bahia',
    observacoes: 'Cacau Fino Forastero',
    comprador: '0xabcd567890123456789012345678901234567890',
  },
  'ORDER-003': {
    orderId: 'ORDER-003',
    listingId: '3',
    loteId: 'LOTE-003',
    produtor: '0x3234567890123456789012345678901234567890',
    dataCompra: Date.now() - 1814400000,
    dataEntrega: Date.now() - 172800000,
    status: DeliveryStatus.Entregue,
    quantidadeKg: 150,
    precoUnitario: 4.1,
    precoTotal: 615,
    origem: 'São Paulo',
    observacoes: 'Café Robusta',
    comprador: '0xabcd567890123456789012345678901234567890',
  },
};

interface TimelineStep {
  stage: string;
  date: number;
  completed: boolean;
  description: string;
}

export default function OrderDetailsPage() {
  const params = useParams();
  const orderId = params?.orderId as string;

  const purchase = MOCK_PURCHASES[orderId] || MOCK_PURCHASES['ORDER-001'];
  const [selectedTab, setSelectedTab] = useState<'lote' | 'produtor' | 'acoes'>('lote');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Timeline stages
  const timelineSteps: TimelineStep[] = [
    {
      stage: 'Aguardando',
      date: purchase.dataCompra,
      completed: ['Aguardando', 'Emitido', 'Transportando', 'Entregue'].includes(purchase.status),
      description: 'Pedido criado e aguardando confirmação',
    },
    {
      stage: 'Emitido',
      date: purchase.dataCompra + 172800000, // +2 dias
      completed: ['Emitido', 'Transportando', 'Entregue'].includes(purchase.status),
      description: 'Pedido emitido e processado',
    },
    {
      stage: 'Transportando',
      date: purchase.dataCompra + 432000000, // +5 dias
      completed: ['Transportando', 'Entregue'].includes(purchase.status),
      description: 'Produto em trânsito',
    },
    {
      stage: 'Entregue',
      date: purchase.dataEntrega,
      completed: purchase.status === 'Entregue',
      description: 'Entrega completada',
    },
  ];

  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return 'Desconectado';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Aguardando': 'var(--status-aguardando)',
      'Emitido': 'var(--status-emitido)',
      'Transportando': 'var(--status-transportando)',
      'Entregue': 'var(--status-entregue)',
      'Rejeitado': 'var(--status-rejeitado)',
    };
    return colors[status] || 'var(--texto-2)';
  };

  const getStatusBgColor = (status: string) => {
    const colors: Record<string, string> = {
      'Aguardando': 'var(--status-aguardando-bg)',
      'Emitido': 'var(--status-emitido-bg)',
      'Transportando': 'var(--status-transportando-bg)',
      'Entregue': 'var(--status-entregue-bg)',
      'Rejeitado': 'var(--status-rejeitado-bg)',
    };
    return colors[status] || 'var(--sup-2)';
  };

  const handleRejectOrder = () => {
    if (rejectionReason.trim()) {
      console.log('Pedido rejeitado com motivo:', rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      // Aqui você atualizaria o status do pedido para 'Rejeitado'
    }
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            margin: '0 0 8px',
            fontFamily: 'Georgia, serif',
            fontSize: '28px',
            color: 'var(--texto-1)',
            fontWeight: 600,
          }}
        >
          Detalhes do Pedido: {purchase.orderId}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              display: 'inline-block',
              background: getStatusBgColor(purchase.status),
              color: getStatusColor(purchase.status),
              padding: 'var(--e-1) var(--e-3)',
              borderRadius: 'var(--raio-xs)',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            {purchase.status}
          </div>
          <p style={{ margin: '0', fontSize: '14px', color: 'var(--texto-2)' }}>
            {new Date(purchase.dataCompra).toLocaleDateString('pt-BR')}
          </p>
        </div>
      </div>

      {/* Layout 2 colunas */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Coluna Esquerda: Informações */}
        <div>
          {/* Card com dados de compra */}
          <div
            style={{
              background: 'var(--sup-1)',
              border: '1px solid var(--linha)',
              borderRadius: 'var(--raio)',
              padding: 'var(--e-4)',
              marginBottom: '16px',
              boxShadow: 'var(--sombra)',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--texto-1)',
                borderBottom: '1px solid var(--linha)',
                paddingBottom: '12px',
              }}
            >
              Informações da Compra
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Lote ID
                </p>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '500', color: 'var(--texto-1)' }}>
                  {purchase.loteId}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Produtor
                </p>
                <p
                  style={{
                    margin: '0',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--texto-1)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  {truncateAddress(purchase.produtor)}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Quantidade
                </p>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '500', color: 'var(--texto-1)' }}>
                  {purchase.quantidadeKg} kg
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Origem
                </p>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '500', color: 'var(--texto-1)' }}>
                  {purchase.origem}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Preço Unitário
                </p>
                <p
                  style={{
                    margin: '0',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: 'var(--verde-600)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  R$ {purchase.precoUnitario?.toFixed(2)}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Preço Total
                </p>
                <p
                  style={{
                    margin: '0',
                    fontSize: '13px',
                    fontWeight: '700',
                    color: 'var(--verde-600)',
                    fontFamily: 'ui-monospace, monospace',
                  }}
                >
                  R$ {purchase.precoTotal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Data Compra
                </p>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '500', color: 'var(--texto-1)' }}>
                  {new Date(purchase.dataCompra).toLocaleDateString('pt-BR')}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: '0 0 4px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Entrega Estimada
                </p>
                <p style={{ margin: '0', fontSize: '13px', fontWeight: '500', color: 'var(--texto-1)' }}>
                  {new Date(purchase.dataEntrega).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna Direita: Timeline */}
        <div>
          <div
            style={{
              background: 'var(--sup-1)',
              border: '1px solid var(--linha)',
              borderRadius: 'var(--raio)',
              padding: 'var(--e-4)',
              boxShadow: 'var(--sombra)',
            }}
          >
            <h3
              style={{
                margin: '0 0 20px',
                fontSize: '14px',
                fontWeight: '600',
                color: 'var(--texto-1)',
                borderBottom: '1px solid var(--linha)',
                paddingBottom: '12px',
              }}
            >
              Cronograma de Entrega
            </h3>

            <div style={{ position: 'relative', paddingLeft: '30px' }}>
              {timelineSteps.map((step, idx) => (
                <div
                  key={step.stage}
                  style={{
                    marginBottom: idx < timelineSteps.length - 1 ? '24px' : '0',
                    position: 'relative',
                  }}
                >
                  {/* Dot */}
                  <div
                    style={{
                      position: 'absolute',
                      left: '-30px',
                      top: '3px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: step.completed ? 'var(--verde-600)' : 'var(--linha)',
                      border: step.completed ? '2px solid var(--verde-600)' : '2px solid var(--linha)',
                    }}
                  />

                  {/* Connector line */}
                  {idx < timelineSteps.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '-24px',
                        top: '12px',
                        width: '2px',
                        height: '32px',
                        background: timelineSteps[idx + 1].completed ? 'var(--verde-600)' : 'var(--linha)',
                      }}
                    />
                  )}

                  {/* Content */}
                  <div>
                    <p
                      style={{
                        margin: '0 0 4px',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: step.completed ? 'var(--verde-600)' : 'var(--texto-3)',
                      }}
                    >
                      {step.stage}
                    </p>
                    <p
                      style={{
                        margin: '0 0 4px',
                        fontSize: '11px',
                        color: 'var(--texto-3)',
                      }}
                    >
                      {new Date(step.date).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p
                      style={{
                        margin: '0',
                        fontSize: '12px',
                        color: 'var(--texto-2)',
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '1px solid var(--linha)',
            marginBottom: '16px',
          }}
        >
          <button
            onClick={() => setSelectedTab('lote')}
            style={{
              padding: 'var(--e-3) var(--e-4)',
              background: selectedTab === 'lote' ? 'transparent' : 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'lote' ? '2px solid var(--verde-600)' : 'none',
              color: selectedTab === 'lote' ? 'var(--verde-600)' : 'var(--texto-2)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedTab === 'lote' ? '600' : '500',
              transition: 'all var(--t-rapida)',
            }}
          >
            Lote
          </button>
          <button
            onClick={() => setSelectedTab('produtor')}
            style={{
              padding: 'var(--e-3) var(--e-4)',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'produtor' ? '2px solid var(--verde-600)' : 'none',
              color: selectedTab === 'produtor' ? 'var(--verde-600)' : 'var(--texto-2)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedTab === 'produtor' ? '600' : '500',
              transition: 'all var(--t-rapida)',
            }}
          >
            Produtor
          </button>
          <button
            onClick={() => setSelectedTab('acoes')}
            style={{
              padding: 'var(--e-3) var(--e-4)',
              background: 'transparent',
              border: 'none',
              borderBottom: selectedTab === 'acoes' ? '2px solid var(--verde-600)' : 'none',
              color: selectedTab === 'acoes' ? 'var(--verde-600)' : 'var(--texto-2)',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: selectedTab === 'acoes' ? '600' : '500',
              transition: 'all var(--t-rapida)',
            }}
          >
            Ações
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div
          style={{
            background: 'var(--sup-1)',
            border: '1px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-4)',
            boxShadow: 'var(--sombra)',
          }}
        >
          {selectedTab === 'lote' && (
            <div>
              <h4
                style={{
                  margin: '0 0 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--texto-1)',
                }}
              >
                Informações do Lote
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--texto-3)',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Tipo de Batch
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: 'var(--texto-1)', fontWeight: '500' }}>
                    Café (Arábica/Robusta)
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--texto-3)',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Peso
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: 'var(--texto-1)', fontWeight: '500' }}>
                    {purchase.quantidadeKg} kg
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--texto-3)',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Origem
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: 'var(--texto-1)', fontWeight: '500' }}>
                    {purchase.origem}
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--texto-3)',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Certificações
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: 'var(--texto-1)', fontWeight: '500' }}>
                    NFT, ZK, EUDR
                  </p>
                </div>
              </div>
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Eventos de Rastreabilidade
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: 'var(--texto-2)' }}>
                  • Plantio: 2024-01-15 (Minas Gerais)<br />
                  • Colheita: 2024-06-20 (Minas Gerais)<br />
                  • Beneficiamento: 2024-07-01 (Processadora XYZ)<br />
                  • Embalagem: 2024-07-05 (Centro de Distribuição)
                </p>
              </div>
            </div>
          )}

          {selectedTab === 'produtor' && (
            <div>
              <h4
                style={{
                  margin: '0 0 12px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--texto-1)',
                }}
              >
                Informações do Produtor
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--texto-3)',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Nome
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: 'var(--texto-1)', fontWeight: '500' }}>
                    João da Silva Oliveira
                  </p>
                </div>
                <div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      color: 'var(--texto-3)',
                      fontWeight: '700',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Empresa
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: 'var(--texto-1)', fontWeight: '500' }}>
                    Fazenda Premium de Café
                  </p>
                </div>
              </div>
              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--linha)', marginTop: '12px' }}>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Reputação
                </p>
                <p style={{ margin: '0', fontSize: '18px', color: 'var(--ouro)', fontWeight: '700' }}>
                  4.8 ⭐ (92 avaliações)
                </p>
              </div>
              <div style={{ paddingTop: '12px', borderTop: '1px solid var(--linha)', marginTop: '12px' }}>
                <p
                  style={{
                    margin: '0 0 8px',
                    fontSize: '10px',
                    textTransform: 'uppercase',
                    color: 'var(--texto-3)',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                  }}
                >
                  Histórico Recente
                </p>
                <p style={{ margin: '0', fontSize: '12px', color: 'var(--texto-2)' }}>
                  • 45 transações completadas<br />
                  • Taxa de aprovação: 99%<br />
                  • Tempo médio de entrega: 5 dias
                </p>
              </div>
            </div>
          )}

          {selectedTab === 'acoes' && (
            <div>
              <h4
                style={{
                  margin: '0 0 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'var(--texto-1)',
                }}
              >
                Ações Disponíveis
              </h4>
              <div style={{ display: 'flex', gap: 'var(--e-3)' }}>
                {purchase.status === 'Entregue' && (
                  <button
                    style={{
                      padding: 'var(--e-3) var(--e-4)',
                      background: 'var(--verde-100)',
                      color: 'var(--verde-600)',
                      border: '1px solid var(--verde-100)',
                      borderRadius: 'var(--raio-xs)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600',
                      transition: 'all var(--t-rapida)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--verde-300)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--verde-100)';
                    }}
                  >
                    ✓ Confirmar Entrega
                  </button>
                )}

                <button
                  onClick={() => setShowRejectModal(true)}
                  style={{
                    padding: 'var(--e-3) var(--e-4)',
                    background: 'var(--status-rejeitado-bg)',
                    color: 'var(--status-rejeitado)',
                    border: '1px solid var(--status-rejeitado)',
                    borderRadius: 'var(--raio-xs)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    transition: 'all var(--t-rapida)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.85';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  ✕ Rejeitar Pedido
                </button>
              </div>
              <p
                style={{
                  marginTop: '12px',
                  fontSize: '12px',
                  color: 'var(--texto-3)',
                  fontStyle: 'italic',
                }}
              >
                Status atual: <strong>{purchase.status}</strong>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Rejeição */}
      {showRejectModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowRejectModal(false)}
        >
          <div
            style={{
              background: 'var(--sup-1)',
              borderRadius: 'var(--raio)',
              padding: 'var(--e-5)',
              maxWidth: '400px',
              width: '90%',
              boxShadow: 'var(--sombra-3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                margin: '0 0 16px',
                fontFamily: 'Georgia, serif',
                fontSize: '18px',
                color: 'var(--texto-1)',
              }}
            >
              Rejeitar Pedido
            </h2>

            <p
              style={{
                margin: '0 0 16px',
                fontSize: '13px',
                color: 'var(--texto-2)',
              }}
            >
              Por favor, explique o motivo da rejeição:
            </p>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Ex: Produto com defeito, embalagem danificada..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: 'var(--e-3)',
                borderRadius: 'var(--raio-xs)',
                border: '1px solid var(--linha)',
                fontSize: '13px',
                color: 'var(--texto-1)',
                fontFamily: 'var(--fonte)',
                boxSizing: 'border-box',
                resize: 'vertical',
                marginBottom: '16px',
              }}
            />

            <div style={{ display: 'flex', gap: 'var(--e-3)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  padding: 'var(--e-3) var(--e-4)',
                  background: 'var(--sup-2)',
                  color: 'var(--texto-1)',
                  border: '1px solid var(--linha)',
                  borderRadius: 'var(--raio-xs)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all var(--t-rapida)',
                }}
              >
                Cancelar
              </button>

              <button
                onClick={handleRejectOrder}
                disabled={!rejectionReason.trim()}
                style={{
                  padding: 'var(--e-3) var(--e-4)',
                  background: rejectionReason.trim() ? 'var(--critico)' : 'var(--sup-2)',
                  color: rejectionReason.trim() ? '#fff' : 'var(--texto-3)',
                  border: 'none',
                  borderRadius: 'var(--raio-xs)',
                  cursor: rejectionReason.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all var(--t-rapida)',
                }}
              >
                Confirmar Rejeição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
        <p style={{ margin: '0', fontSize: '11px', color: 'var(--texto-3)' }}>
          <strong>Dados mockados · Integração Sepolia</strong> · AgroChain v2.0
        </p>
      </div>
    </div>
  );
}
