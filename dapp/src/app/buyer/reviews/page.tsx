'use client';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import type { Review, ProducerReview } from '@/types/agrochain';
import {
  MOCK_PURCHASE_ORDERS,
  MOCK_REVIEWS,
  groupReviewsByProducer,
  truncateAddress,
} from '@/lib/contracts/buyer';

export default function ReviewsPage() {
  const { address: userAddress } = useAccount();
  const [producers, setProducers] = useState<ProducerReview[]>([]);
  const [expandedProducer, setExpandedProducer] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>(MOCK_REVIEWS);
  const [selectedProducer, setSelectedProducer] = useState<string>('');
  const [rating, setRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>('');

  // Inicializa produtores e reviews ao carregar
  useEffect(() => {
    const grouped = groupReviewsByProducer(MOCK_PURCHASE_ORDERS, reviews, []);
    setProducers(grouped);
    if (grouped.length > 0 && !selectedProducer) {
      setSelectedProducer(grouped[0].produtor);
    }
  }, [reviews, selectedProducer]);

  const handleAddReview = () => {
    if (!selectedProducer || !reviewText.trim()) {
      alert('Selecione um produtor e escreva um review');
      return;
    }

    // Cria novo review
    const newReview: Review = {
      id: String(reviews.length + 1),
      orderId: '1', // Placeholder - em produção seria baseado no pedido selecionado
      dataEnvio: Date.now(),
      rating,
      texto: reviewText,
      status: 'Enviado',
    };

    // Adiciona ao histórico
    const updated = [...reviews, newReview];
    setReviews(updated);

    // Limpa formulário
    setReviewText('');
    setRating(5);

    // Recomputa produtores
    const grouped = groupReviewsByProducer(MOCK_PURCHASE_ORDERS, updated, []);
    setProducers(grouped);
  };

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} style={{ fontSize: `${size}px`, color: i <= rating ? 'var(--verde-600)' : 'var(--linha-forte)' }}>
          ★
        </span>
      );
    }
    return stars;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div style={{ maxWidth: '1320px', margin: '0 auto' }}>
      {/* Cabeçalho */}
      <h1
        style={{
          margin: '0 0 8px',
          fontFamily: 'var(--serifa)',
          fontSize: '28px',
          color: 'var(--texto-1)',
          fontWeight: 600,
        }}
      >
        Reviews & Reputação
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          color: 'var(--texto-2)',
          fontSize: '14px',
        }}
      >
        Envie reviews sobre produtores e veja o histórico de avaliações · {truncateAddress(userAddress || 'Desconectado')}
      </p>

      {/* Seção de Novo Review */}
      <section
        style={{
          background: 'var(--sup-1)',
          border: '1px solid var(--linha)',
          borderRadius: 'var(--raio)',
          padding: 'var(--e-5)',
          marginBottom: 'var(--e-6)',
          boxShadow: 'var(--sombra)',
        }}
      >
        <h2
          style={{
            margin: '0 0 16px',
            fontFamily: 'var(--serifa)',
            fontSize: '18px',
            color: 'var(--texto-1)',
            fontWeight: 600,
          }}
        >
          Novo Review
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Select Produtor */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--texto-1)' }}>
              Selecione o Produtor
            </label>
            <select
              value={selectedProducer}
              onChange={(e) => setSelectedProducer(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--linha-forte)',
                borderRadius: 'var(--raio-sm)',
                fontSize: '13px',
                color: 'var(--texto-1)',
                background: '#fff',
                fontFamily: 'var(--fonte)',
                cursor: 'pointer',
              }}
            >
              {producers.map((prod) => (
                <option key={prod.produtor} value={prod.produtor}>
                  {prod.nome} - {prod.empresa}
                </option>
              ))}
            </select>
          </div>

          {/* Slider Rating */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--texto-1)' }}>
              Rating: {rating} ⭐
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: 'var(--linha-forte)',
                outline: 'none',
                accentColor: 'var(--verde-600)',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--texto-3)' }}>
              <span>Péssimo</span>
              <span>Excelente</span>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--texto-1)' }}>
            Review ({reviewText.length}/300 caracteres)
          </label>
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value.slice(0, 300))}
            maxLength={300}
            placeholder="Compartilhe sua experiência com este produtor..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1px solid var(--linha-forte)',
              borderRadius: 'var(--raio-sm)',
              fontSize: '13px',
              color: 'var(--texto-1)',
              background: '#fff',
              fontFamily: 'var(--fonte)',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Botão Enviar */}
        <button
          onClick={handleAddReview}
          style={{
            background: 'linear-gradient(180deg, var(--verde-600) 0%, var(--verde-700) 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: 'var(--raio-sm)',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all var(--t-rapida)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = 'var(--sombra-2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          Enviar Review
        </button>
      </section>

      {/* Seção de Produtores e Reviews */}
      <section>
        <h2
          style={{
            margin: '0 0 16px',
            fontFamily: 'var(--serifa)',
            fontSize: '18px',
            color: 'var(--texto-1)',
            fontWeight: 600,
          }}
        >
          Produtores e Histórico de Reviews
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {producers.map((producer) => (
            <div
              key={producer.produtor}
              style={{
                background: 'var(--sup-1)',
                border: '1px solid var(--linha)',
                borderRadius: 'var(--raio)',
                padding: 'var(--e-5)',
                boxShadow: 'var(--sombra)',
                transition: 'all var(--t-rapida)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = 'var(--sombra-2)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'var(--sombra)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Cabeçalho do Card */}
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--linha)' }}>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontFamily: 'var(--serifa)',
                    fontSize: '15px',
                    color: 'var(--texto-1)',
                    fontWeight: 600,
                  }}
                >
                  {producer.nome}
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: 'var(--texto-2)' }}>
                  {producer.empresa}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {renderStars(Math.round(producer.ratingMedio), 14)}
                </div>
                <p style={{ margin: '0', fontSize: '12px', color: 'var(--texto-3)', fontWeight: 500 }}>
                  {producer.ratingMedio > 0 ? `${producer.ratingMedio.toFixed(1)}/5.0` : 'Sem reviews'}
                </p>
              </div>

              {/* Estatísticas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Reputação
                  </p>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 600, color: 'var(--verde-600)' }}>
                    {producer.reputacao}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: 'var(--texto-3)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Transações
                  </p>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 600, color: 'var(--verde-600)' }}>
                    {producer.totalTransacoes}
                  </p>
                </div>
              </div>

              {/* Botão Expandir */}
              <button
                onClick={() =>
                  setExpandedProducer(
                    expandedProducer === producer.produtor ? null : producer.produtor
                  )
                }
                style={{
                  width: '100%',
                  background: expandedProducer === producer.produtor ? 'var(--verde-100)' : 'var(--sup-2)',
                  color: expandedProducer === producer.produtor ? 'var(--verde-600)' : 'var(--texto-2)',
                  border: `1px solid ${expandedProducer === producer.produtor ? '#d1e4d8' : 'var(--linha-forte)'}`,
                  padding: '10px 16px',
                  borderRadius: 'var(--raio-sm)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all var(--t-rapida)',
                }}
                onMouseEnter={(e) => {
                  if (expandedProducer === producer.produtor) {
                    e.currentTarget.style.background = '#d1e4d8';
                  } else {
                    e.currentTarget.style.background = 'var(--sup-3)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (expandedProducer === producer.produtor) {
                    e.currentTarget.style.background = 'var(--verde-100)';
                  } else {
                    e.currentTarget.style.background = 'var(--sup-2)';
                  }
                }}
              >
                {expandedProducer === producer.produtor ? '▼ Ocultar' : '▶ Ver Reviews'} ({producer.reviews.length})
              </button>

              {/* Reviews Expandidos */}
              {expandedProducer === producer.produtor && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
                  {producer.reviews.length === 0 ? (
                    <p style={{ margin: '0', fontSize: '12px', color: 'var(--texto-3)', fontStyle: 'italic' }}>
                      Nenhum review enviado para este produtor
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {producer.reviews.map((review) => (
                        <div
                          key={review.id}
                          style={{
                            background: 'var(--fundo)',
                            border: '1px solid var(--sup-2)',
                            borderRadius: 'var(--raio-xs)',
                            padding: '12px',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              {renderStars(review.rating, 13)}
                            </div>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: 'var(--verde-600)',
                                background: 'var(--verde-100)',
                                padding: '2px 8px',
                                borderRadius: 'var(--raio-xs)',
                              }}
                            >
                              {review.status}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--texto-1)', lineHeight: '1.4' }}>
                            {review.texto}
                          </p>
                          <p style={{ margin: '0', fontSize: '11px', color: 'var(--texto-3)' }}>
                            {formatDate(review.dataEnvio)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rodapé */}
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--linha)' }}>
        <p style={{ margin: '0', fontSize: '11px', color: 'var(--texto-3)' }}>
          <strong>Dados mockados · Integração Sepolia</strong> · AgroChain v2.0 · Reviews Page
        </p>
      </div>
    </div>
  );
}
