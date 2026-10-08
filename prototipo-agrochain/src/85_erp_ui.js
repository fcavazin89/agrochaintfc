/* =========================================================================
 * AGROCHAIN · INTERFACE DO ERP
 * Telas de gestão: visão geral, financeiro (contas a pagar e receber, fluxo
 * de caixa, DRE, orçado x realizado, escrow), custos por talhão e por saca,
 * estoques e movimentações, pessoas e máquinas, fechamento contábil ancorado.
 * Todos os gráficos passam pela biblioteca Graf (SVG próprio).
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var E = global.Erp;
  var Graf = global.Graf;
  var IoT = global.IoT;
  var Ledger = global.Ledger;

  var App4 = {
    aba: 'visao',
    mes: null,
    talhao: null,
    filtroTitulo: 'todos',
    filtroMov: 'todos',
    filtroItem: 'todos',
    compra: { item: '', qtd: '2', preco: '', fornecedor: '', prazo: '30' },
    aplicacao: { item: '', qtd: '0,5', talhao: '' },
    venda: { lote: '', qtd: '', preco: '', comprador: '', prazo: '30' },
    preparo: null,
    ancoragem: null,
    prova: null,
    maquinaSel: null,
    aviso: null,
    avisoTipo: 'verde'
  };

  /* ---------------- utilidades ---------------- */
  function num(v, d) { if (v === null || v === undefined || isNaN(v)) return '—'; return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d === undefined ? 0 : d }); }
  function brl(v, d) { if (v === null || v === undefined || isNaN(v)) return '—'; return 'R$ ' + num(v, d === undefined ? 2 : d); }
  function pct(v, d) { if (v === null || v === undefined || isNaN(v)) return '—'; return num(v, d === undefined ? 1 : d) + '%'; }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function mesBR(mm) { var p = mm.split('-'); return ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][Number(p[1]) - 1] + '/' + p[0].slice(2); }
  function dataBR(iso) { if (!iso) return '—'; var p = iso.slice(0, 10).split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function sinal(v) { return v > 0 ? 'positivo' : v < 0 ? 'negativo' : ''; }
  function chip(t, cor) { return '<span class="chip ' + (cor || 'cinza') + '">' + esc(t) + '</span>'; }
  function barra(p, cor) {
    var v = Math.max(0, Math.min(100, p || 0));
    var grad = cor ? 'background:' + cor : '';
    return '<div class="barra-alt" style="min-width:70px"><i style="width:' + v.toFixed(0) + '%;' + grad + '"></i></div>';
  }
  function kpi(rot, val, obs, cor) {
    return '<div class="kpi"><div class="rot">' + rot + '</div><div class="val ' + (cor === 'pequeno' ? 'pequeno' : '') + '"' +
      (cor && cor !== 'pequeno' ? ' style="color:' + cor + '"' : '') + '>' + val + '</div>' + (obs ? '<div class="obs">' + obs + '</div>' : '') + '</div>';
  }
  function cartao(titulo, corpo, classe) {
    return '<div class="cartao ' + (classe || '') + '">' + (titulo ? '<h2>' + titulo + '</h2>' : '') + corpo + '</div>';
  }
  function fonte(texto) { return '<div class="nota" style="margin-top:8px;border-top:1px solid var(--linha);padding-top:7px">ⓘ ' + texto + '</div>'; }
  function corSeveridade(s) { return s === 'critico' ? 'vermelho' : s === 'atencao' ? 'ouro' : 'cinza'; }

  /* ---------------- toasts ---------------- */
  function toast(mensagem, tipo) {
    if (typeof document === 'undefined') return;
    var caixa = document.getElementById('toasts');
    if (!caixa) return;
    var el = document.createElement('div');
    el.className = 'toast ' + (tipo || '');
    el.innerHTML = mensagem;
    caixa.appendChild(el);
    global.setTimeout(function () { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; }, 5200);
    global.setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5800);
  }
  function avisar(msg, tipo) { toast(msg, tipo || 'verde'); App4.renderAba(); }

  /* ---------------- navegação ---------------- */
  App4.ir = function (aba) { App4.aba = aba; App4.aviso = null; global.App.render(); };
  App4.verTalhao = function (id) { App4.talhao = id; App4.aba = 'custos'; global.App.render(); };
  App4.filtrarTitulo = function (f) { App4.filtroTitulo = f; global.App.render(); };
  App4.filtrarMov = function (f) { App4.filtroMov = f; global.App.render(); };
  App4.renderAba = function () { if (global.App.view === 'erp') global.App.render(); };
  App4.limpar = function () { App4.preparo = null; App4.prova = null; App4.ancoragem = null; global.App.render(); };

  /* =====================================================================
   * CASCA — cabeçalho, abas e roteamento interno
   * =================================================================== */
  App4.viewErp = function () {
    var escopo = E.escopoAtual();
    var al = E.alertas();
    var ind = E.indicadores();
    var abas = [
      { id: 'visao', n: 'Visão geral' },
      { id: 'financeiro', n: 'Financeiro', badge: ind.vencidos || null },
      { id: 'custos', n: 'Custos e safra' },
      { id: 'estoque', n: 'Estoques', badge: ind.estoqueAbaixoMinimo || null },
      { id: 'operacoes', n: 'Pessoas e máquinas' },
      { id: 'fechamento', n: 'Fechamento contábil' }
    ];
    var html = '<h2>ERP da propriedade ' +
      chip(escopo.tipo === 'PROPRIO' ? 'minha propriedade' : 'visão consolidada', escopo.tipo === 'PROPRIO' ? 'verde' : 'roxo') +
      chip(al.criticos + ' críticos de ' + al.total + ' alertas', al.criticos ? 'vermelho' : 'verde') + '</h2>';
    html += '<div class="sub" style="margin-bottom:10px">' + esc(escopo.rotulo || 'Cadastro, custo, caixa e estoque com a mesma origem de dado: o evento da cadeia. Nada é digitado duas vezes.') + '</div>';
    html += '<div class="abas">' + abas.map(function (a) {
      return '<div class="aba ' + (App4.aba === a.id ? 'on' : '') + '" onclick="App4.ir(\'' + a.id + '\')">' + a.n +
        (a.badge ? '<span class="badge">' + a.badge + '</span>' : '') + '</div>';
    }).join('') + '</div>';

    if (App4.aviso) html += '<div class="caixa ' + (App4.avisoTipo === 'vermelho' ? '' : 'verde') + '" style="margin-bottom:12px">' + App4.aviso + '</div>';

    if (App4.aba === 'visao') html += viewVisao();
    else if (App4.aba === 'financeiro') html += viewFinanceiro();
    else if (App4.aba === 'custos') html += viewCustos();
    else if (App4.aba === 'estoque') html += viewEstoque();
    else if (App4.aba === 'operacoes') html += viewOperacoes();
    else html += viewFechamento();
    return html;
  };

  /* =====================================================================
   * VISÃO GERAL
   * =================================================================== */
  function viewVisao() {
    var ind = E.indicadores();
    var d = E.dre({});
    var c = E.custosConsolidados();
    var est = E.estoqueAtual({});
    var al = E.alertas();
    var lotes = E.estoquePorLote({});
    var pe = ind.pontoEquilibrio;
    var html = '';

    html += '<div class="grade g4">';
    html += cartao('', kpi('Resultado do período', brl(ind.resultado, 0), d.periodo + ' · margem líquida de ' + pct(ind.margemLiquida), ind.resultado >= 0 ? 'var(--positivo)' : 'var(--negativo)'));
    html += cartao('', kpi('Receita líquida', brl(ind.receita, 0), 'custo de produção consome ' + num(ind.custoPorReal * 100, 0) + ' centavos de cada real'));
    html += cartao('', kpi('Margem bruta da lavoura', pct(ind.margemBruta), 'após tributos e custo de produção'));
    html += cartao('', kpi('Custo por hectare', brl(ind.custoPorHa, 0), num(ind.area, 1) + ' ha produtivos sob gestão'));
    html += '</div>';

    html += '<div class="grade g4" style="margin-top:14px">';
    html += cartao('', kpi('Caixa (12 meses)', brl(ind.saldoCaixa, 0), 'partiu de ' + brl(E.fluxoCaixa({}).saldoInicial, 0)));
    html += cartao('', kpi('A receber', brl(ind.aReceber, 0), ind.vencidos ? (ind.vencidos + ' título(s) vencido(s): ' + brl(ind.vencidosValor, 0)) : 'nenhum título vencido'));
    html += cartao('', kpi('Estoque', brl(ind.estoque, 0), 'produto ' + brl(ind.estoqueProduto, 0) + ' + insumos ' + brl(ind.estoqueInsumo, 0)));
    html += cartao('', kpi('Ponto de equilíbrio', pct(pe.coberturaPct, 0) + ' coberto', 'meta de ' + num(pe.sacasEquivalentes, 0) + ' sacas equivalentes: ' + brl(pe.receitaNecessaria, 0)));
    html += '</div>';

    /* gráficos principais */
    html += '<div class="grade g2" style="margin-top:14px">';
    var meses = d.meses.map(function (m) { return mesBR(m.mes); });
    html += cartao('Receita e custo por mês (últimos 12 meses)',
      '<div class="graf">' + Graf.barras(meses, [
        { nome: 'Entradas (vendas)', dados: d.meses.map(function (m) { return m.receita; }), cor: Graf.CORES.verde },
        { nome: 'Saídas (custo e despesa)', dados: d.meses.map(function (m) { return m.custo; }), cor: Graf.CORES.cacau }
      ], { formato: function (v) { return Graf.compacto(v); }, unidade: 'R$', sufixo: '', altura: 240 }) + '</div>' +
      '<div class="legenda"><span><i style="background:' + Graf.CORES.verde + '"></i>Entradas</span><span><i style="background:' + Graf.CORES.cacau + '"></i>Saídas</span></div>' +
      fonte('Barras agrupadas do resultado mês a mês. O caixa da fazenda é sazonal: a colheita concentra a saída e o recebimento vem 30 a 60 dias depois da venda.'));
    var acumulado = 0;
    var linhaAcum = d.meses.map(function (m) { acumulado += m.resultado; return acumulado; });
    html += cartao('Resultado acumulado no período',
      '<div class="graf">' + Graf.area([{ nome: 'Resultado acumulado', dados: linhaAcum, cor: Graf.CORES.ouro }], {
        formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$', baseZero: true, altura: 240,
        rotuloX: [mesBR(d.meses[0].mes), mesBR(d.meses[d.meses.length - 1].mes)]
      }) + '</div>' + fonte('Soma corrida do resultado: mostra em que mês a safra vira lucro e quanto do ano depende das vendas do segundo semestre.'));
    html += '</div>';

    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('De onde vem o resultado (cascata da DRE)',
      '<div class="graf">' + Graf.cascata(d.cascata, { formato: function (v) { return 'R$ ' + Graf.compacto(v); } }) + '</div>' +
      fonte('A cascata parte da receita bruta e desconta tributos, custo de produção, despesas, depreciação e juros até o resultado do período.'));
    html += cartao('Composição do custo de produção',
      '<div class="flex envolve" style="gap:18px;align-items:center">' +
      Graf.rosca(d.contas.custos.slice(0, 5).map(function (x) { return { nome: x.nome, valor: x.valor }; }),
        { formato: function (v) { return 'R$ ' + Graf.compacto(v); }, centro: 'R$ ' + Graf.compacto(d.custoProducao), centroRotulo: 'custo do período', unidade: 'R$' }) +
      '<div style="flex:1;min-width:240px">' + d.contas.custos.slice(0, 5).map(function (x, i) {
        return '<div class="flex entre" style="padding:5px 0;border-bottom:1px solid var(--linha)"><span class="nota">' + esc(x.nome) + '</span><b>' + brl(x.valor, 0) + '</b></div>';
      }).join('') + '</div></div>' +
      fonte('As cinco contas que mais pesam no custo de produção. Cada centavo vem de lançamento do ERP — compra de insumo, baixa de estoque, folha ou serviço de máquina.'));
    html += '</div>';

    /* talhões */
    html += '<div class="cartao" style="margin-top:14px"><h2>Custo, preço e margem por talhão ' + chip('clique em um talhão para abrir a ficha completa', 'cinza') + '</h2>';
    html += '<div style="overflow-x:auto"><table class="tabela"><thead><tr>' +
      '<th>Talhão</th><th>Área</th><th class="num">Custo total</th><th class="num">Custo por ' + 'saca/arroba' + '</th><th class="num">Preço de mercado</th><th class="num">Preço do lote (IA)</th><th>Margem</th><th>Safra</th><th></th>' +
      '</tr></thead><tbody>';
    c.talhoes.forEach(function (t) {
      var cor = t.margemPct >= 25 ? 'verde' : t.margemPct >= 10 ? 'ouro' : 'vermelho';
      html += '<tr><td><b>' + esc(t.nome) + '</b><div class="nota">' + esc(t.produtoRotulo) + ' · ' + esc(t.cultivar) + ' · ' + t.idade + ' anos · ' + esc(t.sistema) + '</div></td>' +
        '<td>' + num(t.area, 1) + ' ha</td>' +
        '<td class="num">' + brl(t.custoTotal, 0) + '<div class="nota">' + brl(t.custoPorHa, 0) + '/ha</div></td>' +
        '<td class="num">' + brl(t.custoSacaProjetado, 0) + '<div class="nota">' + esc(t.unidadeNome) + '</div></td>' +
        '<td class="num">' + brl(t.precoMercado, 0) + '</td>' +
        '<td class="num">' + (t.precoPremium ? brl(t.precoPremium, 0) + '<div class="nota">lote ' + esc(t.loteRef) + '</div>' : '—') + '</td>' +
        '<td>' + chip(pct(t.margemPct, 1), cor) + (t.margemPremiumPct !== null && t.precoPremium ? '<div class="nota">com o lote: ' + pct(t.margemPremiumPct, 1) + '</div>' : '') + '</td>' +
        '<td style="min-width:90px">' + barra(t.progressoSafraPct) + '<div class="nota">' + num(t.progressoSafraPct, 0) + '% de ' + num(t.unidadesPrevistas, 0) + ' ' + esc(t.unidadeNome.split(' ')[0]) + '</div></td>' +
        '<td><button class="mini sec" onclick="App4.verTalhao(\'' + t.talhao + '\')">abrir</button></td></tr>';
    });
    html += '</tbody></table></div>' + fonte('Custo dividido pela produção prevista pelo modelo de IA: se a lavoura render menos que o previsto, o custo por saca sobe na hora — é o mesmo número que o assistente usa para responder.') + '</div>';

    /* estoque + alertas */
    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Estoque de produto rastreado, lote a lote',
      lotes.length ? '<div style="overflow-x:auto"><table class="tabela compacta"><thead><tr><th>Lote</th><th>Produto</th><th class="num">Saldo</th><th class="num">Custo</th><th class="num">Preço da IA</th><th class="num">Margem</th></tr></thead><tbody>' +
        lotes.map(function (l) {
          return '<tr><td><b>' + esc(l.lote) + '</b><div class="nota">' + esc(l.talhao || '') + '</div></td>' +
            '<td>' + esc(l.produtoRotulo) + '<div class="nota">' + esc(l.statusCadeia || '') + '</div></td>' +
            '<td class="num">' + num(l.saldo, 0) + '<div class="nota">' + esc(l.unidade) + '</div></td>' +
            '<td class="num">' + brl(l.custoUnit, 0) + '</td>' +
            '<td class="num">' + brl(l.precoIA, 0) + '<div class="nota">nota ' + num(l.notaQualidade, 0) + ' · ' + (l.ajustePct > 0 ? '+' : '') + num(l.ajustePct, 1) + '%</div></td>' +
            '<td class="num ' + sinal(l.margemPct) + '">' + pct(l.margemPct, 1) + '<div class="nota">' + brl(l.resultado, 0) + '</div></td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="caixa" style="margin-top:10px">Total disponível para venda: <b>' + brl(est.valorProduto, 0) + '</b> a preço de custo e <b>' + brl(lotes.reduce(function (a, l) { return a + l.valorMercado; }, 0), 0) + '</b> ao preço que o modelo de IA devolve para a qualidade de cada lote.</div>'
        : Graf.vazio('Nenhum lote em estoque no período'),
      'destaque');
    html += cartao('Alertas do ERP (' + al.total + ')',
      al.itens.length ? al.itens.slice(0, 9).map(function (a) {
        return '<div class="caixa" style="margin-bottom:8px;border-left:3px solid ' + (a.severidade === 'critico' ? 'var(--critico)' : a.severidade === 'atencao' ? 'var(--atencao)' : 'var(--linha-forte)') + '">' +
          '<div class="flex entre envolve" style="gap:8px"><b>' + esc(a.titulo) + '</b>' + chip(a.area, corSeveridade(a.severidade)) + '</div>' +
          '<div class="nota" style="margin-top:5px">' + esc(a.detalhe) + '</div>' +
          '<div class="nota" style="margin-top:5px;color:var(--verde-300)">' + esc(a.acao) + '</div></div>';
      }).join('') + (al.itens.length > 9 ? '<div class="nota">e mais ' + (al.itens.length - 9) + ' alertas nas outras abas.</div>' : '') : Graf.vazio('Sem alertas no período'));
    html += '</div>';

    /* heatmap de custo */
    html += '<div class="cartao" style="margin-top:14px"><h2>Custo por hectare, talhão a talhão e mês a mês</h2>' +
      '<div class="graf">' + heatmapCusto() + '</div>' +
      fonte('Mancha de calor do custo por hectare em cada mês. Serve para ver onde o dinheiro entra: adubação de outubro a abril, colheita de maio a outubro e a manutenção de máquinas em abril e outubro.') + '</div>';
    return html;
  }

  function heatmapCusto() {
    var talhoes = E.custosConsolidados().talhoes;
    var meses = E.MESES();
    var linhas = talhoes.map(function (t) { return t.talhao + ' ' + t.nome.slice(0, 14); });
    var cols = meses.map(function (m) { return mesBR(m); });
    var valores = talhoes.map(function (t) {
      return meses.map(function (m) {
        var ls = E.lancamentos({ talhao: t.talhao, de: m + '-01', ate: m + '-31' });
        var v = ls.reduce(function (a, l) { return a + l.valor; }, 0);
        return Math.round(v / t.area);
      });
    });
    return Graf.heatmap(linhas, cols, valores, { formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: '/ha', celula: 46, nota: 'Custo direto lançado no talhão (sem rateio da estrutura), dividido pela área.' });
  }

  /* =====================================================================
   * FINANCEIRO
   * =================================================================== */
  function viewFinanceiro() {
    var ind = E.indicadores();
    var d = E.dre({});
    var fc = E.fluxoCaixa({});
    var proj = E.projecaoCaixa(90);
    var tit = E.titulos({});
    var orc = E.orcadoRealizado(2026);
    var html = '';

    html += '<div class="grade g5">';
    html += cartao('', kpi('A receber', brl(ind.aReceber, 0), tit.filter(function (t) { return t.tipo === 'RECEBER' && t.status !== 'RECEBIDO'; }).length + ' títulos em aberto'));
    html += cartao('', kpi('A pagar', brl(ind.aPagar, 0), tit.filter(function (t) { return t.tipo === 'PAGAR' && t.status !== 'PAGO'; }).length + ' títulos em aberto'));
    html += cartao('', kpi('Vencidos', brl(ind.vencidosValor, 0), ind.vencidos + ' título(s) — ' + (ind.vencidos ? 'renegociar ou liquidar' : 'nada em atraso'), ind.vencidos ? 'var(--negativo)' : 'var(--positivo)'));
    html += cartao('', kpi('Liquidez seca', num(ind.liquidez, 2) + 'x', '(receber + estoque de produto) ÷ contas a pagar'));
    html += cartao('', kpi('Capital de giro', brl(ind.capitalGiro, 0), 'receber + estoque − pagar'));
    html += '</div>';

    /* fluxo de caixa */
    var meses = fc.serie.map(function (m) { return mesBR(m.mes); });
    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Fluxo de caixa dos últimos 12 meses',
      '<div class="graf">' + Graf.barras(meses, [
        { nome: 'Entradas', dados: fc.serie.map(function (m) { return m.entradas; }), cor: Graf.CORES.verde },
        { nome: 'Saídas', dados: fc.serie.map(function (m) { return -m.saidas; }), cor: Graf.CORES.risco }
      ], { formato: function (v) { return Graf.compacto(v); }, unidade: 'R$', altura: 230 }) + '</div>' +
      '<div class="graf" style="margin-top:6px">' + Graf.linha([{ nome: 'Saldo de caixa', dados: fc.serie.map(function (m) { return m.saldo; }), cor: Graf.CORES.ouro }], {
        altura: 150, formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$', baseZero: true,
        faixas: [{ de: -1e9, ate: 0, nome: 'caixa negativo', cor: 'rgba(192,57,43,.14)' }]
      }) + '</div>' +
      '<div class="nota">Saldo inicial de ' + brl(fc.saldoInicial, 0) + ' e saldo atual de <b>' + brl(fc.saldoFinal, 0) + '</b>. O mês corrente (' + mesBR(E.MESES()[E.MESES().length - 1]) + ') está incompleto e aparece como parcial.</div>', 'destaque');
    html += cartao('Projeção de 90 dias e estoque disponível',
      '<div class="graf">' + Graf.barras(proj.janelas.map(function (j) { return j.rotulo; }), [
        { nome: 'A receber', dados: proj.janelas.map(function (j) { return j.aReceber; }), cor: Graf.CORES.verde },
        { nome: 'A pagar + custeio', dados: proj.janelas.map(function (j) { return -(j.aPagar + j.custeio); }), cor: Graf.CORES.cacau }
      ], { formato: function (v) { return Graf.compacto(v); }, unidade: 'R$', altura: 200 }) + '</div>' +
      '<table class="tabela compacta" style="margin-top:8px"><thead><tr><th>Janela</th><th class="num">A receber</th><th class="num">A pagar</th><th class="num">Custeio estimado</th><th class="num">Saldo projetado</th></tr></thead><tbody>' +
      proj.janelas.map(function (j) {
        return '<tr><td>' + esc(j.rotulo) + '</td><td class="num positivo">' + brl(j.aReceber, 0) + '</td><td class="num negativo">' + brl(j.aPagar, 0) + '</td><td class="num negativo">' + brl(j.custeio, 0) + '</td>' +
          '<td class="num ' + sinal(j.saldo) + '"><b>' + brl(j.saldo, 0) + '</b></td></tr>';
      }).join('') + '</tbody></table>' +
      (proj.alerta ? '<div class="caixa" style="margin-top:9px;border-left:3px solid var(--critico)">' + esc(proj.alerta) + '</div>' : '<div class="caixa verde" style="margin-top:9px">✓ Caixa projetado positivo nas três janelas. Fôlego estimado: ' + num(proj.mesesDeFolego, 1) + ' meses de custeio coberto por caixa e estoque.</div>') +
      '<h3 style="margin-top:12px">Estoque que pode virar caixa hoje</h3>' +
      (proj.disponivel.length ? '<table class="tabela compacta"><thead><tr><th>Lote</th><th class="num">Saldo</th><th class="num">Custo</th><th class="num">Preço da IA</th><th class="num">Líquido</th><th class="num">Margem</th></tr></thead><tbody>' +
        proj.disponivel.map(function (x) {
          return '<tr><td><b>' + esc(x.loteRef) + '</b><div class="nota">' + esc(x.statusCadeia || '') + '</div></td><td class="num">' + num(x.quantidade, 0) + ' ' + esc(String(x.unidade).split(' ')[0]) + '</td>' +
            '<td class="num">' + brl(x.custoUnit, 0) + '</td><td class="num">' + brl(x.precoUnit, 0) + '<div class="nota">nota ' + num(x.notaQualidade, 0) + '</div></td>' +
            '<td class="num"><b>' + brl(x.liquido, 0) + '</b></td><td class="num ' + sinal(x.margemPct) + '">' + pct(x.margemPct, 1) + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr class="total"><td colspan="4">Total disponível ao preço ajustado pela qualidade</td><td class="num">' + brl(proj.estoqueLiquido, 0) + '</td><td></td></tr></tfoot></table>'
        : Graf.vazio('Nenhum lote disponível para venda')));
    html += '</div>';

    /* títulos */
    var receber = tit.filter(function (t) { return t.tipo === 'RECEBER'; });
    var pagar = tit.filter(function (t) { return t.tipo === 'PAGAR'; });
    var filtro = App4.filtroTitulo;
    function passa(t) { return filtro === 'todos' || t.status === filtro; }
    html += '<div class="cartao" style="margin-top:14px"><h2>Contas a receber e a pagar ' +
      '<span class="sub">' + receber.length + ' a receber · ' + pagar.length + ' a pagar</span></h2>';
    html += '<div class="flex envolve" style="margin-bottom:9px">' +
      ['todos', 'ABERTO', 'VENCIDO', 'RECEBIDO', 'PAGO'].map(function (f) {
        return '<span class="chip filtro ' + (filtro === f ? 'on' : '') + '" onclick="App4.filtrarTitulo(\'' + f + '\')">' + (f === 'todos' ? 'todos' : f.toLowerCase()) + '</span>';
      }).join('') + '</div>';
    html += '<div class="grade g2">';
    html += '<div><h3>Contas a receber</h3><div style="overflow-x:auto"><table class="tabela compacta"><thead><tr><th>Contraparte</th><th class="num">Valor</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead><tbody>' +
      receber.filter(passa).map(function (t) {
        return '<tr><td>' + esc(t.contraparte) + '<div class="nota">' + esc(t.descricao.slice(0, 68)) + (t.contrato ? ' · ' + esc(t.contrato) : '') + '</div>' +
          (t.origem === 'ESCROW' ? '<span class="tag">escrow</span>' : '') + '</td>' +
          '<td class="num">' + brl(t.valor, 0) + '</td><td>' + dataBR(t.vencimento) + '</td>' +
          '<td>' + chip(t.status === 'RECEBIDO' ? 'recebido' : t.status === 'VENCIDO' ? 'vencido' : 'aberto', t.status === 'RECEBIDO' ? 'verde' : t.status === 'VENCIDO' ? 'vermelho' : 'ouro') + '</td>' +
          '<td>' + (t.status === 'RECEBIDO' ? '' : '<button class="mini sec" onclick="App4.liquidar(\'' + t.id + '\')">liquidar</button>') + '</td></tr>';
      }).join('') || '<tr><td colspan="5">' + Graf.vazio('Nenhum título neste filtro') + '</td></tr>';
    html += '</tbody></table></div></div>';
    html += '<div><h3>Contas a pagar</h3><div style="overflow-x:auto"><table class="tabela compacta"><thead><tr><th>Contraparte</th><th class="num">Valor</th><th>Vencimento</th><th>Situação</th><th></th></tr></thead><tbody>' +
      pagar.filter(passa).map(function (t) {
        return '<tr><td>' + esc(t.contraparte) + '<div class="nota">' + esc(t.descricao.slice(0, 68)) + '</div></td>' +
          '<td class="num">' + brl(t.valor, 0) + '</td><td>' + dataBR(t.vencimento) + '</td>' +
          '<td>' + chip(t.status === 'PAGO' ? 'pago' : t.status === 'VENCIDO' ? 'vencido' : 'aberto', t.status === 'PAGO' ? 'verde' : t.status === 'VENCIDO' ? 'vermelho' : 'ouro') + '</td>' +
          '<td>' + (t.status === 'PAGO' ? '' : '<button class="mini sec" onclick="App4.liquidar(\'' + t.id + '\')">pagar</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
    html += '</div>';
    html += '<div class="flex envolve" style="margin-top:11px;gap:9px">' +
      '<button class="roxo" onclick="App4.sincronizarEscrow()">Sincronizar contratos em escrow com o contas a receber</button>' +
      '<span class="nota">Contrato com pagamento em escrow entra no contas a receber com o banco de custódia identificado; quando a etapa de liberação é concluída na cadeia, o título é baixado.</span></div>';
    html += '</div>';

    /* DRE + orçado */
    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('DRE do período — ' + esc(d.periodo),
      '<table class="tabela compacta"><tbody>' +
      linhaDre('Receita bruta', d.receitaBruta, false) +
      linhaDre('(−) Tributos sobre a venda', -d.tributos, false) +
      linhaDre('= Receita líquida', d.receitaLiquida, true) +
      linhaDre('(−) Custo de produção', -d.custoProducao, false) +
      linhaDre('= Margem bruta (' + pct(d.margemBrutaPct) + ')', d.margemBruta, true) +
      linhaDre('(−) Despesas operacionais', -d.despesas, false) +
      linhaDre('(−) Depreciação', -d.depreciacao, false) +
      linhaDre('= Resultado operacional', d.resultadoOperacional, true) +
      linhaDre('(−) Despesas financeiras', -d.financeiras, false) +
      linhaDre('= Resultado do período (' + pct(d.margemLiquidaPct) + ')', d.resultado, true) +
      '</tbody></table>' +
      '<h3 style="margin-top:12px">Cinco maiores contas de custo</h3>' +
      d.contas.custos.slice(0, 5).map(function (x) {
        return '<div class="flex entre" style="padding:4px 0"><span class="nota">' + esc(x.codigo + ' ' + x.nome) + '</span><b>' + brl(x.valor, 0) + '</b></div>';
      }).join('') + fonte('A DRE é montada por grupo de conta do plano de contas; receita e custo saem dos mesmos lançamentos que alimentam o fluxo de caixa.'),
      'claro');
    html += cartao('Orçado × realizado de ' + orc.ano + ' (' + orc.progressoAnoPct + '% do ano decorrido)',
      '<div class="graf">' + Graf.barras(orc.linhas.map(function (l) { return l.nome.replace(' planejada', '').slice(0, 22); }), [
        { nome: 'Orçado', dados: orc.linhas.map(function (l) { return l.planejado; }), cor: Graf.CORES.ref },
        { nome: 'Realizado', dados: orc.linhas.map(function (l) { return l.realizado; }), cor: Graf.CORES.verde }
      ], { formato: function (v) { return Graf.compacto(v); }, unidade: 'R$', altura: 210 }) + '</div>' +
      '<table class="tabela compacta" style="margin-top:8px"><thead><tr><th>Grupo</th><th class="num">Orçado</th><th class="num">Realizado</th><th class="num">Atingido</th><th>Situação</th></tr></thead><tbody>' +
      orc.linhas.map(function (l) {
        var cor = l.ehReceita ? (l.atingimentoPct >= orc.progressoAnoPct ? 'verde' : 'ouro') : (l.atingimentoPct <= orc.progressoAnoPct * 1.02 ? 'verde' : l.atingimentoPct <= orc.progressoAnoPct * 1.15 ? 'ouro' : 'vermelho');
        return '<tr><td>' + esc(l.nome) + '<div class="nota">' + esc(l.grupo) + (l.meta ? ' · ' + esc(l.meta) : '') + '</div></td>' +
          '<td class="num">' + brl(l.planejado, 0) + '</td><td class="num">' + brl(l.realizado, 0) + '</td>' +
          '<td class="num">' + pct(l.atingimentoPct, 0) + '</td><td>' + chip(l.situacao, cor) + '</td></tr>';
      }).join('') + '</tbody></table>' +
      fonte('O orçamento parte do histórico anualizado com metas declaradas: 4% de redução no custo da lavoura, estrutura mantida com a inflação e 6% de crescimento na receita com prêmio de qualidade.'));
    html += '</div>';
    return html;
  }
  function linhaDre(nome, valor, forte) {
    return '<tr' + (forte ? ' class="total"' : '') + '><td>' + esc(nome) + '</td><td class="num ' + (!forte ? sinal(valor) : '') + '" style="width:150px"><b>' + brl(valor, 0) + '</b></td></tr>';
  }

  /* =====================================================================
   * CUSTOS E SAFRA
   * =================================================================== */
  function viewCustos() {
    var c = E.custosConsolidados();
    var html = '';
    html += '<div class="grade g4">';
    html += cartao('', kpi('Custo de produção no período', brl(c.custoTotal, 0), num(c.area, 1) + ' ha sob gestão'));
    html += cartao('', kpi('Custo médio por hectare', brl(c.custoPorHa, 0), 'inclui rateio da estrutura por área'));
    html += cartao('', kpi('Talhões abaixo de 10% de margem', num(c.criticos.length, 0), c.criticos.length ? 'revisar: ' + c.criticos.join(', ') : 'todos com margem saudável', c.criticos.length ? 'var(--negativo)' : 'var(--positivo)'));
    html += cartao('', kpi('Talhões monitorados', num(c.talhoes.length, 0), 'custo, produção e preço lote a lote'));
    html += '</div>';

    html += cartao('Custo por unidade produzida × preço que o mercado paga',
      '<div class="graf">' + Graf.barras(c.talhoes.map(function (t) { return t.talhao + ' ' + t.unidadeNome.slice(0, 10); }), [
        { nome: 'Custo por unidade (projetado com a IA)', dados: c.talhoes.map(function (t) { return t.custoSacaProjetado; }), cor: Graf.CORES.cacau },
        { nome: 'Preço de mercado', dados: c.talhoes.map(function (t) { return t.precoMercado; }), cor: Graf.CORES.verde },
        { nome: 'Preço do lote rastreado', dados: c.talhoes.map(function (t) { return t.precoPremium; }), cor: Graf.CORES.ouro }
      ], { formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$', altura: 240 }) + '</div>' +
      '<div class="nota">Quando a barra de custo alcança a de preço, o talhão está trabalhando no limite — são os casos de ' +
      esc(c.criticos.length ? c.criticos.join(', ') : 'nenhum talhão') + ' neste período. O custo por unidade usa a produtividade PREVISTA pela IA: se a lavoura render menos, a barra de custo sobe antes mesmo da colheita.</div>');

    c.talhoes.forEach(function (t) {
      var aberto = App4.talhao === t.talhao;
      var cor = t.margemPct >= 25 ? 'verde' : t.margemPct >= 10 ? 'ouro' : 'vermelho';
      html += '<div class="cartao ' + (aberto ? 'destaque' : '') + '" style="margin-top:14px">';
      html += '<div class="flex entre envolve"><h2>' + esc(t.talhao + ' · ' + t.nome) + ' ' + chip(t.produtoRotulo, 'verde') + chip(t.idade + ' anos', 'cinza') + chip(t.sistema, 'azul') + '</h2>' +
        '<div class="flex" style="gap:8px">' + chip('margem ' + pct(t.margemPct, 1), cor) + '<button class="mini sec" onclick="App4.verTalhao(' + (aberto ? 'null' : '\'' + t.talhao + '\'') + ')">' + (aberto ? 'fechar' : 'abrir ficha') + '</button></div></div>';
      html += '<div class="grade g5" style="margin-top:6px">' +
        kpi('Área', num(t.area, 1) + ' ha', esc(t.cultivar)) +
        kpi('Custo direto', brl(t.custoDireto, 0), 'aplicado no talhão') +
        kpi('Rateio da estrutura', brl(t.rateio, 0), 'por área plantada') +
        kpi('Custo por ' + t.unidadeNome, brl(t.custoSacaProjetado, 0), 'projetado com a safra da IA') +
        kpi('Preço de mercado', brl(t.precoMercado, 0), t.precoPremium ? 'lote ' + t.loteRef + ': ' + brl(t.precoPremium, 0) : 'sem lote rastreado') +
        '</div>';
      html += '<div style="margin-top:10px">' + barra(t.progressoSafraPct, 'background:linear-gradient(90deg,var(--verde-500),var(--ouro))') +
        '<div class="nota">' + t.safraRotulo + ': ' + num(t.unidadesRealizadas, 0) + ' de ' + num(t.unidadesPrevistas, 0) + ' ' + esc(t.unidadeNome) + ' colhidos (' + num(t.progressoSafraPct, 0) + '%) — previsão do modelo com ' + num(t.confiancaIA, 0) + '% de confiança</div></div>';

      if (aberto) {
        var fs = E.fechamentoSafra(t.talhao);
        var ev = E.evidenciaSensor(t.talhao);
        html += '<div class="divisor"></div>';
        html += '<div class="grade g2">';
        html += '<div><h3>Composição do custo direto</h3><div class="graf">' +
          Graf.rosca(t.porConta.slice(0, 5).map(function (x) { return { nome: x.nome, valor: x.valor }; }), {
            tamanho: 200, formato: function (v) { return 'R$ ' + Graf.compacto(v); }, centro: 'R$ ' + Graf.compacto(t.custoDireto), centroRotulo: 'custo direto', unidade: 'R$'
          }) + '</div>' +
          t.porConta.slice(0, 6).map(function (x) {
            return '<div class="flex entre" style="padding:3px 0;border-bottom:1px solid var(--linha)"><span class="nota">' + esc(x.codigo + ' ' + x.nome) + '</span><b>' + brl(x.valor, 0) + '</b></div>';
          }).join('') + '</div>';
        html += '<div><h3>Previsão da IA × volume registrado na cadeia</h3>' +
          '<div class="graf">' + Graf.barras([t.safraRotulo], [
            { nome: 'Produção prevista (IA)', dados: [t.unidadesPrevistas || 0], cor: Graf.CORES.especial || Graf.CORES.ia },
            { nome: 'Colhido e registrado', dados: [t.unidadesRealizadas], cor: Graf.CORES.verde }
          ], { formato: function (v) { return num(v, 0); }, unidade: t.unidadeNome, altura: 180, largura: 500 }) + '</div>' +
          '<table class="tabela compacta" style="margin-top:8px"><tbody>' +
          '<tr><td>Produção prevista (IA)</td><td class="num">' + num(t.unidadesPrevistas, 1) + ' ' + esc(t.unidadeNome) + '</td></tr>' +
          '<tr><td>Colhido até agora</td><td class="num">' + num(t.unidadesRealizadas, 1) + ' ' + esc(t.unidadeNome) + '</td></tr>' +
          '<tr><td>Custo por unidade projetado</td><td class="num">' + brl(t.custoSacaProjetado, 2) + '</td></tr>' +
          '<tr><td>Custo por unidade já colhida</td><td class="num">' + brl(t.custoUnitarioParcial, 2) + '</td></tr>' +
          (t.custoUnitarioRealizado ? '<tr><td>Custo por unidade fechado</td><td class="num"><b>' + brl(t.custoUnitarioRealizado, 2) + '</b></td></tr>' : '') +
          '<tr><td>Produtividade prevista</td><td class="num">' + num(t.produtividadePrevista, 1) + ' ' + (t.produto === 'cacau' ? 'kg/ha' : 'sacas/ha') + '</td></tr>' +
          '<tr><td>Produtividade histórica</td><td class="num">' + num(t.produtividadeHistorica, 1) + ' ' + (t.produto === 'cacau' ? 'kg/ha' : 'sacas/ha') + '</td></tr>' +
          '</tbody></table>' + fonte(t.fonte) + '</div>';
        html += '</div>';

        html += '<div class="grade g2" style="margin-top:12px">';
        html += '<div><h3>Fechamento da safra</h3>' +
          '<table class="tabela compacta"><tbody>' +
          '<tr><td>Receita atribuída (volume × preço)</td><td class="num">' + brl(fs.receita, 0) + '</td></tr>' +
          '<tr><td>Custo total do talhão</td><td class="num">' + brl(fs.custoTotal, 0) + '</td></tr>' +
          '<tr class="total"><td>Resultado da safra</td><td class="num">' + brl(fs.resultado, 0) + '</td></tr>' +
          '<tr><td>Margem</td><td class="num">' + pct(fs.margemPct, 1) + '</td></tr>' +
          '<tr><td>Produtividade realizada</td><td class="num">' + num(fs.produtividadeRealizada, 1) + ' ' + (t.produto === 'cacau' ? 'kg/ha' : 'sacas/ha') + '</td></tr>' +
          '<tr><td>Produtividade prevista pela IA</td><td class="num">' + num(fs.produtividadePrevista, 1) + ' ' + (t.produto === 'cacau' ? 'kg/ha' : 'sacas/ha') + '</td></tr>' +
          '</tbody></table>' +
          '<div class="graf" style="margin-top:8px">' + Graf.barras(fs.porMes.map(function (p) { return mesBR(p.mes); }), [
            { nome: 'Volume colhido', dados: fs.porMes.map(function (p) { return p.volumeKg; }), cor: Graf.CORES.cacau }
          ], { formato: function (v) { return Graf.compacto(v); }, unidade: 'kg', altura: 170 }) + '</div>' +
          '<div class="nota">' + esc(fs.comparativoIA ? fs.comparativoIA.leitura : '') + '</div></div>';
        html += '<div><h3>Preço, qualidade e fermentação por lote do talhão</h3>' +
          (ev && ev.lotes.length ? '<table class="tabela compacta"><thead><tr><th>Lote</th><th>Situação</th><th class="num">Nota</th><th class="num">Ajuste</th><th class="num">Preço</th><th class="num">Fermentação</th></tr></thead><tbody>' +
            ev.lotes.map(function (l) {
              return '<tr><td><b>' + esc(l.lote) + '</b><div class="nota">' + num(l.quantidade, 0) + ' ' + esc(l.unidade) + '</div></td>' +
                '<td>' + chip(l.status, 'cinza') + '</td><td class="num">' + num(l.nota, 0) + '</td>' +
                '<td class="num ' + sinal(l.ajustePct) + '">' + (l.ajustePct > 0 ? '+' : '') + num(l.ajustePct, 1) + '%</td>' +
                '<td class="num">' + brl(l.precoAjustado, 2) + '</td>' +
                '<td class="num">' + (l.indiceFermentacao !== null && l.indiceFermentacao !== undefined ? num(l.indiceFermentacao, 0) + ' °C·h<div class="nota">' + esc(l.classeFermentacao || '') + '</div>' : '—') + '</td></tr>';
            }).join('') + '</tbody></table>'
            : '<div class="caixa">Sem lote rastreado neste talhão no período.</div>') + '</div>';
        html += '</div>';

        if (ev) {
          html += '<div class="grade g2" style="margin-top:12px">';
          html += '<div><h3>Evidência de campo: aplicação × medição</h3>' +
            (ev.aplicacoes.length ? '<table class="tabela compacta"><thead><tr><th>Data</th><th>Leitura da janela</th><th class="num">Custo</th><th>Conclusão</th></tr></thead><tbody>' +
              ev.aplicacoes.map(function (a) {
                return '<tr><td>' + dataBR(a.data) + '<div class="nota">' + esc(a.descricao.slice(0, 40)) + '</div></td>' +
                  '<td>' + esc(a.leitura) + '<div class="nota">' + esc(a.fonte) + '</div></td>' +
                  '<td class="num">' + brl(a.valor, 0) + '</td>' +
                  '<td>' + chip(a.justificada ? 'justificada' : 'preventiva', a.justificada ? 'verde' : 'ouro') + '<div class="nota">' + esc(a.conclusao) + '</div></td></tr>';
              }).join('') + '</tbody></table>'
              : '<div class="caixa">Sem aplicação de defensivo no talhão no período.</div>');
          if (ev.irrigacao) {
            html += '<div class="caixa" style="margin-top:9px"><b>Irrigação conferida contra a ET0 medida</b><div class="nota" style="margin-top:5px">' +
              'Lâmina irrigada em 7 dias: ' + num(ev.irrigacao.lamina7d, 1) + ' mm · chuva: ' + num(ev.irrigacao.chuva7d, 1) + ' mm · ET0: ' + num(ev.irrigacao.et0_7d, 1) + ' mm (' + num(ev.irrigacao.coberturaPct, 0) + '% de cobertura) — ' + esc(ev.irrigacao.situacao) +
              '<br>Custo de energia do talhão no período: <b>' + brl(ev.irrigacao.custoEnergia, 0) + '</b>' + (ev.irrigacao.periodoEnergia ? ' (' + esc(ev.irrigacao.periodoEnergia) + ')' : '') + '</div></div>';
          }
          html += '</div>';
          html += '<div><h3>Como o ERP se liga à IA, ao campo e à cadeia</h3>' +
            '<div class="caixa">' +
            '<b>1. Produção</b><div class="nota">Cada colheita registrada na cadeia alimenta o volume do talhão e o custo por saca.</div>' +
            '<b>2. Insumo</b><div class="nota">A baixa de estoque entra no talhão pelo custo médio; a aplicação fica ancorada na cadeia como evento.</div>' +
            '<b>3. Preço</b><div class="nota">O preço de cada venda registrada no ERP é o preço ajustado pela qualidade que o modelo de IA calcula para o lote.</div>' +
            '<b>4. Contabilidade</b><div class="nota">O fechamento do período gera uma raiz de Merkle e é ancorado em bloco, com prova de inclusão conferível.</div>' +
            '</div><div class="nota" style="margin-top:8px">' + esc(ev.resumo) + '</div></div>';
          html += '</div>';
        }
      }
      html += '</div>';
    });
    return html;
  }

  /* =====================================================================
   * ESTOQUES
   * =================================================================== */
  function viewEstoque() {
    var est = E.estoqueAtual({});
    var lotes = E.estoquePorLote({});
    var itens = est.itens;
    var html = '';
    html += '<div class="grade g4">';
    html += cartao('', kpi('Valor em estoque', brl(est.valorTotal, 0), itens.length + ' itens cadastrados'));
    html += cartao('', kpi('Produto acabado', brl(est.valorProduto, 0), 'lotes prontos para venda ou em pós-colheita'));
    html += cartao('', kpi('Insumos e embalagens', brl(est.valorInsumo, 0), 'custo médio ponderado de cada entrada'));
    html += cartao('', kpi('Abaixo do mínimo', num(est.abaixoMinimo, 0), est.abaixoMinimo ? 'programar reposição' : 'nível de segurança mantido', est.abaixoMinimo ? 'var(--negativo)' : 'var(--positivo)'));
    html += '</div>';

    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Composição do estoque',
      '<div class="flex envolve" style="gap:16px;align-items:center">' +
      Graf.rosca(est.categorias.filter(function (c) { return c.valor > 0; }).map(function (c) { return { nome: c.categoria === 'PRODUTO' ? 'Produto acabado' : c.categoria === 'INSUMO' ? 'Insumos' : 'Embalagens', valor: c.valor }; }), {
        tamanho: 200, formato: function (v) { return 'R$ ' + Graf.compacto(v); }, centro: 'R$ ' + Graf.compacto(est.valorTotal), centroRotulo: 'em estoque', unidade: 'R$'
      }) +
      '<div style="flex:1;min-width:220px">' + est.categorias.map(function (c) {
        return '<div class="flex entre" style="padding:5px 0;border-bottom:1px solid var(--linha)"><span class="nota">' + esc(c.categoria) + ' · ' + c.itens + ' itens</span><b>' + brl(c.valor, 0) + '</b></div>';
      }).join('') + '</div></div>' +
      fonte('O estoque entra no balanço como ativo: a compra não é custo, o custo nasce quando o insumo é aplicado no talhão. É essa separação que permite saber o custo real de cada hectare.'));
    html += cartao('Registrar entrada de insumo',
      '<div class="grade g2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">' +
      '<div class="campo"><label>Item</label><select id="cm-item">' + itens.filter(function (i) { return i.categoria !== 'PRODUTO'; }).map(function (i) {
        return '<option value="' + i.id + '"' + (App4.compra.item === i.id ? ' selected' : '') + '>' + esc(i.nome) + ' — saldo ' + num(i.saldo, 2) + ' ' + esc(i.unidade) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="campo"><label>Quantidade</label><input id="cm-qtd" value="' + esc(App4.compra.qtd) + '"></div>' +
      '<div class="campo"><label>Preço unitário</label><input id="cm-preco" value="' + esc(App4.compra.preco) + '" placeholder="deixe vazio para usar o custo médio"></div>' +
      '<div class="campo"><label>Fornecedor</label><input id="cm-forn" value="' + esc(App4.compra.fornecedor) + '"></div>' +
      '<div class="campo"><label>Prazo (dias)</label><select id="cm-prazo">' + [0, 15, 30, 60].map(function (p) { return '<option value="' + p + '"' + (Number(App4.compra.prazo) === p ? ' selected' : '') + '>' + (p === 0 ? 'à vista' : p + ' dias') + '</option>'; }).join('') + '</select></div>' +
      '</div><div class="flex envolve" style="margin-top:9px;gap:9px"><button onclick="App4.registrarCompra()">Registrar entrada e conta a pagar</button>' +
      '<span class="nota">A entrada recalcula o custo médio, gera o título a pagar e ancora o documento na cadeia como evento do tipo COMPRA_INSUMO.</span></div>');
    html += '</div>';

    html += '<div class="cartao" style="margin-top:14px"><h2>Itens em estoque</h2><div style="overflow-x:auto"><table class="tabela"><thead><tr>' +
      '<th>Item</th><th>Local</th><th class="num">Saldo</th><th class="num">Mínimo</th><th>Cobertura</th><th class="num">Custo médio</th><th class="num">Valor</th><th class="num">Última entrada/saída</th><th></th></tr></thead><tbody>';
    itens.slice().sort(function (a, b) { return b.valorTotal - a.valorTotal; }).forEach(function (i) {
      html += '<tr' + (i.critico ? ' style="background:rgba(90,25,18,.22)"' : '') + '>' +
        '<td><b>' + esc(i.nome) + '</b><div class="nota">' + esc(i.codigo + ' · ' + i.categoria) + (i.fornecedor ? ' · ' + esc(i.fornecedor) : '') + '</div></td>' +
        '<td class="nota">' + esc(i.local) + '</td>' +
        '<td class="num">' + num(i.saldo, i.unidade === 'un' ? 0 : 2) + ' ' + esc(i.unidade) + '</td>' +
        '<td class="num">' + num(i.minimo, i.unidade === 'un' ? 0 : 2) + '</td>' +
        '<td>' + (i.coberturaPct !== null ? barra(i.coberturaPct, i.critico ? 'background:var(--critico)' : '') + '<div class="nota">' + num(i.coberturaPct, 0) + '% do mínimo</div>' : '<span class="nota">—</span>') + '</td>' +
        '<td class="num">' + brl(i.custoMedio, 2) + '</td>' +
        '<td class="num"><b>' + brl(i.valorTotal, 0) + '</b></td>' +
        '<td class="num nota">' + dataBR(i.ultimaMovimentacao) + '</td>' +
        '<td>' + (i.categoria !== 'PRODUTO' && i.saldo > 0 ? '<button class="mini sec" onclick="App4.prepararAplicacao(\'' + i.id + '\')">aplicar</button>' : '') + '</td></tr>';
    });
    html += '</tbody></table></div></div>';

    /* aplicação */
    if (App4.aplicacao.item) {
      var item = itens.filter(function (i) { return i.id === App4.aplicacao.item; })[0];
      var talhoes = D.talhoes.filter(function (t) { return E.produtoresDe({}).indexOf(t.produtor) >= 0; });
      html += '<div class="cartao destaque" style="margin-top:14px"><h2>Baixar do estoque e aplicar em ' + esc(item.nome) + '</h2>' +
        '<div class="grade g3" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr))">' +
        '<div class="campo"><label>Quantidade (' + esc(item.unidade) + ')</label><input id="ap-qtd" value="' + esc(App4.aplicacao.qtd) + '"></div>' +
        '<div class="campo"><label>Talhão destino</label><select id="ap-talhao">' + talhoes.map(function (t) {
          return '<option value="' + t.id + '"' + (App4.aplicacao.talhao === t.id ? ' selected' : '') + '>' + esc(t.id + ' · ' + t.nome) + '</option>';
        }).join('') + '</select></div>' +
        '<div class="campo"><label>Disponível</label><div class="caixa">' + num(item.saldo, 2) + ' ' + esc(item.unidade) + ' a ' + brl(item.custoMedio, 2) + ' = ' + brl(item.saldo * item.custoMedio, 0) + '</div></div>' +
        '</div><div class="flex envolve" style="margin-top:9px;gap:9px"><button class="azul" onclick="App4.aplicarInsumo()">Aplicar e lançar no talhão</button>' +
        '<button class="sec" onclick="App4.prepararAplicacao(null)">cancelar</button>' +
        '<span class="nota">A baixa entra no custo do talhão pelo custo médio e a aplicação é ancorada na cadeia com a leitura de campo da janela como evidência.</span></div></div>';
    }

    /* lote a lote */
    html += '<div class="cartao" style="margin-top:14px"><h2>Estoque de produto rastreado por lote</h2>' +
      (lotes.length ? '<div style="overflow-x:auto"><table class="tabela"><thead><tr><th>Lote</th><th>Produto</th><th>Talhão</th><th>Situação na cadeia</th><th class="num">Saldo</th><th class="num">Custo médio</th><th class="num">Preço ajustado (IA)</th><th class="num">Resultado</th><th></th></tr></thead><tbody>' +
        lotes.map(function (l) {
          return '<tr><td><b>' + esc(l.lote) + '</b><div class="nota">entradas ' + num(l.entradas, 0) + ' · saídas ' + num(l.saidas, 0) + '</div></td>' +
            '<td>' + esc(l.produtoRotulo) + '</td><td>' + esc(l.talhao || '—') + '</td><td>' + chip(l.statusCadeia || '—', 'cinza') + (l.certificacao ? ' ' + chip(l.certificacao, 'roxo') : '') + '</td>' +
            '<td class="num">' + num(l.saldo, 0) + ' ' + esc(String(l.unidade).split(' ')[0]) + '</td>' +
            '<td class="num">' + brl(l.custoUnit, 2) + '</td>' +
            '<td class="num">' + brl(l.precoIA, 2) + '<div class="nota">nota ' + num(l.notaQualidade, 0) + ' · ' + (l.ajustePct > 0 ? '+' : '') + num(l.ajustePct, 1) + '%</div></td>' +
            '<td class="num ' + sinal(l.resultado) + '"><b>' + brl(l.resultado, 0) + '</b><div class="nota">' + pct(l.margemPct, 1) + '</div></td>' +
            '<td><button class="mini sec" onclick="App4.prepararVenda(\'' + l.lote + '\')">vender</button></td></tr>';
        }).join('') + '</tbody></table></div>'
        : Graf.vazio('Nenhum lote em estoque')) +
      '<div class="nota" style="margin-top:8px">Cada lote tem custo próprio (o custo médio do talhão que o produziu) e preço próprio (a nota de qualidade que o modelo de IA calculou). Vender o lote é o que fecha o ciclo entre campo, contabilidade e cadeia.</div></div>';

    /* venda */
    if (App4.venda.lote) {
      var lote = Dados_lote(App4.venda.lote);
      var saldoLote = lotes.filter(function (l) { return l.lote === App4.venda.lote; })[0];
      var sug = sugPreco(App4.venda.lote);
      html += '<div class="cartao destaque" style="margin-top:14px"><h2>Registrar venda do lote ' + esc(App4.venda.lote) + '</h2>' +
        '<div class="grade g3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">' +
        '<div class="campo"><label>Quantidade</label><input id="vd-qtd" value="' + esc(App4.venda.qtd) + '"><div class="nota">disponível: ' + num(saldoLote ? saldoLote.saldo : 0, 0) + ' ' + esc(lote ? lote.unidade : '') + '</div></div>' +
        '<div class="campo"><label>Preço unitário</label><input id="vd-preco" value="' + esc(App4.venda.preco) + '"><div class="nota">sugerido pela IA: ' + brl(sug, 2) + '</div></div>' +
        '<div class="campo"><label>Comprador</label><input id="vd-comprador" value="' + esc(App4.venda.comprador) + '" placeholder="ex.: COOPRON"></div>' +
        '<div class="campo"><label>Prazo</label><select id="vd-prazo">' + [0, 15, 30, 45, 60].map(function (p) { return '<option value="' + p + '"' + (Number(App4.venda.prazo) === p ? ' selected' : '') + '>' + (p === 0 ? 'à vista' : p + ' dias') + '</option>'; }).join('') + '</select></div>' +
        '</div><div class="flex envolve" style="margin-top:9px;gap:9px"><button class="ouro" onclick="App4.registrarVenda()">Registrar venda, título e âncora na cadeia</button>' +
        '<button class="sec" onclick="App4.prepararVenda(null)">cancelar</button>' +
        '<span class="nota">A venda baixa o lote do estoque com o custo médio, cria a conta a receber e registra o evento VENDA na blockchain.</span></div></div>';
    }

    /* movimentações */
    var mv = E.movimentacoes({}).itens;
    var f = App4.filtroMov;
    var filtradas = mv.filter(function (m) { return f === 'todos' || m.tipo === f; }).slice(0, 40);
    html += '<div class="cartao" style="margin-top:14px"><h2>Movimentações de estoque <span class="sub">' + mv.length + ' lançamentos no período</span></h2>';
    html += '<div class="flex envolve" style="margin-bottom:9px">' + ['todos', 'ENTRADA', 'SAIDA'].map(function (x) {
      return '<span class="chip filtro ' + (f === x ? 'on' : '') + '" onclick="App4.filtrarMov(\'' + x + '\')">' + (x === 'todos' ? 'todas' : x === 'ENTRADA' ? 'entradas' : 'saídas') + '</span>';
    }).join('') + '</div>';
    html += '<div style="overflow-x:auto"><table class="tabela compacta"><thead><tr><th>Data</th><th>Item</th><th>Tipo</th><th class="num">Quantidade</th><th class="num">Custo unitário</th><th class="num">Valor</th><th>Destino ou origem</th><th>Documento</th></tr></thead><tbody>' +
      filtradas.map(function (m) {
        return '<tr><td>' + dataBR(m.data) + '</td><td>' + esc(m.itemNome) + '</td>' +
          '<td>' + chip(m.tipo === 'ENTRADA' ? 'entrada' : 'saída', m.tipo === 'ENTRADA' ? 'verde' : 'azul') + '</td>' +
          '<td class="num">' + num(m.qtd, 2) + '</td><td class="num">' + brl(m.custoUnit, 2) + '</td><td class="num">' + brl(m.valor, 0) + '</td>' +
          '<td class="nota">' + esc(m.talhao ? 'talhão ' + m.talhao : (m.motivo || '')) + (m.lote ? ' · lote ' + esc(m.lote) : '') + '</td>' +
          '<td class="mono">' + esc(m.documento || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' +
      fonte('Cada movimentação é um evento do negócio: a entrada traz o documento fiscal, a saída diz para qual talhão o insumo foi e fecha o custo daquele hectare.') + '</div>';
    return html;
  }
  function Dados_lote(id) { return D.lotes.filter(function (l) { return l.id === id; })[0]; }
  function sugPreco(loteId) {
    var lote = Dados_lote(loteId);
    if (!lote) return 0;
    var a = global.IA.precoAjustado(lote);
    return a.ajustado * (lote.produto === 'cacau' ? 15 : 1);
  }

  /* =====================================================================
   * PESSOAS E MÁQUINAS
   * =================================================================== */
  function viewOperacoes() {
    var f = E.folha();
    var maq = E.maquinas();
    var pat = E.patrimonioFiltrado();
    var html = '';
    html += '<div class="grade g4">';
    html += cartao('', kpi('Folha dos últimos 12 meses', brl(f.custo12meses, 0), 'média de ' + brl(f.custoMensalMedio, 0) + ' por mês'));
    html += cartao('', kpi('Pessoas fixas', num(f.fixos.length, 0), 'com ' + num(f.encargos * 100, 0) + '% de encargos'));
    html += cartao('', kpi('Equipes de diaristas', num(f.diaristas.length, 0), 'diária de ' + brl(f.diaria, 0) + ' por pessoa/dia'));
    html += cartao('', kpi('Custo/hora do maquinário', brl(maq.reduce(function (a, m) { return a + m.custoHora * m.horasAno; }, 0) / Math.max(1, maq.reduce(function (a, m) { return a + m.horasAno; }, 0)), 2), 'média ponderada das horas de uso'));
    html += '</div>';

    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Folha de pagamento por competência',
      '<div class="graf">' + Graf.barras(f.competencias.map(function (c) { return mesBR(c.competencia); }), [
        { nome: 'Bruto', dados: f.competencias.map(function (c) { return c.bruto; }), cor: Graf.CORES.verde },
        { nome: 'Encargos', dados: f.competencias.map(function (c) { return c.encargos; }), cor: Graf.CORES.cacau }
      ], { empilhado: true, formato: function (v) { return Graf.compacto(v); }, unidade: 'R$', altura: 210 }) + '</div>' +
      '<div class="legenda"><span><i style="background:' + Graf.CORES.verde + '"></i>Bruto</span><span><i style="background:' + Graf.CORES.cacau + '"></i>Encargos (' + num(f.encargos * 100, 0) + '%)</span></div>' +
      (f.ultima ? '<div class="caixa" style="margin-top:9px"><b>Competência ' + esc(f.ultima.competencia) + '</b> — ' + (f.ultima.status === 'ABERTA' ? chip('aberta (mês em curso)', 'ouro') : chip('paga', 'verde')) +
        '<table class="tabela compacta" style="margin-top:7px"><thead><tr><th>Pessoa</th><th>Função</th><th class="num">Bruto</th><th class="num">13º</th><th class="num">Líquido</th></tr></thead><tbody>' +
        f.ultima.itens.map(function (i) {
          return '<tr><td>' + esc(i.nome) + '</td><td class="nota">' + esc(i.funcao) + '</td><td class="num">' + brl(i.bruto, 0) + '</td><td class="num">' + brl(i.decimo, 0) + '</td><td class="num">' + brl(i.liquido, 0) + '</td></tr>';
        }).join('') + '</tbody><tfoot><tr class="total"><td colspan="2">Total com encargos</td><td class="num">' + brl(f.ultima.bruto, 0) + '</td><td class="num">—</td><td class="num">' + brl(f.ultima.bruto + f.ultima.encargos, 0) + '</td></tr></tfoot></table></div>' : '') +
      fonte('A folha da equipe fixa entra como mão de obra de campo no custo de produção; as diárias de colheita entram por saca colhida, dentro do custo de colheita.'));
    html += cartao('Pessoas e conformidade trabalhista',
      '<table class="tabela compacta"><thead><tr><th>Pessoa</th><th>Função</th><th>Vínculo</th><th class="num">Salário</th><th>NR-31</th></tr></thead><tbody>' +
      f.fixos.concat(f.diaristas).map(function (p) {
        var meses = (new Date('2026-10-06') - new Date(p.nr31 + 'T12:00:00-04:00')) / 2592000000;
        var vencido = meses > 12;
        return '<tr><td><b>' + esc(p.nome) + '</b><div class="nota">desde ' + dataBR(p.desde) + '</div></td>' +
          '<td class="nota">' + esc(p.funcao) + '</td>' +
          '<td>' + chip(p.vinculo === 'FIXO' ? 'fixo' : 'diária', p.vinculo === 'FIXO' ? 'verde' : 'azul') + '</td>' +
          '<td class="num">' + (p.salario ? brl(p.salario, 0) : 'por diária') + '</td>' +
          '<td>' + chip(dataBR(p.nr31) + (vencido ? ' · vencido' : ''), vencido ? 'vermelho' : 'verde') + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="caixa" style="margin-top:9px">Equipes de <b>colheita</b> e de <b>pós-colheita</b> são contratadas por diária na safra: o ERP lança o custo por volume colhido, então cada saca carrega a mão de obra que realmente gastou. O treinamento NR-31 é exigência legal para aplicação de defensivos e é conferido na auditoria de certificação.</div>');
    html += '</div>';

    var semHoras = E.patrimonioSemHoras();
    html += '<div class="cartao" style="margin-top:14px"><h2>Máquinas, veículos e benfeitorias ' + chip('custo por hora com depreciação, manutenção, combustível e operador', 'cinza') + '</h2>' +
      '<div style="overflow-x:auto"><table class="tabela"><thead><tr><th>Ativo</th><th>Tipo</th><th class="num">Valor</th><th class="num">Idade</th><th class="num">Horas/ano</th><th class="num">Depreciação/ano</th><th class="num">Manutenção/ano</th><th class="num">Custo/hora</th><th></th></tr></thead><tbody>' +
      maq.map(function (m) {
        return '<tr><td><b>' + esc(m.nome) + '</b><div class="nota">' + esc(m.uso) + '</div></td>' +
          '<td>' + chip(m.tipo.toLowerCase(), m.tipo === 'TECNOLOGIA' ? 'roxo' : m.tipo === 'BENFEITORIA' ? 'ouro' : 'azul') + '</td>' +
          '<td class="num">' + brl(m.valor, 0) + '</td><td class="num">' + num(m.idadeAnos, 1) + ' a</td>' +
          '<td class="num">' + num(m.horasAno, 0) + '</td><td class="num">' + brl(m.depreciacaoAno, 0) + '</td><td class="num">' + brl(m.manutencaoAno, 0) + '</td>' +
          '<td class="num"><b>' + brl(m.custoHora, 2) + '</b><div class="nota">' + brl(m.custoAnoEstimado, 0) + '/ano</div></td>' +
          '<td><button class="mini sec" onclick="App4.verMaquina(\'' + m.ativo + '\')">composição</button></td></tr>';
      }).join('') + '</tbody></table></div>';
    if (App4.maquinaSel) {
      var cm = E.custoHoraMaquina(App4.maquinaSel);
      html += '<div class="divisor"></div><div class="flex envolve" style="gap:18px;align-items:center">' +
        Graf.rosca(cm.composicao.filter(function (c) { return c.valor > 0; }).map(function (c) { return { nome: c.nome, valor: c.valor }; }), {
          tamanho: 190, formato: function (v) { return brl(v, 2) + '/h'; }, centro: brl(cm.custoHora, 2), centroRotulo: 'por hora', unidade: 'R$/h'
        }) +
        '<div style="flex:1;min-width:260px"><h3>' + esc(cm.nome) + '</h3>' +
        cm.composicao.map(function (c) {
          return '<div class="flex entre" style="padding:4px 0;border-bottom:1px solid var(--linha)"><span class="nota">' + esc(c.nome) + '</span><b>' + brl(c.valor, 2) + '/h</b></div>';
        }).join('') +
        '<table class="tabela compacta" style="margin-top:8px"><tbody>' +
        '<tr><td>Valor de reposição</td><td class="num">' + brl(cm.valor, 0) + '</td></tr>' +
        '<tr><td>Depreciação anual</td><td class="num">' + brl(cm.depreciacaoAno, 0) + '</td></tr>' +
        '<tr><td>Manutenção anual</td><td class="num">' + brl(cm.manutencaoAno, 0) + '</td></tr>' +
        '<tr><td>Horas de uso por ano</td><td class="num">' + num(cm.horasAno, 0) + ' h</td></tr>' +
        '<tr class="total"><td>Custo total por hora</td><td class="num">' + brl(cm.custoHora, 2) + '</td></tr>' +
        '</tbody></table><div class="nota" style="margin-top:7px">' + esc(cm.fonte) + '</div></div></div>';
    }
    if (semHoras.length) {
      html += '<div class="caixa" style="margin-top:10px"><b>Estruturas sem horas de uso medidas</b>' +
        semHoras.map(function (a) {
          return '<div class="flex entre" style="padding:5px 0;border-bottom:1px solid var(--linha)"><span>' + esc(a.nome) +
            '<div class="nota">' + esc(a.uso) + '</div></span><b>' + brl(a.custoAnoEstimado, 0) + '/ano</b></div>';
        }).join('') +
        '<div class="nota" style="margin-top:7px">Terreiro e casa de fermentação não têm horas de uso medidas: entram na DRE e no patrimônio pela depreciação e manutenção anuais. Reportar um custo por hora igual a zero faria a estrutura parecer gratuita.</div></div>';
    }
    html += '</div>';

    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Patrimônio e depreciação',
      '<div class="graf">' + Graf.barras(pat.map(function (p) { return p.nome.slice(0, 22); }), [
        { nome: 'Valor de reposição', dados: pat.map(function (p) { return p.valor; }), cor: Graf.CORES.agua },
        { nome: 'Depreciação anual', dados: pat.map(function (p) { return p.valor * (p.depreciaAno / 100); }), cor: Graf.CORES.atencao }
      ], { horizontal: true, formato: function (v) { return Graf.compacto(v); }, unidade: 'R$', altura: 340 }) + '</div>' +
      '<div class="caixa" style="margin-top:9px">Patrimônio de <b>' + brl(pat.reduce(function (a, p) { return a + p.valor; }, 0), 0) + '</b> com depreciação anual de <b>' +
      brl(pat.reduce(function (a, p) { return a + p.valor * (p.depreciaAno / 100); }, 0), 0) + '</b> — ' + pct(pat.reduce(function (a, p) { return a + p.valor * (p.depreciaAno / 100); }, 0) / Math.max(1, pat.reduce(function (a, p) { return a + p.valor; }, 0)) * 100, 1) + ' do valor.</div>' +
      fonte('A depreciação entra na DRE como despesa e no custo por hora das máquinas: é o que evita a ilusão de que máquina velha é máquina barata.'));
    html += cartao('Índice de endividamento e estrutura',
      '<div class="grade g2" style="align-items:center">' +
      Graf.medidor(E.indicadores().endividamento, { rotulo: 'dívida ÷ patrimônio', rodape: pct(E.indicadores().endividamento), nota: 'Custeio bancário em aberto sobre o patrimônio contábil.' }) +
      '<div>' + [
        ['Patrimônio', brl(E.indicadores().patrimonio, 0)],
        ['Dívida em aberto', brl(E.indicadores().divida, 0)],
        ['Depreciação anual', brl(E.indicadores().depreciacaoAnual, 0)],
        ['Custo fixo dos últimos 12 meses', brl(E.indicadores().pontoEquilibrio.custoFixo12m, 0)],
        ['Margem de contribuição', pct(E.indicadores().pontoEquilibrio.margemContribuicaoPct)]
      ].map(function (x) {
        return '<div class="flex entre" style="padding:5px 0;border-bottom:1px solid var(--linha)"><span class="nota">' + x[0] + '</span><b>' + x[1] + '</b></div>';
      }).join('') + '</div></div>');
    html += '</div>';
    return html;
  }
  App4.verMaquina = function (id) { App4.maquinaSel = App4.maquinaSel === id ? null : id; global.App.render(); };
  App4.prepararAplicacao = function (id) { App4.aplicacao.item = id; global.App.render(); };
  App4.prepararVenda = function (id) {
    App4.venda.lote = id;
    if (id) {
      var l = E.estoquePorLote({}).filter(function (x) { return x.lote === id; })[0];
      App4.venda.qtd = l ? String(Math.round(l.saldo)) : '';
      App4.venda.preco = l ? l.precoIA.toFixed(2) : '';
      App4.venda.comprador = 'COOPRON — Coop. Agropecuária de Rondônia';
    }
    global.App.render();
  };

  /* =====================================================================
   * FECHAMENTO CONTÁBIL
   * =================================================================== */
  var MESES_FECHAMENTO = (function () {
    var out = [];
    var m = E.MESES();
    for (var i = m.length - 2; i >= 0; i--) out.push(m[i]);
    return out;
  })();

  function viewFechamento() {
    var ancoragens = E.erp().ancoragens;
    var comp = App4.mes || MESES_FECHAMENTO[0];
    var html = '';
    html += cartao('Como funciona o fechamento ancorado',
      '<div class="caixa">Cada conta do fechamento mensal gera um hash; os hashes formam uma <b>árvore de Merkle</b> e só a raiz é gravada na blockchain, dentro de uma transação <span class="tag">FECHAMENTO_CONTABIL</span>. ' +
      'Assim qualquer auditor recalcula a raiz a partir dos lançamentos e confere contra o bloco — se um único valor tiver sido alterado depois do fechamento, as raízes divergem. ' +
      'É auditoria de livro-caixa sem abrir o livro-caixa.</div>' +
      '<div class="grade g3" style="margin-top:11px">' +
      '<div class="campo"><label>Competência</label><select id="fc-mes">' + MESES_FECHAMENTO.map(function (m) {
        return '<option value="' + m + '"' + (comp === m ? ' selected' : '') + '>' + m + ' (' + mesBR(m) + ')</option>';
      }).join('') + '</select></div>' +
      '<div class="campo"><label>&nbsp;</label><button onclick="App4.prepararFechamento()">1. Preparar fechamento do período</button></div>' +
      '<div class="campo"><label>&nbsp;</label><button class="roxo" ' + (App4.preparo ? '' : 'disabled') + ' onclick="App4.ancorar()">2. Ancorar a raiz na blockchain</button></div>' +
      '</div>',
      'destaque');

    var dMes = E.dre({ mes: comp });
    var contasMes = dMes.contas.receitas.length + dMes.contas.custos.length + dMes.contas.despesas.length + dMes.contas.deducoes.length + 1;   // + a linha de resultado
    html += '<div class="cartao" style="margin-top:14px"><h2>O que vai ser gravado no bloco de ' + mesBR(comp) + '</h2>' +
      '<div class="graf">' + Graf.cascata(dMes.cascata, { altura: 250, formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$' }) + '</div>' +
      '<div class="grade g4" style="margin-top:10px">' +
      kpi('Contas com movimento no mês', num(contasMes, 0), 'cada uma gera um hash de 256 bits') +
      kpi('Resultado do mês', brl(dMes.resultado, 0), 'margem de ' + pct(dMes.margemLiquidaPct)) +
      kpi('Fechamentos já ancorados', num(ancoragens.length, 0), ancoragens.length ? 'último: ' + esc(ancoragens[0].competencia) + ' no bloco #' + ancoragens[0].bloco : 'nenhum até agora') +
      kpi('Custo de gravar', '1 transação', 'a árvore inteira cabe em uma única transação na cadeia') +
      '</div></div>';

    if (App4.preparo) {
      var p = App4.preparo;
      html += '<div class="cartao" style="margin-top:14px"><h2>Fechamento de ' + esc(p.competencia) + ' — ' + p.linhas.length + ' contas</h2>' +
        '<div class="grade g4">' +
        kpi('Receita líquida', brl(p.resumo.receitaLiquida, 0), p.resumo.contas + ' contas com movimento') +
        kpi('Custo e despesa', brl(p.resumo.custoProducao + p.resumo.despesas + p.resumo.depreciacao, 0), 'produção, estrutura e depreciação') +
        kpi('Resultado do mês', brl(p.resumo.resultado, 0), 'margem de ' + pct(p.resumo.margemLiquidaPct), p.resumo.resultado >= 0 ? 'var(--positivo)' : 'var(--negativo)') +
        kpi('Raiz de Merkle', '<span class="mono" style="font-size:12px">' + p.raizMerkle.slice(0, 22) + '…</span>', 'raiz de ' + p.linhas.length + ' hashes') +
        '</div>' +
        '<div class="grade g2" style="margin-top:12px"><div style="overflow-x:auto;max-height:340px;overflow-y:auto"><table class="tabela compacta"><thead><tr><th>Conta</th><th>Nome</th><th class="num">Valor</th><th>Hash</th></tr></thead><tbody>' +
        p.linhas.map(function (l, i) { return linhaHash(l, p.hashes[i]); }).join('') +
        '</tbody></table></div>' +
        '<div><h3>Balancete do mês</h3>' +
        '<table class="tabela compacta"><tbody>' +
        '<tr><td>Estoque</td><td class="num">' + brl(p.resumo.estoque, 0) + '</td></tr>' +
        '<tr><td>A receber</td><td class="num">' + brl(p.resumo.aReceber, 0) + '</td></tr>' +
        '<tr><td>A pagar</td><td class="num">' + brl(p.resumo.aPagar, 0) + '</td></tr>' +
        '<tr><td>Caixa</td><td class="num">' + brl(p.resumo.saldoCaixa, 0) + '</td></tr>' +
        '<tr class="total"><td>Resultado do período</td><td class="num">' + brl(p.resumo.resultado, 0) + '</td></tr>' +
        '</tbody></table>' +
        '<div class="nota" style="margin-top:8px">Escopo: ' + esc(p.resumo.escopo === 'PROPRIO' ? 'propriedade do perfil ativo' : 'consórcio consolidado') + ' · produtores ' + esc((p.resumo.produtores || []).join(', ')) + '</div>' +
        '<div class="nota" style="margin-top:6px">' + (App4.ancoragem ? '' : 'Confira os valores, ancore a raiz e depois prove a inclusão de qualquer conta no bloco.') + '</div></div></div></div>';
    }

    if (App4.ancoragem) {
      var a = App4.ancoragem;
      html += '<div class="cartao" style="margin-top:14px"><h2>Ancoragem concluída</h2>' +
        '<div class="grade g4">' +
        kpi('Transação', '<span class="mono" style="font-size:12px">' + a.transacao.id + '</span>', a.transacao.tipo + ' · assinada pelo autor ' + esc(a.transacao.autor)) +
        kpi('Bloco', a.bloco ? '#' + a.bloco.indice : '—', a.bloco ? num(a.bloco.transacoes.length, 0) + ' transações · nonce ' + num(a.bloco.nonce, 0) : '') +
        kpi('Simulação de bloco', a.bloco ? num(a.bloco.tentativas || 0, 0) + ' hashes' : '—', 'prova de trabalho, dificuldade ' + (Ledger ? Ledger.DIFICULDADE : 3)) +
        kpi('Raiz de Merkle', '<span class="mono" style="font-size:12px">' + a.registro.raizMerkle.slice(0, 22) + '…</span>', 'gravada no bloco') +
        '</div>' +
        '<div class="flex envolve" style="margin-top:11px;gap:9px">' +
        '<button class="azul" onclick="App4.conferir(\'' + a.registro.id + '\')">3. Conferir prova de inclusão</button>' +
        '<button class="sec" onclick="App4.limpar()">novo fechamento</button>' +
        '<span class="nota">A prova recalcula a raiz subindo a árvore a partir dos lançamentos atuais do período.</span></div>' +
        (a.transacao ? fonte('Transação de ' + esc(a.transacao.tipo) + ' com assinatura <span class="mono">' + a.transacao.assinatura.slice(0, 24) + '…</span> e hash <span class="mono">' + a.transacao.hash.slice(0, 24) + '…</span>') : '') +
        '</div>';
    }

    if (App4.prova) {
      var pr = App4.prova;
      html += '<div class="cartao ' + (pr.confere ? 'destaque' : 'alerta') + '" style="margin-top:14px"><h2>Prova de inclusão ' + (pr.confere ? '✓ conferida' : '✗ divergente') + '</h2>' +
        '<div class="grade g2"><div>' +
        '<table class="tabela compacta"><tbody>' +
        '<tr><td>Fechamento</td><td class="num mono">' + esc(pr.fechamento) + '</td></tr>' +
        '<tr><td>Competência</td><td class="num">' + esc(pr.competencia) + '</td></tr>' +
        '<tr><td>Bloco</td><td class="num">#' + pr.bloco + '</td></tr>' +
        '<tr><td>Contas no fechamento</td><td class="num">' + num(pr.linhas.length, 0) + '</td></tr>' +
        '<tr><td>Níveis da árvore</td><td class="num">' + num(pr.niveis, 0) + '</td></tr>' +
        '<tr><td>Hash da linha de resultado</td><td class="num mono">' + pr.hashResultado.slice(0, 20) + '…</td></tr>' +
        '<tr><td>Raiz recalculada</td><td class="num mono">' + pr.raizCalculada.slice(0, 20) + '…</td></tr>' +
        '<tr class="total"><td>Raiz gravada no bloco</td><td class="num mono">' + pr.raizAncorada.slice(0, 20) + '…</td></tr>' +
        '</tbody></table>' +
        '<div class="caixa ' + (pr.confere ? 'verde' : '') + '" style="margin-top:9px">' + esc(pr.explicacao) + '</div></div>' +
        '<div><h3>Caminho de prova</h3><table class="tabela compacta"><thead><tr><th>Nível</th><th>Hashes da árvore</th><th>Posição</th></tr></thead><tbody>' +
        pr.caminho.map(function (h, i) {
          return '<tr><td>' + (i + 1) + '</td><td class="mono">' + esc(h.irmao) + '</td><td>' + esc(h.posicao) + (h.duplicado ? ' (duplicado)' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div></div></div>';
    }

    html += '<div class="cartao" style="margin-top:14px"><h2>Fechamentos ancorados na demonstração (' + ancoragens.length + ')</h2>' +
      (ancoragens.length ? '<table class="tabela compacta"><thead><tr><th>Fechamento</th><th>Competência</th><th class="num">Contas</th><th class="num">Resultado</th><th>Raiz</th><th>Bloco</th><th></th></tr></thead><tbody>' +
        ancoragens.map(function (x) {
          return '<tr><td class="mono">' + esc(x.id) + '</td><td>' + esc(x.competencia) + '</td><td class="num">' + num(x.contas, 0) + '</td>' +
            '<td class="num ' + sinal(x.resultado) + '">' + brl(x.resultado, 0) + '</td>' +
            '<td class="mono">' + esc(x.raizMerkle.slice(0, 18)) + '…</td><td>#' + x.bloco + '</td>' +
            '<td><button class="mini sec" onclick="App4.conferir(\'' + x.id + '\')">provar</button></td></tr>';
        }).join('') + '</tbody></table>'
        : Graf.vazio('Nenhum período ancorado ainda — prepare e ancore o primeiro fechamento')) + '</div>';
    return html;
  }
  function linhaHash(l, h) {
    return '<tr><td>' + esc(l.codigo) + '</td><td class="nota">' + esc(l.nome) + '</td>' +
      '<td class="num ' + sinal(l.tipo === 'RECEITA' ? l.valor : -l.valor) + '">' + brl(l.valor, 0) + '</td>' +
      '<td class="mono">' + esc(h.slice(0, 16)) + '…</td></tr>';
  }

  /* =====================================================================
   * AÇÕES
   * =================================================================== */
  App4.registrarCompra = function () {
    function v(id) { var el = document.getElementById(id); return el ? el.value : null; }
    var itemId = v('cm-item');
    var qtd = Number(String(v('cm-qtd')).replace(',', '.'));
    var preco = String(v('cm-preco') || '').trim();
    var item = E.estoqueAtual({}).itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item || !(qtd > 0)) { avisar('Informe uma quantidade válida.', 'vermelho'); return; }
    var precoUnit = preco ? Number(preco.replace(',', '.')) : item.custoMedio;
    var fornecedor = v('cm-forn') || item.fornecedor;
    var prazo = Number(v('cm-prazo'));
    var r = E.registrarCompra(itemId, qtd, precoUnit, fornecedor, prazo, global.App.usuario);
    if (!r) { avisar('Não foi possível registrar a entrada.', 'vermelho'); return; }
    App4.compra = { item: itemId, qtd: '2', preco: '', fornecedor: fornecedor, prazo: String(prazo) };
    toast('<b>Entrada registrada</b><br>' + esc(item.nome) + ': ' + num(qtd, 2) + ' ' + esc(item.unidade) + ' a ' + brl(precoUnit, 2) +
      '<br>Novo custo médio: <b>' + brl(r.custoMedioNovo, 2) + '</b> · título ' + r.titulo.id + ' (' + r.titulo.status.toLowerCase() + ')' +
      '<br>' + (r.transacao.status === 'PENDENTE' ? 'Evento COMPRA_INSUMO ' + r.transacao.id + ' na fila da cadeia.' : 'Cadeia recusou: ' + esc(r.transacao.motivoRejeicao)), 'verde');
    global.App.render();
  };

  App4.aplicarInsumo = function () {
    function v(id) { var el = document.getElementById(id); return el ? el.value : null; }
    var qtd = Number(String(v('ap-qtd')).replace(',', '.'));
    var talhao = v('ap-talhao');
    var r = E.consumirInsumo(App4.aplicacao.item, qtd, talhao, global.App.usuario);
    if (!r) { avisar('Aplicação inválida.', 'vermelho'); return; }
    if (r.erro) { avisar(esc(r.erro), 'vermelho'); return; }
    var ev = r.evidencia && r.evidencia.aplicacoes.length ? r.evidencia.aplicacoes[0] : null;
    toast('<b>Aplicação lançada no talhão</b><br>' + esc(r.movimento.itemNome) + ': ' + num(qtd, 2) + ' ' + brl(r.movimento.valor, 2) +
      ' custo direto de ' + esc(talhao) + '<br>' + (ev ? esc(ev.leitura) + '<br>' + esc(ev.conclusao) : 'sem leitura de campo no talhão') +
      '<br>' + (r.transacao.status === 'PENDENTE' ? 'Evento APLICACAO_INSUMO ' + r.transacao.id + ' na fila.' : esc(r.transacao.motivoRejeicao)), 'azul');
    App4.aplicacao.item = null;
    global.App.render();
  };

  App4.registrarVenda = function () {
    function v(id) { var el = document.getElementById(id); return el ? el.value : null; }
    var qtd = Number(String(v('vd-qtd')).replace(',', '.'));
    var preco = Number(String(v('vd-preco')).replace(',', '.'));
    var comprador = v('vd-comprador') || 'Comprador não informado';
    var prazo = Number(v('vd-prazo'));
    var r = E.registrarVenda(App4.venda.lote, qtd, preco, comprador, prazo, global.App.usuario);
    if (!r) { avisar('Venda inválida.', 'vermelho'); return; }
    if (r.erro) { avisar(esc(r.erro), 'vermelho'); return; }
    toast('<b>Venda registrada</b><br>' + esc(App4.venda.lote) + ': ' + num(qtd, 0) + ' × ' + brl(preco, 2) + ' = <b>' + brl(r.titulo.valor, 2) + '</b>' +
      '<br>Conta a receber ' + r.titulo.id + ' em ' + dataBR(r.titulo.vencimento) + ' · lote baixado do estoque pelo custo médio' +
      '<br>' + (r.transacao.status === 'PENDENTE' ? 'Evento VENDA ' + r.transacao.id + ' na fila da cadeia.' : esc(r.transacao.motivoRejeicao)), 'ouro');
    App4.venda.lote = null;
    global.App.render();
  };

  App4.liquidar = function (id) {
    var t = E.liquidarTitulo(id);
    if (!t) return;
    toast('<b>Título liquidado</b><br>' + esc(t.descricao.slice(0, 70)) + '<br>' + brl(t.valor, 2) + ' marcado como ' + (t.tipo === 'RECEBER' ? 'recebido' : 'pago') + ' em ' + dataBR(t.liquidadoEm) + '.', 'verde');
    global.App.render();
  };

  App4.sincronizarEscrow = function () {
    var r = E.sincronizarEscrow();
    var msg = r.criados.length || r.liquidados.length
      ? '<b>Escrow sincronizado com o contas a receber</b><br>' + r.criados.map(function (t) {
        return t.tipo + ' ' + t.id + ' · ' + esc(t.contrato) + ' · ' + brl(t.valor, 2) + ' (' + t.status.toLowerCase() + ')';
      }).join('<br>') + (r.liquidados.length ? '<br>' + r.liquidados.length + ' título(s) liquidado(s) por etapa concluída na cadeia.' : '')
      : '<b>Nada novo a sincronizar</b><br>Os contratos em escrow do seu escopo já estão no contas a receber (contratos entre cooperativa e indústria aparecem na visão consolidada).';
    toast(msg, 'roxo');
    global.App.render();
  };

  App4.prepararFechamento = function () {
    var el = document.getElementById('fc-mes');
    App4.mes = el ? el.value : MESES_FECHAMENTO[0];
    App4.preparo = E.prepararFechamento(App4.mes, global.App.usuario);
    App4.ancoragem = null; App4.prova = null;
    toast('<b>Fechamento preparado</b><br>' + App4.preparo.linhas.length + ' contas de ' + App4.mes + ' com hashes calculados. ' +
      'Raiz de Merkle: <span class="mono">' + App4.preparo.raizMerkle.slice(0, 20) + '…</span><br>Resultado do mês: ' + brl(App4.preparo.resumo.resultado, 2) + '.', 'verde');
    global.App.render();
  };

  App4.ancorar = function () {
    if (!App4.preparo) return;
    var r = E.ancorarFechamento(App4.mes, global.App.usuario);
    if (r.recusado) { avisar('A cadeia recusou o registro: ' + esc(r.motivo), 'vermelho'); return; }
    App4.ancoragem = { transacao: r.transacao, bloco: r.bloco, registro: r.registro };
    toast('<b>Fechamento ancorado na blockchain</b><br>Transação ' + r.transacao.id + ' no bloco #' + (r.bloco ? r.bloco.indice : '—') +
      (r.bloco ? ' após ' + num(r.bloco.tentativas, 0) + ' hashes de prova de trabalho' : '') + '.<br>Raiz de Merkle gravada: <span class="mono">' + r.registro.raizMerkle.slice(0, 24) + '…</span>', 'roxo');
    global.App.render();
  };

  App4.conferir = function (id) {
    var p = E.provarFechamento(id);
    if (!p) { avisar('Fechamento não encontrado.', 'vermelho'); return; }
    App4.prova = p;
    toast(p.confere
      ? '<b>✓ Prova de inclusão conferida</b><br>A raiz recalculada a partir dos lançamentos atuais é idêntica à raiz gravada no bloco #' + p.bloco + '.'
      : '<b>✗ Divergência na prova</b><br>A raiz recalculada difere da raiz no bloco — algum lançamento do período foi alterado depois do fechamento.', p.confere ? 'verde' : 'vermelho');
    global.App.render();
  };

  global.App4 = App4;
})(typeof window !== 'undefined' ? window : globalThis);
