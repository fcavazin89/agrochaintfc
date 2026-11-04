'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          padding: '40px',
          textAlign: 'center',
          background: '#f5f1e7',
        }}
      >
        <h2 style={{ color: '#195236' }}>Erro crítico na aplicação</h2>
        <p style={{ color: '#7c867a' }}>{error.message}</p>
        <button
          onClick={reset}
          style={{
            marginTop: '16px',
            padding: '10px 24px',
            background: '#1f6440',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Recarregar
        </button>
      </body>
    </html>
  );
}
