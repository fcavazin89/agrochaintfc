'use client';
import { useState } from 'react';
import { useAccount } from 'wagmi';
import type { ProducerBatch, ActiveSale } from '@/types/agrochain';

const MOCK_BATCHES: ProducerBatch[] = [
  { id: 'BATCH-001', name: 'Lote Safra 2024', type: 'Coffee', weightKg: 500, status: 'Disponível', pricePerKg: 8.50 },
  { id: 'BATCH-002', name: 'Arabica Premium', type: 'Coffee', weightKg: 250, status: 'Vendendo', pricePerKg: 12.00 },
  { id: 'BATCH-003', name: 'Cacau Fino', type: 'Cacao', weightKg: 300, status: 'Disponível', pricePerKg: 15.75 },
];

const MOCK_SALES: ActiveSale[] = [
  { id: 'SALE-001', buyer: '0x1234...5678', token: 'AGROTOKEN', amount: 4250, status: 'Escrow' },
  { id: 'SALE-002', buyer: '0xabcd...ef01', token: 'AGROTOKEN', amount: 3000, status: 'Aceito' },
  { id: 'SALE-003', buyer: '0x9999...1111', token: 'AGROTOKEN', amount: 2100, status: 'Rejeitado' },
];

export default function ProducerPage() {
  const { address: userAddress } = useAccount();
  const [batches] = useState<ProducerBatch[]>(MOCK_BATCHES);
  const [sales] = useState<ActiveSale[]>(MOCK_SALES);

  const truncateAddress = (addr: string | undefined) => {
    if (!addr) return 'Desconectado';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponível': return '#1f6440';
      case 'Vendendo': return '#b8912a';
      case 'Vendido': return '#495649';
      case 'Aceito': return '#1f6440';
      case 'Escrow': return '#b8912a';
      case 'Rejeitado': return '#a83226';
      default: return '#495649';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'Disponível': return '#e8f2ea';
      case 'Vendendo': return '#fef9f0';
      case 'Vendido': return '#f2ecdd';
      case 'Aceito': return '#e8f2ea';
      case 'Escrow': return '#fef9f0';
      case 'Rejeitado': return '#ffe8e3';
      default: return '#f2ecdd';
    }
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22', fontWeight: 600 }}>
        Dashboard do Produtor
      </h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <p style={{ margin: '0 0 24px', color: '#495649', fontSize: '14px' }}>
          Gerencie seus lotes e vendas ativas na plataforma AgroChain · {truncateAddress(userAddress)}
        </p>
        <button
          style={{
            background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.06), 0 12px 28px -20px rgba(19,66,44,.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          + Novo Anúncio
        </button>
      </div>

      {/* Seção de Lotes */}
      <section style={{ marginBottom: '32px' }}>
        <h2 style={{ margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22', fontWeight: 600 }}>
          Meus Lotes
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {batches.map(batch => (
            <div
              key={batch.id}
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '18px',
                border: '1px solid #e6ddc9',
                boxShadow: '0 1px 2px rgba(31,42,34,.06)',
                transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.05), 0 12px 28px -20px rgba(19,66,44,.35)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <h3 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif', fontSize: '15px', color: '#1e2a22', fontWeight: 600 }}>
                  {batch.name}
                </h3>
                <p style={{ margin: '0', fontSize: '12px', color: '#495649' }}>
                  {batch.type === 'Coffee' ? '☕ Café' : '🍫 Cacau'} · {batch.weightKg} kg
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #e6ddc9' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Preço/kg
                  </p>
                  <p style={{ margin: '0', fontSize: '16px', fontFamily: 'ui-monospace, monospace', color: '#1f6440', fontWeight: 600 }}>
                    R$ {batch.pricePerKg.toFixed(2)}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Status
                  </p>
                  <div style={{
                    display: 'inline-block',
                    background: getStatusBgColor(batch.status),
                    color: getStatusColor(batch.status),
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}>
                    {batch.status}
                  </div>
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  background: batch.status === 'Disponível' ? '#e8f2ea' : '#f2ecdd',
                  color: batch.status === 'Disponível' ? '#1f6440' : '#495649',
                  border: `1px solid ${batch.status === 'Disponível' ? '#d1e4d8' : '#d6c9b0'}`,
                  padding: '10px 16px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = batch.status === 'Disponível' ? '#d1e4d8' : '#e8e0cd';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = batch.status === 'Disponível' ? '#e8f2ea' : '#f2ecdd';
                }}
              >
                {batch.status === 'Disponível' ? '📢 Anunciar' : batch.status === 'Vendendo' ? '⏳ Em Venda' : '✓ Vendido'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Seção de Vendas Ativas */}
      <section>
        <h2 style={{ margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22', fontWeight: 600 }}>
          Vendas Ativas e Pendentes
        </h2>
        <div style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #e6ddc9',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(31,42,34,.06)',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f2ecdd', borderBottom: '1px solid #e6ddc9' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  ID Venda
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 700, color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Comprador
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '10px', fontWeight: 700, color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Valor (AGROTOKEN)
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '10px', fontWeight: 700, color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '10px', fontWeight: 700, color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale, idx) => (
                <tr key={sale.id} style={{ borderBottom: idx < sales.length - 1 ? '1px solid #e6ddc9' : 'none', background: idx % 2 === 0 ? '#fff' : '#f2ecdd' }}>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#1e2a22', fontWeight: 500 }}>
                    {sale.id}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#495649', fontFamily: 'ui-monospace, monospace' }}>
                    {sale.buyer}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#1f6440', fontFamily: 'ui-monospace, monospace' }}>
                    {sale.amount.toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block',
                      background: getStatusBgColor(sale.status),
                      color: getStatusColor(sale.status),
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}>
                      {sale.status}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <button
                      style={{
                        background: '#e8f2ea',
                        color: '#1f6440',
                        border: '1px solid #d1e4d8',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#d1e4d8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#e8f2ea';
                      }}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rodapé com fonte */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e6ddc9' }}>
        <p style={{ margin: '0', fontSize: '11px', color: '#7c867a' }}>
          <strong>Dados mockados · Integração Sepolia</strong> · AgroChain v2.0
        </p>
      </div>
    </div>
  );
}
