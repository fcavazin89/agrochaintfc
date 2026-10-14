'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: '560px',
        margin: '48px auto',
        background: '#fff',
        border: '1px solid #f5c6cb',
        borderRadius: '12px',
        padding: '28px',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '40px' }}>⚠️</div>
      <h1
        style={{
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
          color: '#1e2a22',
          margin: '12px 0 8px',
        }}
      >
        Algo deu errado
      </h1>
      <p style={{ color: '#495649', fontSize: '14px', margin: '0 0 20px', wordBreak: 'break-word' }}>
        {error.message || 'Ocorreu um erro inesperado ao carregar esta página.'}
      </p>
      <button
        onClick={() => reset()}
        style={{
          background: '#1f6440',
          color: '#fff',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '14px',
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
