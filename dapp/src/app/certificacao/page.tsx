'use client';
import { useState } from 'react';

type CertStep = { label: string; status: 'DONE' | 'ACTIVE' | 'PENDING' | 'ERROR' };

const INITIAL_STEPS: CertStep[] = [
  { label: '1. Validar dados', status: 'PENDING' },
  { label: '2. Gerar ZK proof', status: 'PENDING' },
  { label: '3. Submeter on-chain', status: 'PENDING' },
  { label: '4. Confirmação', status: 'PENDING' },
];

export default function CertificacaoPage() {
  const [form, setForm] = useState({ batchId: '', type: 'Coffee', variety: 'Arabica', weightKg: '', origin: '' });
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async () => {
    if (!form.batchId || !form.weightKg || !form.origin) return;
    setIsProcessing(true);
    setIsDone(false);
    const newSteps = INITIAL_STEPS.map(s => ({ ...s }));
    setSteps(newSteps);
    for (let i = 0; i < newSteps.length; i++) {
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'ACTIVE' } : s));
      await new Promise(r => setTimeout(r, 1200));
      setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'DONE' } : s));
    }
    setIsProcessing(false);
    setIsDone(true);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #ddd8cc', fontSize: '14px',
    background: '#fff', color: '#1e2a22', boxSizing: 'border-box' as const,
  };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' as const, color: '#495649' };

  return (
    <div style={{maxWidth: '800px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>🏆 Certificação ZK</h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Gere um Zero-Knowledge Proof de certificação para um lote.</p>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        <div style={{background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>Dados do Lote</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
            <div><label style={labelStyle}>Batch ID (bytes32)</label><input style={inputStyle} value={form.batchId} onChange={e => set('batchId', e.target.value)} placeholder="COFFEE-2024-001" /></div>
            <div><label style={labelStyle}>Tipo</label><select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}><option>Coffee</option><option>Cacao</option></select></div>
            <div><label style={labelStyle}>Variedade</label>
              <select style={inputStyle} value={form.variety} onChange={e => set('variety', e.target.value)}>
                {form.type === 'Coffee'
                  ? <><option>Arabica</option><option>Robusta</option><option>Conilon</option></>
                  : <><option>Forastero</option><option>Criollo</option><option>Trinitario</option><option>Nacional</option></>}
              </select>
            </div>
            <div><label style={labelStyle}>Peso (kg)</label><input style={inputStyle} type="number" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="500" /></div>
            <div><label style={labelStyle}>Origem</label><input style={inputStyle} value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Minas Gerais, Brasil" /></div>
            <button
              onClick={handleSubmit}
              disabled={isProcessing}
              style={{background: isProcessing ? '#888' : '#1f6440', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: isProcessing ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px'}}
            >
              {isProcessing ? '⚙️ Processando...' : '🔐 Gerar Certificado ZK'}
            </button>
          </div>
        </div>

        <div style={{background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>Status do Processo</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {steps.map((step, i) => {
              const icon = step.status === 'DONE' ? '✅' : step.status === 'ACTIVE' ? '⚡' : step.status === 'ERROR' ? '❌' : '⏳';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: step.status === 'ACTIVE' ? '#f0faf4' : '#f9f7f2', border: `1px solid ${step.status === 'DONE' ? '#1f6440' : step.status === 'ACTIVE' ? '#2f8f52' : '#ddd8cc'}` }}>
                  <span style={{fontSize: '20px'}}>{icon}</span>
                  <span style={{fontSize: '14px', fontWeight: step.status !== 'PENDING' ? '600' : '400', color: '#1e2a22'}}>{step.label}</span>
                </div>
              );
            })}
          </div>
          {isDone && (
            <div style={{marginTop: '20px', padding: '16px', background: '#f0faf4', borderRadius: '8px', border: '1px solid #1f6440', textAlign: 'center'}}>
              <div style={{fontSize: '32px'}}>🎉</div>
              <p style={{margin: '8px 0 0', fontWeight: '700', color: '#1f6440'}}>Certificado ZK Gerado!</p>
              <p style={{margin: '4px 0 0', fontSize: '12px', color: '#495649'}}>TX: 0x{Math.random().toString(16).slice(2, 18)}...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
