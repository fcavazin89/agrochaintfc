'use client';
import { useAccount } from 'wagmi';

const IcoSeed = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22V12" />
    <path d="M12 12C12 7 7 3 2 3c0 5 4 9 10 9z" />
    <path d="M12 12c0-5 5-9 10-9 0 5-4 9-10 9z" />
  </svg>
);

export default function TopBar() {
  const { address, isConnected } = useAccount();
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  return (
    <header
      className="topo"
      style={{
        background: 'linear-gradient(180deg,#10301f,#0b2216)',
        height: '56px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: '1px solid rgba(184,145,42,.35)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '16px',
      }}
    >
      {/* Marca */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 0 auto' }}>
        <IcoSeed />
        <span
          style={{
            fontFamily: 'var(--serifa)',
            fontSize: '18px',
            fontWeight: 700,
            color: '#f3f7f2',
            letterSpacing: '-0.3px',
          }}
        >
          AgroChain
        </span>
        <span
          style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '999px',
            background: 'rgba(47,143,82,.25)',
            color: '#7fe0a4',
            letterSpacing: '.4px',
          }}
        >
          SEPOLIA
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Estado da rede */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 12px',
          borderRadius: '999px',
          background: 'rgba(47,143,82,.15)',
          border: '1px solid rgba(47,143,82,.25)',
        }}
      >
        <span
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: '#2f8f52',
            boxShadow: '0 0 0 2px rgba(47,143,82,.3)',
            animation: 'pulse 2s infinite',
            display: 'inline-block',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '12px', color: '#ccdbd1', fontWeight: 500 }}>
          Sepolia Testnet
        </span>
      </div>

      {/* Wallet */}
      <div
        style={{
          fontSize: '12px',
          fontFamily: 'var(--mono)',
          color: isConnected ? '#7fe0a4' : '#9db2a4',
          padding: '5px 12px',
          borderRadius: '999px',
          background: 'rgba(233,243,236,.08)',
          border: '1px solid rgba(233,243,236,.12)',
          whiteSpace: 'nowrap',
        }}
      >
        {isConnected && shortAddr ? shortAddr : 'Não conectado'}
      </div>
    </header>
  );
}
