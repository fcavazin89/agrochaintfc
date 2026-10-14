'use client';

import type { CSSProperties } from 'react';
import { MOCK_LOTS } from '@/lib/mockLotData';
import type { CarbonCredit } from '@/types/agrochain';

// Distribuição de status: 4 Emitido, 1 Pendente, 1 Vendido
const STATUS_MAP: Array<CarbonCredit['status']> = [
  'Emitido',  // Lote 1 — MG Cerrado 150.5 ha
  'Emitido',  // Lote 2 — SP Ribeirão 230.0 ha
  'Emitido',  // Lote 3 — ES Vale Rio Doce 180.75 ha
  'Emitido',  // Lote 4 — BA Ilhéus 320.0 ha
  'Pendente', // Lote 5 — RS Fronteira 275.25 ha
  'Vendido',  // Lote 6 — GO Planalto 400.0 ha
];

const MOCK_CARBON_CREDITS: CarbonCredit[] = MOCK_LOTS.map((lot, idx) => ({
  creditId: `CC-${String(idx + 1).padStart(3, '0')}`,
  loteId: lot.loteId,
  produtor: lot.produtor,
  hectares: lot.área,
  creditos: Math.floor(lot.área),
  status: STATUS_MAP[idx],
  dataEmissao: lot.dataColheita,
  dataTransferencia: STATUS_MAP[idx] === 'Vendido' ? lot.dataColheita + 2592000 : undefined,
  destinatario:
    STATUS_MAP[idx] === 'Vendido'
      ? '0x70997970C51812e339D9B73b0245Ad59cc5fAEf0'
      : undefined,
}));

// ── KPI derivados ──────────────────────────────────────────────────────────────
const totalEmitidos = MOCK_CARBON_CREDITS.filter(c => c.status === 'Emitido').reduce(
  (acc, c) => acc + c.creditos,
  0
);
const totalPendentes = MOCK_CARBON_CREDITS.filter(c => c.status === 'Pendente').reduce(
  (acc, c) => acc + c.creditos,
  0
);
const totalVendidos = MOCK_CARBON_CREDITS.filter(c => c.status === 'Vendido').reduce(
  (acc, c) => acc + c.creditos,
  0
);
const areaTotal = MOCK_CARBON_CREDITS.reduce((acc, c) => acc + c.hectares, 0);

// ── Badge helpers ──────────────────────────────────────────────────────────────
function badgeStyle(status: CarbonCredit['status']): CSSProperties {
  if (status === 'Emitido')
    return {
      background: 'rgba(22,163,74,.12)',
      color: 'var(--verde-600)',
      border: '1px solid rgba(22,163,74,.25)',
    };
  if (status === 'Pendente')
    return {
      background: 'rgba(234,179,8,.12)',
      color: 'var(--atencao)',
      border: '1px solid rgba(234,179,8,.30)',
    };
  // Vendido
  return {
    background: 'var(--sup-2)',
    color: 'var(--texto-3)',
    border: '1px solid var(--linha)',
  };
}

function truncate(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function CreditsPage() {
  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* ── Cabeçalho ───────────────────────────────────────────────────────── */}
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: 'Georgia, serif',
          fontSize: 'var(--t-2xl, 28px)',
          color: 'var(--texto-1)',
          fontWeight: 600,
        }}
      >
        Créditos de Carbono
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          color: 'var(--texto-2)',
          fontSize: 'var(--t-md, 14px)',
        }}
      >
        Gerencie e acompanhe os créditos de carbono dos seus lotes agrícolas · AgroChain
      </p>

      {/* ── KPI Cards ───────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* KPI 1 */}
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
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Total de Créditos Emitidos
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--verde-600)',
            }}
          >
            {totalEmitidos.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* KPI 2 */}
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
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Créditos Pendentes
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--atencao)',
            }}
          >
            {totalPendentes.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* KPI 3 */}
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
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Créditos Vendidos
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--texto-3)',
            }}
          >
            {totalVendidos.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* KPI 4 */}
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
              fontWeight: 700,
              textTransform: 'uppercase',
              color: 'var(--texto-3)',
              letterSpacing: '0.5px',
            }}
          >
            Área Total (ha)
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--verde-600)',
            }}
          >
            {areaTotal.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* ── Tabela de lotes ─────────────────────────────────────────────────── */}
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
          Lotes e Créditos
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
              <tr
                style={{
                  background: 'var(--sup-2)',
                  borderBottom: '1px solid var(--linha)',
                }}
              >
                {['Lote ID', 'Origem', 'Área (ha)', 'Créditos', 'Status', 'Ação'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: 'var(--e-4)',
                      textAlign: i >= 2 && i <= 3 ? 'right' : i === 4 ? 'center' : 'left',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--texto-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_CARBON_CREDITS.map((credit, idx) => (
                <tr
                  key={credit.creditId}
                  style={{
                    borderBottom:
                      idx < MOCK_CARBON_CREDITS.length - 1
                        ? '1px solid var(--linha)'
                        : 'none',
                    background: idx % 2 === 0 ? 'var(--sup-1)' : 'var(--fundo)',
                  }}
                >
                  {/* Lote ID */}
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '12px',
                      color: 'var(--texto-1)',
                      fontFamily: 'ui-monospace, monospace',
                      fontWeight: 500,
                    }}
                  >
                    {truncate(credit.loteId)}
                  </td>

                  {/* Origem */}
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                    }}
                  >
                    {MOCK_LOTS[idx].origem}
                  </td>

                  {/* Área */}
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                      textAlign: 'right',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {credit.hectares.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                  </td>

                  {/* Créditos */}
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--verde-600)',
                      textAlign: 'right',
                      fontFamily: 'ui-monospace, monospace',
                      fontWeight: 600,
                    }}
                  >
                    {credit.creditos.toLocaleString('pt-BR')}
                  </td>

                  {/* Status badge */}
                  <td style={{ padding: 'var(--e-4)', textAlign: 'center' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: 'var(--e-1) var(--e-2)',
                        borderRadius: 'var(--raio-xs)',
                        fontSize: '11px',
                        fontWeight: 600,
                        ...badgeStyle(credit.status),
                      }}
                    >
                      {credit.status}
                    </span>
                  </td>

                  {/* Ação */}
                  <td style={{ padding: 'var(--e-4)', textAlign: 'right' }}>
                    {credit.status === 'Pendente' ? (
                      <button
                        onClick={() => alert('Solicitação enviada (mock)')}
                        style={{
                          background: 'linear-gradient(180deg, var(--verde-600) 0%, var(--verde-700) 100%)',
                          color: '#fff',
                          border: 'none',
                          padding: 'var(--e-2) var(--e-3)',
                          borderRadius: 'var(--raio-xs)',
                          cursor: 'pointer',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Solicitar Créditos
                      </button>
                    ) : (
                      <button
                        disabled
                        style={{
                          background: 'var(--sup-2)',
                          color: 'var(--texto-3)',
                          border: '1px solid var(--linha)',
                          padding: 'var(--e-2) var(--e-3)',
                          borderRadius: 'var(--raio-xs)',
                          cursor: 'not-allowed',
                          fontSize: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Solicitar Créditos
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Rodapé ──────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--texto-3)' }}>
          <strong>Dados mockados · Contrato CarbonCredits (Sepolia)</strong> · AgroChain v2.0
        </p>
      </div>
    </div>
  );
}
