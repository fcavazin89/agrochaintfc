'use client';

import { use } from 'react';
import { MOCK_LOTS } from '@/lib/mockLotData';
import QRCodeDisplay from '@/components/QRCodeDisplay';

interface PassportPageProps {
  params: Promise<{ lotId: string }>;
}

export default function PassportPage({ params }: PassportPageProps) {
  const { lotId } = use(params);
  const lot = MOCK_LOTS.find((l) => l.loteId === lotId);

  if (!lot) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h1>Lote não encontrado</h1>
        <p>O lote {lotId} não foi encontrado no sistema.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--fundo-kraft)',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ borderBottom: '2px solid var(--verde-profundo)', paddingBottom: '24px', marginBottom: '32px' }}>
          <h1 style={{ color: 'var(--texto-principal)', fontSize: '32px', marginBottom: '8px' }}>
            Passaporte Digital da Safra
          </h1>
          <p style={{ color: 'var(--texto-secundario)', fontSize: '18px' }}>
            {lot.loteId} - {lot.produtor}
          </p>
        </div>

        {/* Grid principal */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', marginBottom: '40px' }}>
          {/* Dados do Lote */}
          <div>
            <h2 style={{ color: 'var(--verde-profundo)', marginBottom: '16px' }}>Dados do Lote</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong>Safra:</strong> {lot.safra}
              </div>
              <div>
                <strong>Origem:</strong> {lot.origem}
              </div>
              <div>
                <strong>Área:</strong> {lot.área} hectares
              </div>
              <div>
                <strong>Data Plantio:</strong>{' '}
                {new Date(lot.dataPlantio * 1000).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <strong>Data Colheita:</strong>{' '}
                {new Date(lot.dataColheita * 1000).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    backgroundColor:
                      lot.status === 'Ativo'
                        ? '#10b981'
                        : lot.status === 'Transferindo'
                        ? '#f59e0b'
                        : '#6b7280',
                    color: 'white',
                    fontSize: '14px',
                  }}
                >
                  {lot.status}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <QRCodeDisplay lotId={lot.loteId} size="medium" />
          </div>
        </div>

        {/* Certificações */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: 'var(--verde-profundo)', marginBottom: '16px' }}>Certificações</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {lot.certificações.map((cert, idx) => (
              <div
                key={idx}
                style={{
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: cert.status === 'Certificado' ? '#f0fdf4' : '#fef3c7',
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{cert.tipo}</div>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Status: <strong>{cert.status}</strong>
                </div>
                {cert.dataEmissão > 0 && (
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    Emissão: {new Date(cert.dataEmissão * 1000).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Timeline de Eventos */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{ color: 'var(--verde-profundo)', marginBottom: '16px' }}>Timeline de Eventos</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {lot.eventos.map((evento, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '16px',
                  padding: '16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ minWidth: '120px', color: '#6b7280' }}>
                  {new Date(evento.data * 1000).toLocaleDateString('pt-BR')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{evento.tipo}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{evento.descrição}</div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                    {evento.localização} • {evento.responsável}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px', textAlign: 'center', color: '#6b7280' }}>
          <p>Passaporte Digital Gerado pelo AgroChain</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>
            Rastreabilidade completa do café e cacau brasileiro
          </p>
        </div>
      </div>
    </div>
  );
}
