'use client';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

const IcoSeed = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22V12" />
    <path d="M12 12C12 7 7 3 2 3c0 5 4 9 10 9z" />
    <path d="M12 12c0-5 5-9 10-9 0 5-4 9-10 9z" />
  </svg>
);

export default function TopBar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const shortAddr = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : null;

  const injectedConnector =
    connectors.find((c) => c.id === 'injected') ?? connectors[0];

  const handleConnect = () => {
    if (!injectedConnector) return;
    connect({ connector: injectedConnector });
  };

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

      {/* Erro de conexão */}
      {!isConnected && error && (
        <div
          title={error.message}
          style={{
            fontSize: '11.5px',
            color: '#ffb4a8',
            padding: '5px 12px',
            borderRadius: '999px',
            background: 'rgba(220,80,60,.15)',
            border: '1px solid rgba(220,80,60,.35)',
            maxWidth: '260px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {error.message.includes('User rejected')
            ? 'Conexão recusada'
            : 'MetaMask não encontrada'}
        </div>
      )}

      {/* Wallet */}
      {isConnected && shortAddr ? (
        <button
          type="button"
          onClick={() => disconnect()}
          title={`${address}\nClique para desconectar`}
          style={{
            fontSize: '12px',
            fontFamily: 'var(--mono)',
            color: '#7fe0a4',
            padding: '5px 12px',
            borderRadius: '999px',
            background: 'rgba(47,143,82,.15)',
            border: '1px solid rgba(47,143,82,.35)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          {shortAddr}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={isPending}
          title="Conectar MetaMask"
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#0b2216',
            padding: '6px 14px',
            borderRadius: '999px',
            background: isPending ? '#7fae90' : '#7fe0a4',
            border: '1px solid rgba(127,224,164,.6)',
            whiteSpace: 'nowrap',
            cursor: isPending ? 'wait' : 'pointer',
          }}
        >
          {isPending ? 'Conectando…' : 'Conectar Carteira'}
        </button>
      )}
    </header>
  );
}
