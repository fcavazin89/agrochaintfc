/* =========================================================================
 * AGROCHAIN · APLICAÇÃO — MÓDULOS DE IA, BLOCKCHAIN, MERCADO E APOIO
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var IA = global.IA;
  var A = global.App;

  function brl(v, dec) { dec = dec === undefined ? 2 : dec; return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function num(v, dec) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function dataBR(iso) { return new Date(iso).toLocaleDateString('pt-BR'); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function curto(h, n) { n = n || 14; return h ? h.slice(0, n) + '…' : '—'; }
  function chip(t, c) { return '<span class="chip ' + (c || 'cinza') + '">' + t + '</span>'; }
  function barra(pct, cor) { return '<div class="barra-alt"><i style="width:' + Math.max(2, Math.min(100, pct)) + '%' + (cor ? ';background:' + cor : '') + '"></i></div>'; }
  function graficoLinha() { return A.graficoLinha.apply(null, arguments); }
  function graficoBarras() { return A.graficoBarras.apply(null, arguments); }
  function usuario() { return D.usuarios.filter(function (u) { return u.id === A.usuario; })[0]; }

  var App2 = {};

  /* =========================================================================
   * MÓDULO DE IA
   * ======================================================================= */
  App2.viewIA = function () {
    var abas = [['safra', 'Previsão de safra'], ['preco', 'Previsão de preço'], ['sanidade', 'Pragas e doenças'], ['qualidade', 'Qualidade do lote'], ['destino', 'Decisão de venda'], ['modelos', 'Modelos de IA']];
    var h = '<h1>Inteligência artificial aplicada à lavoura e ao negócio</h1>';
    h += '<div class="sub">Seis capacidades em produção neste protótipo — todas com explicação do resultado, porque no campo uma recomendação sem justificativa não é seguida</div>';
    h += '<div class="abas">';
    abas.forEach(function (a) { h += '<div class="aba ' + (A.abaIA === a[0] ? 'on' : '') + '" onclick="App.aba(\'' + a[0] + '\')">' + a[1] + '</div>'; });
    h += '</div>';

    if (A.abaIA === 'safra') h += App2.abaSafra();
    else if (A.abaIA === 'preco') h += App2.abaPreco();
    else if (A.abaIA === 'sanidade') h += App2.abaSanidade();
    else if (A.abaIA === 'qualidade') h += App2.abaQualidade();
    else if (A.abaIA === 'destino') h += App2.abaDestino();
    else h += App2.abaModelos();
    return h;
  };

  App2.abaSafra = function () {
    var u = usuario();
    var talhoes = u.papel === 'produtor' ? D.talhoes.filter(function (t) { return t.produtor === u.id; }) : D.talhoes;
    var previsoes = talhoes.map(function (t) { return IA.preverSafra(t.id); });
    var h = '<div class="cartao"><h2>Previsão de produtividade 2026 por talhão</h2>';
    h += '<div class="nota" style="margin-bottom:12px">Modelo <span class="tag">' + IA.MODELOS.safra.nome + ' v' + IA.MODELOS.safra.versao + '</span> — combina histórico de 4 safras, idade da lavoura, NDVI, regime hídrico dos últimos 90 dias, pressão fitossanitária e manejo. Cada previsão mostra o peso de cada fator.</div>';

    /* resumo com totais */
    var totalCafe = previsoes.filter(function (p) { return p.produto.indexOf('cafe') === 0; }).reduce(function (a, p) { return a + p.producaoTotal; }, 0);
    var totalCacau = previsoes.filter(function (p) { return p.produto === 'cacau'; }).reduce(function (a, p) { return a + p.producaoTotal; }, 0);
    h += '<div class="grade g3" style="margin-bottom:14px">' +
      '<div class="caixa verde"><div class="nota">Café previsto (total)</div><b style="font-size:19px">' + num(totalCafe, 0) + ' sacas</b><div class="nota">' + num(totalCafe * 60 / 1000, 1) + ' toneladas</div></div>' +
      '<div class="caixa verde"><div class="nota">Cacau previsto (total)</div><b style="font-size:19px">' + num(totalCacau, 0) + ' kg</b><div class="nota">' + num(totalCacau / 15, 0) + ' arrobas</div></div>' +
      '<div class="caixa ouro"><div class="nota">Fator de risco dominante</div><b style="font-size:15px">Déficit hídrico</b><div class="nota">chuva 62% abaixo do ideal no trimestre</div></div></div>';

    h += graficoBarras(
      previsoes.map(function (p) { return p.nome.replace(/^(Talhão|Fazenda) /, ''); }),
      previsoes.map(function (p) { return p.previsto; }),
      { cores: previsoes.map(function (p) { return p.produto === 'cacau' ? '#b07d4f' : '#2f8f52'; }) });
    h += '<div class="nota">Barras verdes: café (sacas 60 kg/ha) · barras marrons: cacau (kg/ha)</div>';
    h += '</div>';

    /* comparativo ano a ano por talhão */
    h += '<div class="cartao" style="margin-top:14px"><h2>Evolução por talhão — histórico real vs. previsão</h2>';
    h += '<table class="tabela"><tr><th>Talhão</th><th>2023</th><th>2024</th><th>2025</th><th>2026 (IA)</th><th>Variação vs. 2025</th><th>Confiança</th><th>Total estimado</th></tr>';
    previsoes.forEach(function (p) {
      var hist = D.historicoSafra.filter(function (x) { return x.talhao === p.talhao; })[0];
      function v(ano) { var s = hist.safras.filter(function (x) { return x.ano === ano; })[0]; return s && s.valor ? num(s.valor, 0) : '—'; }
      var u2025 = (hist.safras.filter(function (s) { return s.ano === 2025; })[0] || {}).valor;
      var vr = u2025 ? ((p.previsto / u2025 - 1) * 100) : 0;
      h += '<tr><td><b>' + p.talhao + '</b><div class="nota">' + esc(p.nome) + '</div></td><td>' + v(2023) + '</td><td>' + v(2024) + '</td><td>' + v(2025) + '</td>' +
        '<td><b class="aviso">' + num(p.previsto, 0) + '</b></td>' +
        '<td class="' + (vr >= 0 ? 'positivo' : 'negativo') + '">' + (vr >= 0 ? '+' : '') + vr.toFixed(1) + '%</td>' +
        '<td>' + p.confianca + '%</td><td>' + esc(p.totalTexto) + '</td></tr>';
    });
    h += '</table></div>';

    /* explicabilidade detalhada do primeiro talhão */
    var sel = A.talhaoSel && previsoes.some(function (p) { return p.talhao === A.talhaoSel; }) ? A.talhaoSel : previsoes[0].talhao;
    var p = IA.preverSafra(sel);
    h += '<div class="cartao destaque" style="margin-top:14px"><h2>Por que a IA chegou nesse número — ' + esc(p.nome) + '</h2>';
    h += '<div class="flex envolve" style="margin-bottom:11px">' +
      previsoes.map(function (x) { return '<button class="mini ' + (x.talhao === sel ? '' : 'sec') + '" onclick="App.verTalhao(\'' + x.talhao + '\');App.render()">' + x.talhao + '</button>'; }).join('') + '</div>';
    p.fatores.forEach(function (f) {
      var pct = f.efeitoIndividual === 'referência' ? null : parseFloat(f.efeitoIndividual);
      h += '<div style="margin-bottom:11px"><div class="flex entre"><b style="font-size:13px">' + esc(f.nome) + '</b>' +
        (pct === null ? chip('base do cálculo', 'verde') : chip((pct >= 0 ? '+' : '') + pct.toFixed(1) + '%', pct >= 0 ? 'verde' : 'vermelho')) + '</div>' +
        '<div class="nota" style="margin:3px 0">' + esc(f.contribuicao) + '</div>' +
        (pct === null ? '' : barra(Math.min(100, Math.abs(pct) * 6), pct >= 0 ? '#2f8f52' : '#c0392b')) + '</div>';
    });
    h += '<div class="caixa verde"><b>Como ler:</b> a base histórica ponderada é <b>' + num(p.fatores[0].valor, 1) + ' ' + p.unidade + '</b>. Os fatores ajustam essa base em conjunto (' +
      'multiplicador combinado de <b>' + p.multiplicadorCombinado + '</b>), resultando em <b>' + p.previsto + ' ' + p.unidade + '</b> ' +
      '(faixa provável de ' + p.minimo + ' a ' + p.maximo + ').</div>';
    h += '</div>';
    return h;
  };

  App2.abaPreco = function () {
    var h = '<div class="cartao"><h2>Previsão de preço por produto</h2>';
    h += '<div class="nota" style="margin-bottom:12px">Modelo <span class="tag">' + IA.MODELOS.preco.nome + '</span> — tendência de curto prazo (momentum amortecido), reversão parcial à média, sazonalidade do período e volatilidade histórica com banda de incerteza que cresce pela raiz do tempo.</div>';
    h += '<div class="grade g3">';
    ['cafe_conilon', 'cafe_arabica', 'cacau'].forEach(function (p) {
      var f = IA.preverPreco(p, 30);
      var cor = p === 'cacau' ? '#b07d4f' : '#2f8f52';
      h += '<div class="cartao"><div class="flex entre"><b>' + esc(f.nome) + '</b>' + chip(f.variacao >= 0 ? '▲ alta' : '▼ baixa', f.variacao >= 0 ? 'verde' : 'vermelho') + '</div>';
      h += '<div style="font-size:26px;font-weight:700;margin:7px 0">' + brl(f.atual) + '</div>';
      h += '<div class="nota">por ' + D.precoAncora[p].unidade + '</div>';
      h += '<div class="divisor"></div>';
      h += '<div class="grid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12.5px">' +
        '<div><div class="nota">Em 30 dias</div><b>' + brl(f.central) + '</b></div>' +
        '<div><div class="nota">Prob. de alta</div><b>' + f.probabilidadeAlta + '%</b></div>' +
        '<div><div class="nota">Piso (P10)</div>' + brl(f.minimo) + '</div>' +
        '<div><div class="nota">Teto (P90)</div>' + brl(f.maximo) + '</div></div>';
      h += '<div class="nota" style="margin-top:9px">Volatilidade anualizada: ' + f.volAnualizada + '%</div>';
      h += '</div>';
    });
    h += '</div></div>';

    ['cafe_conilon', 'cacau'].forEach(function (p) {
      var f = IA.preverPreco(p, 30);
      h += '<div class="cartao" style="margin-top:14px"><h2>' + (p === 'cacau' ? 'Cacau' : 'Café Conilon') + ' — últimos 60 dias e projeção de 30 dias</h2>';
      h += graficoLinha(D.precos[p].slice(-60), f.trajetoria, { cor: p === 'cacau' ? '#b07d4f' : '#2f8f52' });
      h += '<div class="grade g4" style="margin-top:11px">';
      f.fatores.forEach(function (x) {
        h += '<div class="caixa"><div class="nota">' + esc(x.nome) + '</div><b style="font-size:13.5px">' + esc(x.valor) + '</b></div>';
      });
      h += '</div>';
      h += '<div class="caixa ' + (f.variacao >= 0 ? 'verde' : 'ouro') + '" style="margin-top:11px;font-size:12.5px">' + esc(f.aviso) + '</div>';
      h += '</div>';
    });

    /* análise de retenção vs. venda */
    h += '<div class="cartao" style="margin-top:14px"><h2>Vale a pena segurar o produto? (custo de carregamento)</h2>';
    h += '<div class="nota" style="margin-bottom:11px">A IA compara o ganho projetado do preço com os custos reais de esperar. Em 2026 a taxa básica está em 15% ao ano — segurar café tem custo financeiro alto.</div>';
    h += '<table class="tabela"><tr><th>Produto</th><th>Preço hoje</th><th>Projeção 30 dias</th><th>Ganho bruto</th><th>Armazenagem (30d)</th><th>Custo de capital (30d)</th><th>Resultado de esperar</th></tr>';
    [['cafe_conilon', 300, 'sacas'], ['cacau', 6000, 'kg']].forEach(function (c) {
      var p = c[0], qtd = c[1];
      var f = IA.preverPreco(p, 30);
      var ganho = (f.central - f.atual) * qtd;
      var arm = p === 'cacau' ? qtd * 0.06 : qtd * 1.10;
      var capital = qtd * f.atual * 0.15 / 12;
      var res = ganho - arm - capital;
      h += '<tr><td><b>' + esc(f.nome) + '</b><div class="nota">' + num(qtd) + ' ' + c[2] + '</div></td>' +
        '<td>' + brl(f.atual) + '</td><td>' + brl(f.central) + '</td>' +
        '<td class="' + (ganho >= 0 ? 'positivo' : 'negativo') + '">' + brl(ganho, 0) + '</td>' +
        '<td class="negativo">' + brl(-arm, 0) + '</td><td class="negativo">' + brl(-capital, 0) + '</td>' +
        '<td><b class="' + (res >= 0 ? 'positivo' : 'negativo') + '">' + (res >= 0 ? '+' : '') + brl(res, 0) + '</b><div class="nota">' + (res >= 0 ? 'esperar é vantajoso' : 'vender agora é melhor') + '</div></td></tr>';
    });
    h += '</table><div class="caixa ouro" style="margin-top:11px;font-size:12.5px">Para o cacau, o resultado negativo de esperar é reforçado pela tendência de queda do mercado em 2026 — a IA soma as duas coisas antes de recomendar.</div></div>';
    return h;
  };

  App2.abaSanidade = function () {
    var u = usuario();
    var talhoes = u.papel === 'produtor' ? D.talhoes.filter(function (t) { return t.produtor === u.id; }) : D.talhoes;
    var h = '<div class="cartao"><h2>Diagnóstico fitossanitário e janela de manejo</h2>';
    h += '<div class="nota" style="margin-bottom:12px">Modelo <span class="tag">' + IA.MODELOS.sanidade.nome + '</span> — combina umidade relativa, chuva dos últimos 30/60 dias, temperatura, idade da lavoura, vigor e histórico. As doenças monitoradas são as que realmente atacam café e cacau em Rondônia.</div>';
    talhoes.forEach(function (t) {
      var d = IA.diagnosticarFitossanidade(t.id);
      var cor = d.nivel === 'CRÍTICO' ? 'vermelha' : d.nivel === 'ALTO' ? 'ouro' : d.nivel === 'MODERADO' ? 'ouro' : 'verde';
      h += '<div class="caixa ' + cor + '" style="margin-bottom:12px">';
      h += '<div class="flex entre"><b style="font-size:15px">' + esc(t.nome) + ' (' + t.id + ')</b>' + chip('risco agregado ' + d.riscoAgregado + '/100 — ' + d.nivel, d.nivel === 'CRÍTICO' ? 'vermelho' : d.nivel === 'BAIXO' ? 'verde' : 'ouro') + '</div>';
      h += '<div class="nota" style="margin:6px 0">Fatores climáticos: ' + d.indicadoresClimaticos.chuva30 + ' mm em 30 dias · umidade relativa ' + d.indicadoresClimaticos.umidadeRelativa + '% · temperatura média ' + d.indicadoresClimaticos.temperatura + '°C · ' + esc(Dados.nomeProduto(t.produto)) + '</div>';
      h += '<table class="tabela" style="margin-top:7px"><tr><th>Doença / praga</th><th>Agente</th><th>Risco</th><th>Janela de ação</th></tr>';
      d.riscos.forEach(function (r) {
        h += '<tr><td><b>' + esc(r.nome) + '</b></td><td class="nota">' + esc(r.agente) + '</td>' +
          '<td style="min-width:130px"><div class="flex" style="gap:6px"><b>' + r.risco + '</b><div style="flex:1">' + barra(r.risco, r.risco >= 70 ? '#c0392b' : r.risco >= 50 ? '#d97706' : '#2f8f52') + '</div></div></td>' +
          '<td class="nota">' + esc(r.janela) + '</td></tr>';
      });
      h += '</table>';
      h += '<div style="margin-top:9px"><b style="font-size:12.5px">Manejo recomendado:</b><ul style="margin:6px 0 0 17px;font-size:12.5px">';
      d.riscos.filter(function (r) { return r.risco >= 35; }).forEach(function (r) { h += '<li style="margin-bottom:4px"><b>' + esc(r.nome) + ':</b> ' + esc(r.manejo) + '</li>'; });
      h += '</ul></div>';
      h += '<div class="nota" style="margin-top:9px;font-style:italic">' + esc(d.recomendacaoGeral) + '</div>';
      h += '</div>';
    });
    h += '</div>';
    h += '<div class="cartao" style="margin-top:14px"><h2>Limite de honestidade do modelo</h2><div class="nota">Este diagnóstico é um <b>indicador de pressão climática aliado a limiares agronômicos publicados</b> (Embrapa/Ceplac) — não é a leitura de uma foto. A identificação visual de ferrugem, vassoura-de-bruxa ou monilíase exige vistoria de campo ou análise de imagem com laudo. O sistema foi desenhado para apontar <i>onde olhar primeiro</i>, e não para substituir a vistoria. Na versão de produção, entra um módulo de visão computacional treinado com fotos reais do produtor.</div></div>';
    return h;
  };

  App2.abaQualidade = function () {
    var u = usuario();
    var lotes = u.papel === 'produtor' ? Dados.lotesDoProdutor(u.id) : D.lotes;
    var h = '<div class="cartao"><h2>Score de qualidade do lote (AgroGrade v1)</h2>';
    h += '<div class="nota" style="margin-bottom:12px">Cada lote recebe nota de 0 a 100 com pesos por dimensão. A nota funciona em dois lugares: no prêmio de preço e na elegibilidade para certificação.</div>';
    lotes.forEach(function (l) {
      var q = IA.scoreQualidade(l.id);
      var aj = IA.precoAjustado(l);
      var cor = q.score >= 85 ? 'verde' : q.score >= 72 ? 'ouro' : 'vermelha';
      h += '<div class="caixa ' + cor + '" style="margin-bottom:11px">';
      h += '<div class="flex entre"><div><b>' + l.id + '</b> <span class="nota">' + esc(Dados.nomeProduto(l.produto)) + ' · ' + l.quantidade + ' ' + l.unidade + '</span></div>' +
        '<div class="flex">' + chip('classe ' + q.classe, cor === 'vermelha' ? 'vermelho' : cor) + '<b style="font-size:19px">' + q.score + '</b><span class="nota">/100</span></div></div>';
      h += '<table class="tabela" style="margin-top:8px"><tr><th>Dimensão</th><th>Valor verificado</th><th>Referência ideal</th><th>Nota</th><th>Peso</th></tr>';
      q.dimensoes.forEach(function (d) {
        h += '<tr><td>' + esc(d.nome) + '</td><td class="nota">' + esc(d.valor) + '</td><td class="nota">' + esc(d.referencia) + '</td>' +
          '<td style="min-width:120px"><div class="flex" style="gap:6px"><b>' + d.score + '</b><div style="flex:1">' + barra(d.score, d.score >= 85 ? '#2f8f52' : d.score >= 70 ? '#d97706' : '#c0392b') + '</div></div></td>' +
          '<td class="nota">' + Math.round(d.peso * 100) + '%</td></tr>';
      });
      h += '</table>';
      h += '<div class="nota" style="margin-top:8px">Efeito no preço: <b class="' + (aj.ajustePct >= 0 ? 'positivo' : 'negativo') + '">' + (aj.ajustePct >= 0 ? '+' : '') + aj.ajustePct + '%</b> sobre a cotação-base → ' + brl(aj.base) + ' vira <b>' + brl(aj.ajustado) + '</b></div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  };

  App2.abaDestino = function () {
    var u = usuario();
    var lotes = (u.papel === 'produtor' ? Dados.lotesDoProdutor(u.id) : D.lotes).filter(function (l) { return ['VENDIDO'].indexOf(l.status) < 0; });
    var sel = lotes.some(function (l) { return l.id === A.loteSel; }) ? A.loteSel : (lotes[0] || {}).id;
    var h = '<div class="cartao"><h2>Decisão de destino do lote — venda, retenção ou transformação própria</h2>';
    h += '<div class="nota" style="margin-bottom:11px">A IA projeta quatro caminhos e mostra o resultado financeiro de cada um, já descontando armazenagem e custo de capital. É o coração do sistema para o produtor: <b>quando</b> e <b>como</b> vender.</div>';
    h += '<div class="flex envolve" style="margin-bottom:13px">' + lotes.map(function (l) {
      return '<button class="mini ' + (l.id === sel ? '' : 'sec') + '" onclick="App.loteSel=\'' + l.id + '\';App.render()">' + l.id + ' · ' + esc(Dados.nomeProduto(l.produto)) + '</button>';
    }).join('') + '</div>';
    if (sel) {
      var r = IA.recomendarDestino(sel);
      var lote = Dados.lote(sel);
      h += '<div class="caixa verde" style="margin-bottom:13px"><div class="flex entre"><b style="font-size:15px">Recomendação: ' + esc(r.recomendacao) + '</b>' + chip('receita projetada ' + brl(r.receitaRecomendada, 0), 'verde') + '</div>';
      h += '<ul style="margin:8px 0 0 17px;font-size:13px">' + r.justificativa.map(function (j) { return '<li style="margin-bottom:4px">' + esc(j) + '</li>'; }).join('') + '</ul></div>';
      h += '<div class="grade g2">';
      r.opcoes.forEach(function (o, i) {
        h += '<div class="cartao' + (i === 0 ? ' destaque' : '') + '">' +
          '<div class="flex entre"><b>' + esc(o.nome) + '</b>' + (i === 0 ? chip('melhor resultado', 'ouro') : '') + '</div>' +
          '<div style="font-size:21px;font-weight:700;margin:8px 0">' + brl(o.receita, 0) + '</div>' +
          '<div class="flex envolve">' + chip('prazo: ' + o.quando, 'cinza') + chip('risco ' + o.risco, o.risco === 'alto' ? 'vermelho' : o.risco === 'médio' ? 'ouro' : 'verde') + '</div>' +
          '<div class="nota" style="margin-top:8px">' + esc(o.detalhe) + '</div></div>';
      });
      h += '</div>';
      h += '<div class="divisor"></div>';
      h += '<div class="grade g4">' +
        '<div class="caixa"><div class="nota">Preço base</div><b>' + brl(r.precoBase) + '</b></div>' +
        '<div class="caixa"><div class="nota">Ajuste por qualidade</div><b class="' + (r.ajustePct >= 0 ? 'positivo' : 'negativo') + '">' + (r.ajustePct >= 0 ? '+' : '') + r.ajustePct + '%</b></div>' +
        '<div class="caixa"><div class="nota">Preço efetivo do lote</div><b>' + brl(r.precoEfetivo) + ' /' + r.unidadePreco + '</b></div>' +
        '<div class="caixa"><div class="nota">Score de qualidade</div><b>' + r.scoreQualidade + '/100</b></div></div>';
      h += '<div class="nota" style="margin-top:11px">Simulação financeira sobre ' + num(r.quantidade) + ' ' + (lote.produto === 'cacau' ? 'kg' : 'sacas') + '. A projeção de preço usada é de 30 e 90 dias, com banda de incerteza — está detalhada na aba de preço.</div>';
    }
    h += '</div>';
    return h;
  };

  App2.abaModelos = function () {
    var h = '<div class="cartao"><h2>Modelos de IA em uso neste protótipo</h2>';
    h += '<div class="nota" style="margin-bottom:13px">Transparência sobre o que é o quê. Nenhum destes módulos é uma rede neural treinada em dados reais — eles são <b>modelos determinísticos, auditáveis e executados no próprio dispositivo</b>. Isso é uma decisão de projeto: no campo, o produtor precisa poder contestar o resultado. O pipeline de aprendizado de máquina está construído e validado separadamente (documento técnico, seção 7).</div>';
    var lista = [['safra', 'lavoura'], ['preco', 'grafico'], ['sanidade', 'alerta'], ['qualidade', 'estrela'], ['anomalia', 'escudo']];
    h += '<div class="grade g2">';
    lista.forEach(function (m) {
      var mod = IA.MODELOS[m[0]];
      h += '<div class="modelo-card"><div class="flex entre"><b>' + (Ico.svg(m[1], 'md') || '') + ' ' + esc(mod.nome) + '</b><span class="tag">v' + mod.versao + '</span></div>' +
        '<div class="nota" style="margin-top:7px"><b style="color:var(--verde-300)">Tipo:</b> ' + esc(mod.tipo) + '</div>' +
        '<div class="nota"><b style="color:var(--verde-300)">Base:</b> ' + esc(mod.treino) + '</div>' +
        '<div class="nota"><b style="color:var(--verde-300)">Desempenho:</b> ' + esc(mod.metrica) + '</div>' +
        '<div class="nota"><b style="color:var(--verde-300)">Execução:</b> ' + esc(mod.execucao) + '</div></div>';
    });
    h += '</div></div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Assistente conversacional — arquitetura</h2>';
    h += '<div class="grade g3">';
    [['1. Interpretação da intenção', 'A pergunta é normalizada e classificada por um léxico de intenções do domínio (preço, venda, safra, doença, rastreio, contrato, clima).'],
     ['2. Recuperação nos dados próprios', 'O sistema busca a resposta nos dados reais da cadeia do usuário — lotes, eventos, cotações, clima, contratos. Nada é inventado.'],
     ['3. Resposta com fonte citada', 'Toda resposta vem acompanhada da fonte que a sustenta (lote, bloco, série de preço, laudo), para o usuário conferir.']].forEach(function (c) {
      h += '<div class="caixa"><b style="font-size:12.5px">' + esc(c[0]) + '</b><div class="nota" style="margin-top:5px">' + esc(c[1]) + '</div></div>';
    });
    h += '</div>';
    h += '<div class="caixa ouro" style="margin-top:12px;font-size:12.5px">No protótipo, a resposta é montada localmente — o que garante funcionamento <b>sem internet</b>, requisito real do produtor rural. Em produção, o mesmo contrato de interface aceita um modelo de linguagem no servidor para perguntas livres, mantendo o dado sensível na propriedade.</div></div>';
    return h;
  };

  /* =========================================================================
   * MÓDULO BLOCKCHAIN
   * ======================================================================= */
  App2.viewBlockchain = function () {
    var est = Ledger.estatisticas();
    var ver = Ledger.verificar();
    var h = '<h1>Blockchain do consórcio</h1>';
    h += '<div class="sub">Rede permissionada mantida por ' + D.meta.consorcio.length + ' instituições · ' + esc(D.meta.algoritmo) + ' · chainId ' + D.meta.chainId + '</div>';

    h += '<div class="grade g4">' +
      '<div class="cartao kpi"><span class="rot">Blocos</span><span class="val">' + est.blocos + '</span><span class="obs">último: ' + curto(est.ultimoHash, 16) + '</span></div>' +
      '<div class="cartao kpi"><span class="rot">Transações</span><span class="val">' + est.transacoes + '</span><span class="obs">' + est.pendentes + ' aguardando bloco</span></div>' +
      '<div class="cartao kpi"><span class="rot">Prova de trabalho</span><span class="val pequeno">' + num(est.tentativasUltimoBloco) + ' tentativas</span><span class="obs">dificuldade ' + est.dificuldade + ' zeros hexadecimais</span></div>' +
      '<div class="cartao kpi"><span class="rot">Integridade da cadeia</span><span class="val pequeno ' + (ver.valida ? 'positivo' : 'negativo') + '">' + (ver.valida ? '✓ Íntegra' : '✗ ' + ver.problemas.length + ' falhas') + '</span><span class="obs">verificação de todos os blocos</span></div>' +
      '</div>';

    /* Minerar + verificar + adulterar */
    h += '<div class="cartao" style="margin-top:14px"><h2>Operações de rede</h2>';
    h += '<div class="flex envolve">';
    h += '<button onclick="App2.minerar()" ' + (est.pendentes === 0 || A.minerando ? 'disabled' : '') + '>Minerar bloco com a fila pendente (' + est.pendentes + ')</button>';
    h += '<button class="azul" onclick="App2.verificar()">Verificar integridade da cadeia</button>';
    h += '<button class="perigo" onclick="App2.adulterar()">Simular fraude (adulterar um registro)</button>';
    h += '<button class="sec" onclick="App.reiniciar()">Reconstruir cadeia do zero</button>';
    h += '</div>';
    h += '<div class="nota" style="margin-top:9px">A mineração roda de verdade neste navegador: o sistema procura um nonce cujo hash SHA-256 do bloco comece com ' + est.dificuldade + ' zeros. No console abaixo você acompanha as tentativas reais.</div>';
    if (A.minerando) h += '<div class="pulso-mineracao" style="margin-top:11px"><div class="spinner"></div><span id="contador-pow">procurando nonce…</span></div>';
    if (A.ultimoLog.length) {
      h += '<div class="terminal" style="margin-top:11px">' + A.ultimoLog.map(function (l) { return '<div class="' + (l.c || '') + '">' + esc(l.t) + '</div>'; }).join('') + '</div>';
    }
    h += '</div>';

    /* Blocos */
    h += '<div class="cartao" style="margin-top:14px"><h2>Blocos</h2>';
    if (est.pendentes) {
      h += '<div class="pendente"><b>Próximo bloco — ' + est.pendentes + ' transação(ões) na fila</b>';
      Ledger.filaPendente().slice(0, 5).forEach(function (t) {
        h += '<div class="nota">· ' + esc(t.tipo) + ' por ' + esc(Dados.nomeUsuario(t.autor)) + ' · <span class="mono">' + curto(t.hash, 20) + '</span></div>';
      });
      if (est.pendentes > 5) h += '<div class="nota">… e mais ' + (est.pendentes - 5) + '</div>';
      h += '</div>';
    }
    Ledger.blocos().slice().reverse().forEach(function (b) {
      var invalido = ver.problemas.some(function (p) { return p.bloco === b.indice; });
      h += '<div class="bloco-card ' + (invalido ? 'invalido' : '') + '">';
      h += '<div class="flex entre envolve"><div class="flex"><b>Bloco #' + b.indice + '</b>' + (invalido ? chip('✗ inválido', 'vermelho') : chip('✓ validado', 'verde')) + chip(b.transacoes.length + ' transações', 'cinza') + (b.indice === 0 ? chip('gênese', 'cinza') : '') + '</div>' +
        '<span class="nota">' + (b.timestamp ? new Date(b.timestamp).toLocaleString('pt-BR') : '—') + ' · minerado por ' + esc(b.minerador) + '</span></div>';
      h += '<div class="nota" style="margin-top:6px">hash anterior: <span class="mono">' + curto(b.hashAnterior, 34) + '</span></div>';
      h += '<div class="nota">merkle root: <span class="mono">' + curto(b.merkleRoot, 34) + '</span> · nonce: ' + b.nonce + ' · tentativas: ' + num(b.tentativas) + '</div>';
      h += '<div style="margin:6px 0"><span class="hash">' + curto(b.hash, 42) + '</span></div>';
      h += '<details><summary style="cursor:pointer;font-size:12px;color:var(--verde-300)">ver as transações deste bloco</summary>';
      h += '<table class="tabela" style="margin-top:7px"><tr><th>Transação</th><th>Tipo</th><th>Autor</th><th>Conteúdo</th><th>Hash</th></tr>';
      b.transacoes.forEach(function (t) {
        var conteudo = t.payload.descricao || t.payload.tipo || t.payload.contrato || t.payload.certificacao || t.payload.finalidade || '—';
        h += '<tr><td class="mono">' + t.id + '</td><td>' + esc(t.tipo.replace(/_/g, ' ')) + '</td><td class="nota">' + esc(Dados.nomeUsuario(t.autor)) + '</td>' +
          '<td class="nota" style="max-width:330px">' + esc(String(conteudo).slice(0, 110)) + '</td><td class="mono" style="font-size:10px">' + curto(t.hash, 14) + '</td></tr>';
      });
      h += '</table></details></div>';
    });
    h += '</div>';

    /* Verificação de lote pelo QR/hash */
    h += '<div class="cartao" style="margin-top:14px"><h2>Verificação de lote por hash (o que o comprador vê)</h2>';
    h += '<div class="nota" style="margin-bottom:11px">O comprador recebe o QR impresso na saca; ao ler, o sistema confere se o hash do selo corresponde à trilha registrada. Se alguém trocou a carga no caminho, o hash não fecha.</div>';
    h += '<div class="grade g3">';
    D.lotes.filter(function (l) { return l.bloco !== null; }).slice(0, 3).forEach(function (l) {
      var v = Ledger.verificarLote(l.id);
      h += '<div class="caixa ' + (v.integro ? 'verde' : 'vermelha') + '"><div class="flex entre"><b>' + l.id + '</b>' + chip(v.integro ? '✓ autêntico' : '✗ divergente', v.integro ? 'verde' : 'vermelho') + '</div>' +
        '<div class="nota" style="margin-top:6px">' + esc(Dados.nomeProduto(l.produto)) + ' · ' + l.quantidade + ' ' + l.unidade + '</div>' +
        '<div class="mono" style="font-size:10px;margin-top:5px;color:var(--verde-300)">' + curto(v.hashSelo, 38) + '</div>' +
        '<div class="nota">' + v.eventosNaCadeia + '/' + v.eventosTotal + ' eventos em bloco · blocos ' + (v.blocos.join(', ') || '—') + '</div></div>';
    });
    h += '</div></div>';

    /* Permissões */
    var u = usuario();
    h += '<div class="cartao" style="margin-top:14px"><h2>Quem pode escrever o quê (rede permissionada)</h2>';
    h += '<div class="nota" style="margin-bottom:11px">Diferente de uma blockchain pública, aqui cada instituição do consórcio tem permissões definidas. Isso é o que evita que um participante invente um evento que não é dele.</div>';
    h += '<table class="tabela"><tr><th>Papel</th><th>Pode registrar</th><th>Status do seu perfil</th></tr>';
    Object.keys(Ledger.permissoes()).forEach(function (p) {
      var pode = Ledger.permissoes()[p];
      h += '<tr><td><b>' + p + '</b></td><td class="nota">' + (pode.length ? pode.map(function (x) { return chip(x.replace(/_/g, ' ').toLowerCase(), 'cinza'); }).join(' ') : chip('somente leitura', 'azul')) + '</td>' +
        '<td>' + (u.papel === p ? chip('seu perfil está aqui', 'ouro') : '') + '</td></tr>';
    });
    h += '</table>';
    if (u.papel !== 'auditor') {
      h += '<div class="caixa azul" style="margin-top:11px;font-size:12.5px">Teste o controle de permissão: alterne o perfil no topo da tela para <b>Auditoria Independente</b> e tente registrar uma colheita — o sistema rejeita a transação e mostra o motivo.</div>';
    }
    h += '</div>';

    /* Arquitetura de produção */
    h += '<div class="cartao" style="margin-top:14px"><h2>Como isso vira produção</h2>';
    h += '<div class="grade g3">';
    [['Hoje (protótipo)', 'Blockchain local no navegador: mesma estrutura (hash, merkle, PoW, consenso por permissão), dados de demonstração. Zero custo, funciona offline.'],
     ['Piloto com cooperativa', 'Rede permissionada Hyperledger Besu ou Polygon, um nó por instituição (cooperativa, indústria, certificadora), contrato AgroChainRastreio.sol implantado, QR impresso nas sacas.'],
     ['Escala', 'Integração com balanças e etiquetadoras da cooperativa, sensores de fermentação, oráculos de cotação e API aberta para o comprador conferir o selo.']].forEach(function (x) {
      h += '<div class="caixa"><b style="font-size:12.5px">' + esc(x[0]) + '</b><div class="nota" style="margin-top:5px">' + esc(x[1]) + '</div></div>';
    });
    h += '</div></div>';
    return h;
  };

  /* ---- ações da blockchain ---- */
  App2.minerar = function () {
    if (A.minerando) return;
    var est = Ledger.estatisticas();
    if (!est.pendentes) { A.ultimoLog = [{ t: 'Nada a minerar: a fila está vazia.', c: 'aviso2' }]; A.render(); return; }

    /* A busca de nonce é real e roda sobre os MESMOS dados que formarão o
       bloco: prepararBloco() congela timestamp e merkle root, a interface
       varre os nonces em lotes de 4.000 tentativas (devolvendo o controle ao
       navegador entre lotes) e o bloco é finalizado com o nonce encontrado.
       O contador na tela é, portanto, o número real de tentativas. */
    var prep = Ledger.prepararBloco({});
    var nonce = 0, total = 0, inicio = Date.now();
    A.minerando = true;
    A.ultimoLog = [{ t: 'Iniciando busca de nonce válido (dificuldade ' + prep.dificuldade + ' zeros hexadecimais)…', c: 'aviso2' }];
    A.render();

    function lote() {
      for (var i = 0; i < 4000; i++) {
        var h = Cripto.hashBlock(prep.indice, prep.timestamp, prep.merkleRoot, prep.hashAnterior, nonce);
        total++;
        if (h.indexOf(prep.prefixo) === 0) { finalizar(nonce, total, Date.now() - inicio); return; }
        nonce++;
      }
      var alvo = typeof document !== 'undefined' ? document.getElementById('contador-pow') : null;
      if (alvo) alvo.textContent = num(total) + ' tentativas · nonce ' + num(nonce) + ' · ' + ((Date.now() - inicio) / 1000).toFixed(1) + 's';
      if (typeof setTimeout !== 'undefined') setTimeout(lote, 0); else finalizar(nonce, total, Date.now() - inicio);
    }

    function finalizar(n, t, ms) {
      var bloco = Ledger.finalizarBloco(prep, n, { minerador: usuario().org.split('—')[0].trim() });
      A.minerando = false;
      A.ultimoLog = [
        { t: '✓ Bloco #' + bloco.indice + ' minerado com sucesso', c: '' },
        { t: '  nonce encontrado: ' + bloco.nonce + ' após ' + num(t) + ' tentativas', c: 'apagado' },
        { t: '  hash do bloco: ' + bloco.hash, c: '' },
        { t: '  merkle root:   ' + bloco.merkleRoot, c: 'apagado' },
        { t: '  elo anterior:  ' + bloco.hashAnterior, c: 'apagado' },
        { t: '  transações confirmadas: ' + bloco.transacoes.length, c: '' },
        { t: '  tempo de busca: ' + (ms / 1000).toFixed(2) + 's (~' + num(Math.round(t / Math.max(1, ms / 1000))) + ' hashes por segundo)', c: 'apagado' }
      ];
      A.render();
    }
    lote();
  };

  App2.verificar = function () {
    var v = Ledger.verificar();
    A.ultimoLog = [{ t: 'Verificação completa da cadeia (' + v.blocos + ' blocos, ' + v.transacoes + ' transações)', c: 'aviso2' }];
    if (v.valida) {
      A.ultimoLog.push({ t: '✓ Cadeia íntegra. Nenhum bloco foi alterado.', c: '' });
      A.ultimoLog.push({ t: '  · todos os hashes de bloco conferem com o conteúdo', c: 'apagado' });
      A.ultimoLog.push({ t: '  · todas as árvores de Merkle conferem com as transações', c: 'apagado' });
      A.ultimoLog.push({ t: '  · o encadeamento entre blocos está intacto', c: 'apagado' });
      A.ultimoLog.push({ t: '  · todas as assinaturas dos autores são válidas', c: 'apagado' });
    } else {
      A.ultimoLog.push({ t: '✗ Foram encontradas ' + v.problemas.length + ' inconsistências:', c: 'erro' });
      v.problemas.forEach(function (p) { A.ultimoLog.push({ t: '  [bloco ' + p.bloco + '] ' + p.tipo + ' — ' + p.descricao, c: 'erro' }); });
    }
    A.render();
  };

  App2.adulterar = function () {
    var r = Ledger.simularAdulteracao(Ledger.blocos().length > 1 ? 1 : 0, 'descricao', 'CARGA TROCADA — 100 sacas de café de origem desconhecida');
    var v = Ledger.verificar();
    A.ultimoLog = [
      { t: 'FRAUDE SIMULADA: alguém alterou diretamente o banco de dados do nó', c: 'aviso2' },
      { t: '  transação alvo: ' + r.transacao + ' (bloco ' + r.bloco + ')', c: 'apagado' },
      { t: '  campo alterado: ' + r.descricao + ' "CARGA TROCADA — origem desconhecida"', c: 'apagado' },
      { t: '', c: '' },
      { t: 'Verificação da cadeia na sequência:', c: 'aviso2' },
      { t: '✗ CADEIA INVÁLIDA — ' + v.problemas.length + ' inconsistências detectadas', c: 'erro' }
    ];
    v.problemas.forEach(function (p) { A.ultimoLog.push({ t: '  [bloco ' + p.bloco + '] ' + p.tipo + ' — ' + p.descricao, c: 'erro' }); });
    A.ultimoLog.push({ t: '', c: '' });
    A.ultimoLog.push({ t: 'Leitura: o hash gravado no bloco não corresponde mais ao conteúdo. Para esconder a fraude, seria preciso refazer o hash e a prova de trabalho daquele bloco E de todos os seguintes, mais rápido que o resto do consórcio — inviável em rede permissionada com múltiplos nós.', c: 'aviso2' });
    A.ultimoLog.push({ t: 'Use "Reconstruir cadeia do zero" para voltar ao estado íntegro.', c: 'apagado' });
    A.render();
  };

  /* =========================================================================
   * MÓDULO MERCADO E CONTRATOS
   * ======================================================================= */
  App2.viewMercado = function () {
    var u = usuario();
    var h = '<h1>Mercado, escrow e contratos inteligentes</h1>';
    h += '<div class="sub">Encontro entre quem produz e quem compra — com garantia de pagamento e conferência automática de peso</div>';

    /* Match IA entre lotes e demandas */
    var meusLotes = u.papel === 'produtor' ? Dados.lotesDoProdutor(u.id) : D.lotes.filter(function (l) { return ['DISPONIVEL', 'CERTIFICADO', 'NA_COOPERATIVA'].indexOf(l.status) >= 0; });
    h += '<div class="cartao"><h2>Compatibilidade calculada pela IA entre lotes e demandas abertas</h2>';
    h += '<div class="nota" style="margin-bottom:11px">A IA cruza produto, volume, qualidade exigida, certificação, prazo e preço máximo, e devolve um índice de aderência com o motivo de cada ponto perdido.</div>';
    var linhas = [];
    meusLotes.forEach(function (l) {
      D.demandas.forEach(function (d) {
        if (d.produto !== l.produto) return;
        var q = IA.scoreQualidade(l.id);
        var aj = IA.precoAjustado(l);
        var pontos = 100, motivos = [];
        if (d.quantidade > l.quantidade) { pontos -= 18; motivos.push('volume do lote (' + l.quantidade + ') é menor que o pedido (' + d.quantidade + ')'); }
        else motivos.push('volume atende ao pedido');
        if (d.exigeCertificacao && !l.certificacao) { pontos -= 25; motivos.push('exige certificação e o lote ainda não tem selo ativo'); }
        else if (d.exigeCertificacao) motivos.push('certificação atende à exigência');
        if (aj.ajustado > d.precoMax) { pontos -= 22; motivos.push('preço ajustado pela qualidade (' + brl(aj.ajustado) + ') acima do teto do comprador (' + brl(d.precoMax) + ')'); }
        else motivos.push('preço dentro do teto do comprador');
        if (q.score >= 85) pontos += 6; else if (q.score < 72) { pontos -= 10; motivos.push('qualidade abaixo do padrão exigido pelo segmento'); }
        pontos = Math.max(10, Math.min(100, pontos));
        linhas.push({ lote: l, demanda: d, pontos: pontos, motivos: motivos, q: q, aj: aj });
      });
    });
    linhas.sort(function (a, b) { return b.pontos - a.pontos; });
    if (!linhas.length) h += '<div class="caixa">Nenhuma demanda compatível com os lotes na sua visão.</div>';
    linhas.slice(0, 6).forEach(function (x) {
      var cor = x.pontos >= 80 ? 'verde' : x.pontos >= 55 ? 'ouro' : 'vermelha';
      h += '<div class="caixa ' + cor + '" style="margin-bottom:10px">';
      h += '<div class="flex entre envolve"><div><b>' + x.lote.id + '</b> <span class="nota">' + esc(Dados.nomeProduto(x.lote.produto)) + ' · ' + x.lote.quantidade + ' ' + x.lote.unidade + '</span> <b>' + x.demanda.id + '</b> <span class="nota">' + esc(Dados.orgUsuario(x.demanda.comprador)) + '</span></div>' +
        '<div class="flex">' + chip('aderência ' + x.pontos + '%', cor === 'vermelha' ? 'vermelho' : cor) + chip('teto ' + brl(x.demanda.precoMax), 'cinza') + '</div></div>';
      h += '<div style="margin:7px 0">' + barra(x.pontos, x.pontos >= 80 ? '#2f8f52' : x.pontos >= 55 ? '#d97706' : '#c0392b') + '</div>';
      h += '<ul style="margin-left:17px;font-size:12.5px">' + x.motivos.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul>';
      h += '<div class="nota" style="margin-top:6px">' + esc(x.demanda.especificacoes) + ' · prazo ' + dataBR(x.demanda.prazoEntrega) + '</div>';
      if (u.papel !== 'auditor' && x.pontos >= 55) h += '<div style="margin-top:9px"><button class="mini" onclick="App2.propor(\'' + x.lote.id + '\',\'' + x.demanda.id + '\')">Enviar proposta a este comprador</button></div>';
      h += '</div>';
    });
    h += '</div>';

    /* Contratos */
    h += '<div class="cartao" style="margin-top:14px"><h2>Contratos com pagamento em escrow</h2>';
    h += '<div class="nota" style="margin-bottom:11px">O comprador deposita a garantia no contrato. O dinheiro fica retido e só é liberado quando a carga é conferida. Se a divergência de peso passar da tolerância, o contrato <b>trava sozinho</b> — ninguém precisa confiar na palavra do outro.</div>';
    var visiveis = D.contratos;
    if (!visiveis.length) h += '<div class="caixa">Nenhum contrato em andamento.</div>';
    visiveis.forEach(function (ct) {
      var etapasOk = ct.etapas.filter(function (e) { return e.status === 'CONCLUIDA'; }).length;
      var travado = ct.status === 'TRAVADO_DIVERGENCIA';
      h += '<div class="caixa ' + (travado ? 'vermelha' : 'azul') + '" style="margin-bottom:12px">';
      h += '<div class="flex entre envolve"><div><b>' + ct.id + '</b> <span class="nota">' + esc(Dados.orgUsuario(ct.vendedor)) + ' ' + esc(Dados.orgUsuario(ct.comprador)) + '</span></div>' +
        '<div class="flex">' + chip(ct.status.replace(/_/g, ' '), travado ? 'vermelho' : ct.status === 'CONCLUIDA' ? 'verde' : 'azul') + chip('escrow ' + brl(ct.valorTotal, 0), 'ouro') + '</div></div>';
      h += '<div class="nota" style="margin:7px 0">' + esc(Dados.nomeProduto(ct.produto)) + ' · ' + ct.quantidade + ' ' + ct.unidade + ' · ' + brl(ct.precoUnitario) + ' por unidade · tolerância de peso ' + ct.toleranciaDivergenciaPeso + '% · garantia ' + ct.garantiaPercentual + '%</div>';
      h += '<div style="margin-bottom:9px">' + barra(etapasOk / ct.etapas.length * 100) + '</div>';
      h += '<div class="linha-tempo">';
      ct.etapas.forEach(function (e) {
        h += '<div class="ponto' + (e.status === 'CONCLUIDA' ? '' : ' cinza') + '"><div class="flex entre"><b style="font-size:12.5px">' + esc(e.nome) + '</b>' +
          '<span class="nota">' + (e.data ? dataBR(e.data) : 'pendente') + '</span></div>' +
          (e.bloco !== null && e.bloco !== undefined ? '<span class="hash">bloco ' + e.bloco + '</span>' : '') + '</div>';
      });
      h += '</div>';
      if (travado) h += '<div class="caixa vermelha" style="font-size:12.5px;margin-bottom:9px"><b>Contrato travado pelo smart contract.</b> A divergência de peso apurada na conferência superou a tolerância contratual. O escrow permanece bloqueado até a apresentação de laudo de recontagem. Nenhuma das partes consegue liberar o valor sozinha.</div>';
      if (u.papel !== 'auditor' && ct.status !== 'CONCLUIDA') {
        h += '<div class="flex envolve">';
        h += '<button class="mini" onclick="App2.avancar(\'' + ct.id + '\', 0.8)">▶ Avançar etapa (divergência 0,8%)</button>';
        h += '<button class="mini perigo" onclick="App2.avancar(\'' + ct.id + '\', 4.6)">▶ Avançar com fraude de peso (4,6%)</button>';
        h += '</div><div class="nota" style="margin-top:6px">Os dois botões existem para você ver a diferença: no primeiro, o smart contract libera a etapa; no segundo, ele trava o pagamento.</div>';
      }
      h += '</div>';
    });
    h += '</div>';

    /* Propostas */
    h += '<div class="cartao" style="margin-top:14px"><h2>Propostas em negociação</h2>';
    if (!D.propostas.length) h += '<div class="caixa">Sem propostas abertas.</div>';
    else {
      h += '<table class="tabela"><tr><th>Proposta</th><th>Lote</th><th>De → Para</th><th>Quantidade</th><th>Preço pretendido</th><th>Status</th></tr>';
      D.propostas.forEach(function (p) {
        h += '<tr><td class="mono">' + p.id + '</td><td>' + p.lote + '<div class="nota">' + esc(Dados.nomeProduto(p.produto)) + '</div></td>' +
          '<td class="nota">' + esc(Dados.orgUsuario(p.de)) + ' ' + esc(Dados.orgUsuario(p.para)) + '</td>' +
          '<td>' + p.quantidade + ' ' + p.unidade + '</td><td><b>' + brl(p.precoPretendido) + '</b></td><td>' + chip(p.status.replace(/_/g, ' '), 'azul') + '</td></tr>';
      });
      h += '</table>';
    }
    h += '</div>';
    return h;
  };

  App2.propor = function (loteId, demandaId) {
    var l = Dados.lote(loteId), d = D.demandas.filter(function (x) { return x.id === demandaId; })[0];
    var aj = IA.precoAjustado(l);
    var preco = Math.min(d.precoMax, aj.ajustado);
    var p = {
      id: 'PR-2026-' + String(1000 + D.propostas.length + 3).slice(1), de: A.usuario, para: d.comprador,
      lote: loteId, produto: l.produto, quantidade: Math.min(l.quantidade, d.quantidade), unidade: l.unidade,
      precoPretendido: Math.round(preco * 100) / 100, status: 'AGUARDANDO_RESPOSTA', criadoEm: new Date().toISOString().slice(0, 10)
    };
    D.propostas.unshift(p);
    Ledger.registrarTx('PROPOSTA', { proposta: p.id, lote: loteId, preco: p.precoPretendido, comprador: d.comprador }, A.usuario);
    var ct = Ledger.criarContrato({
      vendedor: A.usuario, comprador: d.comprador, lote: loteId, produto: l.produto,
      quantidade: p.quantidade, unidade: l.unidade, precoUnitario: p.precoPretendido, prazoEntrega: d.prazoEntrega
    });
    A.avisos = 'Proposta ' + p.id + ' enviada a ' + Dados.orgUsuario(d.comprador) + ' e contrato ' + ct.id + ' criado em escrow (valor ' + brl(ct.valorTotal, 0) + '). As transações entram no próximo bloco.';
    A.ultimoLog = [];
    A.render();
  };

  App2.avancar = function (id, divergencia) {
    var ct = Ledger.avancarEtapa(id, { divergenciaPeso: divergencia });
    var etapa = ct.etapas.filter(function (e) { return e.status === 'CONCLUIDA'; }).slice(-1)[0];
    A.avisos = 'Etapa "' + etapa.nome + '" concluída. Status do contrato: ' + ct.status.replace(/_/g, ' ') +
      (ct.status === 'TRAVADO_DIVERGENCIA' ? ' — PAGAMENTO BLOQUEADO automaticamente pelo smart contract.' : '.');
    A.render();
  };

  /* =========================================================================
   * MÓDULO CERTIFICAÇÃO
   * ======================================================================= */
  App2.viewCertificacao = function () {
    var u = usuario();
    var h = '<h1>Certificação e conformidade</h1><div class="sub">Da conformidade da propriedade ao selo verificável por QR Code — sem papel que se possa falsificar</div>';

    if (u.papel === 'certificadora' || u.papel === 'auditor') {
      h += '<div class="cartao"><h2>Fila de certificação (visão da certificadora)</h2>';
      h += '<div class="nota" style="margin-bottom:11px">A certificadora vê os lotes que solicitaram selo, com o score de conformidade calculado pela IA sobre as evidências já registradas na cadeia. A decisão continua humana — a IA organiza e aponta pendências.</div>';
      h += '<table class="tabela"><tr><th>Lote</th><th>Produtor</th><th>Qualidade</th><th>Conformidade</th><th>Evidências na cadeia</th><th>Certificação</th><th></th></tr>';
      D.lotes.filter(function (l) { return l.status !== 'VENDIDO'; }).forEach(function (l) {
        var conf = IA.analisarConformidade(l.produtor);
        var q = IA.scoreQualidade(l.id);
        var evs = Dados.eventosDoLote(l.id).length;
        h += '<tr><td><b>' + l.id + '</b><div class="nota">' + esc(Dados.nomeProduto(l.produto)) + '</div></td>' +
          '<td class="nota">' + esc(Dados.orgUsuario(l.produtor)) + '</td>' +
          '<td><b>' + q.score + '</b> <span class="nota">(' + q.classe + ')</span></td>' +
          '<td><b class="' + (conf.score >= 85 ? 'positivo' : conf.score >= 70 ? 'aviso' : 'negativo') + '">' + conf.score + '</b><div class="nota">' + esc(conf.nivel) + '</div></td>' +
          '<td class="nota">' + evs + ' eventos<div>' + (q.laudo ? chip('laudo presente', 'verde') : chip('sem laudo', 'ouro')) + '</div></td>' +
          '<td>' + (l.certificacao ? chip('certificado', 'roxo') : chip('sem selo', 'cinza')) + '</td>' +
          '<td>' + (u.papel === 'auditor' ? chip('somente leitura', 'azul') : '<button class="mini" onclick="App2.emitirSelo(\'' + l.id + '\')">Emitir selo</button>') + '</td></tr>';
      });
      h += '</table></div>';
    }

    /* Conformidade do produtor */
    var alvo = u.papel === 'produtor' ? u.id : 'U-01';
    var conf = IA.analisarConformidade(alvo);
    h += '<div class="cartao ' + (conf.score >= 85 ? 'destaque' : '') + '" style="margin-top:14px"><h2>Conformidade da propriedade — ' + esc(Dados.orgUsuario(alvo)) + '</h2>';
    h += '<div class="flex entre envolve" style="margin-bottom:11px"><div><span style="font-size:34px;font-weight:700">' + conf.score + '</span><span class="nota">/100</span></div>' +
      chip(conf.nivel, conf.score >= 85 ? 'verde' : conf.score >= 70 ? 'ouro' : 'vermelho') + '</div>';
    h += '<div class="nota" style="margin-bottom:11px">' + conf.lotesComCadeiaCompleta + ' de ' + conf.lotesAnalisados + ' lotes com trilha completa na blockchain.</div>';
    conf.criterios.forEach(function (c) {
      h += '<div style="margin-bottom:11px"><div class="flex entre"><b style="font-size:13px">' + esc(c.nome) + '</b><span class="nota">peso ' + Math.round(c.peso * 100) + '%</span></div>' +
        '<div style="margin:4px 0">' + barra(c.score, c.score >= 85 ? '#2f8f52' : c.score >= 70 ? '#d97706' : '#c0392b') + '</div>' +
        '<div class="nota">' + esc(c.evidencias) + '</div></div>';
    });
    if (conf.pendencias.length) {
      h += '<div class="caixa ouro"><b>Pendências para subir de nível:</b><ul style="margin:7px 0 0 17px;font-size:12.5px">';
      conf.pendencias.forEach(function (p) { h += '<li>' + esc(p.criterio) + ' — impacto estimado de ' + p.impacto + ' pontos</li>'; });
      h += '</ul></div>';
    }
    h += '</div>';

    /* Selos emitidos */
    h += '<div class="cartao" style="margin-top:14px"><h2>Selos registrados na blockchain</h2>';
    if (!D.certificacoes.length) h += '<div class="caixa">Nenhum selo emitido ainda.</div>';
    else {
      h += '<table class="tabela"><tr><th>Selo</th><th>Lote</th><th>Tipo</th><th>Emissor</th><th>Validade</th><th>Status</th><th>Registro on-chain</th></tr>';
      D.certificacoes.forEach(function (c) {
        h += '<tr><td class="mono">' + c.id + '</td><td>' + c.lote + '</td><td class="nota">' + esc(c.tipo) + '</td>' +
          '<td class="nota">' + esc(Dados.orgUsuario(c.emissor)) + '</td><td>' + dataBR(c.validoAte) + '</td>' +
          '<td>' + chip(c.status.replace(/_/g, ' '), c.status === 'ATIVO' ? 'roxo' : 'ouro') + '</td>' +
          '<td>' + (c.bloco !== null && c.bloco !== undefined ? '<span class="hash">bloco ' + c.bloco + ' · ' + curto(c.hash, 12) + '</span>' : chip('aguardando bloco', 'ouro')) + '</td></tr>';
      });
      h += '</table>';
    }
    h += '<div class="caixa azul" style="margin-top:11px;font-size:12.5px">O valor de mercado de um selo encadeado: o comprador internacional não precisa aceitar um PDF. Ele lê o QR do lote, confere o hash e vê qual instituição assinou, quando e com base em qual laudo. Falsificar exigiria reescrever a cadeia inteira.</div></div>';
    return h;
  };

  App2.emitirSelo = function (loteId) {
    var l = Dados.lote(loteId);
    var conf = IA.analisarConformidade(l.produtor);
    var q = IA.scoreQualidade(loteId);
    var id = 'CERT-RO-2026-' + String(1000 + D.certificacoes.length * 7).slice(1);
    var cert = {
      id: id, lote: loteId, tipo: l.produto === 'cacau' ? 'Indicação de Procedência Rondônia (INPI)' : 'Boas Práticas Agrícolas + Rastreabilidade',
      emissor: A.usuario, validoAte: '2028-10-06', status: 'ATIVO', scoreConformidade: conf.score, hash: null, bloco: null
    };
    D.certificacoes.push(cert);
    l.certificacao = id;
    if (l.status === 'DISPONIVEL' || l.status === 'NA_COOPERATIVA') l.status = 'CERTIFICADO';
    Ledger.registrarTx('LAUDO_QUALIDADE', { lote: loteId, score: q.score, laudo: 'emitido pela certificadora' }, A.usuario);
    Ledger.registrarTx('CERTIFICACAO', { certificacao: id, lote: loteId, tipo: cert.tipo }, A.usuario);
    Ledger.minerar({ minerador: usuario().org.split('—')[0].trim() });
    A.avisos = 'Selo ' + id + ' emitido e registrado na blockchain para o lote ' + loteId + ' (conformidade ' + conf.score + '/100, qualidade ' + q.score + '/100).';
    A.render();
  };

  /* =========================================================================
   * MÓDULO AUDITORIA
   * ======================================================================= */
  App2.viewAuditoria = function () {
    var anom = IA.detectarAnomalias();
    var ver = Ledger.verificar();
    var h = '<h1>Auditoria e detecção de fraude</h1><div class="sub">Duas camadas independentes: a IA procura padrões suspeitos nos dados; a blockchain prova se algum registro foi alterado</div>';

    h += '<div class="grade g3">';
    h += '<div class="cartao kpi"><span class="rot">Score de confiabilidade da base</span><span class="val">' + anom.scoreConfiabilidade + '<span class="nota">/100</span></span><span class="obs">' + anom.total + ' apontamentos pela IA</span></div>';
    h += '<div class="cartao kpi"><span class="rot">Integridade criptográfica</span><span class="val pequeno ' + (ver.valida ? 'positivo' : 'negativo') + '">' + (ver.valida ? '✓ Íntegra' : '✗ ' + ver.problemas.length + ' falhas') + '</span><span class="obs">' + ver.blocos + ' blocos verificados</span></div>';
    h += '<div class="cartao kpi"><span class="rot">Apontamentos críticos</span><span class="val ' + (anom.criticos ? 'negativo' : 'positivo') + '">' + anom.criticos + '</span><span class="obs">exigem ação imediata</span></div>';
    h += '</div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Padrões suspeitos encontrados pela IA</h2>';
    if (!anom.total) h += '<div class="caixa verde">Nenhuma inconsistência encontrada na base.</div>';
    anom.achados.forEach(function (a) {
      var cor = a.severidade === 'critico' ? 'vermelha' : 'ouro';
      h += '<div class="caixa ' + cor + '" style="margin-bottom:10px">' +
        '<div class="flex entre envolve"><div>' + chip(a.severidade === 'critico' ? 'CRÍTICO' : 'ATENÇÃO', a.severidade === 'critico' ? 'vermelho' : 'ouro') + ' <b>' + esc(a.tipo.replace(/_/g, ' ')) + '</b> <span class="nota">· ' + esc(a.alvo) + '</span></div></div>' +
        '<div style="margin:7px 0;font-size:13px">' + esc(a.descricao) + '</div>' +
        '<div class="nota"><b>Ação recomendada:</b> ' + esc(a.acao || a.recomendacao) + '</div></div>';
    });
    h += '</div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Prova criptográfica (a camada que não depende de confiança)</h2>';
    h += '<div class="nota" style="margin-bottom:11px">A IA pode errar ou ser enganada por dados falsos na entrada. A cadeia não: se o dado foi alterado depois de gravado, a verificação acusa. Por isso as duas camadas juntas são mais fortes que cada uma isolada.</div>';
    h += '<div class="flex envolve" style="margin-bottom:11px">' +
      '<button class="azul" onclick="App2.verificar()">Verificar cadeia agora</button>' +
      '<button class="perigo" onclick="App2.adulterar()">Simular adulteração de registro</button>' +
      '<button class="sec" onclick="App2.verificarTodosLotes()">Conferir selo de todos os lotes</button></div>';
    if (A.ultimoLog.length) h += '<div class="terminal">' + A.ultimoLog.map(function (l) { return '<div class="' + (l.c || '') + '">' + esc(l.t) + '</div>'; }).join('') + '</div>';
    h += '</div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Trilhas de auditoria por lote</h2><table class="tabela"><tr><th>Lote</th><th>Produtor</th><th>Eventos</th><th>Blocos</th><th>Integridade do selo</th><th>Certificação</th></tr>';
    D.lotes.forEach(function (l) {
      var v = Ledger.verificarLote(l.id);
      h += '<tr><td><b>' + l.id + '</b></td><td class="nota">' + esc(Dados.orgUsuario(l.produtor)) + '</td><td>' + v.eventosTotal + '</td>' +
        '<td class="nota">' + (v.blocos.join(', ') || '—') + '</td>' +
        '<td>' + (v.integro ? chip('✓ hash confere', 'verde') : chip('✗ divergente', 'vermelho')) + '</td>' +
        '<td>' + (l.certificacao ? chip('certificado', 'roxo') : '<span class="nota">sem selo</span>') + '</td></tr>';
    });
    h += '</table></div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>O que este sistema resolve na prática</h2><div class="grade g2">';
    [['Fraude de origem', 'Lote trocado no caminho entre a fazenda e a indústria — o hash do selo não fecha com a trilha registrada.'],
     ['Adulteração de laudo', 'A certificação assinada pela certificadora fica vinculada ao laudo; alterar o resultado invalida a assinatura.'],
     ['Fraude de peso', 'Divergência acima da tolerância contratual trava o escrow automaticamente, sem depender de negociação entre as partes.'],
     ['Sobreposição de venda', 'O mesmo lote em contrato fica bloqueado; o sistema rejeita uma segunda venda do mesmo hash.'],
     ['Importação com exigência ambiental (EUDR)', 'A prova de origem e de não desmatamento fica verificável pelo comprador europeu, sem depender de declaração.'],
     ['Preço injusto por falta de informação', 'O produtor vê a cotação real, a previsão e o efeito da qualidade do seu lote antes de aceitar a proposta.']].forEach(function (x) {
      h += '<div class="caixa"><b style="font-size:12.5px">' + esc(x[0]) + '</b><div class="nota" style="margin-top:5px">' + esc(x[1]) + '</div></div>';
    });
    h += '</div></div>';
    return h;
  };

  App2.verificarTodosLotes = function () {
    A.ultimoLog = [{ t: 'Conferência do selo de ' + D.lotes.length + ' lotes:', c: 'aviso2' }];
    var ok = 0;
    D.lotes.forEach(function (l) {
      var v = Ledger.verificarLote(l.id);
      if (v.integro) ok++;
      A.ultimoLog.push({ t: (v.integro ? '  ✓ ' : '  ✗ ') + l.id + ' — ' + v.eventosNaCadeia + '/' + v.eventosTotal + ' eventos em bloco · hash ' + curto(v.hashSelo, 16), c: v.integro ? 'apagado' : 'erro' });
    });
    A.ultimoLog.push({ t: 'Resultado: ' + ok + ' de ' + D.lotes.length + ' lotes com integridade confirmada.', c: '' });
    A.render();
  };

  /* =========================================================================
   * MÓDULO ASSISTENTE
   * ======================================================================= */
  App2.viewAssistente = function () {
    var h = '<h1>Assistente agropecuário</h1>';
    h += '<div class="sub">Responde com base nos dados reais da sua cadeia — e mostra a fonte de cada resposta. Funciona sem internet.</div>';
    h += '<div class="cartao"><div class="chat" id="chat">';
    if (!A.chat.length) {
      h += '<div class="msg ia">Olá, ' + esc(usuario().nome.split(' ')[0]) + '! Sou o assistente do AgroChain. Posso analisar seus lotes, preços de mercado, riscos na lavoura e a situação dos contratos.\n\nPergunte do seu jeito — por exemplo: <i>"quando devo vender o cacau?"</i></div>';
    }
    A.chat.forEach(function (m) {
      h += '<div class="msg ' + (m.quem === 'eu' ? 'eu' : 'ia') + '">' + esc(m.texto) +
        (m.fontes && m.fontes.length ? '<div class="fontes"><b>Fontes consultadas:</b><br>' + m.fontes.map(function (f) { return '· ' + esc(f); }).join('<br>') + '</div>' : '') + '</div>';
    });
    h += '</div>';
    h += '<div class="sugestoes">';
    ['Quando devo vender o lote de cacau?', 'Qual o risco de ferrugem na minha lavoura?', 'Previsão de safra 2026', 'Quanto vale meu café hoje?', 'Como funciona a blockchain do consórcio?', 'Compensa industrializar o cacau?', 'Situação do contrato em escrow'].forEach(function (s) {
      h += '<div class="sugestao" onclick="App2.perguntar(' + JSON.stringify(s).replace(/"/g, '&quot;') + ')">' + esc(s) + '</div>';
    });
    h += '</div>';
    h += '<div class="flex" style="margin-top:7px"><input id="pergunta" placeholder="Escreva sua pergunta sobre lavoura, preços, lotes ou contratos…" style="flex:1;background:var(--cinza-800);border:1px solid var(--cinza-600);border-radius:10px;padding:11px 13px" onkeydown="if(event.key===\'Enter\'){App2.enviar()}">' +
      '<button onclick="App2.enviar()">Perguntar</button></div>';
    h += '<div class="nota" style="margin-top:9px">As respostas usam exclusivamente os dados desta demonstração: cotações ancoradas em indicadores reais de 06/10/2026, seus lotes, seus talhões, o clima registrado e a situação real da cadeia. Nada é inventado — e quando o dado não existe, o assistente diz que não sabe.</div>';
    h += '</div>';
    return h;
  };

  App2.enviar = function () {
    var el = typeof document !== 'undefined' ? document.getElementById('pergunta') : null;
    if (!el || !el.value.trim()) return;
    App2.perguntar(el.value.trim());
  };

  App2.perguntar = function (texto) {
    A.chat.push({ quem: 'eu', texto: texto });
    var r = IA.conversar(texto, A.usuario);
    A.chat.push({ quem: 'ia', texto: r.resposta, fontes: r.fontes });
    A.render();
    var c = typeof document !== 'undefined' ? document.getElementById('chat') : null;
    if (c) c.scrollTop = c.scrollHeight;
  };

  /* =========================================================================
   * MÓDULO SOBRE / ARQUITETURA
   * ======================================================================= */
  App2.viewSobre = function () {
    var h = '<h1>Sobre o protótipo e a arquitetura</h1><div class="sub">O que este sistema é, o que ele prova e o que ainda falta para ir a campo</div>';

    h += '<div class="cartao"><h2>O problema que o AgroChain ataca</h2>';
    h += '<div class="grade g2">';
    [['Para o produtor de café e cacau de Rondônia', 'Vende matéria-prima sem saber se o preço é justo, sem conseguir provar a qualidade do próprio lote e sem acesso a canais que pagam prêmio por origem e rastreabilidade. O cacau do estado tem Indicação de Procedência — e ainda sai daqui, em boa parte, sem esse valor ser capturado.'],
     ['Para a indústria e o comprador', 'Não consegue verificar se o lote veio mesmo de onde dizem, se o laudo é real e se a prática socioambiental se sustenta — exigência que hoje chega com força pela regulação europeia (EUDR).'],
     ['O que a blockchain resolve', 'Origem verificável, histórico imutável e pagamento condicionado à conferência. O comprador não precisa confiar na palavra de ninguém.'],
     ['O que a IA resolve', 'Transforma dado em decisão: quanto vai colher, o que está atacando a lavoura, quando vender, qual o valor justo do lote e a que comprador ele serve melhor.']].forEach(function (x) {
      h += '<div class="caixa"><b style="font-size:13px">' + esc(x[0]) + '</b><div class="nota" style="margin-top:6px">' + esc(x[1]) + '</div></div>';
    });
    h += '</div></div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Fluxo completo, da lavoura ao comprador</h2>';
    h += '<div class="linha-tempo" style="margin-top:9px">';
    [['1 · Origem', 'O produtor registra a colheita no aplicativo (funciona offline, sincroniza depois). O evento é assinado com a chave dele e vai para a fila da blockchain.'],
     ['2 · Pós-colheita', 'Secagem, fermentação e classificação entram como eventos. É aqui que a IA avalia a qualidade e aponta o que melhorar.'],
     ['3 · Lote rastreável', 'O lote ganha hash único e QR Code impresso na saca. A IA recomenda o destino: venda, retenção ou transformação própria.'],
     ['4 · Negociação', 'A IA cruza o lote com as demandas abertas por indústria e cooperativa e mostra a aderência de cada uma.'],
     ['5 · Escrow', 'Fechado o negócio, a garantia fica retida no smart contract. Divergência de peso acima da tolerância trava o pagamento.'],
     ['6 · Certificação', 'Laudo e selo entram encadeados. O comprador final lê o QR e vê a história completa do que está comprando.']].forEach(function (x) {
      h += '<div class="ponto"><b style="font-size:13px">' + esc(x[0]) + '</b><div class="nota">' + esc(x[1]) + '</div></div>';
    });
    h += '</div></div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Arquitetura em três camadas</h2><div class="grade g3">';
    [['Camada de campo', 'Aplicativo do produtor com funcionamento offline (Service Worker + fila local), captura de foto para diagnóstico, balança e etiquetadora na cooperativa. É onde o dado nasce — se essa camada falhar, nada acima funciona.'],
     ['Camada de confiança', 'Rede blockchain permissionada de consórcio (Hyperledger Besu ou Polygon), um nó por instituição, contrato AgroChainRastreio.sol para lotes, certificações e escrow. Dados sensíveis ficam fora da cadeia; a cadeia guarda o hash e o ponteiro.'],
     ['Camada de inteligência', 'Modelos de previsão de safra e preço, diagnóstico fitossanitário, score de qualidade, recomendação de venda e assistente em linguagem natural — todos rodando sobre os dados da própria cadeia.']].forEach(function (x) {
      h += '<div class="caixa"><b style="font-size:13px">' + esc(x[0]) + '</b><div class="nota" style="margin-top:6px">' + esc(x[1]) + '</div></div>';
    });
    h += '</div></div>';

    h += '<div class="cartao alerta" style="margin-top:14px"><h2>O que este protótipo ainda NÃO é</h2><ul style="margin-left:18px;font-size:13px;line-height:1.8">' +
      '<li><b>Não é uma rede distribuída real.</b> A blockchain roda localmente, com a mesma estrutura criptográfica (SHA-256, Merkle, prova de trabalho, permissões), mas em um único nó. O consenso entre instituições independentes precisa de nós reais em produção.</li>' +
      '<li><b>Não tem visão computacional treinada.</b> O diagnóstico fitossanitário usa indicadores climáticos e limiares agronômicos publicados — aponta onde olhar, não substitui o agrônomo nem a foto analisada.</li>' +
      '<li><b>Os preços são ancorados em cotações reais, mas a série histórica é construída.</b> Não serve para decisão financeira real — em produção, a série vem de API de mercado.</li>' +
      '<li><b>Os modelos de IA são determinísticos e explicáveis</b>, não redes neurais treinadas. O pipeline de aprendizado de máquina está construído e validado (documento técnico, seção 7), e é o passo seguinte.</li>' +
      '<li><b>Dados de produtores são fictícios</b>, embora geografia, cultura e cenário de preço correspondam à realidade de Rondônia em 2026.</li>' +
      '</ul></div>';

    h += '<div class="cartao" style="margin-top:14px"><h2>Especificação técnica registrada</h2>';
    h += '<table class="tabela"><tr><th>Item</th><th>Definição no protótipo</th></tr>';
    [['Rede', D.meta.rede + ' · chainId ' + D.meta.chainId],
     ['Consórcio', D.meta.consorcio.join(' · ')],
     ['Consenso', 'Permissão por papel (produtor, cooperativa, indústria, certificadora, auditor) + prova de trabalho na formação do bloco'],
     ['Criptografia', 'SHA-256 para transações, blocos e árvore de Merkle; assinatura por par autor/timestamp/payload'],
     ['HTML/CSS/JS', 'Aplicação de arquivo único, sem nenhuma dependência externa e sem chamada de rede — inclusive o gerador de QR Code é próprio'],
     ['Dados de mercado', 'Café: indicador Cepea/Esalq de 06/10/2026 (arábica R$ 1.568,95 · conilon R$ 976,94 por saca de 60 kg). Cacau: referência regional pós-correção de 2026'],
     ['Base agronômica', 'Zonas de produção de conilon, arábica e cacaueiro de Rondônia; pragas e doenças relevantes (ferrugem, broca, cercosporiose, bicho-mineiro, vassoura-de-bruxa, monilíase, podridão-parda)']].forEach(function (x) {
      h += '<tr><td><b>' + esc(x[0]) + '</b></td><td class="nota">' + esc(x[1]) + '</td></tr>';
    });
    h += '</table></div>';
    return h;
  };

  A.aba = function (a) { A.abaIA = a; A.render(); };

  global.App2 = App2;
})(typeof window !== 'undefined' ? window : globalThis);
