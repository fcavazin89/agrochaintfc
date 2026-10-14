'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
// import type { PurchaseOrder } from '@/types/agrochain';
// import { DeliveryStatus } from '@/types/agrochain';
const DeliveryStatus = { Transportando: 'Transportando', Emitido: 'Emitido', Entregue: 'Entregue', Aguardando: 'Aguardando', Rejeitado: 'Rejeitado' };

const MOCK_PURCHASES: any[] = [
  {
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
  },
  {
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
  },
  {
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
  },
  {
    orderId: 'ORDER-004',
    listingId: '4',
    loteId: 'LOTE-004',
    produtor: '0x4234567890123456789012345678901234567890',
    dataCompra: Date.now() - 259200000,
    dataEntrega: Date.now() + 86400000,
    status: DeliveryStatus.Emitido,
    quantidadeKg: 80,
    precoUnitario: 6.8,
    precoTotal: 544,
    origem: 'Rondônia',
    observacoes: 'Café Premium Arabica',
  },
  {
    orderId: 'ORDER-005',
    listingId: '5',
    loteId: 'LOTE-005',
    produtor: '0x5234567890123456789012345678901234567890',
    dataCompra: Date.now() - 86400000,
    dataEntrega: Date.now() + 172800000,
    status: DeliveryStatus.Aguardando,
    quantidadeKg: 200,
    precoUnitario: 3.8,
    precoTotal: 760,
    origem: 'Ceará',
    observacoes: 'Café Conilon',
  },
];

export default function BuyerDashboard() {
  const { address: userAddress } = useAccount();
  const [purchases] = useState<any[]>(MOCK_PURCHASES);

  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return 'Desconectado';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Cálculos de KPIs
  const totalSpent = purchases.reduce((acc, p) => acc + (p.precoTotal || 0), 0);
  const batchesPurchased = purchases.length;
  const pendingPurchases = purchases.filter(
    p => ['Aguardando', 'Emitido', 'Transportando'].includes(p.status)
  ).length;
  const averageReputation = 87; // Mock value

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

  const recentPurchases = purchases.slice(-5).reverse();

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: 'Georgia, serif',
          fontSize: 'var(--t-2xl, 28px)',
          color: 'var(--texto-1)',
          fontWeight: 600,
        }}
      >
        Dashboard do Comprador
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          color: 'var(--texto-2)',
          fontSize: 'var(--t-md, 14px)',
        }}
      >
        Gerencie suas compras na plataforma AgroChain · {truncateAddress(userAddress)}
      </p>

      {/* Grid de KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* KPI 1: Total Gasto */}
        <div
          style={{
            background: 'var(--sup-1)',
            border: '2px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-5)',
            textAlign: 'center',
            boxShadow: 'var(--sombra)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Total Gasto
          </p>
          <p
            style={{
              margin: '0',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--verde-600)',
            }}
          >
            R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>

        {/* KPI 2: Lotes Comprados */}
        <div
          style={{
            background: 'var(--sup-1)',
            border: '2px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-5)',
            textAlign: 'center',
            boxShadow: 'var(--sombra)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Lotes Comprados
          </p>
          <p
            style={{
              margin: '0',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--verde-600)',
            }}
          >
            {batchesPurchased}
          </p>
        </div>

        {/* KPI 3: Compras Pendentes */}
        <div
          style={{
            background: 'var(--sup-1)',
            border: '2px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-5)',
            textAlign: 'center',
            boxShadow: 'var(--sombra)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Compras Pendentes
          </p>
          <p
            style={{
              margin: '0',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--atencao)',
            }}
          >
            {pendingPurchases}
          </p>
        </div>

        {/* KPI 4: Reputação Média */}
        <div
          style={{
            background: 'var(--sup-1)',
            border: '2px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-5)',
            textAlign: 'center',
            boxShadow: 'var(--sombra)',
          }}
        >
          <p
            style={{
              margin: '0 0 8px',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Reputação Média
          </p>
          <p
            style={{
              margin: '0',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--ouro)',
            }}
          >
            {averageReputation} ⭐
          </p>
        </div>
      </div>

      {/* Últimas 5 Compras */}
      <section style={{ marginBottom: '32px' }}>
        <h2
          style={{
            margin: '0 0 16px',
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: 'var(--texto-1)',
            fontWeight: 600,
          }}
        >
          Últimas Compras
        </h2>
        <div
          style={{
            background: 'var(--sup-1)',
            borderRadius: 'var(--raio)',
            border: '1px solid var(--linha)',
            overflow: 'hidden',
            boxShadow: 'var(--sombra-2)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--sup-2)', borderBottom: '1px solid var(--linha)' }}>
                <th
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--texto-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  ID Pedido
                </th>
                <th
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--texto-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Lote
                </th>
                <th
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--texto-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Produtor
                </th>
                <th
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'left',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--texto-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Data Compra
                </th>
                <th
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'center',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--texto-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: 'var(--e-4)',
                    textAlign: 'right',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--texto-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                  }}
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {recentPurchases.map((purchase, idx) => (
                <tr
                  key={purchase.orderId}
                  style={{
                    borderBottom: idx < recentPurchases.length - 1 ? '1px solid var(--linha)' : 'none',
                    background: idx % 2 === 0 ? 'var(--sup-1)' : 'var(--fundo)',
                  }}
                >
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-1)',
                      fontWeight: 500,
                    }}
                  >
                    {purchase.orderId}
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                    }}
                  >
                    {purchase.loteId}
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {truncateAddress(purchase.produtor)}
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                    }}
                  >
                    {new Date(purchase.dataCompra).toLocaleDateString('pt-BR')}
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        display: 'inline-block',
                        background: getStatusBgColor(purchase.status),
                        color: getStatusColor(purchase.status),
                        padding: 'var(--e-1) var(--e-2)',
                        borderRadius: 'var(--raio-xs)',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {purchase.status}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      textAlign: 'right',
                    }}
                  >
                    <Link
                      href={`/buyer/orders/${purchase.orderId}`}
                      style={{
                        display: 'inline-block',
                        background: 'var(--verde-100)',
                        color: 'var(--verde-600)',
                        border: '1px solid var(--verde-100)',
                        padding: 'var(--e-2) var(--e-3)',
                        borderRadius: 'var(--raio-xs)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'all var(--t-rapida)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--verde-300)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--verde-100)';
                      }}
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Botão Marketplace */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Link
          href="/marketplace"
          style={{
            display: 'inline-block',
            background: 'linear-gradient(180deg, var(--verde-600) 0%, var(--verde-700) 100%)',
            color: '#fff',
            border: 'none',
            padding: 'var(--e-3) var(--e-5)',
            borderRadius: 'var(--raio-sm)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            textDecoration: 'none',
            transition: 'all var(--t-rapida)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow =
              '0 1px 2px rgba(31,42,34,.06), 0 12px 28px -20px rgba(19,66,44,.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          📦 Ver Marketplace
        </Link>
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
        <p style={{ margin: '0', fontSize: '11px', color: 'var(--texto-3)' }}>
          <strong>Dados mockados · Integração Sepolia</strong> · AgroChain v2.0
        </p>
      </div>
    </div>
  );
}
