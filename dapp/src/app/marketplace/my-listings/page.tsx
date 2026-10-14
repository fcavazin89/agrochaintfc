'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import type { MarketplaceListing } from '@/types/agrochain';
// import { MOCK_LISTINGS } from '@/lib/contracts/marketplace';
const MOCK_LISTINGS: MarketplaceListing[] = [];

export default function MyListingsPage() {
  const { address } = useAccount();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [showNewListingModal, setShowNewListingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState('');

  useEffect(() => {
    if (address) {
      setLoading(true);
      // Simula busca das listagens do produtor
      const userListings = MOCK_LISTINGS.filter(
        l => l.seller.toLowerCase() === address.toLowerCase()
      );
      setListings(userListings);
      setLoading(false);
    }
  }, [address]);

  const handleCreateListing = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert('Funcionalidade de criar listagem será integrada com o contrato');
    setShowNewListingModal(false);
  };

  const handleEditPrice = (listingId: string, currentPrice: number) => {
    setEditingId(listingId);
    setNewPrice(currentPrice.toString());
  };

  const handleSavePrice = async (listingId: string) => {
    if (!newPrice || Number(newPrice) <= 0) {
      alert('Preço inválido');
      return;
    }
    alert(`Preço atualizado para $${newPrice}/kg`);
    setEditingId(null);
    setNewPrice('');
  };

  const handleCancelListing = async (listingId: string) => {
    if (confirm('Tem certeza que deseja cancelar esta listagem?')) {
      alert('Listagem cancelada');
    }
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'Georgia, serif',
              fontSize: '26px',
              color: '#1e2a22',
              margin: 0,
              marginBottom: '8px',
            }}
          >
            Minhas Vendas
          </h1>
          <p style={{ fontSize: '14px', color: '#495649', margin: 0 }}>
            Gerencie seus anúncios e ofertas recebidas
          </p>
        </div>
        <button
          onClick={() => setShowNewListingModal(true)}
          style={{
            background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
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
          + Nova Listagem
        </button>
      </div>

      {/* Tabela de Listagens */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>Carregando...</div>
      ) : listings.length > 0 ? (
        <div
          style={{
            background: '#fffdf8',
            borderRadius: '16px',
            border: '1px solid #e6ddc9',
            overflow: 'hidden',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
            }}
          >
            <thead>
              <tr style={{ background: '#f5f1e7' }}>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Lote
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Tipo
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Peso (kg)
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Disponível (kg)
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'right',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Preço/kg
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: '#495649',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid #e6ddc9',
                  }}
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing, index) => (
                <tr
                  key={listing.listingId}
                  style={{
                    borderBottom:
                      index < listings.length - 1 ? '1px solid #f0ede0' : 'none',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = '#f9f7f3';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 16px', color: '#1e2a22', fontWeight: '600' }}>
                    #{listing.listingId}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#495649' }}>
                    {listing.batchType}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#495649' }}>
                    {listing.weightKg}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#495649' }}>
                    {listing.weightAvailableKg}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      color: '#1f6440',
                      fontWeight: '600',
                    }}
                  >
                    {editingId === listing.listingId ? (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <input
                          type="number"
                          value={newPrice}
                          onChange={e => setNewPrice(e.target.value)}
                          step="0.01"
                          style={{
                            width: '70px',
                            padding: '4px',
                            borderRadius: '6px',
                            border: '1px solid #d4cdb8',
                            fontSize: '12px',
                          }}
                        />
                        <button
                          onClick={() => handleSavePrice(listing.listingId)}
                          style={{
                            padding: '4px 8px',
                            background: '#1f6440',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            fontWeight: '600',
                          }}
                        >
                          OK
                        </button>
                      </div>
                    ) : (
                      `$${listing.pricePerKg.toFixed(2)}`
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <span
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
                        padding: '4px 8px',
                        borderRadius: '999px',
                        fontSize: '10px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {listing.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                      {listing.status === 'Active' && (
                        <>
                          <button
                            onClick={() =>
                              handleEditPrice(listing.listingId, listing.pricePerKg)
                            }
                            style={{
                              padding: '4px 8px',
                              background: '#f0faf4',
                              border: '1px solid #d4e6d8',
                              borderRadius: '6px',
                              color: '#1f6440',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleCancelListing(listing.listingId)}
                            style={{
                              padding: '4px 8px',
                              background: '#fae8e6',
                              border: '1px solid #e6ccc8',
                              borderRadius: '6px',
                              color: '#a83226',
                              fontSize: '10px',
                              cursor: 'pointer',
                              fontWeight: '600',
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                      <Link
                        href={`/marketplace/${listing.listingId}`}
                        style={{
                          padding: '4px 8px',
                          background: '#f5f1e7',
                          border: '1px solid #d4cdb8',
                          borderRadius: '6px',
                          color: '#495649',
                          textDecoration: 'none',
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'inline-block',
                        }}
                      >
                        Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            Você ainda não tem nenhuma listagem.
          </p>
          <p style={{ fontSize: '12px', color: '#888', margin: '4px 0 16px' }}>
            Comece a vender seus lotes certificados agora mesmo.
          </p>
          <button
            onClick={() => setShowNewListingModal(true)}
            style={{
              padding: '8px 16px',
              background: '#1f6440',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Criar Primeira Listagem
          </button>
        </div>
      )}

      {/* Modal Nova Listagem */}
      {showNewListingModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowNewListingModal(false)}
        >
          <div
            style={{
              background: '#fffdf8',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              border: '1px solid #e6ddc9',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1e2a22',
                margin: '0 0 16px',
              }}
            >
              Nova Listagem
            </h2>

            <form onSubmit={handleCreateListing}>
              <div style={{ marginBottom: '12px' }}>
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
                  Selecione um Lote
                </label>
                <select
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d4cdb8',
                    borderRadius: '10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">-- Selecione --</option>
                  <option value="lot1">Lote #001 - Coffee - 500kg</option>
                  <option value="lot2">Lote #002 - Cacao - 1000kg</option>
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
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
                  Quantidade (kg)
                </label>
                <input
                  type="number"
                  required
                  placeholder="500"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d4cdb8',
                    borderRadius: '10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
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
                  Preço por kg ($)
                </label>
                <input
                  type="number"
                  required
                  placeholder="3.50"
                  step="0.01"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d4cdb8',
                    borderRadius: '10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
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
                  Token de Pagamento
                </label>
                <select
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #d4cdb8',
                    borderRadius: '10px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="usdc">MockUSDC (6 decimals)</option>
                  <option value="usdt">USDT (6 decimals)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewListingModal(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f0faf4',
                    border: '1px solid #d4e6d8',
                    borderRadius: '10px',
                    color: '#1f6440',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Criar Listagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
