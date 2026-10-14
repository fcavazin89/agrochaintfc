'use client';

import { useState } from 'react';
import { MOCK_LOTS } from '@/lib/mockLotData';

type Periodo = '7d' | '30d' | '90d' | '1a';

const MULTIPLICADORES: Record<Periodo, number> = {
  '7d': 0.25,
  '30d': 1,
  '90d': 3,
  '1a': 12,
};

// Base calculations derived from MOCK_LOTS
const LOTES_CERTIFICADOS_BASE = MOCK_LOTS.filter((l) =>
  l.certificações.some((c) => c.status === 'Certificado')
).length; // 5

const VOLUME_MOCK_USDC_BASE = MOCK_LOTS.reduce((acc, l) => acc + l.área * 150, 0);

const PRODUTORES_ATIVOS_BASE = new Set(MOCK_LOTS.map((l) => l.produtor)).size; // 3

const SCORE_ESG_MEDIO_BASE = 78;

// Últimos 6 lotes ordenados por dataColheita desc
const ULTIMOS_LOTES = [...MOCK_LOTS]
  .sort((a, b) => b.dataColheita - a.dataColheita)
  .slice(0, 6);

// Lista de estados de origem agrupados
const LOTES_POR_ESTADO: { estado: string; quantidade: number }[] = (() => {
  const contagem: Record<string, number> = {};
  MOCK_LOTS.forEach((l) => {
    const estado = l.origem.split(' - ')[0].trim();
    contagem[estado] = (contagem[estado] || 0) + 1;
  });
  return Object.entries(contagem)
    .map(([estado, quantidade]) => ({ estado, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade);
})();

// Volume mensal simulado (Jan–Jun 2024)
const VOLUME_MENSAL_BASE = [
  { mes: 'Jan', volume: 45000 },
  { mes: 'Fev', volume: 62000 },
  { mes: 'Mar', volume: 58000 },
  { mes: 'Abr', volume: 71000 },
  { mes: 'Mai', volume: 83000 },
  { mes: 'Jun', volume: 95000 },
];

const MAX_VOLUME = Math.max(...VOLUME_MENSAL_BASE.map((v) => v.volume));

export default function AnalyticsPage() {
  const [periodo, setPeriodo] = useState<Periodo>('30d');

  const mult = MULTIPLICADORES[periodo];

  const lotesCertificados = Math.round(LOTES_CERTIFICADOS_BASE * mult);
  const volumeMockUSDC = Math.round(VOLUME_MOCK_USDC_BASE * mult);
  const produtoresAtivos = Math.round(PRODUTORES_ATIVOS_BASE * mult);
  const scoreESGMedio = Math.round(SCORE_ESG_MEDIO_BASE * (0.9 + mult * 0.02));

  const volumeMensal = VOLUME_MENSAL_BASE.map((v) => ({
    ...v,
    volume: Math.round(v.volume * mult),
  }));

  const maxVolumePeriodo = Math.max(...volumeMensal.map((v) => v.volume));

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
        Analytics
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          color: 'var(--texto-2)',
          fontSize: 'var(--t-md, 14px)',
        }}
      >
        Visão geral da plataforma AgroChain · Dados demonstrativos
      </p>

      {/* Filtros de Período */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {(['7d', '30d', '90d', '1a'] as Periodo[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriodo(p)}
            style={{
              padding: '8px 20px',
              borderRadius: 'var(--raio-xs)',
              border: periodo === p ? '2px solid var(--verde-600)' : '1px solid var(--linha)',
              background: periodo === p ? 'var(--verde-600)' : 'var(--sup-1)',
              color: periodo === p ? '#fff' : 'var(--texto-2)',
              fontWeight: periodo === p ? 700 : 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Grid de KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* KPI 1: Lotes Certificados */}
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
            Lotes Certificados
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
            {lotesCertificados}
          </p>
        </div>

        {/* KPI 2: Volume MockUSDC */}
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
            Volume MockUSDC
          </p>
          <p
            style={{
              margin: 0,
              fontFamily: 'ui-monospace, monospace',
              fontSize: '24px',
              fontWeight: 700,
              color: 'var(--ouro)',
            }}
          >
            {volumeMockUSDC.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* KPI 3: Produtores Ativos */}
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
            Produtores Ativos
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
            {produtoresAtivos}
          </p>
        </div>

        {/* KPI 4: Score ESG Médio */}
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
            Score ESG Médio
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
            {Math.min(scoreESGMedio, 100)}
          </p>
        </div>
      </div>

      {/* Gráfico de barras + Lista de estados */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
          marginBottom: '32px',
        }}
      >
        {/* Gráfico de barras */}
        <section
          style={{
            background: 'var(--sup-1)',
            border: '1px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-5)',
            boxShadow: 'var(--sombra)',
          }}
        >
          <h2
            style={{
              margin: '0 0 20px',
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              color: 'var(--texto-1)',
              fontWeight: 600,
            }}
          >
            Volume por Mês (Jan–Jun 2024)
          </h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: '12px',
              height: '180px',
            }}
          >
            {volumeMensal.map(({ mes, volume }) => {
              const heightPx = maxVolumePeriodo > 0
                ? Math.max(8, Math.round((volume / maxVolumePeriodo) * 160))
                : 8;
              return (
                <div
                  key={mes}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--texto-3)',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {(volume / 1000).toFixed(0)}k
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height: `${heightPx}px`,
                      background: 'var(--verde-600)',
                      borderRadius: '4px 4px 0 0',
                    }}
                  />
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--texto-2)',
                      fontWeight: 500,
                    }}
                  >
                    {mes}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Lista de estados de origem */}
        <section
          style={{
            background: 'var(--sup-1)',
            border: '1px solid var(--linha)',
            borderRadius: 'var(--raio)',
            padding: 'var(--e-5)',
            boxShadow: 'var(--sombra)',
          }}
        >
          <h2
            style={{
              margin: '0 0 16px',
              fontFamily: 'Georgia, serif',
              fontSize: '16px',
              color: 'var(--texto-1)',
              fontWeight: 600,
            }}
          >
            Lotes por Estado de Origem
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {LOTES_POR_ESTADO.map(({ estado, quantidade }) => (
              <div
                key={estado}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'var(--sup-2)',
                  borderRadius: 'var(--raio-xs)',
                  padding: '8px 14px',
                }}
              >
                <span style={{ fontSize: '13px', color: 'var(--texto-2)', fontWeight: 500 }}>
                  {estado}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    fontFamily: 'ui-monospace, monospace',
                    fontWeight: 700,
                    color: 'var(--verde-600)',
                  }}
                >
                  {quantidade} lote{quantidade !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Tabela dos últimos 6 lotes */}
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
          Últimos Lotes
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
                {['Lote ID', 'Origem', 'Status', 'Área (ha)', 'Data Colheita'].map((col, i) => (
                  <th
                    key={col}
                    style={{
                      padding: 'var(--e-4)',
                      textAlign: i === 3 ? 'right' : 'left',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: 'var(--texto-3)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ULTIMOS_LOTES.map((lote, idx) => (
                <tr
                  key={lote.loteId}
                  style={{
                    borderBottom:
                      idx < ULTIMOS_LOTES.length - 1 ? '1px solid var(--linha)' : 'none',
                    background: idx % 2 === 0 ? 'var(--sup-1)' : 'var(--fundo)',
                  }}
                >
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '12px',
                      color: 'var(--texto-1)',
                      fontFamily: 'ui-monospace, monospace',
                      fontWeight: 500,
                    }}
                  >
                    {lote.loteId.slice(0, 10)}…
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                    }}
                  >
                    {lote.origem}
                  </td>
                  <td style={{ padding: 'var(--e-4)' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 10px',
                        borderRadius: 'var(--raio-xs)',
                        fontSize: '11px',
                        fontWeight: 600,
                        background:
                          lote.status === 'Ativo'
                            ? 'var(--verde-100)'
                            : lote.status === 'Transferindo'
                            ? 'var(--status-emitido-bg, #fef3c7)'
                            : 'var(--sup-2)',
                        color:
                          lote.status === 'Ativo'
                            ? 'var(--verde-600)'
                            : lote.status === 'Transferindo'
                            ? 'var(--atencao, #b45309)'
                            : 'var(--texto-2)',
                      }}
                    >
                      {lote.status}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                      textAlign: 'right',
                      fontFamily: 'ui-monospace, monospace',
                    }}
                  >
                    {lote.área.toLocaleString('pt-BR')}
                  </td>
                  <td
                    style={{
                      padding: 'var(--e-4)',
                      fontSize: '13px',
                      color: 'var(--texto-2)',
                    }}
                  >
                    {new Date(lote.dataColheita * 1000).toLocaleDateString('pt-BR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Rodapé */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--texto-3)' }}>
          <strong>Dados demonstrativos · Analytics AgroChain</strong> · v2.0
        </p>
      </div>
    </div>
  );
}
