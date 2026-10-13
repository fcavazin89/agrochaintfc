'use client';
import { useState } from 'react';

const products = [
  { id: '1', name: 'Coffee Arabica Premium', origin: 'Minas Gerais', price: 28.50, image: '☕', cert: 'verified' },
  { id: '2', name: 'Coffee Robusta Forte', origin: 'São Paulo', price: 18.00, image: '☕', cert: 'pending' },
  { id: '3', name: 'Cacao Criollo 85%', origin: 'Bahia', price: 45.00, image: '🍫', cert: 'verified' },
  { id: '4', name: 'Cacao Forastero', origin: 'Pará', price: 32.00, image: '🍫', cert: 'verified' },
  { id: '5', name: 'Coffee Blend Especial', origin: 'Minas + São Paulo', price: 35.00, image: '☕', cert: 'verified' },
  { id: '6', name: 'Cacao Nacional', origin: 'Paraná', price: 52.00, image: '🍫', cert: 'pending' },
];

export default function MercadoPage() {
  const [filterCert, setFilterCert] = useState('all');
  const [filterType, setFilterType] = useState('all');

  const filtered = products.filter(p => {
    const certMatch = filterCert === 'all' || p.cert === filterCert;
    const typeMatch = filterType === 'all' || 
      (filterType === 'coffee' && p.image === '☕') ||
      (filterType === 'cacao' && p.image === '🍫');
    return certMatch && typeMatch;
  });

  return (
    <div style={{maxWidth: '1200px', margin: '0 auto'}}>
      <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
        🛒 Marketplace
      </h1>
      <p style={{margin: '0 0 24px', color: '#495649', fontSize: '14px'}}>
        Produtos certificados de Coffee e Cacao com rastreabilidade blockchain
      </p>

      {/* Filters */}
      <div style={{background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc', padding: '20px', marginBottom: '24px'}}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
          <div>
            <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '8px'}}>
              Tipo de Produto
            </label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              style={{width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd8cc', fontSize: '14px'}}
            >
              <option value="all">Todos</option>
              <option value="coffee">☕ Coffee</option>
              <option value="cacao">🍫 Cacao</option>
            </select>
          </div>
          <div>
            <label style={{display: 'block', fontSize: '13px', fontWeight: '600', color: '#495649', marginBottom: '8px'}}>
              Status de Certificação
            </label>
            <select
              value={filterCert}
              onChange={e => setFilterCert(e.target.value)}
              style={{width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid #ddd8cc', fontSize: '14px'}}
            >
              <option value="all">Todos</option>
              <option value="verified">✅ Verificado</option>
              <option value="pending">⏳ Pendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px'}}>
        {filtered.map(product => (
          <div
            key={product.id}
            style={{
              background: '#fff',
              borderRadius: '12px',
              border: '1px solid #ddd8cc',
              overflow: 'hidden',
              transition: 'all 0.2s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(-4px)';
              el.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = 'none';
            }}
          >
            {/* Product image placeholder */}
            <div
              style={{
                background: product.image === '☕' ? '#e8d7c3' : '#8b7355',
                height: '180px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
              }}
            >
              {product.image}
            </div>

            {/* Product info */}
            <div style={{padding: '16px'}}>
              <h3 style={{margin: '0 0 4px', fontFamily: 'Georgia, serif', fontSize: '15px', color: '#1e2a22', fontWeight: '600'}}>
                {product.name}
              </h3>
              <p style={{margin: 0, fontSize: '12px', color: '#495649'}}>
                📍 {product.origin}
              </p>

              <div style={{marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #eee8da'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <span style={{fontSize: '16px', fontWeight: '700', color: '#1f6440'}}>
                    ${product.price.toFixed(2)}
                  </span>
                  <span style={{fontSize: '12px', fontWeight: '600', color: product.cert === 'verified' ? '#1f6440' : '#b8912a'}}>
                    {product.cert === 'verified' ? '✅ Verificado' : '⏳ Pendente'}
                  </span>
                </div>
              </div>

              <button
                style={{
                  width: '100%',
                  marginTop: '12px',
                  background: '#1f6440',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                🔍 Ver Certificação
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #ddd8cc'}}>
          <p style={{fontSize: '40px', margin: 0}}>🔍</p>
          <p style={{margin: '12px 0 0', fontSize: '16px', color: '#495649'}}>Nenhum produto encontrado com esses filtros</p>
        </div>
      )}

      <div style={{background: '#f0faf4', border: '1px solid #1f6440', borderRadius: '12px', padding: '20px'}}>
        <h3 style={{margin: '0 0 8px', color: '#1f6440'}}>ℹ️ Sobre Certificações</h3>
        <p style={{margin: 0, fontSize: '13px', color: '#495649', lineHeight: '1.6'}}>
          Todos os produtos certificados no marketplace foram verificados via Zero-Knowledge Proofs na blockchain.
          Clique em &quot;Ver Certificação&quot; para ver detalhes da rastreabilidade completa e conformidade EUDR.
        </p>
      </div>
    </div>
  );
}
