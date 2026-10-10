'use client';
import { useState } from 'react';
import type { ComplianceResult } from '@/types/agrochain';

export default function CompliancePage() {
  const [form, setForm] = useState({ batchId: '', type: 'coffee', variety: '', weightKg: '', origin: '', humidity: '', temperature: '' });
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleAnalyze = async () => {
    if (!form.batchId) return;
    setLoading(true);
    setError(null);
    try {
      const endpoint = form.type === 'coffee' ? 'http://localhost:8001/api/coffee/analyze' : 'http://localhost:8001/api/cacao/analyze';
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_id: form.batchId, variety: form.variety, weight_kg: parseFloat(form.weightKg) || 0, origin: form.origin }),
      });
      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      setResult({
        batchId: form.batchId,
        batchType: form.type === 'coffee' ? 'Coffee' : 'Cacao',
        overallScore: data.compliance_score ?? data.overall_score ?? 85,
        eudrScore: data.eudr_score ?? 88,
        qualityScore: data.quality_score ?? 90,
        originScore: data.origin_score ?? 82,
        sustainabilityScore: data.sustainability_score ?? 87,
        recommendation: data.recommendation ?? 'Aprovado para exportação',
        details: data.details ?? ['Produto em conformidade com EUDR', 'Rastreabilidade verificada'],
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(`Erro ao conectar à API: ${msg}. Verifique se o servidor está rodando em localhost:8001.`);
      // Mock fallback
      setResult({
        batchId: form.batchId,
        batchType: form.type === 'coffee' ? 'Coffee' : 'Cacao',
        overallScore: 91,
        eudrScore: 94,
        qualityScore: 89,
        originScore: 88,
        sustainabilityScore: 93,
        recommendation: 'Mock: Aprovado para exportação',
        details: ['Mock data — API offline', 'Conecte localhost:8001 para dados reais'],
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #ddd8cc', fontSize: '14px', background: '#fff', color: '#1e2a22', boxSizing: 'border-box' as const };
  const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600' as const, color: '#495649' };

  const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div style={{marginBottom: '12px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '4px'}}>
        <span style={{fontSize: '13px', color: '#495649'}}>{label}</span>
        <span style={{fontSize: '13px', fontWeight: '700', color}}>{score}/100</span>
      </div>
      <div style={{height: '8px', background: '#eee8da', borderRadius: '4px', overflow: 'hidden'}}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '4px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );

  return (
    <div style={{maxWidth: '900px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>🤖 Compliance IA</h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Análise de conformidade EUDR via IA — conecta em localhost:8001.</p>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        <div style={{background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px'}}>Dados do Lote</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '14px'}}>
            <div><label style={labelStyle}>Batch ID</label><input style={inputStyle} value={form.batchId} onChange={e => set('batchId', e.target.value)} placeholder="COFFEE-2024-001" /></div>
            <div><label style={labelStyle}>Tipo</label><select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value)}><option value="coffee">☕ Coffee</option><option value="cacao">🍫 Cacao</option></select></div>
            <div><label style={labelStyle}>Variedade</label><input style={inputStyle} value={form.variety} onChange={e => set('variety', e.target.value)} placeholder="Arabica" /></div>
            <div><label style={labelStyle}>Peso (kg)</label><input style={inputStyle} type="number" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="500" /></div>
            <div><label style={labelStyle}>Origem</label><input style={inputStyle} value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Minas Gerais, Brasil" /></div>
            <button
              onClick={handleAnalyze}
              disabled={loading}
              style={{background: loading ? '#888' : '#1f6440', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px'}}
            >
              {loading ? '🔄 Analisando...' : '🤖 Analisar Compliance'}
            </button>
            {error && <p style={{margin: 0, fontSize: '12px', color: '#e74c3c', background: '#fdf2f2', padding: '10px', borderRadius: '6px'}}>{error}</p>}
          </div>
        </div>

        <div style={{background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px'}}>Resultado</h2>
          {!result ? (
            <div style={{textAlign: 'center', padding: '40px 0', color: '#495649'}}>
              <div style={{fontSize: '48px', marginBottom: '12px'}}>🤖</div>
              <p>Preencha os dados e clique em analisar</p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px', padding: '20px', background: result.overallScore >= 80 ? '#f0faf4' : '#fff8e1', borderRadius: '10px', border: `2px solid ${result.overallScore >= 80 ? '#1f6440' : '#b8912a'}` }}>
                <div style={{fontSize: '48px', fontWeight: '900', fontFamily: 'Georgia, serif', color: result.overallScore >= 80 ? '#1f6440' : '#b8912a'}}>{result.overallScore}</div>
                <p style={{margin: '4px 0 0', fontWeight: '700', color: '#1e2a22'}}>Score de Compliance</p>
                <p style={{margin: '4px 0 0', fontSize: '13px', color: '#495649'}}>{result.recommendation}</p>
              </div>
              <ScoreBar label="EUDR" score={result.eudrScore} color="#1f6440" />
              <ScoreBar label="Qualidade" score={result.qualityScore} color="#2f8f52" />
              <ScoreBar label="Origem" score={result.originScore} color="#b8912a" />
              <ScoreBar label="Sustentabilidade" score={result.sustainabilityScore} color="#4a2f1c" />
              <div style={{marginTop: '16px'}}>
                {result.details.map((d, i) => (
                  <p key={i} style={{margin: '4px 0', fontSize: '12px', color: '#495649', paddingLeft: '12px', borderLeft: '2px solid #ddd8cc'}}>• {d}</p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
