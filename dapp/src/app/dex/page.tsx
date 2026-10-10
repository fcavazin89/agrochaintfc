'use client';
import { useState } from 'react';
import type { PoolInfo } from '@/types/agrochain';

const MOCK_POOLS: PoolInfo[] = [
  { id: '1', tokenA: 'CAFE', tokenB: 'CACAO', reserveA: 125000, reserveB: 98000, fee: 0.003, volume24h: 48200, tvl: 223000 },
  { id: '2', tokenA: 'CAFE', tokenB: 'MATIC', reserveA: 80000, reserveB: 12000, fee: 0.003, volume24h: 21000, tvl: 92000 },
  { id: '3', tokenA: 'CACAO', tokenB: 'USDC', reserveA: 65000, reserveB: 61000, fee: 0.001, volume24h: 31500, tvl: 126000 },
];

export default function DexPage() {
  const [fromAmount, setFromAmount] = useState('');
  const [fromToken, setFromToken] = useState('CAFE');
  const [toToken, setToToken] = useState('CACAO');

  const rate = fromToken === 'CAFE' && toToken === 'CACAO' ? 0.784 : fromToken === 'CACAO' && toToken === 'CAFE' ? 1.275 : 1.0;
  const toAmount = fromAmount ? (parseFloat(fromAmount) * rate).toFixed(4) : '';

  const swapTokens = () => { setFromToken(toToken); setToToken(fromToken); };

  const inputStyle = {
    width: '100%', padding: '14px 16px', borderRadius: '8px',
    border: '2px solid #ddd8cc', fontSize: '18px',
    background: '#f9f7f2', color: '#1e2a22', outline: 'none',
    boxSizing: 'border-box' as const,
  };
  const tokenSelectStyle = {
    padding: '8px 16px', borderRadius: '20px', border: 'none',
    fontWeight: '700' as const, fontSize: '16px', cursor: 'pointer',
  };

  return (
    <div style={{maxWidth: '1000px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>🔄 CoffeeCacaoSwap DEX</h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>Troque tokens Coffee e Cacao com liquidez on-chain.</p>

      <div style={{display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px'}}>
        {/* SwapCard */}
        <div style={{background: '#fff', borderRadius: '16px', padding: '24px', border: '1px solid #ddd8cc', boxShadow: '0 4px 16px rgba(0,0,0,0.06)'}}>
          <h2 style={{margin: '0 0 20px', fontFamily: 'Georgia, serif', fontSize: '18px'}}>Swap</h2>
          <div style={{marginBottom: '8px'}}>
            <label style={{fontSize: '12px', color: '#495649', fontWeight: '600'}}>De</label>
            <div style={{display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center'}}>
              <select value={fromToken} onChange={e => setFromToken(e.target.value)} style={{...tokenSelectStyle, background: '#4a2f1c', color: '#fff'}}>
                <option>CAFE</option><option>CACAO</option><option>MATIC</option><option>USDC</option>
              </select>
              <input type="number" value={fromAmount} onChange={e => setFromAmount(e.target.value)} placeholder="0.0" style={inputStyle} />
            </div>
          </div>

          <div style={{textAlign: 'center', margin: '12px 0'}}>
            <button onClick={swapTokens} style={{background: '#1f6440', border: 'none', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', fontSize: '18px', color: '#fff'}}>⇅</button>
          </div>

          <div style={{marginBottom: '20px'}}>
            <label style={{fontSize: '12px', color: '#495649', fontWeight: '600'}}>Para</label>
            <div style={{display: 'flex', gap: '8px', marginTop: '6px', alignItems: 'center'}}>
              <select value={toToken} onChange={e => setToToken(e.target.value)} style={{...tokenSelectStyle, background: '#b8912a', color: '#fff'}}>
                <option>CACAO</option><option>CAFE</option><option>MATIC</option><option>USDC</option>
              </select>
              <input type="number" value={toAmount} readOnly placeholder="0.0" style={{...inputStyle, background: '#f0faf4'}} />
            </div>
          </div>

          {fromAmount && <p style={{margin: '0 0 16px', fontSize: '12px', color: '#495649', textAlign: 'center'}}>Taxa: ~0.3% · 1 {fromToken} = {rate} {toToken}</p>}

          <button style={{width: '100%', background: '#1f6440', color: '#fff', border: 'none', padding: '16px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '16px'}}>
            🔄 Swap
          </button>
          <p style={{margin: '12px 0 0', fontSize: '11px', color: '#888', textAlign: 'center'}}>Integração on-chain em breve · Versão mock</p>
        </div>

        {/* Pool Stats */}
        <div>
          <h2 style={{margin: '0 0 16px', fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2a22'}}>Pools de Liquidez</h2>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            {MOCK_POOLS.map(pool => (
              <div key={pool.id} style={{background: '#fff', borderRadius: '12px', padding: '16px 20px', border: '1px solid #ddd8cc', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', alignItems: 'center'}}>
                <div>
                  <p style={{margin: 0, fontWeight: '700', fontSize: '15px', color: '#1e2a22'}}>{pool.tokenA}/{pool.tokenB}</p>
                  <p style={{margin: '2px 0 0', fontSize: '11px', color: '#888'}}>Fee {(pool.fee * 100).toFixed(1)}%</p>
                </div>
                <div>
                  <p style={{margin: 0, fontSize: '11px', color: '#495649'}}>TVL</p>
                  <p style={{margin: '2px 0 0', fontWeight: '600', color: '#1e2a22'}}>${pool.tvl.toLocaleString()}</p>
                </div>
                <div>
                  <p style={{margin: 0, fontSize: '11px', color: '#495649'}}>Volume 24h</p>
                  <p style={{margin: '2px 0 0', fontWeight: '600', color: '#1f6440'}}>${pool.volume24h.toLocaleString()}</p>
                </div>
                <button style={{background: '#1f6440', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600'}}>+ Liquidez</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
