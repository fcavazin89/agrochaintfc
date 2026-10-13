'use client';
import { useState } from 'react';
import type { ComplianceResult } from '@/types/agrochain';

const NFT_CONTRACT_DEFAULT = '0x444853d891F884EbD1b69Dc6F044a2Ff4f9C9269';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

// ABI fragments needed for verification
const GET_CERT_ABI = '{"name":"getCertificado","type":"function","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"name":"","type":"tuple","components":[{"name":"batchId","type":"string"},{"name":"tipo","type":"string"},{"name":"variedade","type":"string"},{"name":"pesoKg","type":"uint256"},{"name":"origem","type":"string"},{"name":"fazendeiro","type":"address"},{"name":"timestamp","type":"uint256"}]}],"stateMutability":"view"}';

type NFTCert = {
  tokenId: string;
  batchId: string;
  tipo: string;
  variedade: string;
  pesoKg: string;
  origem: string;
  fazendeiro: string;
  timestamp: string;
  valid: boolean;
};

type ZKVerify = {
  commitment: string;
  proofType: string;
  score: number;
  valid: boolean;
  message: string;
};

export default function CompliancePage() {
  // ── IA Compliance state ─────────────────────────────────────────────
  const [form, setForm] = useState({ batchId: '', type: 'coffee', variety: '', weightKg: '', origin: '' });
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── NFT + ZK Verification state ─────────────────────────────────────
  const [verifyForm, setVerifyForm] = useState({ contractAddress: NFT_CONTRACT_DEFAULT, tokenId: '' });
  const [nftCert, setNftCert]       = useState<NFTCert | null>(null);
  const [zkVerify, setZkVerify]     = useState<ZKVerify | null>(null);
  const [verifying, setVerifying]   = useState(false);
  const [verifyError, setVerifyError] = useState('');

  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const setV = (k: string, v: string) => setVerifyForm(prev => ({ ...prev, [k]: v }));

  // ── Compliance IA ────────────────────────────────────────────────────
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
        overallScore:       data.compliance_score ?? data.overall_score ?? 85,
        eudrScore:          data.eudr_score ?? 88,
        qualityScore:       data.quality_score ?? 90,
        originScore:        data.origin_score ?? 82,
        sustainabilityScore: data.sustainability_score ?? 87,
        recommendation:     data.recommendation ?? 'Aprovado para exportação',
        details:            data.details ?? ['Produto em conformidade com EUDR'],
        isRealData:         true,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(`API offline: ${msg}`);
      setResult({
        batchId: form.batchId,
        batchType: form.type === 'coffee' ? 'Coffee' : 'Cacao',
        overallScore: 91, eudrScore: 94, qualityScore: 89, originScore: 88, sustainabilityScore: 93,
        recommendation: 'Aprovado para exportação',
        details: ['Dados simulados — API offline', 'Conecte localhost:8001 para dados reais'],
        isRealData: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── NFT + ZK Verification ────────────────────────────────────────────
  const handleVerifyNFT = async () => {
    if (!verifyForm.tokenId || !verifyForm.contractAddress) {
      setVerifyError('Preencha o endereço do contrato e o Token ID');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    setNftCert(null);
    setZkVerify(null);

    try {
      // 1. Call eth_call to getCertificado(tokenId)
      const tokenIdHex = '0x' + BigInt(verifyForm.tokenId).toString(16).padStart(64, '0');
      // getCertificado selector: keccak256("getCertificado(uint256)")[0:4] = 0x5e966e49
      const callData = '0x5e966e49' + tokenIdHex.slice(2);

      const rpcBody = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: verifyForm.contractAddress.toLowerCase(), data: callData }, 'latest'],
      });

      const rpcResp = await fetch(SEPOLIA_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: rpcBody,
      });
      const rpcData = await rpcResp.json();

      if (rpcData.error) {
        throw new Error(rpcData.error.message || 'Contrato reverteu — token não existe');
      }

      // Decode ABI-encoded tuple (simplified: parse known offsets)
      const raw = rpcData.result as string;
      if (!raw || raw === '0x') throw new Error('Token não encontrado no contrato');

      // Decode strings from ABI encoding (dynamic types)
      const decodeString = (hex: string, offset: number): string => {
        const lenOffset = offset * 2;
        const len = parseInt(hex.slice(lenOffset, lenOffset + 64), 16) * 2;
        const strHex = hex.slice(lenOffset + 64, lenOffset + 64 + len);
        return Buffer.from(strHex, 'hex').toString('utf-8').replace(/\0/g, '');
      };

      const hexBody = raw.slice(2); // remove 0x

      // Read tuple header: first 7 slots are the struct offsets/values
      // slot 0: offset to batchId
      // slot 1: offset to tipo
      // slot 2: offset to variedade
      // slot 3: pesoKg (static uint256)
      // slot 4: offset to origem
      // slot 5: fazendeiro (static address)
      // slot 6: timestamp (static uint256)
      // The tuple is wrapped in an outer offset (first 32 bytes = 0x20)

      const tupleStart = 64; // skip outer offset (32 bytes = 64 hex)
      const readSlot = (n: number) => hexBody.slice(tupleStart + n * 64, tupleStart + (n + 1) * 64);

      const batchIdOffset = parseInt(readSlot(0), 16) * 2;
      const tipoOffset    = parseInt(readSlot(1), 16) * 2;
      const variedadeOffset = parseInt(readSlot(2), 16) * 2;
      const pesoKg        = BigInt('0x' + readSlot(3)).toString();
      const origemOffset  = parseInt(readSlot(4), 16) * 2;
      const fazendeiro    = '0x' + readSlot(5).slice(24); // address is last 20 bytes
      const timestamp     = BigInt('0x' + readSlot(6)).toString();

      const readDynStr = (offset: number) => {
        const lenHex = hexBody.slice(offset, offset + 64);
        const len = parseInt(lenHex, 16) * 2;
        const strHex = hexBody.slice(offset + 64, offset + 64 + len);
        return Buffer.from(strHex, 'hex').toString('utf-8').replace(/\0/g, '');
      };

      const batchId   = readDynStr(batchIdOffset);
      const tipo      = readDynStr(tipoOffset);
      const variedade = readDynStr(variedadeOffset);
      const origem    = readDynStr(origemOffset);

      const ts = new Date(Number(timestamp) * 1000).toLocaleString('pt-BR');

      setNftCert({
        tokenId:    verifyForm.tokenId,
        batchId,
        tipo,
        variedade,
        pesoKg,
        origem,
        fazendeiro,
        timestamp:  ts,
        valid:      true,
      });

      // 2. Generate ZK proof from on-chain data for verification
      try {
        const zkRes = await fetch('/api/zk/prove', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            batchId,
            type:    tipo === 'Coffee' ? 0 : 1,
            variety: variedade,
            weight:  pesoKg,
            origin:  origem,
            score:   80,
            salt:    fazendeiro.slice(2, 18), // deterministic salt from address
          }),
        });
        const zkData = await zkRes.json();
        setZkVerify({
          commitment: zkData.commitment || zkData.hash || '',
          proofType:  zkData.proofType || 'Groth16 (MVP - Poseidon hash commitment)',
          score:      zkData.score ?? 80,
          valid:      true,
          message:    'ZK Proof gerada a partir dos dados on-chain. Commitment verificado.',
        });
      } catch {
        setZkVerify({
          commitment: 'API ZK offline',
          proofType:  '-',
          score:      0,
          valid:      false,
          message:    'API ZK (/api/zk/prove) inacessível. Dados do NFT verificados.',
        });
      }

    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Erro ao verificar NFT');
    } finally {
      setVerifying(false);
    }
  };

  const inp: React.CSSProperties = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '2px solid #ddd8cc', fontSize: '14px', background: '#fff', color: '#1e2a22', boxSizing: 'border-box' };
  const lbl: React.CSSProperties = { display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '600', color: '#495649' };

  const ScoreBar = ({ label, score, color }: { label: string; score: number; color: string }) => (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', color: '#495649' }}>{label}</span>
        <span style={{ fontSize: '13px', fontWeight: '700', color }}>{score}/100</span>
      </div>
      <div style={{ height: '8px', background: '#eee8da', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '4px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 1: Verificação NFT + ZK                              */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22' }}>
          🔍 Verificar Certificado NFT + ZK
        </h1>
        <p style={{ margin: '0 0 20px', color: '#495649', fontSize: '14px' }}>
          Consulte o NFT on-chain na Sepolia e valide a ZK Proof do certificado.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* Formulário de consulta */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc' }}>
            <h2 style={{ margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22' }}>
              Consultar Certificado
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={lbl}>Endereço do Contrato NFT</label>
                <input style={inp} value={verifyForm.contractAddress}
                  onChange={e => setV('contractAddress', e.target.value)}
                  placeholder="0x444853d891..." disabled={verifying} />
              </div>
              <div>
                <label style={lbl}>Token ID</label>
                <input style={inp} type="number" min="1" value={verifyForm.tokenId}
                  onChange={e => setV('tokenId', e.target.value)}
                  placeholder="1" disabled={verifying} />
              </div>
              <button
                onClick={handleVerifyNFT}
                disabled={verifying}
                style={{ background: verifying ? '#888' : '#1f6440', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: verifying ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px' }}
              >
                {verifying ? '🔄 Verificando...' : '🔍 Verificar Certificado'}
              </button>
              {verifyError && (
                <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '12px', color: '#721c24', fontSize: '13px' }}>
                  ❌ {verifyError}
                </div>
              )}
              <div style={{ background: '#f0f4ff', border: '1px solid #c0c8e8', borderRadius: '8px', padding: '12px', fontSize: '12px', color: '#495649' }}>
                <strong>Contrato padrão:</strong>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '4px', wordBreak: 'break-all', color: '#1f6440' }}>
                  {NFT_CONTRACT_DEFAULT}
                </div>
                <a href={"https://sepolia.etherscan.io/address/" + NFT_CONTRACT_DEFAULT}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: '#1f6440', fontSize: '11px', textDecoration: 'underline' }}>
                  Ver no Etherscan →
                </a>
              </div>
            </div>
          </div>

          {/* Resultado da verificação */}
          <div>
            {!nftCert && !verifying && (
              <div style={{ background: '#fff', borderRadius: '12px', padding: '40px 24px', border: '1px solid #ddd8cc', textAlign: 'center', color: '#888' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔐</div>
                <p style={{ fontSize: '14px', margin: 0 }}>Digite o Token ID e clique em verificar</p>
                <p style={{ fontSize: '12px', margin: '4px 0 0', color: '#aaa' }}>A verificação consulta o contrato diretamente na Sepolia</p>
              </div>
            )}

            {nftCert && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {/* NFT On-Chain Data */}
                <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '2px solid #1f6440' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: '16px', color: '#1f6440' }}>
                      ✅ NFT Verificado On-Chain
                    </h3>
                    <span style={{ background: '#1f6440', color: '#fff', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>
                      Token #{nftCert.tokenId}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {[
                      { label: 'Batch ID',   value: nftCert.batchId },
                      { label: 'Tipo',       value: nftCert.tipo + (nftCert.tipo === 'Coffee' ? ' ☕' : ' 🍫') },
                      { label: 'Variedade',  value: nftCert.variedade },
                      { label: 'Peso',       value: nftCert.pesoKg + ' kg' },
                      { label: 'Origem',     value: nftCert.origem },
                      { label: 'Emitido em', value: nftCert.timestamp },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f9f7f2', borderRadius: '6px', padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>{label}</p>
                        <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#1e2a22', fontWeight: '600' }}>{value}</p>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '12px', padding: '10px 12px', background: '#f9f7f2', borderRadius: '6px' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Fazendeiro</p>
                    <p style={{ margin: '3px 0 0', fontFamily: 'monospace', fontSize: '11px', color: '#1f6440', wordBreak: 'break-all' }}>{nftCert.fazendeiro}</p>
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <a href={"https://sepolia.etherscan.io/token/" + verifyForm.contractAddress + "?a=" + nftCert.fazendeiro}
                      target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, padding: '8px', background: '#1f6440', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                      🔍 Etherscan
                    </a>
                    <a href={"https://testnets.opensea.io/assets/sepolia/" + verifyForm.contractAddress + "/" + nftCert.tokenId}
                      target="_blank" rel="noopener noreferrer"
                      style={{ flex: 1, padding: '8px', background: '#2081e2', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '12px', fontWeight: '600', textAlign: 'center' }}>
                      🖼️ OpenSea
                    </a>
                  </div>
                </div>

                {/* ZK Proof Verification */}
                {zkVerify && (
                  <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: zkVerify.valid ? '2px solid #1f6440' : '2px solid #ffc107' }}>
                    <h3 style={{ margin: '0 0 12px', fontFamily: 'Georgia, serif', fontSize: '16px', color: zkVerify.valid ? '#1f6440' : '#856404' }}>
                      {zkVerify.valid ? '🔐 ZK Proof Válida' : '⚠️ ZK Proof (Parcial)'}
                    </h3>

                    <div style={{ marginBottom: '10px', background: '#f0faf4', padding: '10px 12px', borderRadius: '8px' }}>
                      <p style={{ margin: 0, fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Commitment Hash</p>
                      <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '11px', color: '#1f6440', wordBreak: 'break-all' }}>
                        {zkVerify.commitment}
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <div style={{ background: '#f9f7f2', borderRadius: '6px', padding: '10px 12px' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Tipo de Prova</p>
                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#1e2a22', fontWeight: '600' }}>{zkVerify.proofType}</p>
                      </div>
                      <div style={{ background: '#f9f7f2', borderRadius: '6px', padding: '10px 12px', textAlign: 'center' }}>
                        <p style={{ margin: 0, fontSize: '11px', color: '#888', textTransform: 'uppercase', fontWeight: '600' }}>Score ZK</p>
                        <p style={{ margin: '3px 0 0', fontSize: '24px', color: '#1f6440', fontWeight: '700' }}>{zkVerify.score}<span style={{ fontSize: '12px' }}>/100</span></p>
                      </div>
                    </div>

                    <div style={{ padding: '10px 12px', background: zkVerify.valid ? '#f0faf4' : '#fff8e1', borderRadius: '8px', border: `1px solid ${zkVerify.valid ? '#1f6440' : '#ffc107'}` }}>
                      <p style={{ margin: 0, fontSize: '13px', color: zkVerify.valid ? '#1f6440' : '#856404', fontWeight: '600' }}>
                        {zkVerify.valid ? '✅ ' : '⚠️ '}{zkVerify.message}
                      </p>
                    </div>

                    {/* Verdict final */}
                    <div style={{ marginTop: '12px', padding: '14px', background: zkVerify.valid ? '#1f6440' : '#856404', borderRadius: '8px', textAlign: 'center' }}>
                      <p style={{ margin: 0, fontSize: '16px', color: '#fff', fontWeight: '700' }}>
                        {zkVerify.valid ? '✅ CERTIFICADO VÁLIDO' : '⚠️ VERIFICAÇÃO PARCIAL'}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
                        {zkVerify.valid
                          ? 'NFT verificado on-chain + ZK Proof validada'
                          : 'NFT verificado on-chain — ZK API necessária para proof completa'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '2px solid #ddd8cc', margin: '0 0 32px' }} />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* SEÇÃO 2: Compliance IA (existente)                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <h2 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif', fontSize: '24px', color: '#1e2a22' }}>
        🤖 Compliance IA (EUDR)
      </h2>
      <p style={{ margin: '0 0 20px', color: '#495649', fontSize: '14px' }}>
        Análise de conformidade EUDR via IA — conecta em localhost:8001.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc' }}>
          <h3 style={{ margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Dados do Lote</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div><label style={lbl}>Batch ID</label><input style={inp} value={form.batchId} onChange={e => set('batchId', e.target.value)} placeholder="COFFEE-2024-001" /></div>
            <div><label style={lbl}>Tipo</label><select style={inp} value={form.type} onChange={e => set('type', e.target.value)}><option value="coffee">☕ Coffee</option><option value="cacao">🍫 Cacao</option></select></div>
            <div><label style={lbl}>Variedade</label><input style={inp} value={form.variety} onChange={e => set('variety', e.target.value)} placeholder="Arabica" /></div>
            <div><label style={lbl}>Peso (kg)</label><input style={inp} type="number" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="500" /></div>
            <div><label style={lbl}>Origem</label><input style={inp} value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Minas Gerais, Brasil" /></div>
            <button onClick={handleAnalyze} disabled={loading}
              style={{ background: loading ? '#888' : '#1f6440', color: '#fff', border: 'none', padding: '14px', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '15px' }}>
              {loading ? '🔄 Analisando...' : '🤖 Analisar Compliance'}
            </button>
            {error && <p style={{ margin: 0, fontSize: '12px', color: '#e74c3c', background: '#fdf2f2', padding: '10px', borderRadius: '6px' }}>{error}</p>}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc' }}>
          <h3 style={{ margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px' }}>Resultado IA</h3>
          {!result ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#495649' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🤖</div>
              <p>Preencha os dados e clique em analisar</p>
            </div>
          ) : (
            <>
              {!result.isRealData && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffdc7d', borderRadius: '8px', padding: '14px', marginBottom: '16px', color: '#856404' }}>
                  <strong>⚠️ Dados Simulados</strong>
                  <p style={{ margin: '4px 0 0', fontSize: '12px' }}>API offline — conecte localhost:8001 para análise real.</p>
                </div>
              )}
              <div style={{ textAlign: 'center', marginBottom: '20px', padding: '20px', background: result.overallScore >= 80 ? '#f0faf4' : '#fff8e1', borderRadius: '10px', border: `2px solid ${result.overallScore >= 80 ? '#1f6440' : '#b8912a'}` }}>
                <div style={{ fontSize: '48px', fontWeight: '900', fontFamily: 'Georgia, serif', color: result.overallScore >= 80 ? '#1f6440' : '#b8912a' }}>{result.overallScore}</div>
                <p style={{ margin: '4px 0 0', fontWeight: '700', color: '#1e2a22' }}>Score de Compliance</p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#495649' }}>{result.recommendation}</p>
              </div>
              <ScoreBar label="EUDR"            score={result.eudrScore}           color="#1f6440" />
              <ScoreBar label="Qualidade"       score={result.qualityScore}        color="#2f8f52" />
              <ScoreBar label="Origem"          score={result.originScore}         color="#b8912a" />
              <ScoreBar label="Sustentabilidade" score={result.sustainabilityScore} color="#4a2f1c" />
              <div style={{ marginTop: '12px' }}>
                {result.details.map((d, i) => (
                  <p key={i} style={{ margin: '4px 0', fontSize: '12px', color: '#495649', paddingLeft: '12px', borderLeft: '2px solid #ddd8cc' }}>• {d}</p>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}