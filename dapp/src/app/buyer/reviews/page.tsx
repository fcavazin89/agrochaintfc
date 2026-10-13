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
        <span key={i} style={{ fontSize: `${size}px`, color: i <= rating ? '#1f6440' : '#d6c9b0' }}>
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
          fontFamily: 'Georgia, serif',
          fontSize: '28px',
          color: '#1e2a22',
          fontWeight: 600,
        }}
      >
        Reviews & Reputação
      </h1>
      <p
        style={{
          margin: '0 0 24px',
          color: '#495649',
          fontSize: '14px',
        }}
      >
        Envie reviews sobre produtores e veja o histórico de avaliações · {truncateAddress(userAddress || 'Desconectado')}
      </p>

      {/* Seção de Novo Review */}
      <section
        style={{
          background: '#fffdf8',
          border: '1px solid #e6ddc9',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '32px',
          boxShadow: '0 1px 2px rgba(31,42,34,.06)',
        }}
      >
        <h2
          style={{
            margin: '0 0 16px',
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#1e2a22',
            fontWeight: 600,
          }}
        >
          Novo Review
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Select Produtor */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#1e2a22' }}>
              Selecione o Produtor
            </label>
            <select
              value={selectedProducer}
              onChange={(e) => setSelectedProducer(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d6c9b0',
                borderRadius: '10px',
                fontSize: '13px',
                color: '#1e2a22',
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#1e2a22' }}>
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
                background: '#d6c9b0',
                outline: 'none',
                accentColor: '#1f6440',
                cursor: 'pointer',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: '#7c867a' }}>
              <span>Péssimo</span>
              <span>Excelente</span>
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 600, color: '#1e2a22' }}>
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
              border: '1px solid #d6c9b0',
              borderRadius: '10px',
              fontSize: '13px',
              color: '#1e2a22',
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
            background: 'linear-gradient(180deg, #1f6440 0%, #195236 100%)',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px',
            transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.06), 0 12px 28px -20px rgba(19,66,44,.35)';
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
            fontFamily: 'Georgia, serif',
            fontSize: '18px',
            color: '#1e2a22',
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
                background: '#fffdf8',
                border: '1px solid #e6ddc9',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 1px 2px rgba(31,42,34,.06)',
                transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.05), 0 12px 28px -20px rgba(19,66,44,.35)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 2px rgba(31,42,34,.06)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Cabeçalho do Card */}
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e6ddc9' }}>
                <h3
                  style={{
                    margin: '0 0 4px',
                    fontFamily: 'Georgia, serif',
                    fontSize: '15px',
                    color: '#1e2a22',
                    fontWeight: 600,
                  }}
                >
                  {producer.nome}
                </h3>
                <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#495649' }}>
                  {producer.empresa}
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  {renderStars(Math.round(producer.ratingMedio), 14)}
                </div>
                <p style={{ margin: '0', fontSize: '12px', color: '#7c867a', fontWeight: 500 }}>
                  {producer.ratingMedio > 0 ? `${producer.ratingMedio.toFixed(1)}/5.0` : 'Sem reviews'}
                </p>
              </div>

              {/* Estatísticas */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Reputação
                  </p>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 600, color: '#1f6440' }}>
                    {producer.reputacao}%
                  </p>
                </div>
                <div>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: '#7c867a', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
                    Transações
                  </p>
                  <p style={{ margin: '0', fontSize: '18px', fontWeight: 600, color: '#1f6440' }}>
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
                  background: expandedProducer === producer.produtor ? '#e8f2ea' : '#f2ecdd',
                  color: expandedProducer === producer.produtor ? '#1f6440' : '#495649',
                  border: `1px solid ${expandedProducer === producer.produtor ? '#d1e4d8' : '#d6c9b0'}`,
                  padding: '10px 16px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '13px',
                  transition: 'all 120ms cubic-bezier(.2,.7,.3,1)',
                }}
                onMouseEnter={(e) => {
                  if (expandedProducer === producer.produtor) {
                    e.currentTarget.style.background = '#d1e4d8';
                  } else {
                    e.currentTarget.style.background = '#e8e0cd';
                  }
                }}
                onMouseLeave={(e) => {
                  if (expandedProducer === producer.produtor) {
                    e.currentTarget.style.background = '#e8f2ea';
                  } else {
                    e.currentTarget.style.background = '#f2ecdd';
                  }
                }}
              >
                {expandedProducer === producer.produtor ? '▼ Ocultar' : '▶ Ver Reviews'} ({producer.reviews.length})
              </button>

              {/* Reviews Expandidos */}
              {expandedProducer === producer.produtor && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e6ddc9' }}>
                  {producer.reviews.length === 0 ? (
                    <p style={{ margin: '0', fontSize: '12px', color: '#7c867a', fontStyle: 'italic' }}>
                      Nenhum review enviado para este produtor
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {producer.reviews.map((review) => (
                        <div
                          key={review.id}
                          style={{
                            background: '#f5f1e7',
                            border: '1px solid #e8e0cd',
                            borderRadius: '8px',
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
                                color: '#1f6440',
                                background: '#e8f2ea',
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {review.status}
                            </span>
                          </div>
                          <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#1e2a22', lineHeight: '1.4' }}>
                            {review.texto}
                          </p>
                          <p style={{ margin: '0', fontSize: '11px', color: '#7c867a' }}>
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
      <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e6ddc9' }}>
        <p style={{ margin: '0', fontSize: '11px', color: '#7c867a' }}>
          <strong>Dados mockados · Integração Sepolia</strong> · AgroChain v2.0 · Reviews Page
        </p>
      </div>
    </div>
  );
}
