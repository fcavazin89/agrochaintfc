'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
// import {
//   MOCK_EUDR_COMPLIANCES,
// } from '@/lib/contracts/verification';
// import { DESIGN_TOKENS } from '@/lib/lotConstants';
import type { EUDRCompliance } from '@/types/agrochain';
const MOCK_EUDR_COMPLIANCES: EUDRCompliance[] = [];
const DESIGN_TOKENS = {
  typography: { titleFont: 'Georgia, serif', bodyFont: 'system-ui, sans-serif' },
  colors: { verde600: 'var(--verde-profundo)', texto1: '#1e2a22', texto2: '#495649', texto3: '#6b7d6b' },
};

export default function EUDRCompliancePage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [confidenceFilter, setConfidenceFilter] = useState<number>(60);

  const filteredCompliances = useMemo(
    () =>
      MOCK_EUDR_COMPLIANCES.filter((e) => {
        if (statusFilter && e.status !== statusFilter) return false;
        if (e.confianca < confidenceFilter) return false;
        return true;
      }),
    [statusFilter, confidenceFilter]
  );

  const deforestationCount = useMemo(
    () => MOCK_EUDR_COMPLIANCES.filter((e) => e.desmatamentoDetectado).length,
    []
  );

  const statusOptions = ['Não Iniciado', 'Em Verificação', 'Aprovado', 'Rejeitado'];

  // KPIs
  const totalAnalyzed = MOCK_EUDR_COMPLIANCES.length;
  const atRisk = deforestationCount;
  const compliant = MOCK_EUDR_COMPLIANCES.filter((e) => !e.desmatamentoDetectado).length;

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px', fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
        <Link href="/verification" style={{ color: DESIGN_TOKENS.colors.verde600, textDecoration: 'none' }}>
          Verificação
        </Link>
        {' / '}
        <span>EUDR</span>
      </div>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            margin: '0 0 8px 0',
            fontFamily: DESIGN_TOKENS.typography.titleFont,
            fontSize: '26px',
            fontWeight: 600,
            color: DESIGN_TOKENS.colors.texto1,
          }}
        >
          Conformidade EUDR
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto2 }}>
          Regulamento da União Europeia sobre Desflorestação
        </p>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            background: '#fffdf8',
            border: `1px solid #e6ddc9`,
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 1px 2px rgba(31,42,34,.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: DESIGN_TOKENS.colors.texto3,
              marginBottom: '8px',
            }}
          >
            Lotes Analisados
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              color: DESIGN_TOKENS.colors.verde600,
            }}
          >
            {totalAnalyzed}
          </div>
        </div>

        <div
          style={{
            background: '#fffdf8',
            border: `1px solid #e6ddc9`,
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 1px 2px rgba(31,42,34,.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: DESIGN_TOKENS.colors.texto3,
              marginBottom: '8px',
            }}
          >
            Com Risco
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              color: '#a83226',
            }}
          >
            {atRisk}
          </div>
        </div>

        <div
          style={{
            background: '#fffdf8',
            border: `1px solid #e6ddc9`,
            borderRadius: '16px',
            padding: '18px',
            boxShadow: '0 1px 2px rgba(31,42,34,.05)',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: DESIGN_TOKENS.colors.texto3,
              marginBottom: '8px',
            }}
          >
            Conformes
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              color: DESIGN_TOKENS.colors.verde600,
            }}
          >
            {compliant}
          </div>
        </div>
      </div>

      {/* Alerta de desmatamento */}
      {atRisk > 0 && (
        <div
          style={{
            background: '#fef7e8',
            border: `2px solid #b26a06`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '20px' }}>⚠</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#b26a06' }}>
              {atRisk} {atRisk === 1 ? 'lote' : 'lotes'} com desmatamento detectado
            </div>
            <div style={{ fontSize: '12px', color: '#8a6712', marginTop: '4px' }}>
              Revisão recomendada antes de comercialização
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          background: '#fffdf8',
          border: `1px solid #e6ddc9`,
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '24px',
          display: 'flex',
          gap: '16px',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', marginRight: '8px', display: 'block', marginBottom: '6px' }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: `1px solid #e6ddc9`,
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#fff',
              color: DESIGN_TOKENS.colors.texto1,
            }}
          >
            <option value="">Todos os status</option>
            {statusOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', marginRight: '8px', display: 'block', marginBottom: '6px' }}>
            Confiança Mínima: {confidenceFilter}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(parseInt(e.target.value))}
            style={{
              width: '180px',
              cursor: 'pointer',
            }}
          />
        </div>

        <button
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
            marginLeft: 'auto',
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
        >
          Processar Nova Análise
        </button>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: '#fffdf8',
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid #e6ddc9`,
          boxShadow: '0 1px 2px rgba(31,42,34,.06)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: DESIGN_TOKENS.typography.bodyFont }}>
          <thead>
            <tr style={{ background: '#f2ecdd', borderBottom: `1px solid #e6ddc9` }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lote ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Análise</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desmatamento</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confiança</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCompliances.map((item, idx) => (
              <tr
                key={item.eudrcId}
                style={{
                  borderBottom: `1px solid #e6ddc9`,
                  background: idx % 2 === 0 ? '#fffdf8' : '#f2ecdd',
                }}
              >
                <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{item.loteId.slice(0, 8)}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>
                  {item.dataVerificacao ? new Date(item.dataVerificacao * 1000).toLocaleDateString('pt-BR') : '—'}
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: item.desmatamentoDetectado ? '#f5e8e8' : '#e8f2ea',
                      color: item.desmatamentoDetectado ? '#a83226' : DESIGN_TOKENS.colors.verde600,
                    }}
                  >
                    {item.desmatamentoDetectado ? '✗ Sim' : '✓ Não'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>
                  {item.confianca}%
                </td>
                <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '14px',
                      fontSize: '12px',
                      fontWeight: 600,
                      backgroundColor: item.status === 'Aprovado' ? '#e8f2ea' : item.status === 'Rejeitado' ? '#f5e8e8' : '#fef7e8',
                      color: item.status === 'Aprovado' ? DESIGN_TOKENS.colors.verde600 : item.status === 'Rejeitado' ? '#a83226' : '#b26a06',
                    }}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCompliances.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: DESIGN_TOKENS.colors.texto2, fontSize: '14px' }}>
          Nenhum resultado encontrado com os filtros aplicados
        </div>
      )}

      {/* Rodapé */}
      <div
        style={{
          marginTop: '48px',
          paddingTop: '24px',
          borderTop: `1px solid #e6ddc9`,
          textAlign: 'center',
          fontSize: '12px',
          color: DESIGN_TOKENS.colors.texto3,
        }}
      >
        EUDR Analysis · Mock data · Confiança baseada em imagens de satélite
      </div>
    </div>
  );
}
