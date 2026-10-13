import { MetricCard } from '@/components/ui/MetricCard';
import { Badge } from '@/components/ui/Badge';
import dynamic from 'next/dynamic';

const FarmGlobe = dynamic(
  () => import('@/components/three/FarmGlobe').then(m => m.FarmGlobe),
  { ssr: false, loading: () => <div style={{height: '400px', background: '#0b1d12', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3f7f2'}}>Carregando globo 3D...</div> }
);

const recentCerts = [
  { id: '0x1a2b...', type: 'coffee' as const, batch: 'COFFEE-2024-001', origin: 'Minas Gerais', score: 96 },
  { id: '0x3c4d...', type: 'cacao' as const, batch: 'CACAO-2024-015', origin: 'Bahia',        score: 88 },
  { id: '0x5e6f...', type: 'coffee' as const, batch: 'COFFEE-2024-002', origin: 'São Paulo',   score: 91 },
  { id: '0x7g8h...', type: 'cacao' as const, batch: 'CACAO-2024-016', origin: 'Pará',          score: 84 },
];

export default function DashboardPage() {
  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      {/* Hero Section */}
      <div style={{marginBottom: '48px', textAlign: 'center'}}>
        <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginBottom: '24px'}}>
          <span style={{fontSize: '64px'}}>🌾</span>
        </div>
        <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '42px', color: '#1e2a22', fontWeight: '700'}}>
          AgroChain
        </h1>
        <p style={{margin: '0 0 24px', color: '#495649', fontSize: '18px', fontWeight: '500'}}>
          Rastreabilidade de Coffee &amp; Cacao na Blockchain com Certificação ZK
        </p>
        
        {/* Feature badges */}
        <div style={{display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px', flexWrap: 'wrap'}}>
          <span style={{background: '#f0faf4', color: '#1f6440', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '600'}}>
            ☕ Coffee Arabica &amp; Robusta
          </span>
          <span style={{background: '#f9f7f2', color: '#6b4426', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '600'}}>
            🍫 Cacao Premium
          </span>
          <span style={{background: '#e8f2ea', color: '#195236', padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: '600'}}>
            🔐 Zero-Knowledge Proofs
          </span>
        </div>

        {/* CTA Buttons */}
        <div style={{display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap'}}>
          <a href="/erp" style={{display: 'inline-block', background: '#1f6440', color: '#fff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer'}}>
            📊 Ver Dashboard
          </a>
          <a href="/dex" style={{display: 'inline-block', background: '#b8912a', color: '#fff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer'}}>
            💱 Explorar DEX
          </a>
          <a href="/certificacao" style={{display: 'inline-block', background: '#2f8f52', color: '#fff', padding: '14px 32px', borderRadius: '8px', textDecoration: 'none', fontWeight: '700', fontSize: '15px', cursor: 'pointer'}}>
            🏆 Certificação ZK
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div style={{marginBottom: '48px'}}>
        <h2 style={{margin: '0 0 24px', textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
          Recursos Principais
        </h2>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px'}}>
          {[
            { icon: '🔍', title: 'Rastreabilidade', desc: 'Rastreie cada lote na blockchain' },
            { icon: '🏆', title: 'Certificação ZK', desc: 'Provas criptográficas verificáveis' },
            { icon: '💱', title: 'DEX Integrado', desc: 'Troque Coffee por Cacao facilmente' },
            { icon: '📊', title: 'ERP Completo', desc: 'Gestão financeira integrada' },
            { icon: '📡', title: 'IoT Monitoramento', desc: 'Sensores em tempo real' },
            { icon: '🤖', title: 'IA Assistente', desc: 'Consultoria agrícola com IA' },
          ].map((feat, i) => (
            <div key={i} style={{background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #ddd8cc', textAlign: 'center'}}>
              <div style={{fontSize: '40px', marginBottom: '12px'}}>{feat.icon}</div>
              <h3 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '16px', color: '#1e2a22'}}>{feat.title}</h3>
              <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <hr style={{border: 'none', borderTop: '1px solid #ddd8cc', margin: '48px 0'}} />

      {/* Dashboard Content Below */}
      <div style={{marginBottom: '24px'}}>
        <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
          📊 Dashboard em Tempo Real
        </h1>
        <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>
          Visão geral da cadeia Coffee &amp; Cacao — AgroChain
        </p>
      </div>

      {/* Métricas */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px'}}>
        <MetricCard title="Lotes Coffee Cert." value="1.284" subtitle="+12 esta semana" icon="☕" color="#4a2f1c" />
        <MetricCard title="Lotes Cacao Cert." value="873" subtitle="+7 esta semana" icon="🍫" color="#b8912a" />
        <MetricCard title="Volume DEX 24h" value="$48.2K" subtitle="Coffee ↔ Cacao" icon="🔄" color="#1f6440" />
        <MetricCard title="Compliance Score" value="94/100" subtitle="Média global" icon="🏆" color="#2f8f52" />
      </div>

      {/* Globo 3D */}
      <div style={{marginBottom: '24px'}}>
        <h2 style={{margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>
          🌍 Mapa de Fazendas Certificadas
        </h2>
        <FarmGlobe />
      </div>

      {/* Últimas Certificações */}
      <div>
        <h2 style={{margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>
          📜 Últimas Certificações
        </h2>
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', overflow: 'hidden'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
            <thead>
              <tr style={{background: '#f5f1e7'}}>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>TX Hash</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Tipo</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Batch ID</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Origem</th>
                <th style={{padding: '12px 16px', textAlign: 'left', color: '#495649', fontWeight: '600'}}>Score</th>
              </tr>
            </thead>
            <tbody>
              {recentCerts.map((cert, i) => (
                <tr key={cert.id} style={{borderTop: i > 0 ? '1px solid #eee8da' : 'none'}}>
                  <td style={{padding: '12px 16px', fontFamily: 'monospace', color: '#1f6440'}}>{cert.id}</td>
                  <td style={{padding: '12px 16px'}}><Badge variant={cert.type} /></td>
                  <td style={{padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px'}}>{cert.batch}</td>
                  <td style={{padding: '12px 16px', color: '#495649'}}>{cert.origin}</td>
                  <td style={{padding: '12px 16px'}}>
                    <span style={{fontWeight: '700', color: cert.score >= 90 ? '#1f6440' : '#b8912a'}}>{cert.score}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
