'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { TraceNode } from '@/types/agrochain';

// const TraceChain = dynamic(
//   () => import('@/components/three/TraceChain').then(m => m.TraceChain),
//   { ssr: false, loading: () => <div style={{height: '280px', background: '#0b1d12', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3f7f2'}}>Carregando visualização 3D...</div> }
// );

const MOCK_NODES: TraceNode[] = [
  { id: '1', label: 'Originação', stage: 'ORIGINATION', status: 'DONE', timestamp: 1724000000 },
  { id: '2', label: 'Blockchain', stage: 'BLOCKCHAIN', status: 'DONE', timestamp: 1724003600 },
  { id: '3', label: 'Compliance', stage: 'COMPLIANCE', status: 'ACTIVE', timestamp: 1724007200 },
  { id: '4', label: 'Validação', stage: 'VALIDATION', status: 'PENDING' },
];

export default function RastreioPage() {
  const [batchId, setBatchId] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = () => { if (batchId.trim()) setSearched(true); };

  return (
    <div style={{maxWidth: '900px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>🔍 Rastreabilidade</h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Rastreie a jornada de um lote na blockchain.</p>

      <div style={{display: 'flex', gap: '12px', marginBottom: '32px'}}>
        <input
          type="text"
          value={batchId}
          onChange={e => setBatchId(e.target.value)}
          placeholder="Ex: COFFEE-2024-001 ou 0xabc..."
          style={{flex: 1, padding: '12px 16px', borderRadius: '8px',
            border: '2px solid #ddd8cc', fontSize: '14px',
            background: '#fff', color: '#1e2a22', outline: 'none',}}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button
          onClick={handleSearch}
          style={{background: '#1f6440', color: '#fff', border: 'none',
            padding: '12px 24px', borderRadius: '8px',
            cursor: 'pointer', fontWeight: '600', fontSize: '14px',}}
        >
          Rastrear
        </button>
      </div>

      {searched && (
        <>
          <div style={{background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #ddd8cc', marginBottom: '20px'}}>
            <h3 style={{margin: '0 0 4px', fontFamily: 'Georgia, serif', color: '#1f6440'}}>Batch: {batchId}</h3>
            <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>Cadeia de custódia blockchain · Coffee · Origem: Minas Gerais · 500kg</p>
          </div>
          <h2 style={{margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>Jornada 3D</h2>
          {/* <TraceChain nodes={MOCK_NODES} /> */}
          <div>TraceChain placeholder</div>
          <div style={{marginTop: '24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px'}}>
            {MOCK_NODES.map(node => (
              <div key={node.id} style={{ background: '#fff', borderRadius: '10px', padding: '16px', border: `2px solid ${node.status === 'DONE' ? '#1f6440' : node.status === 'ACTIVE' ? '#b8912a' : '#ddd8cc'}` }}>
                <div style={{fontSize: '20px', marginBottom: '8px'}}>{node.status === 'DONE' ? '✅' : node.status === 'ACTIVE' ? '⚡' : '⏳'}</div>
                <p style={{margin: 0, fontWeight: '700', fontSize: '13px', color: '#1e2a22'}}>{node.label}</p>
                <p style={{margin: '4px 0 0', fontSize: '11px', color: '#888'}}>{node.status}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {!searched && (
        <div style={{textAlign: 'center', padding: '60px', color: '#495649', background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc'}}>
          <div style={{fontSize: '48px', marginBottom: '16px'}}>🔍</div>
          <p style={{fontSize: '16px'}}>Digite um Batch ID para rastrear a jornada na blockchain</p>
        </div>
      )}
    </div>
  );
}
