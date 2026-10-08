/* =========================================================================
 * SMOKE DO ARTEFATO — executa o próprio AgroChain.html
 * Em vez de carregar os módulos de src/, este teste extrai os blocos de
 * <script> do arquivo construído e roda tudo em um DOM simulado. Serve para
 * provar que o que o usuário abre no navegador é o que os testes exercitaram:
 * build quebrado (placeholder não substituído, módulo fora de ordem, classe
 * ausente) passa por checagem de sintaxe e só aparece aqui.
 * ========================================================================= */
'use strict';

var fs = require('fs');
var caminho = '/home/user/prototipo-agrochain/AgroChain.html';
var html = fs.readFileSync(caminho, 'utf8');

/* ---------- DOM simulado ---------- */
var elementos = {};
function criarEl(id) {
  return {
    id: id, innerHTML: '', value: '', textContent: '', className: '', attrs: {}, style: {},
    scrollTop: 0, scrollHeight: 100,
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    removeAttribute: function (k) { delete this.attrs[k]; },
    appendChild: function () {}, removeChild: function () {}, remove: function () {}, focus: function () {},
    addEventListener: function () {}, classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };
}
global.document = {
  readyState: 'complete',
  getElementById: function (id) { return elementos[id] || (elementos[id] = criarEl(id)); },
  querySelector: function (sel) { return sel === '.conteudo' ? { scrollTo: function () {} } : (elementos[sel] || null); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  createElement: function (tag) { return criarEl('<' + tag + '>'); },
  body: criarEl('body')
};
global.localStorage = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
global.location = { reload: function () {} };

/* ---------- executa os blocos do arquivo construído ---------- */
var blocos = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
if (blocos.length < 3) throw new Error('esperados 3 blocos de script no arquivo construído, encontrados ' + blocos.length);
blocos.forEach(function (b, i) {
  var codigo = b.replace(/^<script>/, '').replace(/<\/script>$/, '');
  try {
    new Function(codigo)();          // o arquivo roda em escopo global, como no navegador
  } catch (e) {
    throw new Error('falha ao executar o bloco de script ' + i + ' do arquivo construído: ' + (e && e.message));
  }
});

var App = global.App, App4 = global.App4, Imersivo = global.Imersivo, Erp = global.Erp, Graf = global.Graf, Ledger = global.Ledger;
var globais = { App: App, App2: global.App2, App3: global.App3, App4: App4, Imersivo: Imersivo, Erp: Erp, Graf: Graf, Ledger: Ledger, IoT: global.IoT, IA: global.IA, DB: global.DB, Dados: global.Dados, Cripto: global.Cripto, Ico: global.Ico };
var faltando = Object.keys(globais).filter(function (k) { return !globais[k]; });
if (faltando.length) throw new Error('módulos ausentes no arquivo construído: ' + faltando.join(', '));

if (html.indexOf('{{MODULOS}}') >= 0 || html.indexOf('{{APP}}') >= 0) throw new Error('o build deixou placeholder {{...}} no arquivo');

/* ---------- renderiza tudo ---------- */
var falhas = [], verificacoes = 0;
function tela(rot, fn) {
  verificacoes++;
  try { fn(); } catch (e) { falhas.push(rot + ': ' + (e && e.message ? e.message : e)); }
}

tela('iniciar', function () { if (!App.iniciar()) throw new Error('App.iniciar não retornou verdadeiro'); });

var TELAS = ['painel', 'lavoura', 'lotes', 'erp', 'ia', 'iot', 'blockchain', 'mercado', 'certificacao', 'auditoria', 'assistente', 'sobre'];
var ABAS_ERP = ['visao', 'financeiro', 'custos', 'estoque', 'operacoes', 'fechamento'];
var ABAS_IA = ['safra', 'preco', 'sanidade', 'qualidade', 'destino', 'modelos'];

global.DB.usuarios.forEach(function (u) {
  TELAS.forEach(function (view) {
    tela(view + '/' + u.id, function () {
      App.usuario = u.id; Erp.reiniciar();
      App.view = view;
      var h = App.render();
      if (!h || h.length < 400) throw new Error('HTML curto (' + (h ? h.length : 0) + ')');
      if (/>(undefined|NaN|\[object Object\])</.test(h)) throw new Error('valor inválido visível na tela');
    });
  });
});

tela('abas do ERP', function () {
  App.usuario = 'U-01'; App.view = 'erp';
  ABAS_ERP.forEach(function (a) {
    App4.aba = a;
    var h = App4.viewErp();
    if (!h || h.length < 300) throw new Error('aba ' + a + ' vazia');
    if (/>(undefined|NaN)</.test(h)) throw new Error('aba ' + a + ' com valor inválido');
  });
});

tela('abas de IA', function () {
  App.usuario = 'U-01'; App.view = 'ia';
  ABAS_IA.forEach(function (a) { App.abaIA = a; if (App.render().indexOf('NaN') >= 0) throw new Error('NaN na aba ' + a); });
});

tela('modo imersivo', function () {
  App.view = 'painel'; App.render();
  Imersivo.abrir();
  if (!Imersivo.aberto) throw new Error('não abriu');
  var h = elementos['imersivo'].innerHTML;
  if (h.indexOf('<svg') < 0 || h.indexOf('Estado da cadeia') < 0) throw new Error('painel imersivo incompleto');
  if (/>(undefined|NaN)</.test(h)) throw new Error('valor inválido no painel imersivo');
  Imersivo.contador = 4; Imersivo.tick();
  Imersivo.fechar();
  if (Imersivo.aberto) throw new Error('não fechou');
});

tela('ações do ERP no artefato', function () {
  App.usuario = 'U-01'; Erp.reiniciar(); Ledger.iniciar();
  var item = Erp.estoqueAtual({}).itens.filter(function (i) { return i.categoria === 'INSUMO'; })[0];
  if (!Erp.registrarCompra(item.id, 2, 15, 'Fornecedor', 30, 'U-01')) throw new Error('compra falhou');
  if (!Erp.consumirInsumo(item.id, 0.2, 'T-01', 'U-01')) throw new Error('aplicação falhou');
  var lote = Erp.estoquePorLote({})[0];
  if (!Erp.registrarVenda(lote.lote, 1, lote.precoIA, 'Comprador', 30, 'U-01')) throw new Error('venda falhou');
  var r = Erp.ancorarFechamento('2026-09', 'U-01');
  if (r.recusado || !r.bloco) throw new Error('fechamento não ancorou');
  if (!Erp.provarFechamento(r.registro.id).confere) throw new Error('prova de inclusão divergente');
  if (!Ledger.verificar().valida) throw new Error('cadeia inválida depois das operações');
});

console.log('SMOKE DO ARTEFATO — ' + caminho);
var modulos = (html.match(/\/\* ===== /g) || []).length;
console.log('Tamanho: ' + (html.length / 1024).toFixed(0) + ' KB · blocos de script: ' + blocos.length + ' · módulos embutidos: ' + modulos);
console.log('Verificações: ' + (verificacoes - falhas.length) + '/' + verificacoes);
if (falhas.length) {
  falhas.forEach(function (f) { console.log('  ✗ ' + f); });
  process.exit(1);
}
console.log('✅ O arquivo construído executa, renderiza todas as telas e opera o ERP.');
