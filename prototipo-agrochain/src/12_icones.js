/* =========================================================================
 * AGROCHAIN · CONJUNTO DE ÍCONES
 * Ícones desenhados à mão em SVG, de traço único e monocromáticos (herdam a
 * cor do texto via currentColor). Existem por três razões:
 *   1. o app não pode depender de fonte de ícones nem de rede;
 *   2. emoji colorido não combina com um sistema de gestão — e em Linux sem
 *      fonte de emoji vira "quadradinho" ilegível;
 *   3. ícone de navegação e de identidade ajuda; ícone decorativo em título
 *      atrapalha. Por isso a biblioteca é curta e usada com parcimônia:
 *      menu, perfis, dispositivos de campo, logo e estados vazios.
 * ========================================================================= */
(function (global) {
  'use strict';

  var CAMINHOS = {
    /* ---- navegação ---- */
    painel: '<rect x="3" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8"/>',
    lavoura: '<path d="M20 4C12.5 4 6 8.6 4.4 16.2 4 18.3 4.2 20 4.2 20s2.2-.4 4.3-.8C16.1 17.6 20 11.5 20 4Z"/><path d="M4.6 19.4C8 15 11.6 11.4 16 9"/>',
    lotes: '<path d="M12 3 20.5 7.6v8.8L12 21 3.5 16.4V7.6L12 3Z"/><path d="M3.5 7.6 12 12.2l8.5-4.6M12 12.2V21"/>',
    erp: '<path d="M6 3h12v18l-3-1.9-3 1.9-3-1.9L6 21V3Z"/><path d="M9.6 8.2h4.8M9.6 12.2h4.8"/>',
    ia: '<rect x="7" y="7" width="10" height="10" rx="2.4"/><path d="M10 3.2v3.8M14 3.2v3.8M10 17v3.8M14 17v3.8M3.2 10h3.8M3.2 14h3.8M17 10h3.8M17 14h3.8"/>',
    iot: '<circle cx="12" cy="12" r="2.2"/><path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2"/>',
    cadeia: '<circle cx="7" cy="7" r="3.4"/><circle cx="17" cy="17" r="3.4"/><path d="M9.5 9.5 14.5 14.5"/>',
    mercado: '<rect x="3" y="7.6" width="18" height="12.4" rx="2.4"/><path d="M9 7.6V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.6M3 12.6h18"/>',
    selo: '<circle cx="12" cy="9.4" r="5.6"/><path d="m9.7 9.4 1.6 1.6 3.1-3.3"/><path d="M8.6 14.2 7 21l5-2.1L17 21l-1.6-6.8"/>',
    auditoria: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.7 4.7"/>',
    assistente: '<path d="M20.6 12.4a7.6 7.6 0 0 1-11 6.8L4 20.6l1.4-5.1a7.6 7.6 0 1 1 15.2-3.1Z"/>',
    sobre: '<circle cx="12" cy="12" r="8.6"/><path d="M12 11.2v5.4M12 7.9v.2"/>',

    /* ---- perfis ---- */
    produtor: '<circle cx="12" cy="8" r="3.4"/><path d="M5.6 20a6.4 6.4 0 0 1 12.8 0"/>',
    cooperativa: '<path d="M4 20V9.4L12 4l8 5.4V20"/><path d="M9.2 20v-6h5.6v6"/>',
    industria: '<path d="M3 20V10l4.4 2.8V10L11.8 12.8V10l4.4 2.8V7l4.8 3.2V20Z"/>',
    certificadora: '<circle cx="12" cy="9.4" r="5.6"/><path d="m9.7 9.4 1.6 1.6 3.1-3.3"/><path d="M8.6 14.2 7 21l5-2.1L17 21l-1.6-6.8"/>',
    auditor: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="m15.3 15.3 4.7 4.7"/><path d="M8.4 10.6h4.4"/>',

    /* ---- identidade ---- */
    semente: '<path d="M12 21V11.4"/><path d="M12 11.4C12 6.8 15.6 3 20 3c0 4.6-3.6 8.4-8 8.4Z"/><path d="M12 15.6c0-3.6-2.8-6.4-6.2-6.4 0 3.6 2.8 6.4 6.2 6.4Z"/>',

    /* ---- dispositivos de campo ---- */
    estacao: '<path d="M6.6 15.4a3.6 3.6 0 0 1 0-7.2 5.2 5.2 0 0 1 9.9-1.2 3.6 3.6 0 0 1 1.6 8.4Z"/><path d="M12 3.4v1.4M7.2 4.6l1 1.3M16.8 4.6l-1 1.3"/>',
    solo: '<path d="M12 3.6S6.6 10 6.6 14a5.4 5.4 0 0 0 10.8 0c0-4-5.4-10.4-5.4-10.4Z"/><path d="M4 20h16"/>',
    fermentacao: '<path d="M10 13.8V5.2a2 2 0 1 1 4 0v8.6a4.2 4.2 0 1 1-4 0Z"/><path d="M12 17.4v-6.2"/>',
    secagem: '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.4M12 19v2.4M2.6 12H5M19 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"/>',
    folha: '<path d="M20 4.4C13 4.4 7 8.6 5.6 15.4c-.3 1.8-.2 3.2-.2 3.2s1.8-.3 3.6-.7C15.6 16.4 20 11 20 4.4Z"/><path d="M6 18.6C9 14.6 12.4 11.4 16.4 9.4"/>',
    agua: '<path d="M12 3.6S6.6 10 6.6 14a5.4 5.4 0 0 0 10.8 0c0-4-5.4-10.4-5.4-10.4Z"/>',
    gateway: '<path d="M12 21V9.6"/><circle cx="12" cy="6.4" r="2.2"/><path d="M8.4 12.4a6 6 0 0 0 7.2 0M5.6 9.6a10 10 0 0 0 12.8 0"/>',

    /* ---- estados ---- */
    grafico: '<path d="M4 19.6h16"/><path d="M6.6 16V11M11 16V7.4M15.4 16v-5.6M19.4 16V5"/>',
    alerta: '<path d="M12 4 21 19.6H3L12 4Z"/><path d="M12 10v4.2M12 16.6v.2"/>',
    estrela: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1.2 5.9L12 16.8l-5.4 3 1.2-5.9L3.5 9.8l5.9-.8L12 3.6Z"/>',
    escudo: '<path d="M12 3.2 20 6v6.2c0 4.5-3.2 7.4-8 8.6-4.8-1.2-8-4.1-8-8.6V6l8-2.8Z"/><path d="m9 12 2.2 2.2 4-4.3"/>',
    expandir: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'
  };

  var TAMANHO = { xs: 13, sm: 15, md: 17, lg: 22, xl: 30 };

  /** Devolve o SVG do ícone. `nome` inexistente devolve string vazia —
      melhor um espaço do que um quadradinho quebrado na tela. */
  function svg(nome, tamanho, extra) {
    var d = CAMINHOS[nome];
    if (!d) return '';
    var t = typeof tamanho === 'string' ? (TAMANHO[tamanho] || TAMANHO.md) : (tamanho || TAMANHO.md);
    return '<svg class="ico-svg" width="' + t + '" height="' + t + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true" focusable="false"' + (extra ? ' ' + extra : '') + '>' + d + '</svg>';
  }

  function existe(nome) { return !!CAMINHOS[nome]; }

  global.Ico = { svg: svg, existe: existe, CAMINHOS: CAMINHOS, TAMANHO: TAMANHO };
})(typeof window !== 'undefined' ? window : globalThis);
