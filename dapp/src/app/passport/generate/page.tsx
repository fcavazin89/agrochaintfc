'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import QRCodeDisplay from '@/components/QRCodeDisplay';

interface LotOption {
  id: string;
  name: string;
  product: string;
}

const MOCK_LOTS: LotOption[] = [
  { id: 'LOT-2024-001', name: 'Café Arábica - Bloco A', product: 'Café Arábica' },
  { id: 'LOT-2024-002', name: 'Café Robusta - Área Central', product: 'Café Robusta' },
];

export default function GeneratePassportPage() {
  const { isConnected } = useAccount();
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    if (!selectedLotId) return;
    
    const url = `${window.location.origin}/passport/${selectedLotId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ 
          margin: '0 0 8px', 
          fontFamily: 'Georgia, serif', 
          fontSize: '28px', 
          color: '#1e2a22',
          fontWeight: 600,
        }}>
          Passaporte Digital
        </h1>
        <p style={{ margin: '0 0 24px', color: '#495649', fontSize: '14px' }}>
          Gere QR Codes para compartilhar os passaportes dos seus lotes
        </p>

        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '48px',
          border: '1px solid #e6ddc9',
          boxShadow: '0 2px 8px rgba(31,42,34,.08)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔐</div>
          <h2 style={{ 
            margin: '0 0 12px', 
            fontFamily: 'Georgia, serif', 
            fontSize: '24px', 
            color: '#1e2a22',
            fontWeight: 600,
          }}>
            Conecte Sua Carteira
          </h2>
          <p style={{ margin: '0', color: '#495649', fontSize: '16px', lineHeight: '1.6' }}>
            Para gerar passaportes digitais, você precisa conectar sua carteira Web3.<br />
            Clique no botão &quot;Connect Wallet&quot; no canto superior direito.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ 
        margin: '0 0 8px', 
        fontFamily: 'Georgia, serif', 
        fontSize: '28px', 
        color: '#1e2a22',
        fontWeight: 600,
      }}>
        Passaporte Digital
      </h1>
      <p style={{ margin: '0 0 24px', color: '#495649', fontSize: '14px' }}>
        Gere QR Codes para compartilhar os passaportes dos seus lotes
      </p>

      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        border: '1px solid #e6ddc9',
        boxShadow: '0 2px 8px rgba(31,42,34,.08)',
      }}>
        <h2 style={{ 
          margin: '0 0 20px', 
          fontFamily: 'Georgia, serif', 
          fontSize: '20px', 
          color: '#1e2a22',
          fontWeight: 600,
        }}>
          Selecione um Lote
        </h2>
        
        <div style={{ marginBottom: '24px' }}>
          <label style={{ 
            display: 'block',
            marginBottom: '8px',
            fontSize: '13px',
            color: '#495649',
            fontWeight: 600,
          }}>
            Seus Lotes
          </label>
          <select
            value={selectedLotId}
            onChange={(e) => setSelectedLotId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '2px solid #ddd8cc',
              fontSize: '14px',
              background: '#fff',
              color: '#1e2a22',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Selecione um lote --</option>
            {MOCK_LOTS.map(lot => (
              <option key={lot.id} value={lot.id}>
                {lot.id} - {lot.name}
              </option>
            ))}
          </select>
        </div>

        {selectedLotId && (
          <>
            <div style={{
              background: '#f3f7f2',
              borderRadius: '12px',
              padding: '32px',
              marginBottom: '24px',
              border: '1px solid #e6ddc9',
              textAlign: 'center',
            }}>
              <h3 style={{ 
                margin: '0 0 20px', 
                fontFamily: 'Georgia, serif', 
                fontSize: '18px', 
                color: '#1e2a22',
                fontWeight: 600,
              }}>
                QR Code do Passaporte
              </h3>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center',
                marginBottom: '20px',
              }}>
                <div style={{
                  padding: '20px',
                  background: '#fff',
                  borderRadius: '12px',
                  display: 'inline-block',
                }}>
                  <QRCodeDisplay lotId={selectedLotId} size="large" />
                </div>
              </div>
              <p style={{ margin: '0', fontSize: '13px', color: '#7c867a', lineHeight: '1.6' }}>
                Este QR Code pode ser impresso e anexado ao produto para<br />
                permitir que compradores acessem o passaporte digital
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
            }}>
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/passport/${selectedLotId}`}
                readOnly
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '2px solid #ddd8cc',
                  fontSize: '14px',
                  background: '#f3f7f2',
                  color: '#495649',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleCopyLink}
                style={{
                  background: copied ? '#1f6440' : 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
                  minWidth: '140px',
                }}
                onMouseEnter={(e) => {
                  if (!copied) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.06), 0 12px 28px -20px rgba(19,66,44,.35)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {copied ? '✓ Link Copiado!' : 'Copiar Link'}
              </button>
            </div>
          </>
        )}

        {!selectedLotId && (
          <div style={{
            textAlign: 'center',
            padding: '48px',
            color: '#495649',
            background: '#f3f7f2',
            borderRadius: '12px',
            border: '1px solid #e6ddc9',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
            <p style={{ fontSize: '16px', margin: 0 }}>
              Selecione um lote para gerar o QR Code do passaporte
            </p>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div style={{
        background: '#e8f2ea',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #d1e4d8',
      }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <div style={{ fontSize: '24px' }}>💡</div>
          <div>
            <h3 style={{ 
              margin: '0 0 8px', 
              fontSize: '15px', 
              color: '#1e2a22',
              fontWeight: 600,
            }}>
              Como Usar o Passaporte Digital
            </h3>
            <p style={{ margin: '0', fontSize: '13px', color: '#495649', lineHeight: '1.6' }}>
              O passaporte digital permite que compradores e consumidores finais acessem 
              informações completas sobre a origem, certificações e jornada do produto. 
              Basta escanear o QR Code com qualquer smartphone para visualizar todos os dados 
              de rastreabilidade de forma transparente e pública.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
