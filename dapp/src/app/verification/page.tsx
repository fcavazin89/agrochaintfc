'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MOCK_ORIGIN_VERIFICATIONS,
  MOCK_EUDR_COMPLIANCES,
  MOCK_ESG_SCORES,
} from '@/lib/contracts/verification';
import { DESIGN_TOKENS } from '@/lib/lotConstants';

export default function VerificationDashboard() {
  const [activeTab, setActiveTab] = useState<'origem' | 'eudr' | 'esg'>('origem');

  // KPI: Origem Verificada (status Aprovado)
  const originApprovedCount = useMemo(
    () => MOCK_ORIGIN_VERIFICATIONS.filter((v) => v.status === 'Aprovado').length,
    []
  );

  // KPI: EUDR Compliant (sem desmatamento)
  const eudrCompliantCount = useMemo(
    () => MOCK_EUDR_COMPLIANCES.filter((e) => !e.desmatamentoDetectado).length,
    []
  );

  // KPI: ESG Score >= 70%
  const esgHighScoreCount = useMemo(
    () => MOCK_ESG_SCORES.filter((s) => s.scoreFinal >= 70).length,
    []
  );

  // Filtros para cada aba
  const [originFilter, setOriginFilter] = useState<string>('');
  const [eudrFilter, setEudrFilter] = useState<string>('');
  const [esgFilter, setEsgFilter] = useState<string>('');

  // Dados filtrados
  const filteredOrigin = useMemo(
    () =>
      originFilter
        ? MOCK_ORIGIN_VERIFICATIONS.filter((v) => v.status === originFilter)
        : MOCK_ORIGIN_VERIFICATIONS,
    [originFilter]
  );

  const filteredEudr = useMemo(
    () =>
      eudrFilter
        ? MOCK_EUDR_COMPLIANCES.filter((e) => e.status === eudrFilter)
        : MOCK_EUDR_COMPLIANCES,
    [eudrFilter]
  );

  const filteredEsg = useMemo(
    () =>
      esgFilter
        ? MOCK_ESG_SCORES.filter((s) => s.status === esgFilter)
        : MOCK_ESG_SCORES,
    [esgFilter]
  );

  // Status options
  const statusOptions = ['Não Iniciado', 'Em Verificação', 'Aprovado', 'Rejeitado'];

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            margin: '0 0 8px 0',
            fontFamily: DESIGN_TOKENS.typography.titleFont,
            fontSize: '28px',
            fontWeight: 600,
            color: DESIGN_TOKENS.colors.texto1,
          }}
        >
          Verificação de Lotes
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto2 }}>
          3 camadas de certificação
        </p>
      </div>

      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
            Origem Verificada
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              color: DESIGN_TOKENS.colors.verde600,
              marginBottom: '4px',
            }}
          >
            {originApprovedCount}
          </div>
          <div style={{ fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
            com status Aprovado
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
            EUDR Compliant
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              color: DESIGN_TOKENS.colors.verde600,
              marginBottom: '4px',
            }}
          >
            {eudrCompliantCount}
          </div>
          <div style={{ fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
            sem desmatamento detectado
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
            ESG Score ≥ 70%
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 600,
              fontFamily: DESIGN_TOKENS.typography.titleFont,
              color: DESIGN_TOKENS.colors.verde600,
              marginBottom: '4px',
            }}
          >
            {esgHighScoreCount}
          </div>
          <div style={{ fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
            score final ≥ 70
          </div>
        </div>
      </div>

      {/* Abas */}
      <div
        style={{
          display: 'flex',
          gap: '32px',
          borderBottom: `1px solid #e6ddc9`,
          marginBottom: '24px',
        }}
      >
        {['origem', 'eudr', 'esg'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'origem' | 'eudr' | 'esg')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              fontSize: '14px',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? DESIGN_TOKENS.colors.verde600 : DESIGN_TOKENS.colors.texto2,
              borderBottom: activeTab === tab ? `2px solid ${DESIGN_TOKENS.colors.verde600}` : 'none',
              cursor: 'pointer',
              transition: 'color 0.15s',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'origem' && 'Origem'}
            {tab === 'eudr' && 'EUDR'}
            {tab === 'esg' && 'ESG'}
          </button>
        ))}
      </div>

      {/* Conteúdo das abas */}
      {activeTab === 'origem' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', marginRight: '12px' }}>
              Filtro: Status
            </label>
            <select
              value={originFilter}
              onChange={(e) => setOriginFilter(e.target.value)}
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>País</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Região</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrigin.map((item, idx) => (
                  <tr
                    key={item.verificacaoId}
                    style={{
                      borderBottom: `1px solid #e6ddc9`,
                      background: idx % 2 === 0 ? '#fffdf8' : '#f2ecdd',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{item.loteId.slice(0, 8)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{item.pais}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{item.regiao}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: item.status === 'Aprovado' ? '#e8f2ea' : '#f5f1e7',
                          color: item.status === 'Aprovado' ? DESIGN_TOKENS.colors.verde600 : DESIGN_TOKENS.colors.texto2,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                      <Link href={`/verification/origin`} style={{ color: DESIGN_TOKENS.colors.verde600, textDecoration: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'eudr' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', marginRight: '12px' }}>
              Filtro: Status
            </label>
            <select
              value={eudrFilter}
              onChange={(e) => setEudrFilter(e.target.value)}
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desmatamento?</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confiança %</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEudr.map((item, idx) => (
                  <tr
                    key={item.eudrcId}
                    style={{
                      borderBottom: `1px solid #e6ddc9`,
                      background: idx % 2 === 0 ? '#fffdf8' : '#f2ecdd',
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>{item.loteId.slice(0, 8)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', color: DESIGN_TOKENS.colors.texto1 }}>
                      {new Date(item.dataVerificacao * 1000).toLocaleDateString('pt-BR')}
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
                        {item.desmatamentoDetectado ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'right', color: DESIGN_TOKENS.colors.texto1 }}>
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
                          backgroundColor: item.status === 'Aprovado' ? '#e8f2ea' : '#f5f1e7',
                          color: item.status === 'Aprovado' ? DESIGN_TOKENS.colors.verde600 : DESIGN_TOKENS.colors.texto2,
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
        </div>
      )}

      {activeTab === 'esg' && (
        <div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', marginRight: '12px' }}>
              Filtro: Status
            </label>
            <select
              value={esgFilter}
              onChange={(e) => setEsgFilter(e.target.value)}
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
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ambiental</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Social</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Governança</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Final</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredEsg.map((item, idx) => {
                  const statusColor =
                    item.scoreFinal >= 70
                      ? DESIGN_TOKENS.colors.verde600
                      : item.scoreFinal >= 50
                        ? '#b8912a'
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
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1 }}>{item.scoreAmbiental}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1 }}>{item.scoreSocial}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', color: DESIGN_TOKENS.colors.texto1 }}>{item.scoreGovernanca}</td>
                      <td style={{ padding: '12px 16px', fontSize: '13px', textAlign: 'center', fontWeight: 600, color: DESIGN_TOKENS.colors.texto1 }}>{item.scoreFinal}</td>
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
        </div>
      )}

      {/* Botão registrar nova verificação */}
      <div style={{ marginTop: '32px', textAlign: 'center' }}>
        <button
          style={{
            padding: '10px 24px',
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
          + Registrar nova Verificação
        </button>
      </div>

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
        Mock data · 13/10/2026 · Metodologia: Verificação em 3 camadas
      </div>
    </div>
  );
}
