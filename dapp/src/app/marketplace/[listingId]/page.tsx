'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import Link from 'next/link';
import type { MarketplaceListing, MarketplaceOffer } from '@/types/agrochain';
import { MOCK_LISTINGS, MOCK_OFFERS, truncateAddress, formatPrice } from '@/lib/contracts/marketplace';

export default function ListingDetailPage() {
  const params = useParams();
  const listingId = params.listingId as string;
  const { address } = useAccount();

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [offers, setOffers] = useState<MarketplaceOffer[]>([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerQuantity, setOfferQuantity] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Busca a listagem
    const found = MOCK_LISTINGS.find(l => l.listingId === listingId);
    if (found) {
      setListing(found);
      // Filtra ofertas para esta listagem
      const listingOffers = MOCK_OFFERS.filter(o => o.listingId === listingId);
      setOffers(listingOffers);
    }
    setLoading(false);
  }, [listingId]);

  const handleMakeOffer = async () => {
    if (!offerQuantity || !offerPrice || Number(offerQuantity) <= 0 || Number(offerPrice) <= 0) {
      alert('Por favor preencha quantidade e preço');
      return;
    }

    if (!listing || Number(offerQuantity) > listing.weightAvailableKg) {
      alert('Quantidade solicitada indisponível');
      return;
    }

    setSubmitting(true);
    // Simula envio
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(
      `Oferta enviada!\n\nQuantidade: ${offerQuantity}kg\nPreço: $${offerPrice}/kg\nTotal: $${(Number(offerQuantity) * Number(offerPrice)).toFixed(2)}`
    );
    setShowOfferModal(false);
    setOfferQuantity('');
    setOfferPrice('');
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>Carregando...</div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontSize: '14px', color: '#495649' }}>Listagem não encontrada</p>
          <Link
            href="/marketplace"
            style={{
              display: 'inline-block',
              marginTop: '16px',
              padding: '8px 16px',
              background: '#1f6440',
              color: '#fff',
              textDecoration: 'none',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            Voltar para Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const isOwnListing = address?.toLowerCase() === listing.seller.toLowerCase();
  const totalPrice = offerQuantity && offerPrice ? Number(offerQuantity) * Number(offerPrice) : 0;

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto', padding: '20px' }}>
      {/* Breadcrumb */}
      <Link
        href="/marketplace"
        style={{
          display: 'inline-block',
          marginBottom: '20px',
          color: '#1f6440',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: '600',
        }}
      >
        ← Voltar para Marketplace
      </Link>

      {/* Conteúdo Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Lado esquerdo: Informações */}
        <div>
          {/* Cabeçalho */}
          <div style={{ marginBottom: '24px' }}>
            <h1
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '28px',
                color: '#1e2a22',
                margin: 0,
                marginBottom: '8px',
              }}
            >
              Lote #{listing.listingId}
            </h1>
            <p style={{ fontSize: '14px', color: '#495649', margin: 0 }}>
              {listing.batchType} • {listing.origin} • Safra {listing.safra}
            </p>
          </div>

          {/* KPI Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div
              style={{
                background: '#fffdf8',
                border: '1px solid #e6ddc9',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'Georgia, serif',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1f6440',
                }}
              >
                ${listing.pricePerKg.toFixed(2)}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: '#495649',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}
              >
                Preço/kg
              </p>
            </div>

            <div
              style={{
                background: '#fffdf8',
                border: '1px solid #e6ddc9',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'Georgia, serif',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1f6440',
                }}
              >
                {listing.weightAvailableKg}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: '#495649',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}
              >
                kg Disponível
              </p>
            </div>

            <div
              style={{
                background: '#fffdf8',
                border: '1px solid #e6ddc9',
                borderRadius: '16px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: 'Georgia, serif',
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#b8912a',
                }}
              >
                {listing.status}
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  color: '#495649',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}
              >
                Status
              </p>
            </div>
          </div>

          {/* Detalhes */}
          <div
            style={{
              background: '#fffdf8',
              border: '1px solid #e6ddc9',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <h2
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#495649',
                margin: '0 0 12px',
                letterSpacing: '0.5px',
              }}
            >
              Informações do Lote
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    margin: 0,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  Tipo
                </p>
                <p style={{ fontSize: '13px', color: '#1e2a22', margin: '4px 0 0', fontWeight: '600' }}>
                  {listing.batchType}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    margin: 0,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  Origem
                </p>
                <p style={{ fontSize: '13px', color: '#1e2a22', margin: '4px 0 0', fontWeight: '600' }}>
                  {listing.origin}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    margin: 0,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  Safra
                </p>
                <p style={{ fontSize: '13px', color: '#1e2a22', margin: '4px 0 0', fontWeight: '600' }}>
                  {listing.safra}
                </p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: '11px',
                    color: '#888',
                    margin: 0,
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  Peso Total
                </p>
                <p style={{ fontSize: '13px', color: '#1e2a22', margin: '4px 0 0', fontWeight: '600' }}>
                  {listing.weightKg} kg
                </p>
              </div>
            </div>
          </div>

          {/* Timeline de eventos (placeholder) */}
          <div
            style={{
              background: '#fffdf8',
              border: '1px solid #e6ddc9',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '24px',
            }}
          >
            <h2
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#495649',
                margin: '0 0 12px',
                letterSpacing: '0.5px',
              }}
            >
              Histórico de Eventos
            </h2>
            <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
              Dados de rastreabilidade do lote (integrado com SmartLot)
            </p>
          </div>

          {/* Ofertas recentes */}
          <div
            style={{
              background: '#fffdf8',
              border: '1px solid #e6ddc9',
              borderRadius: '16px',
              padding: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#495649',
                margin: '0 0 12px',
                letterSpacing: '0.5px',
              }}
            >
              Ofertas Ativas ({offers.filter(o => o.status === 'Pending').length})
            </h2>
            {offers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {offers.map(offer => (
                  <div
                    key={offer.offerId}
                    style={{
                      padding: '12px',
                      background: '#f5f1e7',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: '12px', fontWeight: '600', color: '#1e2a22' }}>
                        {offer.quantityKg} kg × ${offer.pricePerKg.toFixed(2)}/kg
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#888' }}>
                        {truncateAddress(offer.buyer)} • Status:{' '}
                        <strong
                          style={{
                            color:
                              offer.status === 'Pending'
                                ? '#b8912a'
                                : offer.status === 'Accepted'
                                  ? '#1f6440'
                                  : '#a83226',
                          }}
                        >
                          {offer.status}
                        </strong>
                      </p>
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#1f6440',
                      }}
                    >
                      ${offer.totalPrice.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>
                Nenhuma oferta ainda. Seja o primeiro a ofertar!
              </p>
            )}
          </div>
        </div>

        {/* Lado direito: Produtor + Ação */}
        <div>
          {/* Cartão do Produtor */}
          <div
            style={{
              background: '#fffdf8',
              border: '1px solid #e6ddc9',
              borderRadius: '16px',
              padding: '20px',
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '14px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#495649',
                margin: '0 0 16px',
                letterSpacing: '0.5px',
              }}
            >
              Produtor
            </h2>
            <div
              style={{
                background: '#f5f1e7',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                marginBottom: '12px',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#888',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                  letterSpacing: '0.5px',
                }}
              >
                Endereço
              </p>
              <p
                style={{
                  margin: '6px 0 0',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1e2a22',
                  fontFamily: 'monospace',
                }}
              >
                {truncateAddress(listing.seller)}
              </p>
            </div>
            <div style={{ paddingTop: '12px', borderTop: '1px solid #e6ddc9' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#495649' }}>Verificado</span>
                <span style={{ fontSize: '16px' }}>✓</span>
              </div>
            </div>
          </div>

          {/* Botão de Ação */}
          {!isOwnListing ? (
            <button
              onClick={() => setShowOfferModal(true)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                marginBottom: '12px',
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
              + Fazer Oferta
            </button>
          ) : (
            <div
              style={{
                padding: '12px',
                background: '#f0faf4',
                border: '1px solid #d4e6d8',
                borderRadius: '10px',
                fontSize: '12px',
                color: '#1f6440',
                textAlign: 'center',
                fontWeight: '600',
                marginBottom: '12px',
              }}
            >
              Este é seu anúncio
            </div>
          )}

          {/* Card de informações de pagamento */}
          <div
            style={{
              background: '#fffdf8',
              border: '1px solid #e6ddc9',
              borderRadius: '16px',
              padding: '16px',
              fontSize: '12px',
            }}
          >
            <h3
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                color: '#495649',
                margin: '0 0 8px',
                letterSpacing: '0.5px',
              }}
            >
              Informações de Pagamento
            </h3>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#495649' }}>
              <strong>Token:</strong> MockUSDC
            </p>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#495649' }}>
              <strong>Sistema:</strong> Escrow Seguro
            </p>
            <p style={{ margin: '4px 0', fontSize: '12px', color: '#495649' }}>
              <strong>Blockchain:</strong> Sepolia
            </p>
          </div>
        </div>
      </div>

      {/* Modal de Oferta */}
      {showOfferModal && (
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
          onClick={() => setShowOfferModal(false)}
        >
          <div
            style={{
              background: '#fffdf8',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%',
              border: '1px solid #e6ddc9',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1e2a22',
                margin: '0 0 16px',
              }}
            >
              Fazer Oferta
            </h2>

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
                placeholder="0"
                value={offerQuantity}
                onChange={e => setOfferQuantity(e.target.value)}
                max={listing.weightAvailableKg}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #d4cdb8',
                  borderRadius: '10px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888' }}>
                Disponível: {listing.weightAvailableKg} kg
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
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
                placeholder="0.00"
                value={offerPrice}
                onChange={e => setOfferPrice(e.target.value)}
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
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#888' }}>
                Preço anunciado: ${listing.pricePerKg.toFixed(2)}/kg
              </p>
            </div>

            {totalPrice > 0 && (
              <div
                style={{
                  background: '#f5f1e7',
                  borderRadius: '10px',
                  padding: '12px',
                  marginBottom: '16px',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '11px',
                    color: '#888',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                    letterSpacing: '0.5px',
                  }}
                >
                  Total
                </p>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontFamily: 'Georgia, serif',
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#1f6440',
                  }}
                >
                  ${totalPrice.toFixed(2)}
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowOfferModal(false)}
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
                onClick={handleMakeOffer}
                disabled={submitting || !offerQuantity || !offerPrice}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: submitting ? '#ccc' : 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: submitting ? 'default' : 'pointer',
                  fontSize: '12px',
                }}
              >
                {submitting ? 'Enviando...' : 'Enviar Oferta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
