/* Sonda: valores estáveis do ERP para as asserções dos testes. */
'use strict';
var elementos = {};
function criarEl(id) {
  return { id: id, innerHTML: '', value: '', textContent: '', className: '', attrs: {},
    setAttribute: function (k, v) { this.attrs[k] = v; }, getAttribute: function (k) { return this.attrs[k] || null; },
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } } };
}
global.document = {
  readyState: 'complete',
  getElementById: function (id) { return elementos[id] || (elementos[id] = criarEl(id)); },
  querySelector: function (s) { return s === '.conteudo' ? { scrollTo: function () {} } : null; },
  querySelectorAll: function () { return []; }, addEventListener: function () {}
};
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
['30_crypto', '10_dados', '12_icones', '15_graficos', '20_ia', '40_qr', '45_iot', '50_ledger', '55_erp', '60_app', '70_app2', '80_iot_ui', '85_erp_ui', '88_imersivo']
  .forEach(function (m) { require('/home/user/prototipo-agrochain/src/' + m + '.js'); });
var App = global.App, E = global.Erp, App4 = global.App4, Imersivo = global.Imersivo, IoT = global.IoT, Graf = global.Graf;
['T-01','T-02','T-03','T-04','T-05','T-06'].forEach(function (t) {
  var m = IoT.molhamentoFoliar(t, 7);
  console.log('   molhamento ' + t + ':', JSON.stringify({ favoraveis: m.horasFavoraveis, molhadas: m.horasMolhadas, maxCont: m.maxHorasContinuas, limiar: m.limiar }));
});
console.log('== folha()', JSON.stringify(Object.keys(E.folha())));
console.log('== maquinas()', JSON.stringify(E.maquinas()[0]));
console.log('== custoHoraMaquina(AT-01)', JSON.stringify(E.custoHoraMaquina('AT-01').custoHora));
console.log('== patrimonioFiltrado()', JSON.stringify(E.patrimonioFiltrado()[0] || null).slice(0,300));

App.iniciar();
App.usuario = 'U-01';

function j(x) { return JSON.stringify(x); }
console.log('== escopo', j({ tipo: E.escopoAtual().tipo, prod: E.escopoAtual().produtores }));
var ind = E.indicadores();
console.log('== indicadores', j({ resultado: ind.resultado, receita: ind.receita, caixa: ind.saldoCaixa, estoque: ind.estoque, aReceber: ind.aReceber, aPagar: ind.aPagar, pe: ind.pontoEquilibrio.coberturaPct, endiv: ind.endividamento }));
var d = E.dre({});
console.log('== dre', j({ recBruta: d.receitaBruta, trib: d.tributos, recLiq: d.receitaLiquida, custo: d.custoProducao, desp: d.despesas, depre: d.depreciacao, res: d.resultado, meses: d.meses.length, cascata: d.cascata.length }));
var c = E.custosConsolidados();
console.log('== custos', j({ n: c.talhoes.length, custoPorHa: c.custoPorHa, criticos: c.criticos }));
c.talhoes.forEach(function (t) { console.log('   ', t.talhao, t.custoSacaProjetado, t.margemPct, t.precoMercado, t.precoPremium, t.unidadesPrevistas, t.progressoSafraPct); });
var es = E.estoqueAtual({});
console.log('== estoque', j({ itens: es.itens.length, valorTotal: es.valorTotal, negativo: es.itens.filter(function (i) { return i.saldo < 0; }).length, abaixo: es.abaixoMinimo }));
var ts = E.titulos({});
console.log('== titulos', j({ n: ts.length, receber: ts.filter(function (t) { return t.tipo === 'RECEBER'; }).length, pagar: ts.filter(function (t) { return t.tipo === 'PAGAR'; }).length, vencidos: ts.filter(function (t) { return t.status === 'VENCIDO'; }).length }));
var fc = E.fluxoCaixa({});
console.log('== caixa', j({ ini: fc.saldoInicial, fim: fc.saldoFinal, meses: fc.meses.length }));
var or = E.orcadoRealizado(2026);
console.log('== orcado', j({ prog: or.progressoAnoPct, linhas: or.linhas.map(function (l) { return l.grupo + ':' + l.atingimentoPct + ':' + l.situacao; }) }));
console.log('== folha', j({ n: E.folha().pessoas ? E.folha().pessoas.length : null, total: E.folha().totalAno || E.folha().total12m }));
console.log('== maquinas', E.maquinas().length, E.maquinas().map(function (m) { return m.id + ':' + m.custoHora; }).join(' '));
var al = E.alertas();
console.log('== alertas', al.total, al.criticos, j(al.resumo));

/* previsão da IA que alimenta o custo por saca */
var prev = global.IA.preverSafra('T-01');
console.log('== preverSafra T-01', j({ previsto: prev.previsto, confianca: prev.confianca }));
console.log('== custoPorTalhao T-01', j((function () { var x = E.custoPorTalhao('T-01'); return { un: x.unidadesRealizadas, prev: x.unidadesPrevistas, custoTotal: x.custoTotal, projetado: x.custoSacaProjetado, prodPrev: x.produtividadePrevista }; })()));

/* fechamento */
var prep = E.prepararFechamento('2026-09', 'U-01');
console.log('== preparo', j({ linhas: prep.linhas.length, raiz: prep.raizMerkle.slice(0, 12), res: prep.resumo.resultado, hash: prep.hashes.length }));

/* evidência de sensor de todos os talhões */
['T-01', 'T-02', 'T-03', 'T-04', 'T-05', 'T-06'].forEach(function (t) {
  var ev = E.evidenciaSensor(t);
  var ap = ev.aplicacoes.map(function (a) { return (a.justificada === null ? 'sem medição' : a.justificada ? 'justificada' : 'sem evidência'); }).join(' / ');
  console.log('   evid ' + t + ':', ev.aplicacoes.length, 'aplicações —', ap, '| lotes', ev.lotes.length, ev.lotes.map(function (l) { return l.lote + ' fer=' + l.indiceFermentacao + ' nota=' + l.nota; }).join(', '));
});

/* imersivo */
App.view = 'erp';
var html = App.render();
console.log('== render erp', html.length, html.indexOf('undefined') >= 0 ? 'TEM undefined' : 'ok');
['visao', 'financeiro', 'custos', 'estoque', 'operacoes', 'fechamento'].forEach(function (a) {
  App4.aba = a;
  var h = App4.viewErp();
  var bad = (h.match(/>(undefined|NaN)</g) || []).join(',');
  console.log('   aba', a, h.length, bad || 'limpo', h.indexOf('Sem dados') >= 0 ? '(tem vazio)' : '');
});

Imersivo.abrir();
console.log('== imersivo aberto', elementos['imersivo'] ? elementos['imersivo'].innerHTML.length : 'sem el', Imersivo.aberto);
Imersivo.contador = 0; Imersivo.tick();
console.log('== tick ok, contador', Imersivo.contador);
Imersivo.fechar();
console.log('== imersivo fechado', Imersivo.aberto, elementos['imersivo'].className);

/* escrow: comprador x vendedor */
App.usuario = 'U-03';
var e1 = E.sincronizarEscrow();
console.log('== escrow U-03 (vendedor)', j(e1.criados.map(function (t) { return t.id + '/' + t.tipo + '/' + t.produtor; })));
App.usuario = 'U-04';
var e2 = E.sincronizarEscrow();
console.log('== escrow U-04 (comprador)', j(e2.criados.map(function (t) { return t.id + '/' + t.tipo + '/' + t.produtor; })));
console.log('== U-04 titulos', j(E.titulos({}).map(function (t) { return t.id + '/' + t.tipo + '/' + t.produtor; })));
App.usuario = 'U-01';
