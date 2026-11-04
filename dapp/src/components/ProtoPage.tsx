'use client';
import { useEffect, useRef } from 'react';

/**
 * Ordem de carregamento dos scripts do protótipo AgroChain.
 * A sequência é obrigatória — cada módulo depende dos anteriores e captura os
 * globais (App, Ledger, Erp, IoT...) no momento em que é avaliado.
 *
 * Observação: `11_web3.js` NÃO faz parte do bundle combinado do protótipo
 * (não consta em `prototipo-agrochain/construir.py`) e usa sintaxe de módulo
 * ES (`export`), por isso não é carregado aqui como script clássico.
 */
const PROTO_SCRIPTS = [
  '/proto/snarkjs.min.js',
  '/proto/10_dados.js',
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

const CSS_ID = 'proto-css';
const OVERRIDES_ID = 'proto-embed-overrides';

/**
 * O protótipo foi escrito para rodar sozinho e renderiza a sua própria barra
 * superior (`.topo`) e o seu próprio menu lateral (`.menu`). Como o dapp já
 * fornece TopBar e Sidebar, escondemos essas duas peças duplicadas dentro do
 * `#app` e deixamos apenas a área de conteúdo (`.conteudo`).
 * `#app` é exclusivo desta tela, então a TopBar do dapp não é afetada.
 */
const OVERRIDES_CSS = `
#app > .topo { display: none !important; }
#app .corpo { max-width: none !important; padding: 0 !important; gap: 0 !important; }
#app .corpo > .menu { display: none !important; }
`;

interface ProtoPageProps {
  /** Nome da view no protótipo — passado para App.irPara(view) */
  view: string;
  titulo: string;
  subtitulo: string;
}

/** Promise compartilhada: os scripts são baixados e avaliados uma única vez. */
let loadPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-proto-src="${src}"]`
    );
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
      } else {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () =>
          reject(new Error(`Falha ao carregar ${src}`))
        );
      }
      return;
    }
    const el = document.createElement('script');
    el.src = src;
    el.async = false; // preserva a ordem de execução
    el.dataset.protoSrc = src;
    el.addEventListener('load', () => {
      el.dataset.loaded = 'true';
      resolve();
    });
    el.addEventListener('error', () => reject(new Error(`Falha ao carregar ${src}`)));
    document.head.appendChild(el);
  });
}

function loadAllScripts(): Promise<void> {
  if (!loadPromise) {
    loadPromise = PROTO_SCRIPTS.reduce(
      (chain, src) => chain.then(() => loadScript(src)),
      Promise.resolve()
    );
  }
  return loadPromise;
}

export default function ProtoPage({ view, titulo, subtitulo }: ProtoPageProps) {
  const bootedRef = useRef(false);

  // Injetar o CSS do protótipo no <head> uma única vez
  useEffect(() => {
    if (!document.getElementById(CSS_ID)) {
      const link = document.createElement('link');
      link.id = CSS_ID;
      link.rel = 'stylesheet';
      link.href = '/proto/proto.css';
      document.head.appendChild(link);
    }
    if (!document.getElementById(OVERRIDES_ID)) {
      const style = document.createElement('style');
      style.id = OVERRIDES_ID;
      style.textContent = OVERRIDES_CSS;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    loadAllScripts()
      .then(() => {
        if (cancelled) return;
        const w = window as any;
        if (!w.App || typeof w.App.irPara !== 'function') {
          console.error('[ProtoPage] App não disponível após carregar os módulos');
          return;
        }

        // Inicializa a aplicação (constrói o ledger) apenas uma vez.
        if (!bootedRef.current && !w.__agrochainBooted) {
          try {
            if (typeof w.App.iniciar === 'function') w.App.iniciar();
            w.__agrochainBooted = true;
            bootedRef.current = true;
          } catch (e) {
            console.error('[ProtoPage] App.iniciar falhou:', e);
          }
        }

        try {
          w.App.irPara(view);
        } catch (e) {
          console.error('[ProtoPage] App.irPara falhou:', e);
        }
      })
      .catch((e) => {
        if (!cancelled) console.error('[ProtoPage]', e);
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  return (
    <div>
      {/* Cabeçalho padrão design.md v3.0 */}
      <div className="tela-cabecalho">
        <div>
          <h1 className="tela-titulo">{titulo}</h1>
          <p className="tela-sub">{subtitulo}</p>
        </div>
      </div>

      {/* Container onde o protótipo renderiza */}
      <div
        id="app"
        style={{ minHeight: '600px' }}
        aria-label={`Conteúdo da tela ${titulo}`}
      />

      {/* Infraestrutura de toasts e tooltip do protótipo */}
      <div id="toasts" className="toasts" aria-live="polite" />
      <div id="tooltip-graf" role="status" aria-live="polite" />
    </div>
  );
}
