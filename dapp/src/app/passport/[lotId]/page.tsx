'use client';

import { use } from 'react';
import QRCodeDisplay from '@/components/QRCodeDisplay';

interface LotEvent {
  date: string;
  type: string;
  description: string;
  actor: string;
}

interface Certification {
  name: string;
  issuer: string;
  status: 'valid' | 'pending' | 'expired';
}

interface LotData {
  id: string;
  product: string;
  producer: string;
  farm: string;
  weight: string;
  harvestDate: string;
  status: 'certified' | 'in_transit' | 'delivered';
  events: LotEvent[];
  certifications: Certification[];
}

const MOCK_LOTS: Record<string, LotData> = {
  'LOT-2024-001': {
    id: 'LOT-2024-001',
    product: 'Café Arábica',
    producer: 'Fazenda Serra Verde',
    farm: 'Bloco A',
    weight: '500 kg',
    harvestDate: '2024-03-15',
    status: 'certified',
    events: [
      { date: '2024-03-15', type: 'Colheita', description: 'Colheita realizada manualmente', actor: 'Produtor' },
      { date: '2024-03-20', type: 'Processamento', description: 'Secagem natural por 12 dias', actor: 'Produtor' },
      { date: '2024-04-01', type: 'Inspeção', description: 'Aprovado pela certificadora', actor: 'Certificadora' },
      { date: '2024-04-05', type: 'Exportação', description: 'Enviado para Rotterdam', actor: 'Logística' },
    ],
    certifications: [
      { name: 'Rainforest Alliance', issuer: 'RA-CERT', status: 'valid' },
      { name: 'Organic', issuer: 'IBD', status: 'valid' },
    ],
  },
  'LOT-2024-002': {
    id: 'LOT-2024-002',
    product: 'Café Robusta',
    producer: 'Sítio Boa Vista',
    farm: 'Área Central',
    weight: '300 kg',
    harvestDate: '2024-03-22',
    status: 'in_transit',
    events: [
      { date: '2024-03-22', type: 'Colheita', description: 'Colheita mecanizada', actor: 'Produtor' },
      { date: '2024-03-28', type: 'Beneficiamento', description: 'Descascamento e classificação', actor: 'Cooperativa' },
    ],
    certifications: [
      { name: 'Fair Trade', issuer: 'FLO', status: 'pending' },
    ],
  },
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'certified': return '#1f6440';
    case 'in_transit': return '#b8912a';
    case 'delivered': return '#495649';
    default: return '#495649';
  }
};

const getStatusBgColor = (status: string) => {
  switch (status) {
    case 'certified': return '#e8f2ea';
    case 'in_transit': return '#fef9f0';
    case 'delivered': return '#f2ecdd';
    default: return '#f2ecdd';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'certified': return 'Certificado';
    case 'in_transit': return 'Em Trânsito';
    case 'delivered': return 'Entregue';
    default: return status;
  }
};

const getCertStatusColor = (status: string) => {
  switch (status) {
    case 'valid': return '#1f6440';
    case 'pending': return '#b8912a';
    case 'expired': return '#a83226';
    default: return '#495649';
  }
};

const getCertStatusBgColor = (status: string) => {
  switch (status) {
    case 'valid': return '#e8f2ea';
    case 'pending': return '#fef9f0';
    case 'expired': return '#ffe8e3';
    default: return '#f2ecdd';
  }
};

const getCertStatusLabel = (status: string) => {
  switch (status) {
    case 'valid': return 'Válido';
    case 'pending': return 'Pendente';
    case 'expired': return 'Expirado';
    default: return status;
  }
};

interface PageProps {
  params: Promise<{ lotId: string }>;
}

export default function PassportPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const lotId = resolvedParams.lotId;
  const lot = MOCK_LOTS[lotId];

  if (!lot) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(180deg, #f3f7f2 0%, #e8ede7 100%)', 
        padding: '40px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '600px',
          background: '#fff',
          borderRadius: '16px',
          padding: '48px',
          border: '1px solid #e6ddc9',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>🔍</div>
          <h1 style={{ 
            margin: '0 0 12px', 
            fontFamily: 'Georgia, serif', 
            fontSize: '28px', 
            color: '#1e2a22',
            fontWeight: 600,
          }}>
            Lote Não Encontrado
          </h1>
          <p style={{ margin: '0', color: '#495649', fontSize: '16px', lineHeight: '1.6' }}>
            O lote <strong>{lotId}</strong> não foi encontrado no sistema.<br />
            Verifique se o código está correto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(180deg, #f3f7f2 0%, #e8ede7 100%)', 
      padding: '40px 20px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          border: '1px solid #e6ddc9',
          boxShadow: '0 2px 8px rgba(31,42,34,.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <h1 style={{ 
                margin: '0 0 8px', 
                fontFamily: 'Georgia, serif', 
                fontSize: '32px', 
                color: '#1e2a22',
                fontWeight: 600,
              }}>
                {lot.product}
              </h1>
              <p style={{ margin: '0', color: '#495649', fontSize: '16px' }}>
                Lote: <strong>{lot.id}</strong>
              </p>
            </div>
            <div style={{
              display: 'inline-block',
              background: getStatusBgColor(lot.status),
              color: getStatusColor(lot.status),
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
            }}>
              {getStatusLabel(lot.status)}
            </div>
          </div>
        </div>

        {/* Informações Básicas */}
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
            Informações do Lote
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px',
          }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Produtor
              </p>
              <p style={{ margin: '0', fontSize: '15px', color: '#1e2a22', fontWeight: 500 }}>
                {lot.producer}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Fazenda
              </p>
              <p style={{ margin: '0', fontSize: '15px', color: '#1e2a22', fontWeight: 500 }}>
                {lot.farm}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Peso
              </p>
              <p style={{ margin: '0', fontSize: '15px', color: '#1e2a22', fontWeight: 500 }}>
                {lot.weight}
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                Data de Colheita
              </p>
              <p style={{ margin: '0', fontSize: '15px', color: '#1e2a22', fontWeight: 500 }}>
                {new Date(lot.harvestDate).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline de Eventos */}
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
            Timeline de Eventos
          </h2>
          <div style={{ position: 'relative' }}>
            {lot.events.map((event, idx) => (
              <div key={idx} style={{ 
                position: 'relative', 
                paddingLeft: '40px', 
                paddingBottom: idx < lot.events.length - 1 ? '24px' : '0',
              }}>
                {/* Timeline line */}
                {idx < lot.events.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    left: '11px',
                    top: '24px',
                    bottom: '0',
                    width: '2px',
                    background: '#e6ddc9',
                  }} />
                )}
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute',
                  left: '0',
                  top: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#1f6440',
                  border: '3px solid #e8f2ea',
                }} />
                <div>
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '4px', alignItems: 'center' }}>
                    <p style={{ margin: '0', fontSize: '16px', fontWeight: 600, color: '#1e2a22' }}>
                      {event.type}
                    </p>
                    <p style={{ margin: '0', fontSize: '13px', color: '#7c867a' }}>
                      {new Date(event.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: '14px', color: '#495649' }}>
                    {event.description}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#7c867a' }}>
                    Por: {event.actor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificações */}
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
            Certificações e Verificações
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {lot.certifications.map((cert, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                background: '#f3f7f2',
                borderRadius: '10px',
                border: '1px solid #e6ddc9',
              }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600, color: '#1e2a22' }}>
                    {cert.name}
                  </p>
                  <p style={{ margin: '0', fontSize: '13px', color: '#7c867a' }}>
                    Emissor: {cert.issuer}
                  </p>
                </div>
                <div style={{
                  display: 'inline-block',
                  background: getCertStatusBgColor(cert.status),
                  color: getCertStatusColor(cert.status),
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                }}>
                  {getCertStatusLabel(cert.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '32px',
          border: '1px solid #e6ddc9',
          boxShadow: '0 2px 8px rgba(31,42,34,.08)',
          textAlign: 'center',
        }}>
          <h2 style={{ 
            margin: '0 0 20px', 
            fontFamily: 'Georgia, serif', 
            fontSize: '20px', 
            color: '#1e2a22',
            fontWeight: 600,
          }}>
            Compartilhe Este Passaporte
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <QRCodeDisplay lotId={lot.id} size="medium" />
          </div>
          <p style={{ margin: '0', fontSize: '13px', color: '#7c867a' }}>
            Escaneie este QR Code para acessar o passaporte digital deste lote
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <p style={{ margin: '0', fontSize: '12px', color: '#7c867a' }}>
            <strong>Dados verificados na blockchain</strong> · AgroChain Passport v1.0
          </p>
        </div>
      </div>
    </div>
  );
}
