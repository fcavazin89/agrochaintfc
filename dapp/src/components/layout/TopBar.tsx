'use client';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function TopBar() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <header
      style={{background: '#0b1d12',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',}}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
        <span style={{fontSize: '24px'}}>🌿</span>
        <span
          style={{color: '#f3f7f2',
            fontFamily: 'Georgia, serif',
            fontSize: '20px',
            fontWeight: 'bold',
            letterSpacing: '0.5px',}}
        >
          AgroChain
        </span>
        <span
          style={{background: '#1f6440',
            color: '#f3f7f2',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            fontWeight: '600',}}
        >
          DApp v0.1
        </span>
      </div>

      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
        {isConnected && address ? (
          <>
            <span style={{color: '#b8912a', fontSize: '13px', fontFamily: 'monospace'}}>
              {truncate(address)}
            </span>
            <button
              onClick={() => disconnect()}
              style={{background: 'transparent',
                border: '1px solid #b8912a',
                color: '#b8912a',
                padding: '6px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',}}
            >
              Desconectar
            </button>
          </>
        ) : (
          <button
            onClick={() => connect({ connector: injected() })}
            style={{background: '#1f6440',
              border: 'none',
              color: '#f3f7f2',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',}}
          >
            🦊 Conectar Carteira
          </button>
        )}
      </div>
    </header>
  );
}
