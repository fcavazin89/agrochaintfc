'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MOCK_ESG_SCORES,
} from '@/lib/contracts/verification';
import { DESIGN_TOKENS } from '@/lib/lotConstants';

export default function ESGScorePage() {
  const [selectedLot, setSelectedLot] = useState<string>(MOCK_ESG_SCORES[0].esgId);
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredScores = useMemo(
    () =>
      MOCK_ESG_SCORES.filter((s) => {
        if (statusFilter && s.status !== statusFilter) return false;
        if (s.scoreFinal < scoreFilter) return false;
        return true;
      }),
    [statusFilter, scoreFilter]
  );

  const selectedData = MOCK_ESG_SCORES.find((s) => s.esgId === selectedLot);

  const statusOptions = ['Não Iniciado', 'Em Verificação', 'Aprovado', 'Rejeitado'];

  // Gráfico de barras simples (SVG mock)
  const renderChart = () => {
    if (!selectedData) return null;
    const scores = [
      { label: 'Ambiental', value: selectedData.scoreAmbiental },
      { label: 'Social', value: selectedData.scoreSocial },
      { label: 'Governança', value: selectedData.scoreGovernanca },
      { label: 'Final', value: selectedData.scoreFinal },
    ];
    const maxValue = 100;
    const barHeight = 30;
    const spacing = 50;
    const startY = 40;

    return (
      <svg width="100%" height="200" style={{ minHeight: '200px' }}>
        {scores.map((item, idx) => {
          const barWidth = (item.value / maxValue) * 300;
          const y = startY + idx * spacing;
          const color = item.value >= 70 ? DESIGN_TOKENS.colors.verde600 : item.value >= 50 ? '#b8912a' : '#a83226';

          return (
            <g key={idx}>
              <text x="0" y={y + 12} fontSize="12" fill={DESIGN_TOKENS.colors.texto2} fontWeight="600">
                {item.label}
              </text>
              <rect x="100" y={y - 8} width={barWidth} height={barHeight} fill={color} opacity="0.7" rx="4" />
              <text x={110 + barWidth} y={y + 12} fontSize="13" fill={DESIGN_TOKENS.colors.texto1} fontWeight="700">
                {item.value}
              </text>
            </g>
          );
        })}
      </svg>
    );
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px', fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
        <Link href="/verification" style={{ color: DESIGN_TOKENS.colors.verde600, textDecoration: 'none' }}>
          Verificação
        </Link>
        {' / '}
        <span>ESG Scores</span>
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
          ESG Scores
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto2 }}>
          Pontuações de Ambiental, Social e Governança
        </p>
      </div>

      {/* Seletor de lote e gráfico */}
      <div
        style={{
          background: '#fffdf8',
          border: `1px solid #e6ddc9`,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 2px rgba(31,42,34,.05)',
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Selecionar Lote
          </label>
          <select
            value={selectedLot}
            onChange={(e) => setSelectedLot(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: `1px solid #e6ddc9`,
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: '#fff',
              color: DESIGN_TOKENS.colors.texto1,
              boxSizing: 'border-box',
            }}
          >
            {MOCK_ESG_SCORES.map((score) => (
              <option key={score.esgId} value={score.esgId}>
                {score.loteId.slice(0, 8)} - Score Final: {score.scoreFinal}
              </option>
            ))}
          </select>
        </div>

        {/* Gráfico */}
        <div style={{ background: '#f2ecdd', padding: '20px', borderRadius: '12px', marginBottom: '20px', overflow: 'auto' }}>
          {renderChart()}
        </div>

        {/* Detalhes */}
        {selectedData && (
          <div>
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '14px',
                fontWeight: 600,
                color: DESIGN_TOKENS.colors.texto1,
              }}
            >
              Detalhes
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '12px',
              }}
            >
              <div style={{ background: '#f2ecdd', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: DESIGN_TOKENS.colors.texto3, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Ambiental
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: DESIGN_TOKENS.colors.verde600 }}>
                  {selectedData.scoreAmbiental}
                </div>
              </div>
              <div style={{ background: '#f2ecdd', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: DESIGN_TOKENS.colors.texto3, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Social
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: DESIGN_TOKENS.colors.verde600 }}>
                  {selectedData.scoreSocial}
                </div>
              </div>
              <div style={{ background: '#f2ecdd', padding: '12px', borderRadius: '8px' }}>
                <div style={{ fontSize: '11px', color: DESIGN_TOKENS.colors.texto3, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Governança
                </div>
                <div style={{ fontSize: '18px', fontWeight: 600, color: DESIGN_TOKENS.colors.verde600 }}>
                  {selectedData.scoreGovernanca}
                </div>
              </div>
              <div
                style={{
                  background: selectedData.scoreFinal >= 70 ? '#e8f2ea' : selectedData.scoreFinal >= 50 ? '#fef7e8' : '#f5e8e8',
                  padding: '12px',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontSize: '11px', color: DESIGN_TOKENS.colors.texto3, fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Score Final
                </div>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: selectedData.scoreFinal >= 70 ? DESIGN_TOKENS.colors.verde600 : selectedData.scoreFinal >= 50 ? '#b26a06' : '#a83226',
                  }}
                >
                  {selectedData.scoreFinal}
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
              Metodologia: {selectedData.metodologia}
            </div>
          </div>
        )}
      </div>

      {/* Tabela com filtros */}
      <div style={{ marginBottom: '24px' }}>
        <h2
          style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: DESIGN_TOKENS.typography.titleFont,
            color: DESIGN_TOKENS.colors.texto1,
          }}
        >
          Todos os Scores
        </h2>

        <div
          style={{
            background: '#fffdf8',
            border: `1px solid #e6ddc9`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
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
              Score Mínimo: {scoreFilter}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={scoreFilter}
              onChange={(e) => setScoreFilter(parseInt(e.target.value))}
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
            Calcular Score
          </button>
        </div>
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
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ambiental</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Social</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Governança</th>
              <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredScores.map((item, idx) => {
              const statusColor =
                item.scoreFinal >= 70
                  ? DESIGN_TOKENS.colors.verde600
                  : item.scoreFinal >= 50
                    ? '#b26a06'
                    : '#a83226';
              const statusBg =
                item.scoreFinal >= 70
                  ? '#e8f2ea'
                  : item.scoreFinal >= 50
                    ? '#fef7e8'
                    : '#f5e8e8';

              return (
                <tr
                  key={item.esgId}
                  style={{
                    borderBottom: `1px solid #e6ddc9`,
                    background: idx % 2 === 0 ? '#fffdf8' : '#f2ecdd',
                  }}
                >
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{item.loteId.slice(0, 8)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>{item.scoreAmbiental}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>{item.scoreSocial}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1, fontWeight: 500 }}>{item.scoreGovernanca}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1, fontWeight: 700 }}>{item.scoreFinal}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: statusBg,
                        color: statusColor,
                      }}
                    >
                      {item.scoreFinal >= 70 ? '✓ OK' : item.scoreFinal >= 50 ? '⚠ Atenção' : '✗ Risco'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredScores.length === 0 && (
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
        ESG Scoring · Mock data · GRI Standards + SASB
      </div>
    </div>
  );
}
