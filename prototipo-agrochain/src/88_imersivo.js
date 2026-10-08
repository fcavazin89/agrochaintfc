/* =========================================================================
 * AGROCHAIN · MODO IMERSIVO
 * Painel de acompanhamento em tela cheia, para deixar aberto no escritório ou
 * na parede da cooperativa: resultado, caixa, custo por saca, talhões, o que
 * está acontecendo no campo agora e o estado da cadeia.
 * Regras do design.md: KPI em corpo grande, sem interação obrigatória,
 * relógio sempre visível e saída por Esc.
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var E = global.Erp;
  var Graf = global.Graf;
  var IoT = global.IoT;
  var Ledger = global.Ledger;

  var Imersivo = { aberto: false, timer: null, contador: 0, instalado: false };

  function num(v, d) { if (v === null || v === undefined || isNaN(v)) return '—'; return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d }); }
  function brl(v, d) { if (v === null || v === undefined || isNaN(v)) return '—'; return 'R$ ' + num(v, d === undefined ? 0 : d); }
  function pct(v, d) { if (v === null || v === undefined || isNaN(v)) return '—'; return num(v, d === undefined ? 1 : d) + '%'; }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function mesBR(mm) { var p = mm.split('-'); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(p[1]) - 1] + '/' + p[0].slice(2); }
  function kpiHero(rot, val, obs, cor) {
    return '<div class="cartao"><div class="kpi kpi-hero"><div class="rot">' + rot + '</div>' +
      '<div class="val"' + (cor ? ' style="color:' + cor + '"' : '') + '>' + val + '</div>' +
      (obs ? '<div class="obs">' + obs + '</div>' : '') + '</div></div>';
  }
  function agora() { return new Date(); }
  function hora() { return agora().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
  function dataLonga() {
    var d = agora();
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  }

  /* =====================================================================
   * ABRIR / FECHAR
   * =================================================================== */
  Imersivo.abrir = function () {
    var el = typeof document !== 'undefined' ? document.getElementById('imersivo') : null;
    if (!el) return;
    el.className = 'imersivo';
    el.setAttribute('aria-hidden', 'false');
    Imersivo.aberto = true;
    el.innerHTML = Imersivo.html();
    if (!Imersivo.instalado) {
      Imersivo.instalado = true;
      if (typeof document !== 'undefined' && document.addEventListener) {
        document.addEventListener('keydown', function (ev) {
          if (ev.key === 'Escape' && Imersivo.aberto) Imersivo.fechar();
        });
      }
    }
    if (Imersivo.timer) global.clearInterval(Imersivo.timer);
    Imersivo.timer = global.setInterval(Imersivo.tick, 1000);
  };

  Imersivo.fechar = function () {
    var el = typeof document !== 'undefined' ? document.getElementById('imersivo') : null;
    Imersivo.aberto = false;
    if (Imersivo.timer) { global.clearInterval(Imersivo.timer); Imersivo.timer = null; }
    if (el) { el.className = 'imersivo off'; el.setAttribute('aria-hidden', 'true'); }
  };

  Imersivo.alternar = function () { if (Imersivo.aberto) Imersivo.fechar(); else Imersivo.abrir(); };

  /* A cada segundo: relógio e contadores. A cada 5 s: blocos de campo e mercado. */
  Imersivo.tick = function () {
    if (!Imersivo.aberto) return;
    var el = document.getElementById('im-relogio');
    if (el) el.textContent = hora();
    Imersivo.contador++;
    /* o campo reporta de 15 em 15 minutos: o bloco vivo é recomposto a cada ciclo */
    if (Imersivo.contador % 5 === 0) {
      var vivo = document.getElementById('im-live');
      if (vivo) vivo.innerHTML = blocoCampo();
      var cot = document.getElementById('im-cotacoes');
      if (cot) cot.innerHTML = blocoMercado();
      var seg = document.getElementById('im-segundos');
      if (seg) seg.textContent = num(5 - (Imersivo.contador % 5), 0);
    }
  };

  /* =====================================================================
   * PAINEL
   * =================================================================== */
  Imersivo.html = function () {
    var escopo = E.escopoAtual();
    var ind = E.indicadores();
    var d = E.dre({});
    var fc = E.fluxoCaixa({});
    var c = E.custosConsolidados();
    var al = E.alertas();
    var est = Ledger.estatisticas();
    var pano = IoT.panorama();
    var lotes = E.estoquePorLote({});
    var acumulado = 0;
    var linhaAcum = d.meses.map(function (m) { acumulado += m.resultado; return acumulado; });
    var meses = d.meses.map(function (m) { return mesBR(m.mes); });
    var melhor = c.talhoes.slice().sort(function (a, b) { return (b.margemPct || -999) - (a.margemPct || -999); })[0];

    var html = '';
    html += '<div class="imersivo-topo">' +
      '<div class="logo" style="width:38px;height:38px">' + Ico.svg('semente', 22) + '</div>' +
      '<div><div class="titulo">Acompanhamento em tempo real</div>' +
      '<div class="nota">' + esc(escopo.tipo === 'PROPRIO' ? (escopo.usuario.nome + ' · ' + escopo.usuario.org) : (escopo.usuario.org || escopo.usuario.nome)) + '</div></div>' +
      '<div class="espaco" style="flex:1"></div>' +
      '<span class="relogio" id="im-relogio">' + hora() + '</span>' +
      '<span class="nota">' + esc(dataLonga()) + '</span>' +
      '<span class="chip verde"><span class="pulso"></span>cadeia íntegra · ' + num(est.blocos, 0) + ' blocos</span>' +
      '<span class="chip azul">' + num(pano.total, 0) + ' dispositivos · ' + num(pano.leiturasPorDia, 0) + ' leituras/dia</span>' +
      '<button class="sec mini" onclick="Imersivo.fechar()">sair (Esc)</button>' +
      '</div>';

    /* KPIs hero */
    html += '<div class="grade g4" style="margin:14px 0">' +
      kpiHero('Resultado do período', brl(ind.resultado, 0), d.periodo + ' · margem de ' + pct(ind.margemLiquida), ind.resultado >= 0 ? 'var(--positivo)' : 'var(--negativo)') +
      kpiHero('Receita líquida', brl(ind.receita, 0), 'custo = ' + num(ind.custoPorReal * 100, 0) + '% da receita') +
      kpiHero('Caixa hoje', brl(ind.saldoCaixa, 0), 'a receber ' + brl(ind.aReceber, 0)) +
      kpiHero('Estoque para venda', brl(lotes.reduce(function (a, l) { return a + l.valorMercado; }, 0), 0), lotes.length + ' lotes ao preço da IA') +
      '</div>';

    html += '<div class="vitrine">';
    /* resultado acumulado */
    html += '<div class="cartao"><h2>Resultado acumulado na safra</h2><div class="graf">' +
      Graf.area([{ nome: 'Resultado acumulado', dados: linhaAcum, cor: Graf.CORES.ouro }], {
        altura: 250, formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$', baseZero: true,
        rotuloX: [meses[0], meses[meses.length - 1]]
      }) + '</div><div class="nota">Saldo do caixa: ' + brl(fc.saldoFinal, 0) + ' · ponto de equilíbrio coberto em ' + pct(ind.pontoEquilibrio.coberturaPct, 0) + '</div></div>';

    /* receita x custo */
    html += '<div class="cartao"><h2>Entradas e saídas mês a mês</h2><div class="graf">' +
      Graf.barras(meses, [
        { nome: 'Entradas', dados: d.meses.map(function (m) { return m.receita; }), cor: Graf.CORES.verde },
        { nome: 'Saídas', dados: d.meses.map(function (m) { return -m.custo; }), cor: Graf.CORES.cacau }
      ], { altura: 250, formato: function (v) { return Graf.compacto(v); }, unidade: 'R$' }) + '</div>' +
      '<div class="nota">O custeio da safra sai antes da colheita; a venda em escrow entra 30 a 60 dias depois.</div></div>';

    /* talhões */
    html += '<div class="cartao"><h2>Talhões: custo por unidade × preço</h2><div class="graf">' +
      Graf.barras(c.talhoes.map(function (t) { return t.talhao + ' ' + t.nome.slice(0, 12); }), [
        { nome: 'Custo por saca/arroba', dados: c.talhoes.map(function (t) { return t.custoSacaProjetado; }), cor: Graf.CORES.cacau },
        { nome: 'Preço de mercado', dados: c.talhoes.map(function (t) { return t.precoMercado; }), cor: Graf.CORES.verde },
        { nome: 'Preço do lote (IA)', dados: c.talhoes.map(function (t) { return t.precoPremium || 0; }), cor: Graf.CORES.ia }
      ], { horizontal: true, altura: Math.max(200, c.talhoes.length * 62 + 60), formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$' }) + '</div></div>';

    /* margens com anéis */
    html += '<div class="cartao"><h2>Margem por talhão</h2>' + c.talhoes.map(function (t) {
      var p = t.margemPct || 0;
      var cor = p >= 25 ? 'var(--acento)' : p >= 10 ? 'var(--atencao)' : 'var(--critico)';
      return '<div class="flex entre" style="padding:8px 0;border-bottom:1px solid var(--linha)">' +
        '<div style="min-width:0"><b>' + esc(t.talhao + ' · ' + t.nome) + '</b>' +
        '<div class="nota">' + esc(t.produtoRotulo) + ' · ' + num(t.area, 1) + ' ha · custo ' + brl(t.custoSacaProjetado, 0) + ' contra preço ' + brl(t.precoMercado, 0) + '</div></div>' +
        '<div class="flex" style="gap:10px">' + Graf.anel(Math.max(0, Math.min(100, p)), 'margem', { cor: cor }) +
        '<div style="text-align:right"><div class="var ' + (p >= 0 ? 'sobe' : 'desce') + '">' + pct(p, 1) + '</div><div class="nota">' + num(t.progressoSafraPct, 0) + '% colhido</div></div></div></div>';
    }).join('') + '<div class="nota" style="margin-top:9px">Melhor resultado por ' + (melhor ? esc(melhor.unidadeNome) : 'unidade') + ': <b>' + (melhor ? esc(melhor.talhao + ' · ' + melhor.nome) : '—') + '</b> com margem de ' + (melhor ? pct(melhor.margemPct, 1) : '—') + '.</div></div>';

    /* campo ao vivo */
    html += '<div class="cartao" id="im-live" style="grid-column:1/-1">' + blocoCampo() + '</div>';

    /* mercado */
    html += '<div class="cartao" id="im-cotacoes">' + blocoMercado() + '</div>';

    /* cadeia */
    html += '<div class="cartao"><h2>Estado da cadeia</h2>' +
      '<div class="grade g2">' +
      '<div>' + [
        ['Blocos minerados', num(est.blocos, 0)],
        ['Transações registradas', num(est.transacoes, 0)],
        ['Lotes selados', num(est.lotes || (D.lotes.length), 0)],
        ['Contratos em escrow', num(D.contratos.length, 0) + ' (' + brl(D.contratos.reduce(function (a, c) { return a + c.valorTotal; }, 0), 0) + ')'],
        ['Último bloco', '#' + (est.ultimoBloco !== undefined ? est.ultimoBloco : (Ledger.blocos().length - 1))]
      ].map(function (x) {
        return '<div class="flex entre" style="padding:6px 0;border-bottom:1px solid var(--linha)"><span class="nota">' + x[0] + '</span><b>' + x[1] + '</b></div>';
      }).join('') + '</div>' +
      '<div><div class="hash" style="word-break:break-all">' + esc(Ledger.hashCadeia().slice(0, 96)) + '…</div>' +
      '<div class="nota" style="margin-top:8px">Hash da cadeia: qualquer alteração em qualquer bloco muda este valor. ' +
      'A verificação roda a cada bloco minerado e confere hash, encadeamento, Merkle e assinatura de cada transação.</div>' +
      '<div class="flex" style="margin-top:10px;gap:8px"><span class="chip verde">' + num(est.blocos, 0) + ' blocos válidos</span>' +
      '<span class="chip cinza">dificuldade ' + Ledger.DIFICULDADE + '</span>' +
      '<span class="chip roxo">fechamentos ancorados: ' + E.erp().ancoragens.length + '</span></div></div></div></div>';

    /* fechamentos */
    if (E.erp().ancoragens.length) {
      html += '<div class="cartao"><h2>Fechamentos contábeis ancorados</h2>' +
        E.erp().ancoragens.map(function (a) {
          return '<div class="flex entre" style="padding:7px 0;border-bottom:1px solid var(--linha)">' +
            '<div><b>' + esc(a.competencia) + '</b><div class="nota">' + a.contas + ' contas · bloco #' + a.bloco + '</div></div>' +
            '<div style="text-align:right"><div class="' + (a.resultado >= 0 ? 'positivo' : 'negativo') + '"><b>' + brl(a.resultado, 0) + '</b></div>' +
            '<div class="hash">' + esc(a.raizMerkle.slice(0, 20)) + '…</div></div></div>';
        }).join('') + '</div>';
    }
    html += '</div>';

    /* alertas em faixa */
    html += '<div class="ticker" style="margin-top:14px">' +
      '<span class="chip ' + (al.criticos ? 'vermelho' : 'verde') + '">' + al.resumo + '</span>' +
      al.itens.slice(0, 5).map(function (a) {
        return '<span>' + '<span class="sev ' + (a.severidade === 'critico' ? 'critico' : a.severidade === 'atencao' ? 'atencao' : 'info') + '"></span>' + esc(a.area + ': ' + a.titulo) + '</span>';
      }).join('') + '</div>';
    html += '<div class="flex entre" style="margin-top:10px"><span class="nota">Próximo ciclo de leitura de campo em <b id="im-segundos">5</b> s · leituras de 15 em 15 minutos, agregadas por hora</span>' +
      '<span class="nota">AgroChain · modo imersivo · Esc para sair</span></div>';
    return html;
  };

  /* =====================================================================
   * BLOCO AO VIVO — o que o campo está medindo
   * =================================================================== */
  function blocoCampo() {
    var panorama = IoT.panorama();
    var html = '<h2>No campo, agora <span class="sub">últimas leituras dos dispositivos ativos</span></h2>';
    var escopo = E.escopoAtual();
    var talhoes = D.talhoes.filter(function (t) { return escopo.produtores.indexOf(t.produtor) >= 0; });
    html += '<div class="grade g3">';
    talhoes.forEach(function (t) {
      var d = IoT.derivadosTalhao(t.id);
      var sensores = IoT.sensoresDeTalhao(t.id);
      var solo = d.estresse || null;
      var linhas = [];
      linhas.push('<div class="flex entre" style="padding:4px 0"><span class="nota">Água disponível no solo</span><b>' + (solo && solo.aguaDisponivel !== undefined ? num(solo.aguaDisponivel, 0) + '% · ' + esc(solo.classificacao) : '—') + '</b></div>');
      if (d.balanco) linhas.push('<div class="flex entre" style="padding:4px 0"><span class="nota">Balanço hídrico (30 d)</span><b class="' + (d.balanco.saldo >= 0 ? 'positivo' : 'negativo') + '">' + num(d.balanco.saldo, 1) + ' mm</b></div>');
      if (d.grausDia) linhas.push('<div class="flex entre" style="padding:4px 0"><span class="nota">Graus-dia acumulados</span><b>' + num(d.grausDia.acumulado30d, 0) + ' GD · ' + esc(d.grausDia.estagio) + '</b></div>');
      if (d.molhamento) linhas.push('<div class="flex entre" style="padding:4px 0"><span class="nota">Molhamento foliar (7 d)</span><b>' + num(d.molhamento.horasFavoraveis, 0) + ' h favoráveis</b></div>');
      html += '<div class="caixa">' +
        '<div class="flex entre"><b>' + esc(t.id + ' · ' + t.nome) + '</b><span class="chip ' + (sensores.length ? 'azul' : 'cinza') + '">' + sensores.length + ' dispositivo(s)</span></div>' +
        '<div class="nota">' + esc(t.produto === 'cacau' ? 'Cacau' : 'Café conilon') + ' · ' + num(t.area, 1) + ' ha · ' + esc(t.sistema) + '</div>' +
        '<div style="margin-top:6px">' + linhas.join('') + '</div>' +
        '</div>';
    });
    /* fermentação e secagem com gráfico */
    var lojas = D.lotes.filter(function (l) {
      return escopo.produtores.indexOf(l.produtor) >= 0 && (l.status === 'EM_FERMENTACAO' || l.status === 'EM_SECAGEM');
    });
    lojas.forEach(function (l) {
      if (l.produto === 'cacau' && l.status === 'EM_FERMENTACAO') {
        var f = IoT.fermentacao(l.id);
        if (!f) return;
        var serieF = f.serie.map(function (x) { return x.valores.tempMassa; });
        html += '<div class="caixa"><div class="flex entre"><b>Massa de cacau ' + esc(l.id) + '</b>' +
          '<span class="chip ' + (f.classe === 'ideal' ? 'verde' : f.classe === 'excesso' ? 'vermelho' : 'ouro') + '">' + esc(f.classe) + ' · ' + esc(f.situacao || 'em andamento') + '</span></div>' +
          '<div class="kpi" style="margin:6px 0"><div class="val" style="font-size:26px">' + num(f.indiceAcumulado, 0) + ' <span style="font-size:14px">°C·h</span></div>' +
          '<div class="obs">pico de ' + num(f.temperaturaPico, 1) + ' °C em ' + num(f.picoAtingidoEmHoras, 0) + ' h · nota prevista ' + num(f.notaPrevista, 0) + '</div></div>' +
          '<div class="graf">' + Graf.linha([{ nome: 'Temperatura da massa', dados: serieF, cor: Graf.CORES.ia }], {
            altura: 120, formato: function (v) { return num(v, 1) + ' °C'; }, unidade: '°C',
            faixas: [{ de: 40, ate: 52, nome: 'acima de 40 °C o calor conta para o índice', cor: 'rgba(107,79,168,.14)' }]
          }) + '</div>' +
          '<div class="nota">' + esc(f.recomendacao || '') + '</div></div>';
      } else if (l.produto === 'cafe_conilon' || l.status === 'EM_SECAGEM') {
        var s = IoT.secagem(l.id);
        if (!s) return;
        var serieS = s.serie.map(function (x) { return x.valores.umidadeGrao; });
        html += '<div class="caixa"><div class="flex entre"><b>Secagem do lote ' + esc(l.id) + '</b>' +
          '<span class="chip ' + (s.concluida ? 'verde' : 'azul') + '">' + (s.concluida ? 'no ponto' : 'em andamento') + '</span></div>' +
          '<div class="kpi" style="margin:6px 0"><div class="val" style="font-size:26px">' + num(s.umidadeAtual, 1) + ' <span style="font-size:14px">% umidade</span></div>' +
          '<div class="obs">meta ' + num(s.umidadeAlvo, 1) + '% a ' + num(s.taxaDesidratacaoDia, 2) + '%/dia · ' +
          (s.diasParaPontoIdeal === null ? 'taxa insuficiente para prever o ponto' : num(s.diasParaPontoIdeal, 1) + ' dia(s) para o ponto') + '</div></div>' +
          '<div class="graf">' + Graf.linha([{ nome: 'Umidade do grão', dados: serieS, cor: Graf.CORES.agua }], {
            altura: 120, formato: function (v) { return num(v, 1) + '%'; }, unidade: '%',
            faixas: [{ de: s.umidadeAlvo - 0.4, ate: s.umidadeAlvo + 0.4, nome: 'umidade de entrega', cor: 'rgba(201,162,39,.18)' }]
          }) + '</div>' +
          (s.alerta ? '<div class="nota">' + esc(s.alerta) + '</div>' : '') + '</div>';
      }
    });
    html += '</div>';
    html += '<div class="nota" style="margin-top:9px">Sensores: ' + num(panorama.total, 0) + ' cadastrados, ' + num(panorama.ativos, 0) + ' ativos, ' + num(panorama.confiabilidadeMedia, 0) + '% de confiabilidade · bateria média ' + num(panorama.bateriaMedia, 0) + '%. ' +
      'As leituras são agregadas de hora em hora e a massa de cacau reporta a cada 15 minutos — é isso que dá base para justificar cada aplicação e cada lote.</div>';
    return html;
  }

  function blocoMercado() {
    var cot = [
      { produto: 'cafe_arabica', nome: 'Café arábica', unidade: 'saca 60 kg', cor: Graf.CORES.verde },
      { produto: 'cafe_conilon', nome: 'Café conilon', unidade: 'saca 60 kg', cor: Graf.CORES.ouro },
      { produto: 'cacau', nome: 'Cacau', unidade: 'kg', cor: Graf.CORES.cacau }
    ];
    var html = '<h2>Cotações e mercado <span class="sub">Cepea/Esalq e praças de Rondônia</span></h2><div class="grade g3">';
    cot.forEach(function (c) {
      var serie = D.precos[c.produto];
      var valores = serie.map(function (p) { return p.preco; });
      var atual = valores[valores.length - 1];
      var antes = valores[Math.max(0, valores.length - 31)];
      var varPct = (atual - antes) / antes * 100;
      html += '<div class="caixa"><div class="flex entre"><b>' + esc(c.nome) + '</b>' +
        '<span class="var ' + (varPct >= 0 ? 'sobe' : 'desce') + '">' + (varPct >= 0 ? '▲' : '▼') + ' ' + pct(Math.abs(varPct), 1) + '</span></div>' +
        '<div class="kpi" style="margin:4px 0"><div class="val" style="font-size:24px">' + brl(atual, 2) + '</div><div class="obs">por ' + esc(c.unidade) + ' · 30 dias</div></div>' +
        Graf.sparkline(valores.slice(-60), { largura: 240, altura: 40, cor: c.cor }) + '</div>';
    });
    html += '</div>';
    var lotes = E.estoquePorLote({});
    if (lotes.length) {
      html += '<div style="margin-top:12px;overflow-x:auto"><table class="tabela compacta"><thead><tr><th>Lote</th><th class="num">Saldo</th><th class="num">Custo</th><th class="num">Preço da IA</th><th class="num">Resultado</th></tr></thead><tbody>' +
        lotes.map(function (l) {
          return '<tr><td><b>' + esc(l.lote) + '</b><div class="nota">' + esc(l.produtoRotulo) + ' · nota ' + num(l.notaQualidade, 0) + '</div></td>' +
            '<td class="num">' + num(l.saldo, 0) + ' ' + esc(String(l.unidade).split(' ')[0]) + '</td>' +
            '<td class="num">' + brl(l.custoUnit, 0) + '</td><td class="num">' + brl(l.precoIA, 0) + '</td>' +
            '<td class="num ' + (l.resultado >= 0 ? 'positivo' : 'negativo') + '"><b>' + brl(l.resultado, 0) + '</b></td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    return html;
  }

  global.Imersivo = Imersivo;
})(typeof window !== 'undefined' ? window : globalThis);
