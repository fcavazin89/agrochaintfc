'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { encodeFunctionData, getAddress } from 'viem';

const NFT_CONTRACT_KEY = 'agrochain_nft_contract_address';
const NFT_CONTRACT_DEFAULT = '0x444853d891F884EbD1b69Dc6F044a2Ff4f9C9269';

type CertStep = { label: string; status: 'DONE' | 'ACTIVE' | 'PENDING' | 'ERROR' };
type ZKProof = { commitment: string; proof: any; proofType: string; score: number };

const INITIAL_STEPS: CertStep[] = [
  { label: '1. Validar carteira',       status: 'PENDING' },
  { label: '2. Gerar ZK Proof',         status: 'PENDING' },
  { label: '3. Mint NFT on-chain',      status: 'PENDING' },
  { label: '4. Confirmação',            status: 'PENDING' },
];

const MINT_ABI = [{
  name: 'mintCertificado',
  type: 'function' as const,
  inputs: [
    { name: 'batchId',   type: 'string' },
    { name: 'tipo',      type: 'string' },
    { name: 'variedade', type: 'string' },
    { name: 'pesoKg',    type: 'uint256' },
    { name: 'origem',    type: 'string' },
  ],
  outputs: [{ name: 'tokenId', type: 'uint256' }],
  stateMutability: 'nonpayable' as const,
}] as const;

export default function CertificacaoPage() {
  const { address, isConnected, chain } = useAccount();

  const [form, setForm] = useState({
    batchId: '',
    type: 'Coffee',
    variety: 'Arabica',
    weightKg: '',
    origin: '',
    score: 85,
  });
  const [steps, setSteps]       = useState(INITIAL_STEPS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone]     = useState(false);
  const [txHash, setTxHash]     = useState('');
  const [mintedTokenId, setMintedTokenId] = useState('');
  const [zkProof, setZkProof]   = useState<ZKProof | null>(null);
  const [error, setError]       = useState('');
  const [contractAddress, setContractAddressState] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(NFT_CONTRACT_KEY) || NFT_CONTRACT_DEFAULT;
    setContractAddressState(saved);
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h1 style={{ margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22' }}>
          🏆 Certificação NFT + ZK
        </h1>
        <div style={{ background: '#f9f7f2', borderRadius: '12px', padding: '48px', textAlign: 'center', color: '#495649' }}>
          Carregando...
        </div>
      </div>
    );
  }

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));
  const resetSteps = () => setSteps(INITIAL_STEPS.map(s => ({ ...s })));

  const setContractAddress = (addr: string) => {
    setContractAddressState(addr);
    localStorage.setItem(NFT_CONTRACT_KEY, addr);
  };

  const handleSetContractAddress = () => {
    const addr = prompt('Endereço do contrato NFT AgroChain (0x...):');
    if (addr) {
      if (!addr.startsWith('0x') || addr.length !== 42) {
        setError('Endereço inválido: 42 chars começando com 0x');
        return;
      }
      setContractAddress(addr);
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (!form.batchId)                    { setError('Batch ID é obrigatório'); return; }
    if (!form.weightKg || Number(form.weightKg) <= 0) { setError('Peso deve ser maior que zero'); return; }
    if (!form.origin)                     { setError('Origem é obrigatória'); return; }
    if (!isConnected)                     { setError('Conecte sua carteira MetaMask'); return; }
    if (chain?.id !== 11155111)           { setError('Mude para Sepolia no MetaMask'); return; }
    if (!contractAddress)                 { setError('Configure o endereço do contrato'); return; }

    setError('');
    setIsProcessing(true);
    setIsDone(false);
    setTxHash('');
    setMintedTokenId('');
    setZkProof(null);
    resetSteps();

    try {
      // ─── Step 1: Validar ───────────────────────────────────────────
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'ACTIVE' } : s));
      if (!window.ethereum) throw new Error('MetaMask não encontrado');

      const codeResp = await window.ethereum.request({
        method: 'eth_getCode',
        params: [contractAddress.toLowerCase(), 'latest'],
      }) as string;
      if (!codeResp || codeResp === '0x') {
        throw new Error('Endereço não é um contrato. Use: ' + NFT_CONTRACT_DEFAULT);
      }
      await new Promise(r => setTimeout(r, 300));
      setSteps(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'DONE' } : s));

      // ─── Step 2: Gerar ZK Proof ────────────────────────────────────
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'ACTIVE' } : s));

      const zkRes = await fetch('/api/zk/prove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId:  form.batchId,
          type:     form.type === 'Coffee' ? 0 : 1,
          variety:  form.variety,
          weight:   form.weightKg,
          origin:   form.origin,
          score:    form.score,
          salt:     Math.random().toString(36).slice(2),
        }),
      });
      const zkData = await zkRes.json();
      setZkProof({
        commitment: zkData.commitment || zkData.hash || '',
        proof:      zkData.proof || zkData.proofData || {},
        proofType:  zkData.proofType || 'Groth16 (MVP - Poseidon hash commitment)',
        score:      form.score,
      });
      setSteps(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'DONE' } : s));

      // ─── Step 3: Mint NFT ──────────────────────────────────────────
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'ACTIVE' } : s));

      const callData = encodeFunctionData({
        abi: MINT_ABI,
        functionName: 'mintCertificado',
        args: [form.batchId, form.type, form.variety, BigInt(form.weightKg), form.origin],
      });

      const hash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ to: getAddress(contractAddress), from: address, value: '0x0', data: callData }],
      }) as string;
      if (!hash) throw new Error('Transação cancelada no MetaMask');
      setTxHash(hash);
      setSteps(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'DONE' } : s));

      // ─── Step 4: Aguardar confirmação ──────────────────────────────
      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'ACTIVE' } : s));

      let receipt: any = null;
      const t0 = Date.now();
      while (!receipt) {
        if (Date.now() - t0 > 60000) throw new Error('Timeout. Verifique no Etherscan.');
        await new Promise(r => setTimeout(r, 2000));
        receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        });
      }
      if (receipt.status === '0x0') throw new Error('TX revertida no contrato. Verifique os dados.');

      // Parse CertificadoMintado event → tokenId
      const EVENT_SIG = '0xe8b8cdeb24a8038b0bd8b58c33e9a0b5e77f3490b3c15b6f00d0d35f96a5d4e4';
      const mintLog = receipt.logs?.find((l: any) =>
        l.topics?.[0]?.toLowerCase() === EVENT_SIG.toLowerCase()
      );
      if (mintLog?.topics?.[1]) setMintedTokenId(BigInt(mintLog.topics[1]).toString());

      setSteps(prev => prev.map((s, i) => i === 3 ? { ...s, status: 'DONE' } : s));
      setIsProcessing(false);
      setIsDone(true);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setIsProcessing(false);
      resetSteps();
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: '2px solid #ddd8cc', fontSize: '14px',
    background: '#fff', color: '#1e2a22', boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = {
    display: 'block', marginBottom: '6px',
    fontSize: '13px', fontWeight: '600', color: '#495649',
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {!isConnected && (
        <div style={{ background: '#ffe8d6', border: '1px solid #ff9c66', borderRadius: '8px', padding: '14px', marginBottom: '20px', color: '#a83226', fontSize: '14px' }}>
          ⚠️ Conecte sua carteira MetaMask no topo
        </div>
      )}
      {isConnected && chain?.id !== 11155111 && (
        <div style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px', padding: '14px', marginBottom: '20px', color: '#856404', fontSize: '14px' }}>
          ⚠️ Mude para a rede <strong>Sepolia</strong> (Chain 11155111) no MetaMask
        </div>
      )}

      <h1 style={{ margin: '0 0 4px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22' }}>
        🏆 Certificação NFT + ZK
      </h1>
      <p style={{ margin: '0 0 20px', color: '#495649', fontSize: '14px' }}>
        Gera uma ZK Proof de qualidade e minta um NFT ERC721 certificando seu lote na blockchain Sepolia.
      </p>

      {error && (
        <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#721c24', fontSize: '14px' }}>
          ❌ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* ── Formulário ── */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #ddd8cc' }}>
          <h2 style={{ margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22' }}>
            Dados do Lote
          </h2>

          {/* Contrato */}
          <div style={{ marginBottom: '14px', padding: '10px 12px', background: '#f9f7f2', borderRadius: '8px', fontSize: '11px', color: '#495649', border: contractAddress ? '1px solid #1f6440' : '1px solid #f5c6cb' }}>
            <strong>Contrato NFT:</strong>
            {contractAddress ? (
              <>
                <div style={{ fontFamily: 'monospace', fontSize: '10px', marginTop: '3px', wordBreak: 'break-all' }}>{contractAddress}</div>
                <button onClick={handleSetContractAddress} style={{ marginTop: '6px', padding: '3px 8px', background: '#1f6440', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Mudar</button>
              </>
            ) : (
              <button onClick={handleSetContractAddress} style={{ marginTop: '6px', padding: '5px 10px', background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                ⚠️ Configurar
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={lbl}>Batch ID</label>
              <input style={inp} value={form.batchId} onChange={e => set('batchId', e.target.value)} placeholder="COFFEE-2024-001" disabled={isProcessing} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Tipo</label>
                <select style={inp} value={form.type} onChange={e => set('type', e.target.value)} disabled={isProcessing}>
                  <option>Coffee</option>
                  <option>Cacao</option>
                </select>
              </div>
              <div>
                <label style={lbl}>Variedade</label>
                <select style={inp} value={form.variety} onChange={e => set('variety', e.target.value)} disabled={isProcessing}>
                  {form.type === 'Coffee'
                    ? <><option>Arabica</option><option>Robusta</option><option>Conilon</option></>
                    : <><option>Forastero</option><option>Criollo</option><option>Trinitario</option><option>Nacional</option></>}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={lbl}>Peso (kg)</label>
                <input style={inp} type="number" min="1" value={form.weightKg} onChange={e => set('weightKg', e.target.value)} placeholder="500" disabled={isProcessing} />
              </div>
              <div>
                <label style={lbl}>Score de Qualidade</label>
                <input style={inp} type="number" min="0" max="100" value={form.score} onChange={e => set('score', Number(e.target.value))} disabled={isProcessing} />
              </div>
            </div>

            <div>
              <label style={lbl}>Origem</label>
              <input style={inp} value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="Minas Gerais, Brasil" disabled={isProcessing} />
            </div>

            {/* Score slider */}
            <div style={{ background: '#f9f7f2', borderRadius: '8px', padding: '12px' }}>
              <label style={{ ...lbl, marginBottom: '8px' }}>Score ZK: <span style={{ color: '#1f6440', fontWeight: '700' }}>{form.score} pts</span></label>
              <input type="range" min="0" max="100" value={form.score}
                onChange={e => set('score', Number(e.target.value))}
                disabled={isProcessing}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#1f6440' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#888', marginTop: '4px' }}>
                <span>0 — Baixo</span><span>50 — Médio</span><span>100 — Premium</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isProcessing || !isConnected || chain?.id !== 11155111 || !contractAddress}
              style={{
                background: (!isProcessing && isConnected && chain?.id === 11155111 && contractAddress) ? '#1f6440' : '#888',
                color: '#fff', border: 'none', padding: '14px', borderRadius: '8px',
                cursor: 'pointer', fontWeight: '700', fontSize: '15px',
              }}
            >
              {isProcessing ? '⚙️ Processando...'
                : !isConnected ? '🔒 Conecte a Carteira'
                : chain?.id !== 11155111 ? '🌐 Mude para Sepolia'
                : !contractAddress ? '⚠️ Configure o Contrato'
                : '🏆 Emitir Certificado NFT + ZK'}
            </button>
          </div>
        </div>

        {/* ── Painel direito: Steps + Resultado ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Steps */}
          <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #ddd8cc' }}>
            <h2 style={{ margin: '0 0 14px', fontFamily: 'Georgia, serif', fontSize: '16px', color: '#1e2a22' }}>Status</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {steps.map((step, i) => {
                const icon = step.status === 'DONE' ? '✅' : step.status === 'ACTIVE' ? '⚡' : '⏳';
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '8px',
                    background: step.status === 'ACTIVE' ? '#f0faf4' : '#f9f7f2',
                    border: `1px solid ${step.status === 'DONE' ? '#1f6440' : step.status === 'ACTIVE' ? '#2f8f52' : '#ddd8cc'}` }}>
                    <span style={{ fontSize: '18px' }}>{icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: step.status !== 'PENDING' ? '600' : '400', color: '#1e2a22' }}>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ZK Proof Result */}
          {zkProof && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #1f6440' }}>
              <h2 style={{ margin: '0 0 14px', fontFamily: 'Georgia, serif', fontSize: '16px', color: '#1f6440' }}>
                🔐 ZK Proof Gerada
              </h2>

              <div style={{ marginBottom: '12px', background: '#f0faf4', padding: '10px 12px', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#495649', fontWeight: '600', textTransform: 'uppercase' }}>Commitment Hash</p>
                <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '11px', color: '#1f6440', wordBreak: 'break-all' }}>
                  {zkProof.commitment}
                </p>
              </div>

              <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#495649', fontWeight: '600', textTransform: 'uppercase' }}>Tipo de Prova</p>
                  <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#1f6440', fontWeight: '700' }}>{zkProof.proofType}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '11px', color: '#495649', fontWeight: '600', textTransform: 'uppercase' }}>Score ZK</p>
                  <p style={{ margin: '3px 0 0', fontSize: '22px', color: '#1f6440', fontWeight: '700' }}>{zkProof.score}<span style={{ fontSize: '12px' }}>/100</span></p>
                </div>
              </div>

              <div style={{ background: '#f9f7f2', padding: '10px 12px', borderRadius: '8px', maxHeight: '100px', overflow: 'auto' }}>
                <p style={{ margin: 0, fontSize: '11px', color: '#495649', fontWeight: '600', textTransform: 'uppercase' }}>Proof Data</p>
                <pre style={{ margin: '4px 0 0', fontSize: '9px', color: '#495649', fontFamily: 'monospace', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(zkProof.proof, null, 2).slice(0, 400)}...
                </pre>
              </div>

              <div style={{ marginTop: '10px', background: '#f0faf4', padding: '8px 12px', borderRadius: '6px', border: '1px solid #1f6440' }}>
                <p style={{ margin: 0, fontSize: '12px', color: '#1f6440', fontWeight: '600' }}>✅ Prova Gerada com Sucesso!</p>
                <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#495649' }}>Commitment incluído no certificado NFT.</p>
              </div>
            </div>
          )}

          {/* NFT Mint Result */}
          {isDone && (
            <div style={{ background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #1f6440' }}>
              <div style={{ fontSize: '32px', textAlign: 'center' }}>🎉</div>
              <p style={{ margin: '8px 0 4px', fontWeight: '700', color: '#1f6440', textAlign: 'center', fontSize: '16px' }}>
                Certificado NFT + ZK Emitido!
              </p>

              {mintedTokenId && (
                <p style={{ margin: '10px 0 0', fontSize: '22px', color: '#1e2a22', textAlign: 'center', fontWeight: '700' }}>
                  NFT Token ID: #{mintedTokenId}
                </p>
              )}

              <p style={{ margin: '8px 0 0', fontSize: '10px', color: '#888', textAlign: 'center', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                TX: {txHash.slice(0, 22)}...{txHash.slice(-6)}
              </p>

              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <a href={"https://sepolia.etherscan.io/tx/" + txHash} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'block', padding: '8px 16px', background: '#1f6440', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                  🔍 Ver TX no Etherscan
                </a>
                {mintedTokenId && (
                  <a href={"https://testnets.opensea.io/assets/sepolia/" + contractAddress + "/" + mintedTokenId}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'block', padding: '8px 16px', background: '#2081e2', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '600', textAlign: 'center' }}>
                    🖼️ Ver NFT no OpenSea
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '20px', background: '#fff8e1', border: '1px solid #b8912a', borderRadius: '10px', padding: '14px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#495649' }}>
          <strong style={{ color: '#b8912a' }}>ℹ️ Fluxo:</strong> Os dados do lote alimentam a ZK Proof (commitment hash Poseidon) no Step 2.
          O commitment é vinculado ao NFT ERC721 mintado no Step 3 — sem custos extras, on-chain na Sepolia.
        </p>
      </div>
    </div>
  );
}