'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  MOCK_ORIGIN_VERIFICATIONS,
} from '@/lib/contracts/verification';
import { DESIGN_TOKENS } from '@/lib/lotConstants';

const MOCK_LOTS = [
  { id: 'LOT-101', name: 'Lote Café Arábica - MG' },
  { id: 'LOT-102', name: 'Lote Café Robusta - SP' },
  { id: 'LOT-103', name: 'Lote Cacau - BA' },
];

export default function OriginVerificationPage() {
  const [selectedLot, setSelectedLot] = useState<string>(MOCK_LOTS[0].id);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);

  const filteredVerifications = useMemo(
    () =>
      statusFilter
        ? MOCK_ORIGIN_VERIFICATIONS.filter((v) => v.status === statusFilter)
        : MOCK_ORIGIN_VERIFICATIONS,
    [statusFilter]
  );

  const statusOptions = ['Não Iniciado', 'Em Verificação', 'Aprovado', 'Rejeitado'];

  const handleSubmit = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '16px', fontSize: '12px', color: DESIGN_TOKENS.colors.texto3 }}>
        <Link href="/verification" style={{ color: DESIGN_TOKENS.colors.verde600, textDecoration: 'none' }}>
          Verificação
        </Link>
        {' / '}
        <span>Origem</span>
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
          Verificação de Origem
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: DESIGN_TOKENS.colors.texto2 }}>
          Verifique a origem geográfica do lote
        </p>
      </div>

      {/* Formulário Display */}
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
        <h2
          style={{
            margin: '0 0 20px 0',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: DESIGN_TOKENS.typography.titleFont,
            color: DESIGN_TOKENS.colors.texto1,
          }}
        >
          Dados do Lote
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Lote
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
              {MOCK_LOTS.map((lot) => (
                <option key={lot.id} value={lot.id}>
                  {lot.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              País
            </label>
            <div
              style={{
                padding: '10px 12px',
                border: `1px solid #e6ddc9`,
                borderRadius: '8px',
                fontSize: '13px',
                background: '#f2ecdd',
                color: DESIGN_TOKENS.colors.texto1,
              }}
            >
              Brasil
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Região
            </label>
            <div
              style={{
                padding: '10px 12px',
                border: `1px solid #e6ddc9`,
                borderRadius: '8px',
                fontSize: '13px',
                background: '#f2ecdd',
                color: DESIGN_TOKENS.colors.texto1,
              }}
            >
              Minas Gerais
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Latitude
            </label>
            <div
              style={{
                padding: '10px 12px',
                border: `1px solid #e6ddc9`,
                borderRadius: '8px',
                fontSize: '13px',
                background: '#f2ecdd',
                color: DESIGN_TOKENS.colors.texto1,
              }}
            >
              -20.33°
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Longitude
            </label>
            <div
              style={{
                padding: '10px 12px',
                border: `1px solid #e6ddc9`,
                borderRadius: '8px',
                fontSize: '13px',
                background: '#f2ecdd',
                color: DESIGN_TOKENS.colors.texto1,
              }}
            >
              -45.93°
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Prova (IPFS)
            </label>
            <a
              href="#"
              style={{
                display: 'block',
                padding: '10px 12px',
                border: `1px solid #e6ddc9`,
                borderRadius: '8px',
                fontSize: '13px',
                background: '#fff',
                color: DESIGN_TOKENS.colors.verde600,
                textDecoration: 'none',
                fontWeight: 500,
              }}
            >
              ipfs://Qm...
            </a>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleSubmit}
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
            Submeter
          </button>
          <button
            onClick={() => setShowToast(true)}
            style={{
              padding: '10px 24px',
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
            Mock Toast
          </button>
        </div>
      </div>

      {/* Verificações em andamento */}
      <div style={{ marginBottom: '32px' }}>
        <h2
          style={{
            margin: '0 0 16px 0',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: DESIGN_TOKENS.typography.titleFont,
            color: DESIGN_TOKENS.colors.texto1,
          }}
        >
          Verificações em Progresso
        </h2>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontSize: '12px', fontWeight: 600, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', marginRight: '12px' }}>
            Filtro: Status
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
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: DESIGN_TOKENS.colors.texto3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredVerifications.map((item, idx) => (
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
                        backgroundColor: item.status === 'Aprovado' ? '#e8f2ea' : item.status === 'Rejeitado' ? '#f5e8e8' : '#fef7e8',
                        color: item.status === 'Aprovado' ? DESIGN_TOKENS.colors.verde600 : item.status === 'Rejeitado' ? '#a83226' : '#b26a06',
                      }}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {item.status === 'Em Verificação' && (
                      <>
                        <button
                          style={{
                            padding: '4px 8px',
                            marginRight: '8px',
                            background: '#e8f2ea',
                            color: DESIGN_TOKENS.colors.verde600,
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#d0e8d8'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#e8f2ea'}
                        >
                          Aprovar
                        </button>
                        <button
                          style={{
                            padding: '4px 8px',
                            background: '#f5e8e8',
                            color: '#a83226',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#edcfcc'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#f5e8e8'}
                        >
                          Rejeitar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: DESIGN_TOKENS.colors.verde600,
            color: '#fff',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 26px 64px -26px rgba(13,51,34,.45)',
            fontSize: '13px',
            fontWeight: 600,
            animation: 'slideIn 0.3s ease-out',
            zIndex: 2000,
          }}
        >
          ✓ Verificação enviada com sucesso
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateY(100px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
