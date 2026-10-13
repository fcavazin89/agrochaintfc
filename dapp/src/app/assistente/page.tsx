'use client';
import { useState } from 'react';

const mockConversation = [
  { role: 'assistant', text: 'Olá! Sou o Assistente de IA da AgroChain. Como posso ajudá-lo com gestão de sua fazenda, rastreabilidade ou compliance?' },
  { role: 'user', text: 'Qual é a melhor época para colher Coffee Arabica em Minas Gerais?' },
  { role: 'assistant', text: 'A melhor época para colher Coffee Arabica em Minas Gerais é entre maio e setembro, especialmente em julho-agosto quando a umidade está mais controlada. Consulte dados históricos da sua fazenda para otimizar a data exata.' },
  { role: 'user', text: 'Como assegurar conformidade com EUDR?' },
  { role: 'assistant', text: 'Para EUDR: 1) Rastrear origem do produto até campo específico; 2) Documentar ausência de desmatamento; 3) Manter certificados ZK de integridade; 4) Cumprir regulamentações de trabalho justo. Usar blockchain para imutabilidade.' },
];

export default function AssistentePage() {
  const [messages, setMessages] = useState(mockConversation);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMsg = { role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        'Excelente pergunta! Vou consultar os dados da sua fazenda...',
        'Com base nos dados históricos, recomendo...',
        'A conformidade blockchain garante...',
        'Segundo as melhores práticas do setor...',
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: 'assistant', text: randomResponse }]);
      setIsLoading(false);
    }, 1200);
  };

  return (
    <div style={{maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: 'calc(100vh - 150px)'}}>
      <div style={{marginBottom: '24px'}}>
        <h1 style={{margin: '0 0 8px', fontFamily: 'Georgia, serif', fontSize: '28px', color: '#1e2a22'}}>
          🤖 Assistente IA
        </h1>
        <p style={{margin: 0, color: '#495649', fontSize: '14px'}}>
          Faça perguntas sobre gestão agrícola, conformidade e rastreabilidade
        </p>
      </div>

      {/* Chat container */}
      <div
        style={{
          flex: 1,
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid #ddd8cc',
          padding: '20px',
          overflowY: 'auto',
          marginBottom: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {msg.role === 'assistant' && (
              <span style={{fontSize: '24px', marginTop: '4px'}}>🤖</span>
            )}
            <div
              style={{
                maxWidth: '70%',
                background: msg.role === 'user' ? '#1f6440' : '#f0faf4',
                color: msg.role === 'user' ? '#fff' : '#1e2a22',
                padding: '12px 16px',
                borderRadius: '12px',
                fontSize: '14px',
                lineHeight: '1.5',
                borderTopLeftRadius: msg.role === 'user' ? 0 : 12,
                borderTopRightRadius: msg.role === 'user' ? 12 : 0,
              }}
            >
              {msg.text}
            </div>
            {msg.role === 'user' && (
              <span style={{fontSize: '24px', marginTop: '4px'}}>👨‍🌾</span>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{display: 'flex', alignItems: 'start', gap: '12px'}}>
            <span style={{fontSize: '24px'}}>🤖</span>
            <div style={{background: '#f0faf4', padding: '12px 16px', borderRadius: '12px', fontSize: '14px'}}>
              ✍️ Digitando...
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{display: 'flex', gap: '12px'}}>
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Digite uma pergunta..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '8px',
            border: '1px solid #ddd8cc',
            fontSize: '14px',
            color: '#1e2a22',
            background: '#fff',
            opacity: isLoading ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !inputValue.trim()}
          style={{
            background: isLoading ? '#888' : '#1f6440',
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          📤 Enviar
        </button>
      </div>

      <div style={{marginTop: '16px', background: '#f9f7f2', border: '1px solid #ddd8cc', borderRadius: '8px', padding: '12px'}}>
        <p style={{margin: 0, fontSize: '12px', color: '#495649'}}>
          💡 Dica: Faça perguntas sobre colheita, certificação, conformidade regulatória ou interpretação de dados.
        </p>
      </div>
    </div>
  );
}
