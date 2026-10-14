'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { MOCK_LOTS } from '@/lib/mockLotData';
import QRCodeDisplay from '@/components/QRCodeDisplay';

export default function GeneratePassportPage() {
  const { isConnected } = useAccount();
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!isConnected) {
    return (
      <div style={{ padding: '40px' }}>
        <h1 style={{ color: 'var(--texto-principal)', marginBottom: '16px' }}>
          Gerar Passaporte Digital
        </h1>
        <p style={{ color: 'var(--texto-secundario)' }}>
          Conecte sua carteira para gerar passaportes dos seus lotes.
        </p>
      </div>
    );
  }

  const handleCopyLink = () => {
    const link = `${origin || window.location.origin}/passport/${selectedLotId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div style={{ padding: '40px' }}>
      <h1 style={{ color: 'var(--texto-principal)', marginBottom: '8px' }}>
        Gerar Passaporte Digital
      </h1>
      <p style={{ color: 'var(--texto-secundario)', marginBottom: '32px' }}>
        Selecione um lote para gerar o QR Code e link público do Passaporte Digital.
      </p>

      {/* Seletor de Lote */}
      <div style={{ marginBottom: '32px' }}>
        <label
          htmlFor="lot-select"
          style={{
            display: 'block',
            marginBottom: '8px',
            fontWeight: 'bold',
            color: 'var(--texto-principal)',
          }}
        >
          Selecione o Lote:
        </label>
        <select
          id="lot-select"
          value={selectedLotId}
          onChange={(e) => setSelectedLotId(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '500px',
            padding: '12px',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '16px',
          }}
        >
          <option value="">Selecione um lote...</option>
          {MOCK_LOTS.map((lot) => (
            <option key={lot.loteId} value={lot.loteId}>
              {lot.loteId} - {lot.produtor} ({lot.safra})
            </option>
          ))}
        </select>
      </div>

      {/* QR Code e Ações */}
      {selectedLotId && (
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
          }}
        >
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <QRCodeDisplay lotId={selectedLotId} size="large" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                padding: '12px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#6b7280',
                wordBreak: 'break-all',
              }}
            >
              {origin}/passport/{selectedLotId}
            </div>

            <button
              onClick={handleCopyLink}
              style={{
                padding: '12px 24px',
                backgroundColor: copiedLink ? '#10b981' : 'var(--verde-profundo)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {copiedLink ? '✓ Link Copiado!' : 'Copiar Link'}
            </button>

            <a
              href={`/passport/${selectedLotId}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '12px 24px',
                backgroundColor: 'white',
                color: 'var(--verde-profundo)',
                border: '2px solid var(--verde-profundo)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 'bold',
                textAlign: 'center',
                textDecoration: 'none',
              }}
            >
              Ver Passaporte
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
