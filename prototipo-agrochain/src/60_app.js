/* =========================================================================
 * AGROCHAIN · APLICAÇÃO (navegação, gráficos e painéis operacionais)
 * Perfis: produtor · cooperativa · indústria · certificadora · auditor
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var IA = global.IA;

  var App = {
    usuario: 'U-01',
    view: 'painel',
    abaIA: 'safra',
    loteSel: 'L-2026-0142',
    talhaoSel: 'T-01',
    chat: [],
    ultimoLog: [],
    minerando: false,
    contratoSel: 'CT-2026-0041',
    filtroLote: 'todos'
  };

  /* ---------------- utilidades ---------------- */
  function brl(v, dec) {
    dec = dec === undefined ? 2 : dec;
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }
  function num(v, dec) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function dataBR(iso) { return new Date(iso).toLocaleDateString('pt-BR'); }
  function dataHora(iso) { var d = new Date(iso); return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function curto(h, n) { n = n || 12; return h ? h.slice(0, n) + '…' : '—'; }
  function papel() { return D.usuarios.filter(function (u) { return u.id === App.usuario; })[0]; }
  function icone(p) { return Ico.svg(Ico.existe(p) ? p : 'produtor', 'sm'); }
  function chip(texto, cor) { return '<span class="chip ' + (cor || 'cinza') + '">' + texto + '</span>'; }

  /* Status de lote → cor */
  var COR_STATUS = { DISPONIVEL: 'verde', EM_SECAGEM: 'ouro', NA_COOPERATIVA: 'azul', CERTIFICADO: 'roxo', EM_CONTRATO: 'azul', VENDIDO: 'cinza', CONSUMIDO_PROPRIO: 'verde' };
  var NOME_STATUS = { DISPONIVEL: 'Disponível', EM_SECAGEM: 'Em secagem', NA_COOPERATIVA: 'Na cooperativa', CERTIFICADO: 'Certificado', EM_CONTRATO: 'Em contrato', VENDIDO: 'Vendido', CONSUMIDO_PROPRIO: 'Consumo próprio' };
  function chipStatus(s) { return chip(NOME_STATUS[s] || s, COR_STATUS[s] || 'cinza'); }

  /* =========================================================================
   * GRÁFICOS EM SVG (desenhados à mão — nenhuma biblioteca externa)
   * ======================================================================= */
  function graficoLinha(historico, previsao, opts) {
    opts = opts || {};
    var L = 640, A = 210, ml = 52, mr = 14, mt = 14, mb = 26;
    var todos = historico.map(function (h) { return h.preco || h.central; })
      .concat(previsao ? previsao.map(function (p) { return p.superior; }) : [])
      .concat(previsao ? previsao.map(function (p) { return p.inferior; }) : []);
    var mn = Math.min.apply(null, todos), mx = Math.max.apply(null, todos);
    var folga = (mx - mn) * 0.12 || 1; mn -= folga; mx += folga;
    var n = historico.length + (previsao ? previsao.length : 0);
    function px(i) { return ml + (L - ml - mr) * (i / (n - 1)); }
    function py(v) { return mt + (A - mt - mb) * (1 - (v - mn) / (mx - mn)); }
    var svg = '<svg viewBox="0 0 ' + L + ' ' + A + '" style="width:100%;height:auto">';
    /* grade + rótulos do eixo Y */
    for (var g = 0; g <= 4; g++) {
      var vv = mn + (mx - mn) * g / 4, y = py(vv);
      svg += '<line x1="' + ml + '" y1="' + y + '" x2="' + (L - mr) + '" y2="' + y + '" class="grade-linha" stroke-width="1"/>';
      svg += '<text x="' + (ml - 7) + '" y="' + (y + 3.5) + '" style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">' + num(Math.round(vv)) + '</text>';
    }
    /* área de incerteza da previsão */
    if (previsao && previsao.length) {
      var base = historico.length - 1;
      var sup = '', inf = '';
      previsao.forEach(function (p, i) {
        sup += (i === 0 ? 'M' + px(base) + ',' + py(historico[base].preco) + ' ' : '') + 'L' + px(base + 1 + i) + ',' + py(p.superior) + ' ';
      });
      for (var j = previsao.length - 1; j >= 0; j--) {
        inf += 'L' + px(base + 1 + j) + ',' + py(previsao[j].inferior) + ' ';
      }
      svg += '<path d="' + sup + inf + 'Z" fill="rgba(201,162,39,.16)" stroke="none"/>';
      svg += '<line x1="' + px(base) + '" y1="' + mt + '" x2="' + px(base) + '" y2="' + (A - mb) + '" stroke="rgba(201,162,39,.45)" stroke-width="1" stroke-dasharray="4 3"/>';
      svg += '<text x="' + (px(base) + 4) + '" y="' + (mt + 10) + '" fill="#8a6712" font-size="9.5">hoje</text>';
      /* linha central da previsão */
      var dc = 'M' + px(base) + ',' + py(historico[base].preco);
      previsao.forEach(function (p, i) { dc += ' L' + px(base + 1 + i) + ',' + py(p.central); });
      svg += '<path d="' + dc + '" fill="none" stroke="#b8912a" stroke-width="2" stroke-dasharray="6 3"/>';
    }
    /* linha histórica */
    var d = '';
    historico.forEach(function (h, i) { var v = h.preco || h.central; d += (i ? ' L' : 'M') + px(i) + ',' + py(v); });
    svg += '<path d="' + d + '" fill="none" stroke="' + (opts.cor || '#2f8f52') + '" stroke-width="2.4" stroke-linejoin="round"/>';
    var ult = historico[historico.length - 1];
    var vu = ult.preco || ult.central;
    svg += '<circle cx="' + px(historico.length - 1) + '" cy="' + py(vu) + '" r="4.2" fill="' + (opts.cor || '#2f8f52') + '" style="stroke:var(--sup-1)" stroke-width="2"/>';
    svg += '</svg>';
    return svg;
  }

  function graficoBarras(rotulos, valores, opts) {
    opts = opts || {};
    var L = 640, A = 190, ml = 46, mr = 12, mt = 12, mb = 30;
    var mx = Math.max.apply(null, valores) * 1.12;
    var n = valores.length, larg = (L - ml - mr) / n;
    var svg = '<svg viewBox="0 0 ' + L + ' ' + A + '" style="width:100%;height:auto">';
    for (var g = 0; g <= 4; g++) {
      var y = mt + (A - mt - mb) * g / 4;
      svg += '<line x1="' + ml + '" y1="' + y + '" x2="' + (L - mr) + '" y2="' + y + '" class="grade-linha"/>';
      svg += '<text x="' + (ml - 6) + '" y="' + (y + 3.5) + '" style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">' + num(Math.round(mx * (1 - g / 4))) + '</text>';
    }
    valores.forEach(function (v, i) {
      var h = (A - mt - mb) * (v / mx);
      var x = ml + larg * i + larg * 0.16, w = larg * 0.68;
      var cor = opts.cores ? opts.cores[i] : (opts.cor || 'url(#gradBarra)');
      svg += '<rect x="' + x + '" y="' + (A - mb - h) + '" width="' + w + '" height="' + h + '" rx="4" fill="' + cor + '"/>';
      svg += '<text x="' + (x + w / 2) + '" y="' + (A - mb - h - 5) + '" style="fill:var(--texto-1)" font-size="10" text-anchor="middle">' + num(Math.round(v)) + '</text>';
      svg += '<text x="' + (x + w / 2) + '" y="' + (A - mb + 13) + '" style="fill:var(--texto-3)" font-size="9.5" text-anchor="middle">' + esc(rotulos[i]) + '</text>';
    });
    svg = '<defs><linearGradient id="gradBarra" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#3a9d5c"/><stop offset="100%" stop-color="#1f6440"/></linearGradient></defs>' + svg;
    svg += '</svg>';
    return svg;
  }

  function barraAlt(pct, cor) {
    return '<div class="barra-alt"><i style="width:' + Math.max(2, Math.min(100, pct)) + '%' + (cor ? ';background:' + cor : '') + '"></i></div>';
  }

  /* =========================================================================
   * TELA: PAINEL
   * ======================================================================= */
  /* Alertas de sensor visíveis ao perfil ativo (usado no menu e no painel) */
  function alertasIoTDe(u) {
    if (!global.IoT) return [];
    return global.IoT.alertasSensores().filter(function (a) { return u.papel !== 'produtor' || a.produtor === u.id; });
  }

  /* Cartão-resumo da rede de sensores no painel geral: dá contexto ao produtor
     antes de ele abrir a área de IoT, e mostra que o dado do campo está vivo. */
  function cartaoSensores(alertasIoT, u) {
    if (!global.IoT) return '';
    var sensores = u.papel === 'produtor' ? D.sensores.filter(function (s) { return s.produtor === u.id; }) : D.sensores;
    if (!sensores.length) return '';
    var p = global.IoT.panorama();
    var criticos = alertasIoT.filter(function (a) { return a.severidade === 'critico'; });
    var h = '<div class="cartao" style="margin-top:14px"><div class="flex entre" style="flex-wrap:wrap;gap:10px">' +
      '<h2 style="margin:0">Sensores em campo</h2>' +
      '<button class="mini sec" onclick="App.irPara(\'iot\')">Abrir painel de IoT </button></div>';
    h += '<div class="grade g4" style="margin-top:11px">' +
      '<div class="kpi"><span class="rot">Sensores na sua visão</span><span class="val">' + sensores.length + '</span><span class="obs">' +
        sensores.filter(function (s) { return s.status === 'ATIVO'; }).length + ' operando · ' + sensores.filter(function (s) { return s.status === 'ATENCAO'; }).length + ' em atenção</span></div>' +
      '<div class="kpi"><span class="rot">Leituras por dia</span><span class="val">' + num(sensores.reduce(function (a, s) { return a + 1440 / s.intervaloMin; }, 0), 0) + '</span>' +
        '<span class="obs">telemetria horária com controle de qualidade</span></div>' +
      '<div class="kpi"><span class="rot">Ancoragens na blockchain</span><span class="val">' + D.ancoragensIoT.length + '</span>' +
        '<span class="obs">raízes de Merkle com prova de inclusão verificável</span></div>' +
      '<div class="kpi"><span class="rot">Alertas de sensor</span><span class="val' + (criticos.length ? ' negativo' : '') + '">' + alertasIoT.length + '</span>' +
        '<span class="obs">' + (criticos.length ? criticos.length + ' exigem ação imediata' : 'nenhum crítico no momento') + '</span></div></div>';
    var top = alertasIoT.slice(0, 3);
    if (top.length) {
      h += '<div class="grade g3" style="margin-top:12px">' + top.map(function (a) {
        return '<div class="caixa ' + (a.severidade === 'critico' ? 'vermelha' : 'ouro') + '"><b style="font-size:12.5px">' + esc(a.titulo) + '</b>' +
          '<div class="nota" style="margin-top:5px">' + esc(a.acao || '') + '</div></div>';
      }).join('') + '</div>';
    }
    h += '</div>';
    return h;
  }

  function viewPainel() {
    var u = papel();
    var alertas = IA.alertasFitossanitarios();
    var anom = IA.detectarAnomalias();
    var est = Ledger.estatisticas();
    var ver = Ledger.verificar();
    var lotesVisiveis = u.papel === 'produtor' ? Dados.lotesDoProdutor(u.id) : D.lotes;
    var valorEstoque = lotesVisiveis.filter(function (l) { return ['DISPONIVEL', 'CERTIFICADO', 'NA_COOPERATIVA'].indexOf(l.status) >= 0; })
      .reduce(function (a, l) { return a + Dados.valorLote(l); }, 0);
    var h = '';

    h += '<h1>Bom dia, ' + esc(u.nome.split(' ')[0]) + '</h1>';
    h += '<div class="sub">' + esc(u.org) + ' · ' + esc(u.municipio) + '/' + u.uf + ' · perfil <b>' + u.papel + '</b> · ' +
      'rede de consórcio com ' + est.participantes + ' instituições</div>';

    h += '<div class="grade g4" style="margin-bottom:16px">';
    h += '<div class="cartao kpi"><span class="rot">Cotações de hoje</span>' +
      '<span class="val pequeno">' + brl(Dados.precoAtual('cafe_conilon'), 0) + '</span>' +
      '<span class="obs">Café Conilon / saca 60 kg</span>' +
      '<span class="obs">Cacau ' + brl(Dados.precoAtual('cacau')) + '/kg · Arábica ' + brl(Dados.precoAtual('cafe_arabica'), 0) + '/sc</span></div>';
    h += '<div class="cartao kpi"><span class="rot">Lotes na sua visão</span><span class="val">' + lotesVisiveis.length + '</span>' +
      '<span class="obs">' + lotesVisiveis.filter(function (l) { return l.hash; }).length + ' já ancorados em blockchain</span></div>';
    h += '<div class="cartao kpi"><span class="rot">Valor estimado em estoque</span><span class="val">' + brl(valorEstoque, 0) + '</span>' +
      '<span class="obs">preço de mercado ajustado pela qualidade</span></div>';
    h += '<div class="cartao kpi"><span class="rot">Rede blockchain</span><span class="val">' + est.blocos + ' blocos</span>' +
      '<span class="obs">' + est.transacoes + ' transações · integridade ' + (ver.valida ? '<b class="positivo">verificada ✓</b>' : '<b class="negativo">falha (' + ver.problemas.length + ')</b>') + '</span></div>';
    h += '</div>';

    h += '<div class="grade g2">';

    /* Alertas fitossanitários */
    var meusTalhoes = u.papel === 'produtor' ? D.talhoes.filter(function (t) { return t.produtor === u.id; }) : D.talhoes;
    var idsMeus = meusTalhoes.map(function (t) { return t.id; });
    var meusAlertas = alertas.filter(function (a) { return idsMeus.indexOf(a.talhao) >= 0; });
    h += '<div class="cartao ' + (meusAlertas.length ? 'alerta' : '') + '"><h2>Alertas da IA na lavoura</h2>';
    if (!meusAlertas.length) h += '<div class="caixa verde">Nenhum risco acima do limite de ação nas próximas semanas.</div>';
    meusAlertas.forEach(function (a) {
      h += '<div class="caixa ' + (a.severidade === 'critico' ? 'vermelha' : 'ouro') + '" style="margin-bottom:9px">' +
        '<div class="flex entre"><b>' + esc(a.titulo) + '</b>' + chip(a.nomeTalhao, a.severidade === 'critico' ? 'vermelho' : 'ouro') + '</div>' +
        '<div class="nota" style="margin:5px 0">' + esc(a.descricao) + '</div>' +
        '<div style="font-size:12.5px"><b>Ação:</b> ' + esc(a.acao) + '</div></div>';
    });
    h += '<button class="mini sec" onclick="App.irPara(\'ia\',\'sanidade\')">Ver diagnóstico completo </button></div>';

    /* Recomendações de venda */
    h += '<div class="cartao"><h2>Recomendação da IA para seus lotes</h2>';
    lotesVisiveis.filter(function (l) { return ['DISPONIVEL', 'CERTIFICADO', 'NA_COOPERATIVA', 'EM_SECAGEM'].indexOf(l.status) >= 0; }).slice(0, 3).forEach(function (l) {
      var r = IA.recomendarDestino(l.id);
      h += '<div class="caixa" style="margin-bottom:9px">' +
        '<div class="flex entre"><b>' + l.id + '</b>' + chipStatus(l.status) + '</div>' +
        '<div style="font-size:12.5px;margin:5px 0">' + Dados.nomeProduto(l.produto) + ' · ' + l.quantidade + ' ' + l.unidade + ' · qualidade <b>' + r.scoreQualidade + '/100</b></div>' +
        '<div class="caixa ' + (r.recomendacao.indexOf('Vender') === 0 ? 'verde' : 'azul') + '" style="font-size:12.5px">' +
        '<b>' + esc(r.recomendacao) + '</b> · ' + brl(r.receitaRecomendada, 0) + (r.ganhoVsVendaImediata > 0 ? ' <span class="positivo">(+' + brl(r.ganhoVsVendaImediata, 0) + ' vs. venda imediata)</span>' : '') + '</div></div>';
    });
    h += '<button class="mini sec" onclick="App.irPara(\'ia\',\'destino\')">Simular destinos com a IA </button></div>';
    h += '</div>';

    /* Rede de sensores em campo — porta de entrada para o painel de IoT */
    h += cartaoSensores(alertasIoTDe(u), u);

    /* Preços e cadeia */
    h += '<div class="grade g2" style="margin-top:14px">';
    h += '<div class="cartao"><h2>Café Conilon — 60 dias + projeção 30 dias</h2>';
    h += graficoLinha(D.precos.cafe_conilon.slice(-60), null, { cor: '#2f8f52' });
    h += '<div class="nota">Fonte: série do sistema ancorada em Cepea/Esalq (' + brl(Dados.precoAtual('cafe_conilon')) + '/saca em 06/10/2026).</div></div>';
    h += '<div class="cartao"><h2>Cacau — 60 dias + projeção 30 dias</h2>';
    h += graficoLinha(D.precos.cacau.slice(-60), IA.preverPreco('cacau', 30).trajetoria, { cor: '#b07d4f' });
    h += '<div class="nota">Cacau em correção em 2026. A faixa sombreada é a incerteza do modelo (P10–P90).</div></div>';
    h += '</div>';

    /* Estado da rede */
    h += '<div class="cartao" style="margin-top:14px"><h2>Estado do consórcio AgroChain</h2><div class="grade g4">';
    h += '<div><div class="rot nota">Blocos minerados</div><b style="font-size:19px">' + est.blocos + '</b></div>';
    h += '<div><div class="rot nota">Transações on-chain</div><b style="font-size:19px">' + est.transacoes + '</b></div>';
    h += '<div><div class="rot nota">Pendentes na fila</div><b style="font-size:19px">' + est.pendentes + '</b></div>';
    h += '<div><div class="rot nota">Dificuldade de mineração</div><b style="font-size:19px">' + est.dificuldade + ' zeros</b></div>';
    h += '</div><div class="divisor"></div>';
    h += '<div class="flex envolve"><span class="nota">Hash da cadeia:</span><span class="hash">' + curto(est.hashCadeia, 40) + '</span>' +
      (ver.valida ? chip('✓ cadeia íntegra — nenhuma adulteração detectada', 'verde') : chip('✗ ' + ver.problemas.length + ' inconsistências detectadas', 'vermelho')) + '</div>';
    h += '<div style="margin-top:11px"><button class="mini sec" onclick="App.irPara(\'blockchain\')">Abrir explorador da blockchain </button></div></div>';

    if (anom.total) {
      h += '<div class="cartao alerta" style="margin-top:14px"><h2>Auditoria automática da IA — ' + anom.total + ' apontamento(s)</h2>';
      h += '<div class="nota" style="margin-bottom:9px">Score de confiabilidade da base: <b>' + anom.scoreConfiabilidade + '/100</b></div>';
      anom.achados.slice(0, 3).forEach(function (a) {
        h += '<div class="caixa ' + (a.severidade === 'critico' ? 'vermelha' : 'ouro') + '" style="margin-bottom:8px;font-size:12.5px">' +
          chip(a.severidade === 'critico' ? 'CRÍTICO' : 'ATENÇÃO', a.severidade === 'critico' ? 'vermelho' : 'ouro') + ' ' +
          '<b>' + esc(a.tipo.replace(/_/g, ' ')) + '</b> · ' + esc(a.alvo) + '<div class="nota" style="margin-top:5px">' + esc(a.descricao) + '</div></div>';
      });
      h += '<button class="mini sec" onclick="App.irPara(\'auditoria\')">Ver auditoria completa </button></div>';
    }
    return h;
  }

  /* =========================================================================
   * TELA: LAVOURA
   * ======================================================================= */
  function viewLavoura() {
    var u = papel();
    var talhoes = u.papel === 'produtor' ? D.talhoes.filter(function (t) { return t.produtor === u.id; }) : D.talhoes;
    var h = '<h1>Minhas lavouras</h1><div class="sub">Monitoramento por talhão: vigor vegetativo (NDVI), histórico de produtividade, sanidade e microclima</div>';

    /* Mapa esquemático com as coordenadas reais dos talhões */
    h += '<div class="cartao"><h2>Mapa das áreas georreferenciadas</h2>';
    var lats = talhoes.map(function (t) { return t.geo.lat; }), lons = talhoes.map(function (t) { return t.geo.lon; });
    var latMin = Math.min.apply(null, lats), latMax = Math.max.apply(null, lats);
    var lonMin = Math.min.apply(null, lons), lonMax = Math.max.apply(null, lons);
    var escala = 100000;
    h += '<div class="mapa"><svg viewBox="0 0 660 260" style="width:100%;height:auto">';
    for (var i = 0; i <= 10; i++) h += '<line x1="' + (i * 66) + '" y1="0" x2="' + (i * 66) + '" y2="260" stroke="rgba(47,143,82,.09)"/><line x1="0" y1="' + (i * 26) + '" x2="660" y2="' + (i * 26) + '" stroke="rgba(47,143,82,.09)"/>';
    talhoes.forEach(function (t) {
      var x = 60 + ((t.geo.lon - lonMin) * escala) / 2.4, y = 40 + ((latMax - t.geo.lat) * escala) / 1.5;
      var r = 9 + t.area * 1.5;
      var cor = t.produto === 'cacau' ? '#b07d4f' : '#2f8f52';
      h += '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + cor + '" opacity=".3"/>';
      h += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="' + cor + '" stroke="#0b2e1c" stroke-width="2"/>';
      h += '<text x="' + (x + 10) + '" y="' + (y + 4) + '" fill="#e6f4ec" font-size="11">' + t.id + ' · ' + esc(t.nome) + ' <tspan fill="#9db2a4">' + t.area + ' ha</tspan></text>';
    });
    h += '<text x="12" y="250" fill="#9db2a4" font-size="10">Escala esquemática · coordenadas reais da região (Cacoal e Rolim de Moura/RO)</text>';
    h += '</svg></div>';
    h += '<div class="flex envolve" style="margin-top:11px"><span class="flex"><span style="width:11px;height:11px;border-radius:50%;background:#2f8f52;display:inline-block"></span><span class="nota">café</span></span>' +
      '<span class="flex"><span style="width:11px;height:11px;border-radius:50%;background:#b07d4f;display:inline-block"></span><span class="nota">cacau</span></span>' +
      '<span class="nota">tamanho do círculo = área plantada</span></div></div>';

    /* Cartões dos talhões */
    h += '<div class="grade g2" style="margin-top:14px">';
    talhoes.forEach(function (t) {
      var safra = IA.preverSafra(t.id);
      var san = IA.diagnosticarFitossanidade(t.id);
      var hist = D.historicoSafra.filter(function (x) { return x.talhao === t.id; })[0];
      var regiao = D.usuarios.filter(function (x) { return x.id === t.produtor; })[0].municipio;
      var chuva = D.clima[regiao].slice(-14);
      var corRisco = san.nivel === 'CRÍTICO' ? 'vermelho' : san.nivel === 'ALTO' ? 'ouro' : san.nivel === 'MODERADO' ? 'ouro' : 'verde';
      h += '<div class="cartao"><div class="flex entre" style="margin-bottom:9px">' +
        '<div><b style="font-size:15.5px">' + esc(t.nome) + '</b><div class="nota">' + t.id + ' · ' + esc(Dados.nomeProduto(t.produto)) + ' · ' + t.area + ' ha · ' + esc(t.cultivar) + '</div></div>' +
        chip('risco ' + san.nivel, corRisco) + '</div>';
      h += '<div class="grade" style="grid-template-columns:1fr 1fr;gap:9px;margin-bottom:11px">' +
        '<div><div class="nota">Vigor (NDVI)</div><div class="flex" style="gap:7px"><b>' + t.ndvi + '</b>' + barraAlt(t.ndvi * 100) + '</div></div>' +
        '<div><div class="nota">Maturação</div><b>' + (2026 - t.plantio) + ' anos</b> <span class="nota">(' + esc(t.sistema) + ')</span></div></div>';
      h += '<div class="nota" style="margin-bottom:6px">Histórico de produtividade e previsão 2026 (' + safra.unidade + ')</div>';
      h += graficoBarras(
        hist.safras.map(function (s) { return s.ano; }),
        hist.safras.map(function (s) { return s.valor || safra.previsto; }),
        { cores: ['#2f8f52', '#2f8f52', '#2f8f52', '#2f8f52', '#c9a227'] });
      h += '<div class="caixa verde" style="font-size:12.5px;margin-top:9px"><b>Previsão 2026:</b> ' + safra.previsto + ' ' + safra.unidade +
        ' <span class="nota">(faixa ' + safra.minimo + '–' + safra.maximo + ', confiança ' + safra.confianca + '%)</span><br>' +
        '<span class="nota">Total estimado: ' + safra.totalTexto + ' · fator que mais pesa: ' + esc(safra.fatores[3].nome.toLowerCase()) + '</span></div>';
      /* microclima dos últimos 14 dias */
      h += '<div class="nota" style="margin-top:11px">Chuva nos últimos 14 dias em ' + esc(regiao) + '</div>';
      h += '<svg viewBox="0 0 300 46" style="width:100%;height:auto">';
      chuva.forEach(function (c, i) {
        var alt = Math.min(38, c.chuvaMm * 2.2);
        h += '<rect x="' + (i * 21 + 4) + '" y="' + (40 - alt) + '" width="13" height="' + Math.max(1.5, alt) + '" rx="2" fill="' + (c.chuvaMm > 10 ? '#1f6f9e' : '#2f8f52') + '" opacity=".85"/>';
      });
      h += '<line x1="0" y1="40.5" x2="300" y2="40.5" class="grade-linha"/></svg>';
      h += '<div class="flex entre" style="margin-top:11px"><button class="mini sec" onclick="App.verTalhao(\'' + t.id + '\')">Detalhar talhão</button>' +
        chip('✓ georreferenciado', 'cinza') + '</div>';
      h += '</div>';
    });
    h += '</div>';

    /* Painel de detalhe do talhão selecionado */
    var t = Dados.talhao(App.talhaoSel);
    if (t) {
      var prev = IA.preverSafra(t.id), san = IA.diagnosticarFitossanidade(t.id);
      h += '<div class="cartao destaque" style="margin-top:14px"><h2>Detalhamento da previsão — ' + esc(t.nome) + '</h2>';
      h += '<div class="nota" style="margin-bottom:11px">Cada fator abaixo entra no cálculo com seu peso. É esse detalhamento que permite ao produtor contestar ou confirmar a previsão — modelo explicável, não caixa-preta.</div>';
      h += '<table class="tabela"><tr><th>Fator</th><th>Efeito no resultado</th><th>Justificativa com os dados do talhão</th></tr>';
      prev.fatores.forEach(function (f) {
        var efeito = f.efeitoIndividual === 'referência' ? chip('base', 'verde') :
          (parseFloat(f.efeitoIndividual) >= 0 ? chip('+' + f.efeitoIndividual, 'verde') : chip(f.efeitoIndividual, 'vermelho'));
        h += '<tr><td><b>' + esc(f.nome) + '</b></td><td>' + efeito + '</td><td class="nota">' + esc(f.contribuicao) + '</td></tr>';
      });
      h += '</table>';
      h += '<div class="caixa verde" style="margin-top:11px"><b>Resultado:</b> base histórica ' + num(prev.fatores[0].valor, 1) + ' × ajuste combinado ' +
        prev.multiplicadorCombinado + ' = <b>' + prev.previsto + ' ' + prev.unidade + '</b>. O ajuste combinado não multiplica os fatores diretamente — a IA aplica amortecimento para não punir o produtor duas vezes pelo mesmo problema.</div>';
      h += '</div>';
    }
    return h;
  }

  /* =========================================================================
   * TELA: COLHEITA E LOTES
   * ======================================================================= */
  function viewLotes() {
    var u = papel();
    var todos = u.papel === 'produtor' ? Dados.lotesDoProdutor(u.id) : D.lotes;
    var lotes = App.filtroLote === 'todos' ? todos : todos.filter(function (l) { return l.status === App.filtroLote; });
    var h = '<h1>Colheita, pós-colheita e lotes</h1><div class="sub">Registro no campo → secagem/fermentação → classificação → lote rastreável com selo blockchain</div>';

    h += '<div class="flex envolve" style="margin-bottom:12px">';
    [['todos', 'Todos'], ['DISPONIVEL', 'Disponíveis'], ['EM_SECAGEM', 'Em secagem'], ['CERTIFICADO', 'Certificados'], ['EM_CONTRATO', 'Em contrato'], ['CONSUMIDO_PROPRIO', 'Consumo próprio']].forEach(function (f) {
      h += '<button class="mini ' + (App.filtroLote === f[0] ? '' : 'sec') + '" onclick="App.filtrarLotes(\'' + f[0] + '\')">' + f[1] + '</button>';
    });
    h += '</div>';

    if (u.papel === 'produtor') {
      h += '<div class="cartao" style="margin-bottom:14px"><h2>Registrar nova colheita</h2>';
      h += '<div class="nota" style="margin-bottom:10px">Ao salvar, o sistema cria os eventos da cadeia, avalia a qualidade com IA e ancora tudo na blockchain automaticamente.</div>';
      h += '<div class="grade" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr))">' +
        '<div class="campo"><label>Talhão</label><select id="f_talhao">' +
        D.talhoes.filter(function (t) { return t.produtor === u.id; }).map(function (t) { return '<option value="' + t.id + '">' + t.id + ' · ' + esc(t.nome) + ' (' + Dados.nomeProduto(t.produto) + ')</option>'; }).join('') +
        '</select></div>' +
        '<div class="campo"><label>Quantidade</label><input id="f_qtd" type="number" value="45"></div>' +
        '<div class="campo"><label>Data da colheita</label><input id="f_data" type="date" value="2026-10-06"></div>' +
        '<div class="campo"><label>Umidade (%)</label><input id="f_umid" type="number" step="0.1" value="13.5"></div>' +
        '<div class="campo"><label>Dias de secagem/fermentação</label><input id="f_dias" type="number" value="7"></div>' +
        '<div class="campo"><label>Destino</label><select id="f_destino"><option value="venda">Venda (cooperativa/indústria)</option><option value="consumo_proprio">Consumo próprio / transformação artesanal</option></select></div>' +
        '</div>';
      h += '<button onclick="App.registrarColheita()">Registrar colheita e ancorar na blockchain</button>';
      h += '<span class="nota" style="margin-left:11px">O lote recebe um hash SHA-256 único, entra no próximo bloco e ganha QR Code de rastreio.</span>';
      h += '</div>';
    }

    h += '<div class="grade g2">';
    lotes.forEach(function (l) {
      var evs = Dados.eventosDoLote(l.id);
      var valor = Dados.valorLote(l);
      var ajuste = IA.precoAjustado(l);
      h += '<div class="cartao">';
      h += '<div class="flex entre" style="margin-bottom:7px"><b style="font-size:15px">' + l.id + '</b>' + chipStatus(l.status) + '</div>';
      h += '<div class="nota">' + esc(Dados.nomeProduto(l.produto)) + ' · talhão ' + l.talhao + ' · ' + l.quantidade + ' ' + l.unidade + ' (' + num(l.pesoKg) + ' kg)</div>';
      h += '<div class="grade" style="grid-template-columns:1fr 1fr 1fr;gap:8px;margin:11px 0">' +
        '<div><div class="nota">Qualidade</div><b>' + (l.qualidade || ajuste.score) + '/100</b></div>' +
        '<div><div class="nota">Preço c/ prêmio</div><b>' + brl(ajuste.ajustado) + '</b><span class="nota"> ' + (ajuste.ajustePct >= 0 ? '+' : '') + ajuste.ajustePct.toFixed(1) + '%</span></div>' +
        '<div><div class="nota">Valor do lote</div><b>' + brl(valor, 0) + '</b></div></div>';
      h += '<div class="nota">' + evs.length + ' eventos on-chain · colheita em ' + dataBR(l.dataColheita) + ' · umidade ' + l.umidade + '%</div>';
      if (l.bloco !== null && l.bloco !== undefined) h += '<div class="flex" style="margin-top:7px"><span class="nota">bloco</span><span class="hash">' + l.bloco + ' · ' + curto(l.hash, 18) + '</span></div>';
      else h += '<div class="nota" style="margin-top:7px">' + chip('aguardando mineração', 'ouro') + '</div>';
      h += '<div class="flex envolve" style="margin-top:11px"><button class="mini" onclick="App.abrirLote(\'' + l.id + '\')">Rastreabilidade e selo</button>' +
        (['DISPONIVEL', 'CERTIFICADO', 'NA_COOPERATIVA'].indexOf(l.status) >= 0 ? '<button class="mini sec" onclick="App.irPara(\'ia\',\'destino\');App.loteSel=\'' + l.id + '\';App.render()">Decidir venda com IA</button>' : '') +
        '</div></div>';
    });
    h += '</div>';

    /* Detalhe do lote selecionado */
    var l = Dados.lote(App.loteSel);
    if (l) {
      var selo = Ledger.seloLote(l.id);
      var ver = Ledger.verificarLote(l.id);
      var evs = Dados.eventosDoLote(l.id).sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
      h += '<div class="cartao destaque" style="margin-top:14px"><h2>Selo de rastreabilidade — ' + l.id + '</h2><div class="grade g2">';
      h += '<div>';
      h += '<div class="nota" style="margin-bottom:9px">Trilha completa auditável. Cada evento foi assinado pelo autor e encadeado ao bloco.</div>';
      h += '<div class="linha-tempo">';
      evs.forEach(function (e) {
        h += '<div class="ponto"><div class="flex entre"><b style="font-size:13px">' + esc(e.tipo.replace(/_/g, ' ')) + '</b><span class="nota">' + dataBR(e.timestamp) + '</span></div>' +
          '<div class="nota">' + esc(e.descricao) + '</div>' +
          '<div class="flex" style="margin-top:4px"><span class="nota">por ' + esc(Dados.nomeUsuario(e.autor)) + '</span>' +
          (e.bloco !== null && e.bloco !== undefined ? '<span class="hash">bloco ' + e.bloco + '</span>' + '<span class="hash">' + curto(e.hash, 16) + '</span>' : chip('pendente', 'ouro')) + '</div></div>';
      });
      h += '</div>';
      if (selo.certificacoes.length) {
        selo.certificacoes.forEach(function (c) {
          h += '<div class="caixa verde" style="margin-top:9px;font-size:12.5px"><b>' + esc(c.tipo) + '</b><br><span class="nota">Emitido por ' + esc(Dados.orgUsuario(c.emissor)) + ' · válido até ' + dataBR(c.validoAte) + ' · conformidade ' + c.scoreConformidade + '/100</span></div>';
        });
      }
      h += '</div>';
      h += '<div style="text-align:center">';
      h += '<div class="qr">' + selo.qr + '</div>';
      h += '<div class="nota" style="margin-top:8px;text-align:left">QR Code de conferência — o comprador aponta a câmera e vê a cadeia inteira deste lote. Funciona offline: o hash é conferido localmente.</div>';
      h += '<div class="caixa mono" style="margin-top:9px;font-size:10.5px;text-align:left">' + esc(selo.conteudoQR) + '</div>';
      h += '<div class="caixa ' + (ver.integro ? 'verde' : 'vermelha') + '" style="margin-top:9px;text-align:left;font-size:12.5px">' +
        (ver.integro ? '✓ Integridade confirmada' : '✗ Hash divergente') + ' — hash do selo <span class="mono">' + curto(ver.hashSelo, 20) + '</span><br>' +
        '<span class="nota">' + ver.eventosNaCadeia + ' de ' + ver.eventosTotal + ' eventos confirmados em bloco · blocos ' + (ver.blocos.join(', ') || '—') + '</span></div>';
      h += '</div></div></div>';
    }
    return h;
  }

  /* ---------------- ações ---------------- */
  App.filtrarLotes = function (f) { App.filtroLote = f; App.render(); };
  App.verTalhao = function (id) { App.talhaoSel = id; App.render(); };
  App.abrirLote = function (id) { App.loteSel = id; App.render(); };
  App.irPara = function (view, aba) {
    App.view = view;
    if (aba && view === 'ia') App.abaIA = aba;
    if (aba && view === 'erp' && global.App4) global.App4.aba = aba;
    if (global.Imersivo && global.Imersivo.aberto) global.Imersivo.fechar();
    App.ultimoLog = [];
    App.render();
    if (typeof document !== 'undefined' && document.querySelector) { var c = document.querySelector('.conteudo'); if (c && c.scrollTo) c.scrollTo(0, 0); }
  };

  App.registrarColheita = function () {
    function v(id) { var el = document.getElementById(id); return el ? el.value : null; }
    var talhaoId = v('f_talhao');
    var t = Dados.talhao(talhaoId);
    var dados = {
      talhao: talhaoId, produto: t.produto, quantidade: v('f_qtd'), dataColheita: v('f_data'),
      umidade: v('f_umid'), diasSecagem: v('f_dias'), destino: v('f_destino')
    };
    var res = Ledger.registrarLote(dados, App.usuario);
    App.loteSel = res.lote.id;
    var san = IA.scoreQualidade(res.lote.id);
    App.avisos = 'Lote ' + res.lote.id + ' registrado: ' + res.eventos.length + ' eventos criados, score de qualidade IA ' + san.score +
      '/100 (classe ' + san.classe + '), bloco ' + (res.minerado ? res.minerado.indice : '—') + ' minerado.';
    App.render();
  };

  App.avisos = null;
  App.avisar = function () { var a = App.avisos; App.avisos = null; return a; };

  /* gráficos expostos para os demais módulos da interface */
  App.graficoLinha = graficoLinha;
  App.graficoBarras = graficoBarras;
  App.brl = brl; App.num = num; App.chip = chip; App.esc = esc; App.curto = curto;

  /* ---------------- roteador ---------------- */
  App.render = function () {
    var raiz = typeof document !== 'undefined' ? document.getElementById('app') : null;
    if (!raiz) return null;
    var u = papel();
    var est = Ledger.estatisticas();
    var alertasIoT = alertasIoTDe(u);
    var alertas = IA.alertasFitossanitarios().filter(function (a) {
      var t = Dados.talhao(a.talhao);
      return u.papel !== 'produtor' || t.produtor === u.id;
    });
    var anom = IA.detectarAnomalias();
    var html = '';

    /* topo */
    html += '<div class="topo"><div class="marca"><div class="logo">' + Ico.svg('semente', 20) + '</div><div>AGROCHAIN<small>café &amp; cacau · Rondônia</small></div></div>';
    html += '<div class="rede"><span class="pulso"></span>' + esc(D.meta.rede) + ' · ' + est.blocos + ' blocos</div>';
    html += '<div class="espaco"></div>';
    html += '<button class="mini ouro" onclick="Imersivo.abrir()" title="Painel de acompanhamento em tela cheia — Esc para sair">' + Ico.svg('expandir', 14) + ' Modo imersivo</button>';
    html += '<button class="mini sec" onclick="App.reiniciar()" title="Recomeça a demonstração do zero">Reiniciar demo</button>';
    html += '<div class="seletor-perfil"><div class="av">' + icone(u.papel) + '</div><div style="line-height:1.15"><div style="font-size:12.5px;font-weight:600">' + esc(u.nome) + '</div><div class="nota" style="font-size:10.5px">' + esc(u.org.split('—')[0].trim()) + '</div></div>';
    html += '<select onchange="App.trocarUsuario(this.value)">' + D.usuarios.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === App.usuario ? ' selected' : '') + '>' + icone(x.papel) + ' ' + esc(x.nome) + ' — ' + x.papel + '</option>';
    }).join('') + '</select></div></div>';

    /* menu */
    var itens = [
      { g: 'Operação', id: 'painel', ic: 'painel', n: 'Painel geral', todos: true },
      { g: 'Operação', id: 'lavoura', ic: 'lavoura', n: 'Lavouras e talhões', todos: true },
      { g: 'Operação', id: 'lotes', ic: 'lotes', n: 'Colheita e lotes', todos: true },
      { g: 'Gestão', id: 'erp', ic: 'erp', n: 'ERP agro', todos: true, badge: (global.Erp ? global.Erp.alertas().criticos : null) || null },
      { g: 'Inteligência', id: 'ia', ic: 'ia', n: 'Inteligência artificial', todos: true, badge: alertas.length || null },
      { g: 'Inteligência', id: 'iot', ic: 'iot', n: 'IoT e sensores', todos: true, badge: alertasIoT.length || null },
      { g: 'Confiança', id: 'blockchain', ic: 'cadeia', n: 'Blockchain', todos: true },
      { g: 'Confiança', id: 'mercado', ic: 'mercado', n: 'Mercado e contratos', todos: true },
      { g: 'Confiança', id: 'certificacao', ic: 'selo', n: 'Certificação', todos: true },
      { g: 'Confiança', id: 'auditoria', ic: 'auditoria', n: 'Auditoria e fraudes', todos: true, badge: anom.criticos || null },
      { g: 'Apoio', id: 'assistente', ic: 'assistente', n: 'Assistente agro', todos: true },
      { g: 'Apoio', id: 'sobre', ic: 'sobre', n: 'Sobre e arquitetura', todos: true }
    ];
    html += '<div class="corpo"><div class="menu">';
    var grupoAtual = null;
    itens.forEach(function (it) {
      if (it.g !== grupoAtual) { html += '<h4>' + it.g + '</h4>'; grupoAtual = it.g; }
      html += '<div class="item ' + (App.view === it.id ? 'on' : '') + '" onclick="App.irPara(\'' + it.id + '\')">' +
        '<span class="ic">' + (Ico.svg(it.ic, 'md') || it.ic) + '</span><span>' + it.n + '</span>' + (it.badge ? '<span class="badge">' + it.badge + '</span>' : '') + '</div>';
    });
    html += '<div class="cartao" style="margin-top:14px;padding:11px"><div class="nota" style="line-height:1.6">' +
      '<b style="color:var(--verde-300)">Perfil ativo:</b> ' + esc(u.nome) + '<br>' + icone(u.papel) + ' ' + u.papel + '<br>' +
      esc(u.area) + '<br><span style="color:var(--verde-300)">no consórcio desde ' + u.desde + '</span></div></div>';
    html += '</div><div class="conteudo">';

    if (App.avisos) html += '<div class="caixa verde" style="margin-bottom:13px">✓ ' + esc(App.avisar()) + '</div>';

    if (App.view === 'painel') html += viewPainel();
    else if (App.view === 'lavoura') html += viewLavoura();
    else if (App.view === 'lotes') html += viewLotes();
    else if (App.view === 'erp') html += global.App4.viewErp();
    else if (App.view === 'ia') html += global.App2.viewIA();
    else if (App.view === 'iot') html += global.App3.viewIoT();
    else if (App.view === 'blockchain') html += global.App2.viewBlockchain();
    else if (App.view === 'mercado') html += global.App2.viewMercado();
    else if (App.view === 'certificacao') html += global.App2.viewCertificacao();
    else if (App.view === 'auditoria') html += global.App2.viewAuditoria();
    else if (App.view === 'assistente') html += global.App2.viewAssistente();
    else html += global.App2.viewSobre();

    html += '<div class="rodape">AgroChain · protótipo funcional de rastreabilidade de café e cacau com blockchain e inteligência artificial.<br>' +
      'Dados de mercado ancorados em cotações reais de 06/10/2026 (Cepea/Esalq para café). Cenário demonstrativo com propriedades reais do estado de Rondônia — Cacoal e Rolim de Moura.<br>' +
      'Os modelos de IA deste protótipo são determinísticos e explicáveis; o pipeline de aprendizado de máquina validado está descrito no documento técnico.</div>';

    html += '</div></div>';
    raiz.innerHTML = html;
    return html;
  };

  App.trocarUsuario = function (id) {
    App.usuario = id;
    if (global.Imersivo) global.Imersivo.fechar();
    if (global.Erp) global.Erp.reiniciar();
    if (global.App4) { global.App4.aba = 'visao'; global.App4.mes = null; global.App4.prova = null; global.App4.ancoragem = null; global.App4.preparo = null; global.App4.aviso = null; }
    var u = papel();
    App.view = u.papel === 'industria' ? 'mercado' : u.papel === 'certificadora' ? 'certificacao' : u.papel === 'auditor' ? 'auditoria' : 'painel';
    App.avisos = 'Perfil alterado para ' + u.nome + ' (' + u.papel + ').';
    App.render();
  };

  App.reiniciar = function () {
    try { localStorage.removeItem(Dados.CHAVE); } catch (e) {}
    Dados.restaurarSemente();   // volta aos dados originais da demonstração
    Ledger.iniciar();           // reconstrói a blockchain a partir dos eventos originais
    App.chat = []; App.ultimoLog = []; App.usuario = 'U-01'; App.view = 'painel';
    if (global.App3) { global.App3.prova = null; global.App3.aviso = null; global.App3.aba = 'mapa'; }
    if (global.Imersivo) global.Imersivo.fechar();
    if (global.Erp) global.Erp.reiniciar();
    if (global.App4) { global.App4.aba = 'visao'; global.App4.mes = null; global.App4.talhao = null; global.App4.preparo = null; global.App4.ancoragem = null; global.App4.prova = null; global.App4.aviso = null; }
    App.avisos = 'Demonstração reiniciada: blockchain reconstruída a partir dos eventos originais.';
    App.render();
  };

  App.iniciar = function () {
    Ledger.iniciar();
    App.render();
    return true;
  };

  global.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
