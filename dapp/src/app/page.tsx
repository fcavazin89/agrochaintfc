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
      <div style={{marginBottom: '24px'}}>
        <h1 style={{margin: 0, fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
          Dashboard
        </h1>
        <p style={{margin: '4px 0 0', color: '#495649', fontSize: '14px'}}>
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
