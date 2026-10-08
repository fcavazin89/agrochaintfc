/* Banco de ensaio do ERP — roda os módulos em Node e imprime os números
   para conferência de consistência (não faz parte do app). */
global.window = global;
['10_dados', '15_graficos', '20_ia', '30_crypto', '40_qr', '45_iot', '50_ledger', '55_erp'].forEach(function (m) {
  require('/home/user/prototipo-agrochain/src/' + m + '.js');
});
var D = global.DB, E = global.Erp, IA = global.IA;

function brl(v) { return 'R$ ' + (Math.round(v * 100) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }); }
function num(v) { return (Math.round(v * 100) / 100).toLocaleString('pt-BR'); }

E.iniciar();
console.log('=== BASE ===');
console.log('lançamentos', E.erp().lancamentos.length, '| títulos', E.erp().titulos.length, '| movimentos', E.erp().movimentos.length, '| produção', E.erp().producao.length, '| folha', E.erp().folha.length);

['U-01', 'U-02'].forEach(function (u) {
  global.App = { usuario: u };
  console.log('\n########## ' + u + ' — ' + E.nomeUsuario(u) + ' ##########');
  var d = E.dre({});
  console.log('DRE ' + d.periodo);
  console.log('  receita bruta', brl(d.receitaBruta), '| tributos', brl(d.tributos), '| líq', brl(d.receitaLiquida));
  console.log('  custo produção', brl(d.custoProducao), '| margem bruta', brl(d.margemBruta), '(' + d.margemBrutaPct + '%)');
  console.log('  despesas', brl(d.despesas), '| depreciação', brl(d.depreciacao), '| financeiras', brl(d.financeiras));
  console.log('  RESULTADO', brl(d.resultado), '(' + d.margemLiquidaPct + '% margem líquida)');
  var i = E.indicadores();
  console.log('Indicadores: caixa', brl(i.saldoCaixa), '| a receber', brl(i.aReceber), '| a pagar', brl(i.aPagar), '| vencidos', i.vencidos, brl(i.vencidosValor));
  console.log('  estoque', brl(i.estoque), '(produto', brl(i.estoqueProduto), '+ insumo', brl(i.estoqueInsumo) + ') | abaixo do mínimo:', i.estoqueAbaixoMinimo);
  console.log('  custo/ha', brl(i.custoPorHa), '| patrimônio', brl(i.patrimonio), '| depreciação anual', brl(i.depreciacaoAnual), '| endividamento', i.endividamento + '%');
  console.log('  PE: fixo 12m', brl(i.pontoEquilibrio.custoFixo12m), '| receita necessária', brl(i.pontoEquilibrio.receitaNecessaria), '| cobertura', i.pontoEquilibrio.coberturaPct + '%');
  var fc = E.fluxoCaixa({});
  console.log('Fluxo de caixa: inicial', brl(fc.saldoInicial), '| final', brl(fc.saldoFinal));
  fc.serie.forEach(function (m) {
    console.log('   ', m.mes, 'entradas', brl(m.entradas).padStart(16), 'saídas', brl(m.saidas).padStart(16), 'saldo', brl(m.saldo).padStart(16), m.parcial ? '(parcial)' : '');
  });
  var p = E.projecaoCaixa(90);
  console.log('Projeção 90d: partida', brl(p.saldoPartida), '| custeio/mês', brl(p.custeioMensal), '| menor saldo', brl(p.menorSaldo), '| fôlego', p.mesesDeFolego, 'meses');
  console.log('  estoque disponível', brl(p.estoqueLiquido));
  p.disponivel.forEach(function (x) { console.log('   ', x.item, num(x.quantidade), x.unidade, 'custo', brl(x.custoUnit), 'venda', brl(x.precoUnit), '→', brl(x.liquido), 'lote', x.loteRef); });
  if (p.alerta) console.log('  ALERTA:', p.alerta);
  console.log('Custos por talhão:');
  E.custosConsolidados().talhoes.forEach(function (t) {
    console.log('   ', t.talhao, t.nome.slice(0, 22).padEnd(22), t.produtoRotulo.padEnd(13), t.area + 'ha',
      'direto', brl(t.custoDireto).padStart(14), 'rateio', brl(t.rateio).padStart(13),
      'custo/' + t.unidadeNome.slice(0, 6) + ' projetado', brl(t.custoSacaProjetado).padStart(11),
      'realizado', (t.custoUnitarioRealizado ? brl(t.custoUnitarioRealizado) : '—').padStart(11),
      'mercado', brl(t.precoMercado).padStart(11), 'premium', (t.precoPremium ? brl(t.precoPremium) : '—').padStart(11),
      'margem', t.margemPct + '%', 'premium', t.margemPremiumPct + '%', 'safra', t.progressoSafraPct + '%');
  });
  var al = E.alertas();
  console.log('Alertas:', al.resumo);
  al.itens.forEach(function (a) { console.log('   ', '[' + a.severidade + ']', a.area, '—', a.titulo); });
});

console.log('\n########## MÉTODOS DE INTEGRAÇÃO ##########');
global.App = { usuario: 'U-01' };
var ev = E.evidenciaSensor('T-03');
console.log('Evidência de sensor T-03:', ev ? (ev.aplicacoes.length + ' aplicações, irrigação ' + (ev.irrigacao ? 'sim' : 'não')) : 'null');
if (ev) ev.aplicacoes.slice(0, 2).forEach(function (a) { console.log('   ', a.data, a.leitura, '|', a.conclusao); });
var fs = E.fechamentoSafra('T-01');
console.log('Fechamento T-01:', JSON.stringify({ custo: fs.custoTotal, un: fs.unidades, prev: fs.unidadesPrevistas, prod: fs.produtividadeRealizada, prodPrev: fs.produtividadePrevista, custoUn: fs.custoUnitario, res: fs.resultado, margem: fs.margemPct }));
var orc = E.orcadoRealizado(2026);
console.log('Orçado x realizado (' + orc.progressoAnoPct + '% do ano):');
orc.linhas.forEach(function (l) { console.log('   ', l.nome.padEnd(38), 'planejado', brl(l.planejado).padStart(14), 'realizado', brl(l.realizado).padStart(14), l.atingimentoPct + '%', '—', l.situacao); });
var f = E.folha();
console.log('Folha: 12 meses', brl(f.custo12meses), '| média/mês', brl(f.custoMensalMedio), '| última competência', f.ultima.competencia, 'bruto', brl(f.ultima.bruto), 'encargos', brl(f.ultima.encargos));
console.log('Máquinas (custo/hora):');
E.maquinas().slice(0, 5).forEach(function (m) { console.log('   ', m.ativo, m.nome.padEnd(34), brl(m.custoHora) + '/h', '| ano', brl(m.custoAnoEstimado), '| idade', m.idadeAnos + ' anos'); });
var esc = E.sincronizarEscrow();
console.log('Escrow sincronizado (U-01):', esc.criados.length, 'criados,', esc.liquidados.length, 'liquidados');
global.App = { usuario: 'U-03' };
E.erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.contrato === 'CT-2026-0041'; }).forEach(function (t) { console.log('   ', t.id, t.contrato, t.contraparte, brl(t.valor), t.status, '|', t.banco); });

console.log('\n########## CONSÓRCIO (cooperativa) ##########');
var dc = E.dre({});
console.log('receita', brl(dc.receitaLiquida), '| resultado', brl(dc.resultado), '(' + dc.margemLiquidaPct + '%)');
var ic = E.indicadores();
console.log('caixa', brl(ic.saldoCaixa), '| estoque', brl(ic.estoque), '| patrimônio', brl(ic.patrimonio), '| custo/ha', brl(ic.custoPorHa));

console.log('\n########## ESCRITA / BLOCKCHAIN ##########');
global.App = { usuario: 'U-01' };
var compra = E.registrarCompra('U-01-INS-01', 1.5, 2850, 'Agro Insumos Cacoal', 30, 'U-01');
console.log('Compra:', compra.movimento.id, brl(compra.movimento.valor), 'novo custo médio', brl(compra.custoMedioNovo), '| tx', compra.transacao.status, compra.transacao.id);
var cons = E.consumirInsumo('U-01-INS-01', 0.4, 'T-01', 'U-01');
console.log('Aplicação:', cons.movimento.id, brl(cons.movimento.valor), '| tx', cons.transacao.status, '| evidência', cons.evidencia && cons.evidencia.aplicacoes[0] ? cons.evidencia.aplicacoes[0].conclusao.slice(0, 60) : '—');
var venda = E.registrarVenda('L-2026-0142', 10, 989.15, 'COOPRON — Coop. Agropecuária de Rondônia', 30, 'U-01');
console.log('Venda:', venda.titulo.id, brl(venda.titulo.valor), '| tx', venda.transacao.status, venda.transacao.id, '| bloco pendente', global.Ledger.estado ? '' : '');
var fech = E.ancorarFechamento('2026-09', 'U-01');
console.log('Fechamento:', fech.registro ? fech.registro.id : 'não ancorado', fech.registro ? 'bloco #' + fech.registro.bloco : (fech.motivo || ''), fech.transacao.status);
if (fech.registro) {
  var prova = E.provarFechamento(fech.registro.id);
  console.log('Prova de inclusão:', prova.confere ? 'OK' : 'DIVERGENTE', '| níveis', prova.niveis, '| raiz', prova.raizAncorada.slice(0, 20) + '…');
}
var v = global.Ledger.verificar();
console.log('Cadeia íntegra:', v.valida, '| blocos', v.blocos, '| transações', v.transacoes);
