'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';

const FarmGlobe = dynamic(
  () => import('@/components/three/FarmGlobe').then(m => m.FarmGlobe),
  { ssr: false, loading: () => <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f3f7f2'}}>Carregando...</div> }
);

export default function ImersivePage() {
  const [isDayMode, setIsDayMode] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isDayMode ? '#87ceeb' : '#0a1428',
        overflow: 'hidden',
        zIndex: 50,
      }}
    >
      {/* 3D Content */}
      <div style={{width: '100%', height: '100%', position: 'relative'}}>
        <FarmGlobe />
      </div>

      {/* UI Overlay */}
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none'}}>
        {/* Top bar */}
        <div style={{pointerEvents: 'auto', background: 'rgba(0,0,0,0.5)', color: '#f3f7f2', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1 style={{margin: 0, fontFamily: 'Georgia, serif', fontSize: '24px', color: '#fff'}}>
            🌾 Modo Imersivo — AgroChain 3D
          </h1>
          <div style={{display: 'flex', gap: '12px'}}>
            <button
              onClick={() => setIsDayMode(!isDayMode)}
              style={{
                background: isDayMode ? '#ffb81c' : '#1f6440',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
              }}
            >
              {isDayMode ? '🌙 Noite' : '☀️ Dia'}
            </button>
          </div>
        </div>

        {/* Bottom left - Instructions */}
        <div
          style={{
            pointerEvents: 'auto',
            position: 'absolute',
            bottom: 24,
            left: 24,
            background: 'rgba(0,0,0,0.6)',
            color: '#f3f7f2',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '280px',
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          <p style={{margin: '0 0 12px', fontWeight: '700'}}>🎮 Controles</p>
          <ul style={{margin: 0, paddingLeft: '20px'}}>
            <li>Arraste para girar a vista</li>
            <li>Scroll para zoom</li>
            <li>Clique nos nós para detalhes</li>
            <li>Espaço: alternar modo órbita</li>
          </ul>
        </div>

        {/* Bottom right - Info */}
        <div
          style={{
            pointerEvents: 'auto',
            position: 'absolute',
            bottom: 24,
            right: 24,
            background: 'rgba(0,0,0,0.6)',
            color: '#f3f7f2',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '300px',
            fontSize: '13px',
          }}
        >
          <p style={{margin: '0 0 8px', fontWeight: '700'}}>📊 Estatísticas</p>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
            <div>
              <p style={{margin: 0, fontSize: '11px', color: '#aaa'}}>Fazendas</p>
              <p style={{margin: '2px 0 0', fontSize: '16px', fontWeight: '700', color: '#2f8f52'}}>24</p>
            </div>
            <div>
              <p style={{margin: 0, fontSize: '11px', color: '#aaa'}}>Sensores</p>
              <p style={{margin: '2px 0 0', fontSize: '16px', fontWeight: '700', color: '#1f6440'}}>89</p>
            </div>
            <div>
              <p style={{margin: 0, fontSize: '11px', color: '#aaa'}}>Certificações</p>
              <p style={{margin: '2px 0 0', fontSize: '16px', fontWeight: '700', color: '#b8912a'}}>156</p>
            </div>
            <div>
              <p style={{margin: 0, fontSize: '11px', color: '#aaa'}}>Compliance</p>
              <p style={{margin: '2px 0 0', fontSize: '16px', fontWeight: '700', color: '#2f8f52'}}>98.2%</p>
            </div>
          </div>
        </div>

        {/* Top right - Close button */}
        <a
          href="/dashboard"
          style={{
            pointerEvents: 'auto',
            position: 'absolute',
            top: 76,
            right: 24,
            background: '#a83226',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          ✕ Sair
        </a>
      </div>

      {/* Center notification */}
      <div
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: '#f3f7f2',
          padding: '24px 32px',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px',
          opacity: showInfo ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
      >
        <p style={{margin: 0, fontSize: '16px', fontWeight: '700'}}>🌍 Clique em um ponto no globo</p>
        <p style={{margin: '8px 0 0', fontSize: '13px', color: '#aaa'}}>para ver detalhes da fazenda e certificações</p>
      </div>

      {/* Hidden info to show on hover */}
      <div
        onMouseEnter={() => setShowInfo(true)}
        onMouseLeave={() => setShowInfo(false)}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100px',
          height: '100px',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'auto',
        }}
      />
    </div>
  );
}
