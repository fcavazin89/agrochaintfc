'use client';
import { useState } from 'react';

export default function ZKStandalonePage() {
  const [formData, setFormData] = useState({
    score: 85,
    salt: '',
    batchId: 'COFFEE-2024-001',
  });
  const [proofResult, setProofResult] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateProof = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/zk/prove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: formData.batchId,
          type: 0,
          variety: 'Arabica',
          weight: '500',
          origin: 'Minas Gerais',
          score: formData.score,
          salt: formData.salt || Math.random().toString(36).slice(2),
        }),
      });
      const data = await res.json();
      setProofResult(data);
    } catch (err) {
      console.error(err);
    }
    setIsGenerating(false);
  };

  return (
    <div style={{maxWidth: '900px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        🔐 Certificador ZK Standalone
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>
        Gere Zero-Knowledge Proofs sem exigência de carteira para teste e demonstração.
      </p>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
        {/* Form */}
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '24px'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>
            Gerar ZK Proof
          </h2>

          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '6px'}}>
              Batch ID
            </label>
            <input
              type="text"
              value={formData.batchId}
              onChange={e => setFormData({...formData, batchId: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ddd8cc',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="COFFEE-2024-001"
            />
          </div>

          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '6px'}}>
              Score de Qualidade (0-100)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={formData.score}
              onChange={e => setFormData({...formData, score: parseInt(e.target.value)})}
              style={{width: '100%', cursor: 'pointer'}}
            />
            <p style={{margin: '6px 0 0', fontSize: '13px', color: '#1f6440', fontWeight: '700'}}>
              {formData.score} pontos
            </p>
          </div>

          <div style={{marginBottom: '16px'}}>
            <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '6px'}}>
              Salt (deixe em branco para gerar aleatório)
            </label>
            <input
              type="text"
              value={formData.salt}
              onChange={e => setFormData({...formData, salt: e.target.value})}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #ddd8cc',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
              placeholder="ou deixe vazio"
            />
          </div>

          <button
            onClick={handleGenerateProof}
            disabled={isGenerating}
            style={{
              width: '100%',
              background: isGenerating ? '#888' : '#1f6440',
              color: '#fff',
              border: 'none',
              padding: '14px',
              borderRadius: '8px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontWeight: '700',
              fontSize: '15px',
            }}
          >
            {isGenerating ? '⚙️ Gerando...' : '🚀 Gerar ZK Proof'}
          </button>
        </div>

        {/* Result */}
        <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '24px'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>
            Resultado
          </h2>

          {proofResult ? (
            <div>
              <div style={{marginBottom: '16px', background: '#f0faf4', padding: '12px', borderRadius: '8px', border: '1px solid #1f6440'}}>
                <p style={{margin: 0, fontSize: '11px', color: '#495649', textTransform: 'uppercase', fontWeight: '600'}}>
                  Commitment Hash
                </p>
                <p style={{margin: '6px 0 0', fontFamily: 'monospace', fontSize: '12px', color: '#1f6440', wordBreak: 'break-all'}}>
                  {proofResult.commitment || proofResult.hash}
                </p>
              </div>

              <div style={{marginBottom: '16px'}}>
                <p style={{margin: 0, fontSize: '11px', color: '#495649', textTransform: 'uppercase', fontWeight: '600'}}>
                  Tipo de Prova
                </p>
                <p style={{margin: '6px 0 0', fontSize: '14px', color: '#1f6440', fontWeight: '700'}}>
                  {proofResult.proofType || '🚀 Groth16 (Real)'}
                </p>
              </div>

              {proofResult.proof && (
                <div style={{marginBottom: '16px', background: '#f9f7f2', padding: '12px', borderRadius: '8px', maxHeight: '120px', overflow: 'auto'}}>
                  <p style={{margin: 0, fontSize: '11px', color: '#495649', textTransform: 'uppercase', fontWeight: '600'}}>
                    Proof Data
                  </p>
                  <pre style={{margin: '6px 0 0', fontSize: '10px', color: '#495649', fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap'}}>
                    {typeof proofResult.proof === 'string' ? proofResult.proof : JSON.stringify(proofResult.proof, null, 2).slice(0, 300)}...
                  </pre>
                </div>
              )}

              <div style={{background: '#f0faf4', padding: '12px', borderRadius: '8px', border: '1px solid #1f6440'}}>
                <p style={{margin: 0, fontSize: '13px', color: '#1f6440', fontWeight: '600'}}>
                  ✅ Prova Gerada com Sucesso!
                </p>
                <p style={{margin: '4px 0 0', fontSize: '12px', color: '#495649'}}>
                  Você pode usar esse commitment em um certificador conectado ao blockchain.
                </p>
              </div>
            </div>
          ) : (
            <div style={{textAlign: 'center', padding: '40px 0', color: '#888'}}>
              <p style={{fontSize: '40px', margin: 0}}>🔍</p>
              <p style={{margin: '12px 0 0', fontSize: '14px'}}>Nenhuma prova gerada ainda</p>
              <p style={{margin: '4px 0 0', fontSize: '12px', color: '#888'}}>Clique em &quot;Gerar ZK Proof&quot; para começar</p>
            </div>
          )}
        </div>
      </div>

      <div style={{marginTop: '24px', background: '#fff8e1', border: '1px solid #b8912a', borderRadius: '12px', padding: '16px'}}>
        <h4 style={{margin: '0 0 8px', color: '#b8912a'}}>ℹ️ Modo Demo</h4>
        <p style={{margin: 0, fontSize: '13px', color: '#495649'}}>
          Este modo standalone não requer conexão de carteira. Use para testar a geração de provas antes de submeter à blockchain.
          A prova gerada aqui é válida apenas localmente.
        </p>
      </div>
    </div>
  );
}
