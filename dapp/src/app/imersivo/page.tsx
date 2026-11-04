'use client';
import { useEffect, useRef } from 'react';
import Script from 'next/script';

const PROTO_SCRIPTS = [
  '/proto/snarkjs.min.js',
  '/proto/10_dados.js',
  '/proto/11_web3.js',
  '/proto/12_icones.js',
  '/proto/15_graficos.js',
  '/proto/20_ia.js',
  '/proto/30_crypto.js',
  '/proto/40_qr.js',
  '/proto/45_iot.js',
  '/proto/50_ledger.js',
  '/proto/55_erp.js',
  '/proto/60_app.js',
  '/proto/70_app2.js',
  '/proto/80_iot_ui.js',
  '/proto/85_erp_ui.js',
  '/proto/88_imersivo.js',
];

export default function ImersivePage() {
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!document.getElementById('proto-css')) {
      const link = document.createElement('link');
      link.id = 'proto-css';
      link.rel = 'stylesheet';
      link.href = '/proto/proto.css';
      document.head.appendChild(link);
    }
  }, []);

  const handleLastScript = () => {
    const interval = setInterval(() => {
      const w = window as any;
      if (w.App && w.Imersivo) {
        if (!loadedRef.current) {
          loadedRef.current = true;
          w.App.irPara('painel'); // inicializa app
          setTimeout(() => w.Imersivo.abrir(), 300);
        }
        clearInterval(interval);
      }
    }, 150);
    setTimeout(() => clearInterval(interval), 10000);
  };

  return (
    <div>
      <div className="tela-cabecalho">
        <div>
          <h1 className="tela-titulo">Modo Imersivo</h1>
          <p className="tela-sub">Painel de acompanhamento em tela cheia · Esc para sair</p>
        </div>
      </div>
      {PROTO_SCRIPTS.map((src, i) => (
        <Script
          key={src}
          id={`proto-imersivo-${i}`}
          src={src}
          strategy="afterInteractive"
          onLoad={i === PROTO_SCRIPTS.length - 1 ? handleLastScript : undefined}
        />
      ))}
      <div id="app" style={{ minHeight: '400px' }} />
      <div id="imersivo" className="imersivo off" aria-hidden="true" />
      <div id="toasts" className="toasts" aria-live="polite" />
      <div id="tooltip-graf" role="status" />
    </div>
  );
}
