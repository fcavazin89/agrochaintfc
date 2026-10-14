'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import type {
  MarketplaceListing,
  MarketplaceFilter,
  BatchType,
} from '@/types/agrochain';
// import {
//   filterListings,
//   MOCK_LISTINGS,
//   truncateAddress,
// } from '@/lib/contracts/marketplace';
const MOCK_LISTINGS: MarketplaceListing[] = [];
const truncateAddress = (a: string) => a;
const filterListings = (l: any[], f: any) => l;

export default function MarketplacePage() {
  const { address } = useAccount();
  const [listings, setListings] = useState<MarketplaceListing[]>(MOCK_LISTINGS);
  const [filter, setFilter] = useState<MarketplaceFilter>({
    sortBy: 'recent',
  });
  const [loading, setLoading] = useState(false);

  // Aplica filtros aos listings
  useEffect(() => {
    setLoading(true);
    // Simula delay de carregamento
    const timer = setTimeout(() => {
      const filtered = filterListings(MOCK_LISTINGS, filter);
      setListings(filtered);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [filter]);

  const handleBatchTypeChange = (batchType: BatchType | undefined) => {
    setFilter(prev => ({ ...prev, batchType }));
  };

  const handleMinPriceChange = (minPrice: number | undefined) => {
    setFilter(prev => ({ ...prev, minPrice }));
  };

  const handleMaxPriceChange = (maxPrice: number | undefined) => {
    setFilter(prev => ({ ...prev, maxPrice }));
  };

  const handleSortChange = (sortBy: any) => {
    setFilter(prev => ({ ...prev, sortBy }));
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '0 20px' }}>
      {/* Cabeçalho */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '26px',
            color: '#1e2a22',
            margin: 0,
            marginBottom: '8px',
          }}
        >
          Marketplace
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#495649',
            margin: 0,
          }}
        >
          Compre lotes certificados de Coffee e Cacao — Blockchain Verified
        </p>
      </div>

      {/* Filtros */}
      <div
        style={{
          background: '#fffdf8',
          borderRadius: '16px',
          border: '1px solid #e6ddc9',
          padding: '16px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#495649',
              marginBottom: '6px',
              letterSpacing: '0.5px',
            }}
          >
            Tipo
          </label>
          <select
            value={filter.batchType || ''}
            onChange={e =>
              handleBatchTypeChange(e.target.value ? (e.target.value as BatchType) : undefined)
            }
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #d4cdb8',
              background: '#fff',
              fontSize: '13px',
              color: '#1e2a22',
              cursor: 'pointer',
            }}
          >
            <option value="">Todos</option>
            <option value="Coffee">Coffee</option>
            <option value="Cacao">Cacao</option>
          </select>
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#495649',
              marginBottom: '6px',
              letterSpacing: '0.5px',
            }}
          >
            Preço Mín ($/kg)
          </label>
          <input
            type="number"
            placeholder="0"
            value={filter.minPrice || ''}
            onChange={e =>
              handleMinPriceChange(e.target.value ? Number(e.target.value) : undefined)
            }
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #d4cdb8',
              background: '#fff',
              fontSize: '13px',
              color: '#1e2a22',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#495649',
              marginBottom: '6px',
              letterSpacing: '0.5px',
            }}
          >
            Preço Máx ($/kg)
          </label>
          <input
            type="number"
            placeholder="∞"
            value={filter.maxPrice || ''}
            onChange={e =>
              handleMaxPriceChange(e.target.value ? Number(e.target.value) : undefined)
            }
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #d4cdb8',
              background: '#fff',
              fontSize: '13px',
              color: '#1e2a22',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: '700',
              textTransform: 'uppercase',
              color: '#495649',
              marginBottom: '6px',
              letterSpacing: '0.5px',
            }}
          >
            Ordenar
          </label>
          <select
            value={filter.sortBy || 'recent'}
            onChange={e => handleSortChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid #d4cdb8',
              background: '#fff',
              fontSize: '13px',
              color: '#1e2a22',
              cursor: 'pointer',
            }}
          >
            <option value="recent">Mais recentes</option>
            <option value="oldest">Mais antigos</option>
            <option value="price-asc">Preço: menor</option>
            <option value="price-desc">Preço: maior</option>
          </select>
        </div>
      </div>

      {/* Grid de Listagens */}
      {loading ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            fontSize: '14px',
            color: '#495649',
          }}
        >
          Carregando listagens...
        </div>
      ) : listings.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}
        >
          {listings.map(listing => (
            <Link
              key={listing.listingId}
              href={`/marketplace/${listing.listingId}`}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  background: '#fffdf8',
                  borderRadius: '16px',
                  border: '1px solid #e6ddc9',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 4px 16px rgba(0,0,0,0.12)';
                  (e.currentTarget as HTMLElement).style.transform =
                    'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 2px 8px rgba(0,0,0,0.08)';
                  (e.currentTarget as HTMLElement).style.transform =
                    'translateY(0)';
                }}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    height: '120px',
                    background: listing.batchType === 'Coffee'
                      ? 'linear-gradient(135deg, #8B7355 0%, #5C4033 100%)'
                      : 'linear-gradient(135deg, #8B6F47 0%, #5C4433 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '40px',
                  }}
                >
                  {listing.batchType === 'Coffee' ? '☕' : '🍫'}
                </div>

                {/* Conteúdo */}
                <div style={{ padding: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Cabeçalho do cartão */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '8px',
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1e2a22',
                        }}
                      >
                        Lote #{listing.listingId}
                      </h3>
                      <p
                        style={{
                          margin: '2px 0 0',
                          fontSize: '11px',
                          color: '#b8912a',
                          fontWeight: '600',
                        }}
                      >
                        {listing.batchType}
                      </p>
                    </div>
                    <div
                      style={{
                        display: 'inline-block',
                        background:
                          listing.status === 'Active'
                            ? 'rgba(31, 100, 64, 0.15)'
                            : listing.status === 'Sold'
                              ? 'rgba(184, 145, 42, 0.15)'
                              : 'rgba(100, 100, 100, 0.15)',
                        color:
                          listing.status === 'Active'
                            ? '#1f6440'
                            : listing.status === 'Sold'
                              ? '#b8912a'
                              : '#666',
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {listing.status}
                    </div>
                  </div>

                  {/* KPIs */}
                  <div
                    style={{
                      marginBottom: '8px',
                      paddingBottom: '8px',
                      borderBottom: '1px solid #f0ede0',
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontFamily: 'Georgia, serif',
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1e2a22',
                      }}
                    >
                      ${listing.pricePerKg.toFixed(2)}/kg
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: '12px',
                        color: '#495649',
                      }}
                    >
                      {listing.origin}
                    </p>
                  </div>

                  {/* Info adicional */}
                  <div style={{ marginBottom: '8px', flex: 1 }}>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#495649' }}>
                      <strong>Disponível:</strong> {listing.weightAvailableKg} kg
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#495649' }}>
                      <strong>Produtor:</strong> {truncateAddress(listing.seller)}
                    </p>
                  </div>

                  {/* Botão */}
                  <button
                    onClick={e => {
                      e.preventDefault();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background =
                        'linear-gradient(180deg, #195236 0%, #133a2a 100%)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background =
                        'linear-gradient(180deg, #1f6440 0%, #195236 100%)';
                    }}
                  >
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: '#fffdf8',
            borderRadius: '16px',
            border: '1px solid #e6ddc9',
          }}
        >
          <p style={{ fontSize: '14px', color: '#495649', margin: 0 }}>
            Nenhuma listagem encontrada com esses filtros.
          </p>
          <p
            style={{
              fontSize: '12px',
              color: '#888',
              margin: '4px 0 16px',
            }}
          >
            Tente ajustar os filtros ou criar uma nova listagem.
          </p>
          <Link
            href="/marketplace/my-listings"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#1f6440',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Criar Listagem
          </Link>
        </div>
      )}
    </div>
  );
}
