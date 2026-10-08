/* =========================================================================
 * AGROCHAIN · BIBLIOTECA DE GRÁFICOS (SVG próprio, sem dependência externa)
 * Implementa o catálogo do design.md §6.9: linha, área, barras (simples,
 * agrupadas e empilhadas), cascata, rosca, medidor, heatmap e sparkline.
 * Tudo em SVG desenhado à mão — o app precisa funcionar sem internet.
 * ========================================================================= */
(function (global) {
  'use strict';

  /* Paleta de séries — ordem fixa definida no design.md */
  var CORES = {
    verde: '#2f8f52',   // café / ação principal
    cacau: '#b07d4f',   // cacau / madeira
    ouro: '#c9a227',    // valor econômico
    agua: '#1d6fa5',    // água / medição
    ia: '#6b4fa8',      // inteligência artificial / criptografia
    atencao: '#d97706',
    risco: '#c0392b',
    ref: '#7b8791',
    claro: '#e8c95a'
  };
  var SERIES = [CORES.verde, CORES.cacau, CORES.ouro, CORES.agua, CORES.ia, CORES.atencao, CORES.risco, CORES.ref];

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function num(v, d) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d });
  }
  function brl(v, d) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return 'R$ ' + num(v, d === undefined ? 0 : d);
  }
  function compacto(v) {
    var a = Math.abs(v);
    if (a >= 1e6) return num(v / 1e6, 1) + ' mi';
    if (a >= 1e3) return num(v / 1e3, a >= 1e4 ? 0 : 1) + ' mil';
    return num(v, 0);
  }

  /* ---------------------------------------------------------------------
   * TOOLTIP
   * Um único elemento no documento, posicionado no ponteiro. Os gráficos
   * publicam o conteúdo em data-tip e um listener delegado cuida do resto —
   * assim nenhum gráfico precisa carregar handler próprio.
   * ------------------------------------------------------------------- */
  var listenerInstalado = false;
  function instalarListener() {
    if (listenerInstalado || typeof document === 'undefined' || !document.addEventListener) return;
    listenerInstalado = true;
    document.addEventListener('mousemove', function (ev) {
      var el = ev.target;
      while (el && el !== document && !(el.getAttribute && el.getAttribute('data-tip'))) el = el.parentNode;
      if (!el || el === document || !el.getAttribute) { esconder(); return; }
      mostrar(el.getAttribute('data-tip'), ev.clientX, ev.clientY);
    });
    document.addEventListener('mouseleave', esconder);
    document.addEventListener('touchstart', function (ev) {
      var el = ev.target;
      while (el && el !== document && !(el.getAttribute && el.getAttribute('data-tip'))) el = el.parentNode;
      if (el && el !== document && el.getAttribute) {
        var t = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
        mostrar(el.getAttribute('data-tip'), t.left + t.width / 2, t.top);
      }
    }, { passive: true });
  }
  function mostrar(html, x, y) {
    var el = typeof document !== 'undefined' && document.getElementById ? document.getElementById('tooltip-graf') : null;
    if (!el) return;
    el.innerHTML = html;
    el.className = 'tooltip-graf on';
    var largura = 250;
    var px = Math.min(Math.max(8, x + 14), (global.innerWidth || 1200) - largura);
    var py = Math.max(8, y - 12);
    el.style.left = px + 'px';
    el.style.top = py + 'px';
  }
  function esconder() {
    var el = typeof document !== 'undefined' && document.getElementById ? document.getElementById('tooltip-graf') : null;
    if (el) el.className = 'tooltip-graf';
  }
  function tip(linhas) {
    return esc(linhas.filter(Boolean).join(' · '));
  }

  /* =====================================================================
   * LINHA / ÁREA
   * series: [{ nome, dados:[{x, y} | número], cor }]
   * opts: { largura, altura, faixas:[{de,ate,nome,cor}], unidade, formato,
   *         rotuloY, area, rotuloX }
   * =================================================================== */
  function linha(series, opts) {
    opts = opts || {};
    var L = opts.largura || 660, A = opts.altura || 210;
    var ml = 56, mr = 16, mt = 16, mb = 28;
    series = series.filter(function (s) { return s && s.dados && s.dados.length; });
    if (!series.length) return vazio(opts.mensagem || 'Sem dados para o período');

    function pontos(s) {
      return s.dados.map(function (d, i) {
        return { x: (typeof d === 'object' ? (d.x === undefined ? i : d.x) : i), y: (typeof d === 'object' ? d.y : d), rot: (typeof d === 'object' ? d.rot : null) };
      });
    }
    var todas = [];
    series.forEach(function (s) { pontos(s).forEach(function (p) { if (typeof p.y === 'number' && !isNaN(p.y)) todas.push(p.y); }); });
    if (!todas.length) return vazio(opts.mensagem || 'Sem dados para o período');
    var n = Math.max.apply(null, series.map(function (s) { return pontos(s).length; }));
    var mn = Math.min.apply(null, todas), mx = Math.max.apply(null, todas);
    if (opts.baseZero) mn = Math.min(0, mn);
    var folga = (mx - mn) * 0.14 || Math.abs(mx) * 0.2 || 1;
    mn -= folga; mx += folga;
    (opts.faixas || []).forEach(function (f) { mn = Math.min(mn, f.de); mx = Math.max(mx, f.ate); });

    function px(i) { return ml + (L - ml - mr) * (n === 1 ? 0.5 : i / (n - 1)); }
    function py(v) { return mt + (A - mt - mb) * (1 - (v - mn) / (mx - mn)); }
    var fmt = opts.formato || function (v) { return num(v, 0); };

    var svg = '<svg viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' + esc(opts.aria || ('Gráfico de linha: ' + series.map(function (s) { return s.nome; }).join(', '))) + '">';
    svg += '<defs>' + series.map(function (s, i) {
      var c = s.cor || SERIES[i % SERIES.length];
      return '<linearGradient id="gradArea' + i + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + c + '" stop-opacity=".22"/>' +
        '<stop offset="100%" stop-color="' + c + '" stop-opacity="0"/></linearGradient>';
    }).join('') + '</defs>';

    /* faixas de referência */
    (opts.faixas || []).forEach(function (f) {
      var y1 = py(Math.min(mx, f.ate)), y2 = py(Math.max(mn, f.de));
      svg += '<rect x="' + ml + '" y="' + y1.toFixed(1) + '" width="' + (L - ml - mr) + '" height="' + Math.max(1, y2 - y1).toFixed(1) + '" fill="' + (f.cor || 'rgba(47,143,82,.10)') + '"/>';
      if (f.nome) svg += '<text class="faixa-rot" x="' + (L - mr - 4) + '" y="' + (y1 + 11).toFixed(1) + '" text-anchor="end">' + esc(f.nome) + '</text>';
    });

    /* grade + eixo Y */
    for (var g = 0; g <= 4; g++) {
      var vv = mn + (mx - mn) * g / 4, y = py(vv);
      svg += '<line class="grade-linha" x1="' + ml + '" y1="' + y.toFixed(1) + '" x2="' + (L - mr) + '" y2="' + y.toFixed(1) + '"/>';
      svg += '<text class="rot-eixo" x="' + (ml - 7) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end">' + esc(compacto(vv)) + '</text>';
    }
    if (opts.rotuloY) svg += '<text class="rot-eixo" x="' + ml + '" y="' + (mt - 5) + '" font-weight="600">' + esc(opts.rotuloY) + '</text>';

    /* séries */
    series.forEach(function (s, i) {
      var c = s.cor || SERIES[i % SERIES.length];
      var pts = pontos(s).filter(function (p) { return typeof p.y === 'number' && !isNaN(p.y); });
      if (!pts.length) return;
      var d = '', area = '';
      pts.forEach(function (p, k) {
        var X = px(p.x).toFixed(1), Y = py(p.y).toFixed(1);
        d += (k ? ' L' : 'M') + X + ',' + Y;
        area += (k ? ' L' : 'M') + X + ',' + Y;
      });
      if (opts.area && series.length === 1) {
        area += ' L' + px(pts[pts.length - 1].x).toFixed(1) + ',' + (A - mb) + ' L' + px(pts[0].x).toFixed(1) + ',' + (A - mb) + ' Z';
        svg += '<path d="' + area + '" fill="url(#gradArea' + i + ')" stroke="none"/>';
      }
      svg += '<path class="traco" d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (s.tracejado ? 2 : 2.4) + '" stroke-linejoin="round"' +
        (s.tracejado ? ' stroke-dasharray="6 3"' : ' style="--comp:2600"') + '/>';
      /* pontos interativos: um círculo invisível maior por ponto */
      pts.forEach(function (p, k) {
        var conteudo = '<b>' + esc(s.nome) + '</b><br>' + fmt(p.y) + (opts.unidade ? ' ' + esc(opts.unidade) : '') +
          (p.rot ? '<br><span style="color:var(--texto-3)">' + esc(p.rot) + '</span>' : '');
        svg += '<circle cx="' + px(p.x).toFixed(1) + '" cy="' + py(p.y).toFixed(1) + '" r="2.6" fill="' + c + '"/>';
        svg += '<circle class="hit" cx="' + px(p.x).toFixed(1) + '" cy="' + py(p.y).toFixed(1) + '" r="9" data-tip="' + conteudo.replace(/"/g, '&quot;') + '"/>';
      });
      svg += '<circle class="marca" cx="' + px(pts[pts.length - 1].x).toFixed(1) + '" cy="' + py(pts[pts.length - 1].y).toFixed(1) + '" r="3.8" fill="' + c + '" stroke="' + c + '"/>';
    });

    if (opts.rotuloX) svg += '<text class="rot-eixo" x="' + ml + '" y="' + (A - 8) + '">' + esc(opts.rotuloX[0]) + '</text>' +
      '<text class="rot-eixo" x="' + (L - mr) + '" y="' + (A - 8) + '" text-anchor="end">' + esc(opts.rotuloX[1]) + '</text>';
    svg += '</svg>';
    return envolver(svg, series, opts);
  }

  function area(series, opts) { opts = opts || {}; opts.area = true; return linha(series, opts); }

  /* =====================================================================
   * BARRAS — simples, agrupadas ou empilhadas
   * categorias: ['jan','fev',...]
   * series: [{ nome, dados:[n,...], cor }]
   * opts: { empilhado, horizontal, largura, altura, formato, unidade, sufixo }
   * =================================================================== */
  function barras(categorias, series, opts) {
    opts = opts || {};
    var horizontal = !!opts.horizontal;
    var L = opts.largura || (horizontal ? 660 : 660), A = opts.altura || (horizontal ? Math.max(160, categorias.length * 30 + 40) : 230);
    var ml = horizontal ? 118 : 56, mr = 16, mt = 16, mb = horizontal ? 26 : 34;
    if (!series || !series.length || !categorias.length) return vazio(opts.mensagem || 'Sem dados para o período');

    var maxV = 0, minV = 0, acumulados = [], soma = categorias.map(function () { return 0; });
    series.forEach(function (s, si) {
      s.dados.forEach(function (v, i) {
        var base = opts.empilhado ? soma[i] : 0;
        var topo = opts.empilhado ? (soma[i] + (v || 0)) : (v || 0);
        maxV = Math.max(maxV, topo, base);
        minV = Math.min(minV, topo, base);
        if (opts.empilhado) soma[i] += (v || 0);
      });
    });
    maxV = maxV * 1.12 || 1;
    var fmt = opts.formato || function (v) { return compacto(v); };
    var n = categorias.length;

    var svg = '<svg viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' + esc(opts.aria || ('Gráfico de barras: ' + series.map(function (s) { return s.nome; }).join(', '))) + '">';

    if (horizontal) {
      var larguraTxt = 8;
      categorias.forEach(function (c) { larguraTxt = Math.max(larguraTxt, String(c).length * 6.2); });
      ml = Math.min(160, larguraTxt + 12);
      var altBar = (A - mt - mb) / n;
      for (var g = 0; g <= 4; g++) {
        var x = ml + (L - ml - mr) * g / 4;
        svg += '<line class="grade-linha" x1="' + x.toFixed(1) + '" y1="' + mt + '" x2="' + x.toFixed(1) + '" y2="' + (A - mb) + '"/>';
        svg += '<text class="rot-eixo" x="' + x.toFixed(1) + '" y="' + (A - mb + 12) + '" text-anchor="middle">' + esc(compacto(maxV * g / 4)) + '</text>';
      }
      categorias.forEach(function (c, i) {
        var y0 = mt + altBar * i;
        svg += '<text class="rot-eixo" x="' + (ml - 8) + '" y="' + (y0 + altBar / 2 + 3.5).toFixed(1) + '" text-anchor="end">' + esc(c) + '</text>';
        var acumulado = 0;
        series.forEach(function (s, si) {
          var v = s.dados[i] || 0;
          var w = (L - ml - mr) * (v / maxV);
          var h = opts.empilhado ? (altBar * 0.68) / series.length : (altBar * 0.62) / series.length;
          var y = y0 + altBar * 0.16 + (opts.empilhado ? 0 : si * h + 1);
          var x0 = opts.empilhado ? ml + (L - ml - mr) * (acumulado / maxV) : ml;
          var cor = s.cor || SERIES[si % SERIES.length];
          var conteudo = '<b>' + esc(c) + '</b><br>' + esc(s.nome) + ': ' + fmt(v) + (opts.unidade ? ' ' + esc(opts.unidade) : '');
          svg += '<rect class="barra" x="' + x0.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(0, w).toFixed(1) + '" height="' + h.toFixed(1) + '" rx="3" fill="' + cor + '" data-tip="' + conteudo.replace(/"/g, '&quot;') + '"/>';
          if (opts.empilhado) acumulado += v;
          else if (series.length === 1) svg += '<text class="valor-rot" x="' + (ml + w + 6).toFixed(1) + '" y="' + (y + h / 2 + 3).toFixed(1) + '">' + fmt(v) + '</text>';
        });
      });
      svg += '</svg>';
      return envolver(svg, series, opts);
    }

    var larg = (L - ml - mr) / n;
    for (var g2 = 0; g2 <= 4; g2++) {
      var y2 = mt + (A - mt - mb) * g2 / 4;
      svg += '<line class="grade-linha" x1="' + ml + '" y1="' + y2.toFixed(1) + '" x2="' + (L - mr) + '" y2="' + y2.toFixed(1) + '"/>';
      svg += '<text class="rot-eixo" x="' + (ml - 7) + '" y="' + (y2 + 3.5).toFixed(1) + '" text-anchor="end">' + esc(fmt(maxV * (1 - g2 / 4))) + '</text>';
    }
    categorias.forEach(function (c, i) {
      var acumulado2 = 0;
      series.forEach(function (s, si) {
        var v = s.dados[i] || 0;
        var cor = s.cor || SERIES[si % SERIES.length];
        var espaco = opts.empilhado ? 0 : 2;
        var wTotal = larg * 0.66;
        var w = opts.empilhado ? wTotal : (wTotal - espaco * (series.length - 1)) / series.length;
        var x = ml + larg * i + (larg - wTotal) / 2 + (opts.empilhado ? 0 : si * (w + espaco));
        var h = (A - mt - mb) * (Math.max(0, v) / maxV);
        var y = (A - mb) - (opts.empilhado ? (A - mt - mb) * (acumulado2 / maxV) : 0) - h;
        var conteudo = '<b>' + esc(c) + '</b><br>' + esc(s.nome) + ': ' + fmt(v) + (opts.unidade ? ' ' + esc(opts.unidade) : '');
        svg += '<rect class="barra" x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + Math.max(0, h).toFixed(1) + '" rx="3" fill="' + cor + '" data-tip="' + conteudo.replace(/"/g, '&quot;') + '"/>';
        if (opts.empilhado) acumulado2 += v;
      });
      if (opts.empilhado && soma[i]) {
        svg += '<text class="valor-rot" x="' + (ml + larg * i + larg / 2).toFixed(1) + '" y="' + ((A - mb) - (A - mt - mb) * (soma[i] / maxV) - 5).toFixed(1) + '" text-anchor="middle">' + esc(fmt(soma[i])) + '</text>';
      } else if (series.length === 1 && series[0].dados[i]) {
        var hh = (A - mt - mb) * (series[0].dados[i] / maxV);
        svg += '<text class="valor-rot" x="' + (ml + larg * i + larg / 2).toFixed(1) + '" y="' + ((A - mb) - hh - 5).toFixed(1) + '" text-anchor="middle">' + esc(fmt(series[0].dados[i])) + '</text>';
      }
      svg += '<text class="rot-eixo" x="' + (ml + larg * i + larg / 2).toFixed(1) + '" y="' + (A - mb + 14) + '" text-anchor="middle"' +
        (String(c).length > 7 ? ' transform="rotate(-18 ' + (ml + larg * i + larg / 2).toFixed(1) + ' ' + (A - mb + 14) + ')"' : '') + '>' + esc(c) + '</text>';
    });
    svg += '</svg>';
    return envolver(svg, series, opts);
  }

  /* =====================================================================
   * CASCATA (waterfall) — do resultado bruto ao líquido
   * itens: [{ nome, valor, tipo:'entrada'|'saida'|'total' }]
   * =================================================================== */
  function cascata(itens, opts) {
    opts = opts || {};
    if (!itens || !itens.length) return vazio(opts.mensagem || 'Sem dados para o período');
    var A = opts.altura || 240, ml = 60, mr = 14, mt = 18, mb = 46;
    var L = opts.largura || Math.max(660, itens.length * 92 + ml + mr);
    var acumulado = 0, passos = [];
    itens.forEach(function (it) {
      if (it.tipo === 'total') passos.push({ nome: it.nome, de: 0, ate: it.valor, total: true, valor: it.valor });
      else if (it.tipo === 'entrada') { passos.push({ nome: it.nome, de: acumulado, ate: acumulado + it.valor, valor: it.valor }); acumulado += it.valor; }
      else { passos.push({ nome: it.nome, de: acumulado - it.valor, ate: acumulado, valor: -it.valor }); acumulado -= it.valor; }
    });
    var todos = [];
    passos.forEach(function (p) { todos.push(p.de, p.ate); });
    var mx = Math.max.apply(null, todos), mn = Math.min.apply(null, todos, 0);
    var folga = (mx - mn) * 0.1 || 1;
    mn -= folga; mx += folga;
    function py(v) { return mt + (A - mt - mb) * (1 - (v - mn) / (mx - mn)); }
    var larg = (L - ml - mr) / itens.length;
    var fmt = opts.formato || function (v) { return compacto(v); };

    var svg = '<svg viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' + esc(opts.aria || 'Gráfico de cascata do resultado') + '">';
    svg += '<line class="grade-linha" x1="' + ml + '" y1="' + py(0).toFixed(1) + '" x2="' + (L - mr) + '" y2="' + py(0).toFixed(1) + '"/>';
    for (var g = 0; g <= 4; g++) {
      var vv = mn + (mx - mn) * g / 4, y = py(vv);
      svg += '<text class="rot-eixo" x="' + (ml - 7) + '" y="' + (y + 3.5).toFixed(1) + '" text-anchor="end">' + esc(fmt(vv)) + '</text>';
    }
    passos.forEach(function (p, i) {
      var x = ml + larg * i + larg * 0.18, w = larg * 0.64;
      var yTopo = py(Math.max(p.de, p.ate)), altura = Math.max(2, Math.abs(py(p.de) - py(p.ate)));
      var cor = p.total ? CORES.verde : (p.valor >= 0 ? '#4aa96c' : CORES.risco);
      var conteudo = '<b>' + esc(p.nome) + '</b><br>' + (p.valor >= 0 ? '+' : '') + fmt(p.valor) + (opts.unidade ? ' ' + esc(opts.unidade) : '');
      svg += '<rect class="barra" x="' + x.toFixed(1) + '" y="' + yTopo.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + altura.toFixed(1) + '" rx="3" fill="' + cor + '" data-tip="' + conteudo.replace(/"/g, '&quot;') + '"/>';
      if (i < passos.length - 1) {
        var p2 = passos[i + 1];
        var yLig = py(p.total ? p.ate : (p.valor >= 0 ? p.ate : p.de));
        svg += '<line x1="' + (x + w).toFixed(1) + '" y1="' + yLig.toFixed(1) + '" x2="' + (ml + larg * (i + 1) + larg * 0.18).toFixed(1) + '" y2="' + yLig.toFixed(1) + '" class="grade-linha" stroke-dasharray="3 3"/>';
      }
      var anc = p.total ? 3 : -6;
      svg += '<text class="valor-rot" x="' + (x + w / 2).toFixed(1) + '" y="' + (yTopo + anc).toFixed(1) + '" text-anchor="middle">' + esc(fmt(p.valor)) + '</text>';
      var palavras = String(p.nome).split(' ');
      var linhasTxt = [];
      var atual = '';
      palavras.forEach(function (pa) {
        if ((atual + ' ' + pa).trim().length > 13) { linhasTxt.push(atual.trim()); atual = pa; } else atual += ' ' + pa;
      });
      if (atual.trim()) linhasTxt.push(atual.trim());
      linhasTxt.slice(0, 3).forEach(function (lt, k) {
        svg += '<text class="rot-eixo" x="' + (x + w / 2).toFixed(1) + '" y="' + (A - mb + 15 + k * 11) + '" text-anchor="middle">' + esc(lt) + '</text>';
      });
    });
    svg += '</svg>';
    return '<div class="graf">' + svg + '</div>';
  }

  /* =====================================================================
   * ROSCA — até 5 fatias, com legenda obrigatória (design.md §6.9.8)
   * =================================================================== */
  function rosca(fatias, opts) {
    opts = opts || {};
    fatias = fatias.filter(function (f) { return f.valor > 0; }).sort(function (a, b) { return b.valor - a.valor; });
    if (!fatias.length) return vazio(opts.mensagem || 'Sem dados para o período');
    var total = fatias.reduce(function (a, f) { return a + f.valor; }, 0);
    var T = opts.tamanho || 220, R = T / 2, r = R * 0.62, cx = R, cy = R;
    var svg = '<svg viewBox="0 0 ' + T + ' ' + T + '" role="img" aria-label="' + esc(opts.aria || 'Gráfico de composição') + '" style="max-width:' + T + 'px">';
    var angulo = -Math.PI / 2;
    fatias.slice(0, 5).forEach(function (f, i) {
      var fracao = f.valor / total, fim = angulo + fracao * 2 * Math.PI;
      var grande = fracao > 0.5 ? 1 : 0;
      var x1 = cx + R * Math.cos(angulo), y1 = cy + R * Math.sin(angulo);
      var x2 = cx + R * Math.cos(fim), y2 = cy + R * Math.sin(fim);
      var x3 = cx + r * Math.cos(fim), y3 = cy + r * Math.sin(fim);
      var x4 = cx + r * Math.cos(angulo), y4 = cy + r * Math.sin(angulo);
      var cor = f.cor || SERIES[i % SERIES.length];
      var conteudo = '<b>' + esc(f.nome) + '</b><br>' + (opts.formato ? opts.formato(f.valor) : compacto(f.valor)) +
        ' · ' + num(fracao * 100, 1) + '%' + (opts.unidade ? ' de ' + esc(opts.unidade) : '');
      svg += '<path d="M' + x1.toFixed(2) + ',' + y1.toFixed(2) + ' A' + R + ',' + R + ' 0 ' + grande + ' 1 ' + x2.toFixed(2) + ',' + y2.toFixed(2) +
        ' L' + x3.toFixed(2) + ',' + y3.toFixed(2) + ' A' + r + ',' + r + ' 0 ' + grande + ' 0 ' + x4.toFixed(2) + ',' + y4.toFixed(2) + ' Z" fill="' + cor + '" opacity=".92" data-tip="' + conteudo.replace(/"/g, '&quot;') + '"/>';
      angulo = fim;
    });
    svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" style="fill:var(--texto-1)" font-size="17" font-weight="700">' + esc(opts.centro || compacto(total)) + '</text>';
    if (opts.centroRotulo) svg += '<text x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle" font-size="9.5" style="fill:var(--texto-3)">' + esc(opts.centroRotulo) + '</text>';
    svg += '</svg>';
    var legenda = '<div class="legenda">' + fatias.slice(0, 5).map(function (f, i) {
      return '<span><i style="background:' + (f.cor || SERIES[i % SERIES.length]) + '"></i>' + esc(f.nome) + ' · ' +
        (opts.formato ? opts.formato(f.valor) : compacto(f.valor)) + '</span>';
    }).join('') + '</div>';
    return '<div class="graf" style="display:flex;gap:18px;align-items:center;flex-wrap:wrap"><div>' + svg + '</div><div style="flex:1;min-width:170px">' + legenda + '</div></div>';
  }

  /* =====================================================================
   * MEDIDOR (gauge 0–100%)
   * =================================================================== */
  function medidor(valor, opts) {
    opts = opts || {};
    var W = 220, H = 122, cx = W / 2, cy = H - 14, R = 84, r = 62;
    var pct = Math.max(0, Math.min(100, valor || 0));
    var ang = Math.PI * (1 - pct / 100);
    function ponto(raio, a) { return [cx + raio * Math.cos(a), cy - raio * Math.sin(a)]; }
    function arco(raio, a0, a1) {
      var p0 = ponto(raio, a0), p1 = ponto(raio, a1);
      var grande = (a0 - a1) > Math.PI ? 1 : 0;
      return 'M' + p0[0].toFixed(1) + ',' + p0[1].toFixed(1) + ' A' + raio + ',' + raio + ' 0 ' + grande + ' 1 ' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1);
    }
    var cor = opts.cor || (pct >= 80 ? CORES.verde : pct >= 50 ? CORES.ouro : CORES.risco);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(opts.aria || ('Medidor em ' + num(pct, 0) + '%')) + '" style="max-width:' + W + 'px">';
    svg += '<path d="' + arco(R, Math.PI, 0) + '" fill="none" style="stroke:var(--trilho)" stroke-width="18" stroke-linecap="round"/>';
    svg += '<path d="' + arco(R, Math.PI, ang) + '" fill="none" stroke="' + cor + '" stroke-width="18" stroke-linecap="round"/>';
    svg += '<path d="' + arco(r, Math.PI, 0) + '" fill="none" style="stroke:var(--grade)" stroke-width="1"/>';
    svg += '<text x="' + cx + '" y="' + (cy - 26) + '" text-anchor="middle" style="fill:var(--texto-1)" font-size="26" font-weight="700">' + num(pct, 0) + '%</text>';
    if (opts.rotulo) svg += '<text x="' + cx + '" y="' + (cy - 8) + '" text-anchor="middle" font-size="10" style="fill:var(--texto-3)">' + esc(opts.rotulo) + '</text>';
    if (opts.rodape) svg += '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="10.5" style="fill:var(--texto-2)">' + esc(opts.rodape) + '</text>';
    svg += '</svg>';
    return '<div class="graf">' + svg + '</div>' + (opts.nota ? '<div class="nota" style="margin-top:4px">' + esc(opts.nota) + '</div>' : '');
  }

  /* =====================================================================
   * HEATMAP — matriz com escala divergente (ex.: margem por talhão/mês)
   * linhas: rótulos · colunas: rótulos · valores: [[...]]
   * =================================================================== */
  function heatmap(linhas, colunas, valores, opts) {
    opts = opts || {};
    if (!linhas.length || !colunas.length) return vazio(opts.mensagem || 'Sem dados para o período');
    var cel = opts.celula || 30, gap = 3;
    var ml = 118, mt = 22, L = ml + colunas.length * (cel + gap) + 10, A = mt + linhas.length * (cel + gap) + 26;
    var planos = [].concat.apply([], valores).filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    var mn = Math.min.apply(null, planos), mx = Math.max.apply(null, planos);
    var limite = Math.max(Math.abs(mn), Math.abs(mx)) || 1;
    function cor(v) {
      if (typeof v !== 'number' || isNaN(v)) return '#18281f';
      var t = Math.max(-1, Math.min(1, v / limite));
      if (t >= 0) return 'rgba(47,143,82,' + (0.20 + 0.62 * t).toFixed(2) + ')';
      return 'rgba(168,50,38,' + (0.20 + 0.62 * Math.abs(t)).toFixed(2) + ')';
    }
    var fmt = opts.formato || function (v) { return num(v, 0); };
    var svg = '<svg viewBox="0 0 ' + L + ' ' + A + '" role="img" aria-label="' + esc(opts.aria || 'Mapa de calor') + '">';
    colunas.forEach(function (c, j) {
      svg += '<text class="rot-eixo" x="' + (ml + j * (cel + gap) + cel / 2) + '" y="' + (mt - 7) + '" text-anchor="middle">' + esc(c) + '</text>';
    });
    linhas.forEach(function (ln, i) {
      svg += '<text class="rot-eixo" x="' + (ml - 8) + '" y="' + (mt + i * (cel + gap) + cel / 2 + 3.5) + '" text-anchor="end">' + esc(ln) + '</text>';
      colunas.forEach(function (c, j) {
        var v = valores[i] ? valores[i][j] : null;
        var x = ml + j * (cel + gap), y = mt + i * (cel + gap);
        var conteudo = '<b>' + esc(ln) + ' · ' + esc(c) + '</b><br>' + fmt(v) + (opts.unidade ? ' ' + esc(opts.unidade) : '');
        svg += '<rect x="' + x + '" y="' + y + '" width="' + cel + '" height="' + cel + '" rx="4" fill="' + cor(v) + '" style="stroke:var(--grade)" data-tip="' + conteudo.replace(/"/g, '&quot;') + '"/>';
      });
    });
    svg += '</svg>';
    var legenda = '<div class="legenda"><span><i style="background:rgba(192,57,43,.7)"></i>abaixo da referência</span>' +
      '<span><i style="background:rgba(47,143,82,.7)"></i>acima da referência</span>' +
      (opts.nota ? '<span class="nota">' + esc(opts.nota) + '</span>' : '') + '</div>';
    return '<div class="graf">' + svg + '</div>' + legenda;
  }

  /* =====================================================================
   * SPARKLINE — linha mínima, sem eixo (uso em KPI e tabela)
   * =================================================================== */
  function sparkline(valores, opts) {
    opts = opts || {};
    valores = (valores || []).filter(function (v) { return typeof v === 'number' && !isNaN(v); });
    if (valores.length < 2) return '';
    var W = opts.largura || 64, H = opts.altura || 22, mn = Math.min.apply(null, valores), mx = Math.max.apply(null, valores);
    var d = valores.map(function (v, i) {
      var x = (W * i / (valores.length - 1)).toFixed(1);
      var y = (H - 2 - (H - 4) * ((v - mn) / ((mx - mn) || 1))).toFixed(1);
      return (i ? 'L' : 'M') + x + ',' + y;
    }).join(' ');
    var cor = opts.cor || (valores[valores.length - 1] >= valores[0] ? CORES.verde : CORES.risco);
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(opts.aria || 'Tendência') + '">' +
      '<path d="' + d + '" fill="none" stroke="' + cor + '" stroke-width="1.8" stroke-linejoin="round"/></svg>';
  }

  /* =====================================================================
   * ANEL DE PROGRESSO (uso em KPI compacto)
   * =================================================================== */
  function anel(pct, rotulo, opts) {
    opts = opts || {};
    var p = Math.max(0, Math.min(100, pct || 0));
    var cor = opts.cor || (p >= 80 ? 'var(--acento)' : p >= 50 ? 'var(--atencao)' : 'var(--critico)');
    return '<div class="anel" style="--pct:' + p.toFixed(1) + '%;background:conic-gradient(' + cor + ' ' + p.toFixed(1) + '%,var(--cinza-800) 0)" role="img" aria-label="' +
      esc((opts.aria || rotulo) + ': ' + num(p, 0) + '%') + '"><b>' + num(p, 0) + '%</b></div>';
  }

  function envolver(svg, series, opts) {
    var legenda = '';
    if (series.length > 1 || opts.legenda === true) {
      legenda = '<div class="legenda">' + series.map(function (s, i) {
        return '<span><i style="background:' + (s.cor || SERIES[i % SERIES.length]) + '"></i>' + esc(s.nome) + '</span>';
      }).join('') + '</div>';
    }
    return '<div class="graf">' + svg + '</div>' + legenda + (opts.nota ? '<div class="nota" style="margin-top:6px">' + esc(opts.nota) + '</div>' : '');
  }
  function vazio(mensagem) {
    return '<div class="vazio"><span class="ico">📉</span><b>Sem dados</b><span class="nota">' + esc(mensagem) + '</span></div>';
  }

  global.Graf = {
    CORES: CORES, SERIES: SERIES, num: num, brl: brl, compacto: compacto, esc: esc,
    linha: linha, area: area, barras: barras, cascata: cascata, rosca: rosca,
    medidor: medidor, heatmap: heatmap, sparkline: sparkline, anel: anel,
    vazio: vazio, instalarListener: instalarListener, esconderTooltip: esconder
  };
  instalarListener();
})(typeof window !== 'undefined' ? window : globalThis);
