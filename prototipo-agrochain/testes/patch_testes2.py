#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_testes2 — estende a bateria de testes com o ERP, a biblioteca de
gráficos, a interface do ERP e o modo imersivo.
"""
import io, sys

ARQ = 'testes/teste_app.js'
s = io.open(ARQ, encoding='utf-8').read()

def sub(a, b, n=1):
    global s
    c = s.count(a)
    if c != n:
        sys.exit('FALHA: âncora %d vez(es) (esperado %d):\n%s' % (c, n, a[:200]))
    s = s.replace(a, b, n)

# 1) módulos carregados
sub("['30_crypto', '10_dados', '20_ia', '40_qr', '45_iot', '50_ledger', '60_app', '70_app2', '80_iot_ui'].forEach(function (m) {",
    "['30_crypto', '10_dados', '15_graficos', '20_ia', '40_qr', '45_iot', '50_ledger', '55_erp',\n '60_app', '70_app2', '80_iot_ui', '85_erp_ui', '88_imersivo'].forEach(function (m) {")

# 2) atalhos
sub("var App = global.App, App2 = global.App2, App3 = global.App3, D = global.DB, IA = global.IA, Ledger = global.Ledger, IoT = global.IoT;",
    "var App = global.App, App2 = global.App2, App3 = global.App3, App4 = global.App4, D = global.DB, IA = global.IA, Ledger = global.Ledger, IoT = global.IoT;\nvar Erp = global.Erp, Graf = global.Graf, Imersivo = global.Imersivo;")

# 3) DOM simulado com atributos (o modo imersivo usa setAttribute/className)
sub("""  return {
    id: id, innerHTML: '', value: '', textContent: '', scrollTop: 0, scrollHeight: 100,
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };""",
    """  return {
    id: id, innerHTML: '', value: '', textContent: '', scrollTop: 0, scrollHeight: 100, className: '', attrs: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    removeAttribute: function (k) { delete this.attrs[k]; },
    appendChild: function () {}, focus: function () {}, remove: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };""")

# 4) o ERP entra na varredura de telas
sub("var TELAS = ['painel', 'lavoura', 'lotes', 'ia', 'iot', 'blockchain', 'mercado', 'certificacao', 'auditoria', 'assistente', 'sobre'];",
    "var TELAS = ['painel', 'lavoura', 'lotes', 'erp', 'ia', 'iot', 'blockchain', 'mercado', 'certificacao', 'auditoria', 'assistente', 'sobre'];")

# 5) novas seções antes do relatório
REL = "/* ---------- 8. relatório ---------- */"

NOVAS = r"""/* ======================================================================
 * 9. ERP — o que fecha, o que não fecha e de onde vem cada número
 * ==================================================================== */
function semLixo(html, onde) {
  var ruim = (html.match(/>(undefined|NaN|\[object Object\])</g) || []).join(',');
  if (ruim) throw new Error('conteúdo inválido na tela ' + onde + ': ' + ruim);
  if (html.indexOf('R$ NaN') >= 0 || html.indexOf('undefined</') >= 0) throw new Error('valor indefinido na tela ' + onde);
}

teste('ERP: escopo por perfil (produtor vê a própria propriedade; consórcio consolida)', function () {
  App.usuario = 'U-01'; Erp.reiniciar();
  var propio = Erp.escopoAtual();
  if (propio.tipo !== 'PROPRIO' || propio.produtores.join(',') !== 'U-01') throw new Error('escopo do produtor errado: ' + JSON.stringify(propio.produtores));
  if (!propio.podeEditar) throw new Error('produtor deveria poder lançar no próprio ERP');
  App.usuario = 'U-03';
  var cons = Erp.escopoAtual();
  if (cons.tipo !== 'CONSORCIO') throw new Error('cooperativa deveria ver o consórcio consolidado');
  if (cons.produtores.indexOf('U-01') < 0 || cons.produtores.indexOf('U-02') < 0) throw new Error('escopo do consórcio não trouxe as duas propriedades');
  if (cons.podeEditar) throw new Error('cooperativa não deveria editar a contabilidade do produtor');
  App.usuario = 'U-01'; Erp.reiniciar();
});

teste('ERP: a DRE fecha (receita líquida, margem bruta, resultado e margens)', function () {
  var d = Erp.dre({});
  var liq = d.receitaBruta - d.tributos;
  if (Math.abs(liq - d.receitaLiquida) > 0.05) throw new Error('receita líquida não bate com bruta menos tributos');
  if (Math.abs((d.receitaLiquida - d.custoProducao) - d.margemBruta) > 0.05) throw new Error('margem bruta inconsistente');
  var res = d.receitaLiquida - d.custoProducao - d.despesas - d.depreciacao;
  if (Math.abs(res - d.resultado) > 0.05) throw new Error('resultado não bate com a identidade da DRE: ' + res + ' vs ' + d.resultado);
  if (Math.abs(d.margemLiquidaPct - d.resultado / d.receitaLiquida * 100) > 0.15) throw new Error('margem líquida inconsistente');
  if (d.meses.length !== 12) throw new Error('série mensal deveria ter 12 meses, tem ' + d.meses.length);
  var somaMeses = d.meses.reduce(function (a, m) { return a + m.resultado; }, 0);
  if (Math.abs(somaMeses - d.resultado) > 1) throw new Error('a soma dos meses não fecha com o período: ' + somaMeses + ' vs ' + d.resultado);
  var cascata = d.cascata[d.cascata.length - 1];
  if (!cascata || cascata.tipo !== 'total' || Math.abs(cascata.valor - d.resultado) > 0.05) throw new Error('cascata da DRE não termina no resultado');
});

teste('ERP: fluxo de caixa fecha mês a mês e o saldo final é o do indicador', function () {
  var fc = Erp.fluxoCaixa({});
  var saldo = fc.saldoInicial;
  fc.meses.forEach(function (m) {
    saldo += m.entradas - m.saidas;
    if (Math.abs(saldo - m.saldo) > 0.05) throw new Error('saldo encadeado errado em ' + m.mes);
  });
  if (Math.abs(saldo - fc.saldoFinal) > 0.05) throw new Error('saldo final do fluxo não bate');
  var ind = Erp.indicadores();
  if (Math.abs(ind.saldoCaixa - fc.saldoFinal) > 0.05) throw new Error('caixa do indicador diferente do fluxo de caixa');
});

teste('ERP: estoque (insumos e produto) nunca fica negativo e o valor soma certo', function () {
  var es = Erp.estoqueAtual({});
  if (!es.itens.length) throw new Error('nenhum item de estoque');
  var soma = 0;
  es.itens.forEach(function (i) {
    if (i.saldo < 0) throw new Error('saldo negativo em ' + i.nome + ': ' + i.saldo);
    if (i.custoMedio < 0) throw new Error('custo médio negativo em ' + i.nome);
    soma += i.saldo * i.custoMedio;
  });
  if (Math.abs(soma - es.valorTotal) > 0.5) throw new Error('valor do estoque não bate com a soma dos itens: ' + soma + ' vs ' + es.valorTotal);
  if (Math.abs(es.valorInsumo + es.valorProduto - es.valorTotal) > 1) throw new Error('insumos + produto não fecham o estoque total');
  if (!es.abaixoMinimo.length) throw new Error('o cenário deveria ter itens abaixo do mínimo (é o que gera alerta)');
});

teste('ERP: contas a receber e a pagar — situação coerente com as datas', function () {
  var ts = Erp.titulos({});
  if (ts.length < 30) throw new Error('poucos títulos gerados: ' + ts.length);
  var receber = ts.filter(function (t) { return t.tipo === 'RECEBER'; }).length;
  var pagar = ts.filter(function (t) { return t.tipo === 'PAGAR'; }).length;
  if (!receber || !pagar) throw new Error('o cenário precisa ter os dois lados');
  var hoje = new Date().toISOString().slice(0, 10);
  ts.forEach(function (t) {
    if (t.status === 'VENCIDO' && t.vencimento >= hoje) throw new Error('título ' + t.id + ' marcado como vencido sem estar vencido');
    if (!t.valor || t.valor <= 0) throw new Error('título ' + t.id + ' sem valor');
    if (!t.contraparte) throw new Error('título ' + t.id + ' sem contraparte');
  });
  var ind = Erp.indicadores();
  var abertoReceber = ts.filter(function (t) { return t.tipo === 'RECEBER' && t.status === 'ABERTO'; }).reduce(function (a, t) { return a + t.valor; }, 0);
  if (abertoReceber < ind.aReceber - 1) throw new Error('a receber do indicador maior que a soma dos títulos em aberto');
});

teste('ERP: o custo por saca/arroba usa a produtividade PREVISTA PELA IA', function () {
  var c = Erp.custosConsolidados();
  if (c.talhoes.length !== 4) throw new Error('esperados 4 talhões no escopo do produtor, vieram ' + c.talhoes.length);
  c.talhoes.forEach(function (t) {
    var prev = IA.preverSafra(t.talhao);
    if (!prev || !prev.previsto) throw new Error('a IA não prevê a safra de ' + t.talhao);
    var fator = t.produto === 'cacau' ? 15 : 1;                       // cacau entra em arrobas de 15 kg
    var previstoNoTalhao = prev.previsto * t.area / fator;
    if (Math.abs(previstoNoTalhao - t.unidadesPrevistas) > Math.max(1, previstoNoTalhao * 0.02)) {
      throw new Error('produtividade prevista da IA não está alimentando o custo de ' + t.talhao + ': ' + previstoNoTalhao + ' vs ' + t.unidadesPrevistas);
    }
    if (Math.abs(t.custoSacaProjetado - t.custoTotal / t.unidadesPrevistas) / t.custoSacaProjetado > 0.01) {
      throw new Error('custo por unidade de ' + t.talhao + ' não é custo ÷ produção prevista');
    }
    if (t.custoSacaProjetado !== null && t.precoMercado && t.margemPct !== null) {
      var margem = (t.precoMercado - t.custoSacaProjetado) / t.precoMercado * 100;
      if (Math.abs(margem - t.margemPct) > 0.2) throw new Error('margem de ' + t.talhao + ' inconsistente: ' + margem + ' vs ' + t.margemPct);
    }
  });
  if (Math.abs(c.custoPorHa - c.custoTotal / c.area) > 0.5) throw new Error('custo por hectare não bate');
});

teste('ERP: rateio administrativo entra no custo do talhão (custo direto + rateio)', function () {
  var c = Erp.custosConsolidados();
  var comRateio = 0;
  c.talhoes.forEach(function (t) {
    if (t.rateio < 0) throw new Error('rateio negativo em ' + t.talhao);
    if (Math.abs(t.custoTotal - (t.custoDireto + t.rateio)) > 0.05) throw new Error('custo total de ' + t.talhao + ' não é direto + rateio');
    if (t.rateio > 0) comRateio++;
    var somaContas = t.porConta.reduce(function (a, x) { return a + x.valor; }, 0);
    if (Math.abs(somaContas - t.custoDireto) > 1) throw new Error('contas do talhão ' + t.talhao + ' não fecham com o custo direto');
  });
  if (!comRateio) throw new Error('nenhum talhão recebeu rateio da estrutura');
});

teste('ERP: fechamento de safra do talhão explica o resultado', function () {
  var f = Erp.fechamentoSafra('T-01');
  if (!f) throw new Error('sem fechamento de safra para T-01');
  if (Math.abs(f.resultado - (f.receita - f.custoTotal)) > 0.05) throw new Error('resultado do fechamento não bate');
  if (!f.comparativoIA) throw new Error('o fechamento deveria comparar previsto × realizado');
  if (f.comparativoIA.previsto !== f.unidadesPrevistas) throw new Error('o comparativo da IA não usa a previsão do custo');
  if (!f.porMes.length) throw new Error('o fechamento deveria trazer a produção mês a mês');
});

teste('ERP: alertas cobrem estoque, financeiro, custo, orçamento e pessoas', function () {
  var al = Erp.alertas();
  if (al.total < 5) throw new Error('poucos alertas para um cenário com vencidos e margem negativa: ' + al.total);
  if (al.criticos < 1) throw new Error('nenhum alerta crítico');
  al.itens.forEach(function (a) {
    if (!a.acao || !a.titulo || !a.area) throw new Error('alerta sem ação, título ou área: ' + JSON.stringify(a).slice(0, 120));
    if (a.valor !== undefined && a.valor !== null && typeof a.valor !== 'number') throw new Error('valor do alerta não é número');
  });
  if (al.resumo.indexOf(String(al.total)) < 0) throw new Error('resumo não cita o total de alertas');
  var areas = al.itens.map(function (a) { return a.area; }).join(' ');
  if (areas.indexOf('Estoque') < 0 || areas.indexOf('Financeiro') < 0) throw new Error('alertas não cobrem estoque e financeiro');
});

teste('ERP: orçado × realizado soma os grupos e classifica a situação', function () {
  var o = Erp.orcadoRealizado(2026);
  if (o.progressoAnoPct < 60 || o.progressoAnoPct > 95) throw new Error('progresso do ano implausível: ' + o.progressoAnoPct);
  if (o.linhas.length < 3) throw new Error('poucos grupos orçamentários');
  o.linhas.forEach(function (l) {
    if (l.planejado <= 0) throw new Error('grupo ' + l.grupo + ' sem orçado');
    if (!l.situacao) throw new Error('grupo ' + l.grupo + ' sem situação');
    if (l.atingimentoPct < 0) throw new Error('atingimento negativo em ' + l.grupo);
  });
  var receita = o.linhas.filter(function (l) { return l.ehReceita; })[0];
  if (!receita) throw new Error('sem linha de receita no orçamento');
  if (receita.situacao === 'abaixo do ritmo' && receita.atingimentoPct >= o.progressoAnoPct) throw new Error('receita classificada como abaixo do ritmo estando no ritmo');
});

teste('ERP: folha de pagamento, conformidade trabalhista e diaristas', function () {
  var f = Erp.folha();
  if (f.competencias.length !== 12) throw new Error('folha deveria fechar 12 competências, tem ' + f.competencias.length);
  if (f.competencias.some(function (c) { return !c.itens.length; })) throw new Error('competência sem itens de folha');
  if (f.encargos <= 0 || f.encargos > 1) throw new Error('alíquota de encargos implausível: ' + f.encargos);
  if (!f.ultima || !f.ultima.status) throw new Error('última competência sem status');
  if (!f.fixos.length || !f.diaristas.length) throw new Error('o cenário deveria ter equipe fixa e diaristas');
  f.fixos.concat(f.diaristas).forEach(function (p) {
    if (!p.nome || !p.funcao || !p.nr31) throw new Error('pessoa sem nome, função ou data de NR-31');
  });
  var somaMeses = f.competencias.reduce(function (a, c) { return a + c.bruto + c.encargos; }, 0);
  if (Math.abs(somaMeses - f.custo12meses * (1 + f.encargos)) / Math.max(1, f.custo12meses) > 0.15) throw new Error('custo da folha não bate com as competências');
});

teste('ERP: custo por hora do maquinário é a soma da composição', function () {
  var maq = Erp.maquinas();
  if (maq.length < 5) throw new Error('poucos ativos cadastrados: ' + maq.length);
  maq.forEach(function (m) {
    var soma = m.composicao.reduce(function (a, c) { return a + c.valor; }, 0);
    if (Math.abs(soma - m.custoHora) > 0.05) throw new Error('composição de ' + m.ativo + ' não fecha com o custo/hora');
    if (m.custoHora <= 0) throw new Error('custo/hora zerado em ' + m.ativo);
    if (m.horasAno <= 0) throw new Error('horas/ano zeradas em ' + m.ativo);
  });
  var detalhe = Erp.custoHoraMaquina(maq[0].ativo);
  if (Math.abs(detalhe.custoHora - maq[0].custoHora) > 0.001) throw new Error('detalhe do ativo diferente da lista');
});

teste('ERP: patrimônio, dívida e endividamento coerentes', function () {
  var ind = Erp.indicadores();
  if (ind.patrimonio <= 0) throw new Error('patrimônio zerado');
  var pat = Erp.patrimonioFiltrado();
  var soma = pat.reduce(function (a, p) { return a + p.valor; }, 0);
  if (Math.abs(soma - ind.patrimonio) > 1) throw new Error('patrimônio do indicador não é a soma dos ativos: ' + soma + ' vs ' + ind.patrimonio);
  if (ind.endividamento > 100) throw new Error('endividamento acima de 100% do patrimônio num cenário de custeio: ' + ind.endividamento);
  if (ind.depreciacaoAnual <= 0) throw new Error('sem depreciação anual');
});

teste('ERP: projeção de caixa encadeia as janelas e considera o custeio', function () {
  var p = Erp.projecaoCaixa(90);
  if (p.janelas.length !== 3) throw new Error('90 dias deveriam dar 3 janelas, deram ' + p.janelas.length);
  var anteriores = p.saldoPartida;
  p.janelas.forEach(function (j) {
    if (j.ate <= j.de.slice(0, 10) && j.ate === j.de) throw new Error('janela com intervalo nulo');
    if (Math.abs(j.resultado - (j.aReceber - j.aPagar - j.custeio)) > 0.05) throw new Error('resultado da janela ' + j.rotulo + ' não bate');
    anteriores = anteriores + j.resultado;
    if (Math.abs(anteriores - j.saldo) > 0.05) throw new Error('saldo projetado de ' + j.rotulo + ' não encadeia');
  });
  if (p.custeioMensal <= 0) throw new Error('custeio mensal zerado');
  if (p.mesesDeFolego === null || p.mesesDeFolego <= 0) throw new Error('fôlego de caixa não calculado');
  if (!p.disponivel.length) throw new Error('nenhum lote disponível para venda projetado');
});

teste('ERP: fechamento contábil — um hash por conta e raiz de Merkle determinística', function () {
  var p1 = Erp.prepararFechamento('2026-09', 'U-01');
  var p2 = Erp.prepararFechamento('2026-09', 'U-01');
  if (p1.linhas.length !== p1.hashes.length) throw new Error('número de hashes diferente do número de contas');
  if (p1.raizMerkle !== p2.raizMerkle) throw new Error('a raiz de Merkle mudou entre duas preparações iguais');
  if (p1.hashes.some(function (h) { return !/^[0-9a-f]{64}$/.test(h); })) throw new Error('hash de conta fora do formato SHA-256');
  var resultado = p1.linhas[p1.linhas.length - 1];
  if (resultado.codigo !== 'RESULTADO' || Math.abs(resultado.valor - p1.resumo.resultado) > 0.05) throw new Error('a última linha do fechamento deveria ser o resultado');
  var d = Erp.dre({ mes: '2026-09' });
  if (Math.abs(d.resultado - p1.resumo.resultado) > 0.05) throw new Error('resultado do fechamento diferente da DRE do mês');
});

teste('ERP: ancoragem do fechamento na cadeia e prova de inclusão', function () {
  Ledger.iniciar();
  var r = Erp.ancorarFechamento('2026-09', 'U-01');
  if (r.recusado) throw new Error('a cadeia recusou o fechamento: ' + r.motivo);
  if (!r.bloco || !r.registro) throw new Error('fechamento sem bloco minerado');
  if (r.registro.bloco !== r.bloco.indice) throw new Error('registro aponta para bloco diferente do minerado');
  var ancorado = Erp.erp().ancoragens[0];
  if (!ancorado || ancorado.raizMerkle !== r.registro.raizMerkle) throw new Error('ancoragem não foi guardada no ERP');
  var prova = Erp.provarFechamento(ancorado.id);
  if (!prova) throw new Error('prova de inclusão não gerada');
  if (!prova.confere) throw new Error('a raiz recalculada não confere com a ancorada');
  if (prova.raizCalculada !== prova.raizAncorada) throw new Error('raízes divergentes na prova');
  if (prova.niveis < 2) throw new Error('caminho de prova curto demais: ' + prova.niveis);
  if (prova.caminho.some(function (c) { return !c.irmao || !c.posicao; })) throw new Error('caminho de prova incompleto');
  if (!Ledger.verificar().integro) throw new Error('a cadeia ficou inconsistente após ancorar o fechamento');
});

teste('ERP × cadeia: escrow vira conta a receber no vendedor e a pagar no comprador', function () {
  App.usuario = 'U-03'; Erp.reiniciar();
  var rv = Erp.sincronizarEscrow();
  Erp.sincronizarEscrow();                                   // segunda chamada não pode duplicar
  var recebiveis = Erp.titulos({ tipo: 'RECEBER', status: 'ABERTO' }).filter(function (t) { return t.origem === 'ESCROW'; });
  if (recebiveis.length !== 1) throw new Error('esperado 1 recebível de escrow para a cooperativa, há ' + recebiveis.length);
  if (recebiveis[0].produtor !== 'U-03') throw new Error('recebível no escopo errado: ' + recebiveis[0].produtor);
  App.usuario = 'U-04'; Erp.reiniciar();
  var rc = Erp.sincronizarEscrow();
  var obrigacoes = Erp.titulos({ tipo: 'PAGAR' }).filter(function (t) { return t.origem === 'ESCROW'; });
  if (obrigacoes.length !== 1) throw new Error('a indústria deveria ter 1 obrigação de escrow, tem ' + obrigacoes.length);
  if (obrigacoes[0].produtor !== 'U-04') throw new Error('a obrigação precisa ficar no escopo de quem compra, não de quem vende');
  if (obrigacoes[0].valor <= 0) throw new Error('obrigação sem valor');
  if (!obrigacoes[0].composicao.length) throw new Error('obrigação sem a composição das etapas do contrato');
  App.usuario = 'U-01'; Erp.reiniciar();
});

teste('ERP: compra de insumo dá entrada no estoque, recalcula o custo médio e gera título', function () {
  Ledger.iniciar();
  var item = Erp.estoqueAtual({}).itens.filter(function (i) { return i.categoria === 'INSUMO'; })[0];
  var antes = { saldo: item.saldo, medio: item.custoMedio };
  var r = Erp.registrarCompra(item.id, 10, 12.5, 'Agro Insumos Cacoal', 30, 'U-01');
  if (!r) throw new Error('compra não registrada');
  if (Math.abs(r.item.saldo - (antes.saldo + 10)) > 0.001) throw new Error('entrada não somou ao saldo');
  var esperadoMedio = (antes.saldo * antes.medio + 10 * 12.5) / (antes.saldo + 10);
  if (Math.abs(r.custoMedioNovo - esperadoMedio) > 0.02) throw new Error('custo médio ponderado errado: ' + r.custoMedioNovo + ' vs ' + esperadoMedio);
  if (r.titulo.tipo !== 'PAGAR') throw new Error('compra a prazo deveria gerar conta a pagar');
  if (r.movimento.tipo !== 'ENTRADA') throw new Error('movimentação de entrada errada');
  if (r.transacao.status !== 'PENDENTE') throw new Error('evento de compra não foi para a fila da cadeia');
  if (r.transacao.tipo !== 'COMPRA_INSUMO') throw new Error('tipo de evento errado: ' + r.transacao.tipo);
});

teste('ERP: aplicação de insumo baixa o estoque, entra no custo do talhão e traz a evidência do sensor', function () {
  var item = Erp.estoqueAtual({}).itens.filter(function (i) { return i.categoria === 'INSUMO' && i.saldo >= 0.5; })[0];
  var antes = Erp.custoPorTalhao('T-01').custoDireto;
  var saldoAntes = item.saldo;
  var r = Erp.consumirInsumo(item.id, 0.5, 'T-01', 'U-01');
  if (!r || r.erro) throw new Error('aplicação falhou: ' + (r && r.erro));
  if (Math.abs(r.item.saldo - (saldoAntes - 0.5)) > 0.001) throw new Error('baixa de estoque não ocorreu');
  if (r.movimento.tipo !== 'SAIDA' || r.movimento.talhao !== 'T-01') throw new Error('movimentação de aplicação errada');
  var depois = Erp.custoPorTalhao('T-01').custoDireto;
  if (Math.abs((depois - antes) - r.movimento.valor) > 0.05) throw new Error('o custo do talhão não recebeu exatamente o valor aplicado');
  if (!r.evidencia || !r.evidencia.aplicacoes.length) throw new Error('a aplicação deveria vir com a evidência de campo');
  if (!r.evidencia.aplicacoes[0].conclusao) throw new Error('evidência sem conclusão: o produtor precisa saber o que o sensor diz');
  if (r.transacao.tipo !== 'APLICACAO_INSUMO') throw new Error('evento de aplicação com tipo errado');
});

teste('ERP: venda de lote gera receita, baixa o estoque e cria conta a receber', function () {
  var lote = Erp.estoquePorLote({})[0];
  var receitaAntes = Erp.dre({}).receitaLiquida;
  var r = Erp.registrarVenda(lote.lote, 1, lote.precoIA, 'Corretora Cacoal', 30, 'U-01');
  if (!r || r.erro) throw new Error('venda falhou: ' + (r && r.erro));
  if (r.titulo.tipo !== 'RECEBER') throw new Error('venda deveria gerar conta a receber');
  if (Math.abs(r.titulo.valor - lote.precoIA) > 0.05) throw new Error('valor do título diferente do preço ajustado pela qualidade');
  if (r.transacao.tipo !== 'VENDA') throw new Error('evento de venda com tipo errado');
  var receitaDepois = Erp.dre({}).receitaLiquida;
  if (receitaDepois <= receitaAntes) throw new Error('a venda não entrou na receita');
  var restante = Erp.estoquePorLote({}).filter(function (l) { return l.lote === lote.lote; })[0];
  if (restante && Math.abs(restante.saldo - (lote.saldo - 1)) > 0.01) throw new Error('o estoque do lote não baixou');
});

teste('ERP: venda acima do estoque é recusada com explicação', function () {
  var lote = Erp.estoquePorLote({})[0];
  var r = Erp.registrarVenda(lote.lote, lote.saldo + 5000, 100, 'Comprador', 30, 'U-01');
  if (!r || !r.erro) throw new Error('venda sem estoque deveria ser recusada');
  if (String(r.erro).indexOf('insuficiente') < 0) throw new Error('mensagem de recusa pouco clara: ' + r.erro);
});

teste('ERP: liquidação de título atualiza situação, caixa e o indicador de vencidos', function () {
  var vencido = Erp.titulos({}).filter(function (t) { return t.status === 'VENCIDO'; })[0];
  if (!vencido) throw new Error('o cenário deveria ter um título vencido');
  var t = Erp.liquidarTitulo(vencido.id);
  if (!t) throw new Error('título não liquidado');
  if (t.status === 'VENCIDO' || t.status === 'ABERTO') throw new Error('situação não mudou após a liquidação: ' + t.status);
  if (!t.liquidadoEm) throw new Error('título liquidado sem data de liquidação');
  var aindaVencido = Erp.titulos({}).filter(function (x) { return x.id === vencido.id && x.status === 'VENCIDO'; }).length;
  if (aindaVencido) throw new Error('o título continua marcado como vencido');
});

teste('ERP: permissões da cadeia cobrem as operações do ERP e a cadeia segue íntegra', function () {
  ['COMPRA_INSUMO', 'APLICACAO_INSUMO', 'VENDA', 'FECHAMENTO_CONTABIL'].forEach(function (tipo) {
    if (!Ledger.podeRegistrar('U-01', tipo)) throw new Error('produtor deveria poder registrar ' + tipo);
    if (Ledger.podeRegistrar('U-07', tipo)) throw new Error('auditor não deveria registrar ' + tipo);
  });
  var v = Ledger.verificar();
  if (!v.integro) throw new Error('cadeia inconsistente após as operações do ERP: ' + JSON.stringify(v.problemas || []));
  var est = Ledger.estatisticas();
  if (est.transacoes < 20) throw new Error('poucas transações registradas: ' + est.transacoes);
  var txsErp = Ledger.blocos().reduce(function (a, b) {
    return a + b.transacoes.filter(function (t) { return ['COMPRA_INSUMO', 'APLICACAO_INSUMO', 'VENDA', 'FECHAMENTO_CONTABIL'].indexOf(t.tipo) >= 0; }).length;
  }, 0);
  if (txsErp < 3) throw new Error('as operações do ERP não chegaram à blockchain (' + txsErp + ' eventos)');
});

/* ======================================================================
 * 10. BIBLIOTECA DE GRÁFICOS
 * ==================================================================== */
function pareceSVG(html, nome) {
  if (typeof html !== 'string' || html.indexOf('<svg') < 0) throw new Error(nome + ' não gerou SVG');
  if (html.indexOf('NaN') >= 0 || html.indexOf('undefined') >= 0) throw new Error(nome + ' gerou valor inválido no desenho');
  return html;
}

teste('Graf: barras agrupadas, empilhadas e horizontais', function () {
  var cats = ['jan', 'fev', 'mar', 'abr'];
  var s = [{ nome: 'A', dados: [10, 20, 30, 40] }, { nome: 'B', dados: [5, 15, 25, 35] }];
  var g = pareceSVG(Graf.barras(cats, s, { altura: 200 }), 'barras agrupadas');
  if (g.indexOf('<rect') < 0) throw new Error('barras sem retângulos');
  if (g.indexOf('data-tip') < 0) throw new Error('barras sem tooltip (data-tip)');
  if (g.indexOf('A') < 0 || g.indexOf('B') < 0) throw new Error('barras sem legenda de séries');
  var emp = pareceSVG(Graf.barras(cats, s, { empilhado: true }), 'barras empilhadas');
  if (emp.indexOf('data-tip') < 0) throw new Error('barras empilhadas sem tooltip');
  pareceSVG(Graf.barras(cats, s, { horizontal: true }), 'barras horizontais');
  if (Graf.barras([], [], {}).indexOf('Sem dados') < 0) throw new Error('barras sem dados deveriam avisar');
});

teste('Graf: linha, área e faixas de referência', function () {
  var serie = [{ nome: 'Preço', dados: [10, 12, 9, 14, 16, 13, 18], cor: Graf.CORES.verde }];
  var l = pareceSVG(Graf.linha(serie, { altura: 180, formato: function (v) { return v + ' kg'; } }), 'linha');
  if (l.indexOf('<path') < 0) throw new Error('linha sem traço');
  var a = pareceSVG(Graf.area(serie, { altura: 180, baseZero: true }), 'área');
  if (a.indexOf('<path') < 0) throw new Error('área sem preenchimento');
  var comFaixa = pareceSVG(Graf.linha(serie, { faixas: [{ de: 0, ate: 11, nome: 'risco', cor: 'rgba(192,57,43,.12)' }] }), 'linha com faixa');
  if (comFaixa.indexOf('risco') < 0) throw new Error('faixa de referência não apareceu');
  if (Graf.linha([], {}).indexOf('Sem dados') < 0) throw new Error('linha sem dados deveria avisar');
});

teste('Graf: cascata, rosca, medidor, heatmap, sparkline e anel', function () {
  var cas = pareceSVG(Graf.cascata([
    { nome: 'Receita', valor: 500, tipo: 'entrada' }, { nome: 'Custo', valor: 300, tipo: 'saida' },
    { nome: 'Despesa', valor: 80, tipo: 'saida' }, { nome: 'Resultado', valor: 120, tipo: 'total' }
  ], { altura: 220 }), 'cascata');
  if (cas.indexOf('120') < 0) throw new Error('cascata não mostra o total');
  var ros = pareceSVG(Graf.rosca([{ nome: 'Custo', valor: 300 }, { nome: 'Despesa', valor: 80 }], { tamanho: 180, centro: 'R$ 380' }), 'rosca');
  if (ros.indexOf('R$ 380') < 0) throw new Error('rosca sem valor central');
  var med = pareceSVG(Graf.medidor(37, { rotulo: 'endividamento', rodape: '37%' }), 'medidor');
  if (med.indexOf('37') < 0) throw new Error('medidor não mostra o valor');
  var heat = pareceSVG(Graf.heatmap(['T-01', 'T-02'], ['jan', 'fev', 'mar'], [[1, 2, 3], [4, 5, 6]], {}), 'heatmap');
  if (heat.indexOf('data-tip') < 0) throw new Error('heatmap sem tooltip');
  var spa = pareceSVG(Graf.sparkline([1, 3, 2, 5, 4, 7], { largura: 200, altura: 40 }), 'sparkline');
  if (spa.indexOf('<svg') !== 0 && spa.indexOf('<svg') < 0) throw new Error('sparkline inválida');
  var an = Graf.anel(72, 'margem');
  if (an.indexOf('anel') < 0 || an.indexOf('72') < 0) throw new Error('anel não desenhou o percentual');
  if (Graf.rosca([], {}).indexOf('Sem dados') < 0) throw new Error('rosca sem dados deveria avisar');
  if (Graf.vazio('nada aqui').indexOf('Sem dados') < 0) throw new Error('estado vazio sem mensagem');
});

teste('Graf: nenhum gráfico das telas do ERP emite NaN ou undefined', function () {
  App.usuario = 'U-01'; Erp.reiniciar();
  var d = Erp.dre({});
  var meses = d.meses.map(function (m) { return m.mes.slice(5); });
  var graficos = [
    Graf.area([{ nome: 'resultado', dados: d.meses.map(function (m) { return m.resultado; }) }], { baseZero: true }),
    Graf.barras(meses, [{ nome: 'receita', dados: d.meses.map(function (m) { return m.receita; }) }], {}),
    Graf.cascata(d.cascata, {}),
    Graf.rosca(d.contas.custos.map(function (c) { return { nome: c.nome, valor: c.valor }; }), {}),
    Graf.heatmap(Erp.custosConsolidados().talhoes.map(function (t) { return t.talhao; }), meses,
      Erp.custosConsolidados().talhoes.map(function (t) { return d.meses.map(function (m) { return (m.receita + m.custo) * (t.area / 100); }); }), {}),
    Graf.medidor(Erp.indicadores().endividamento, { rotulo: 'dívida/patrimônio' }),
    Graf.sparkline(D.precos.cafe_conilon.map(function (p) { return p.preco; }), {})
  ];
  graficos.forEach(function (g, i) {
    if (typeof g !== 'string' || g.indexOf('NaN') >= 0) throw new Error('gráfico ' + i + ' com problema');
    if (g.indexOf('undefined') >= 0) throw new Error('gráfico ' + i + ' com undefined');
  });
});

/* ======================================================================
 * 11. INTERFACE DO ERP E MODO IMERSIVO
 * ==================================================================== */
var ABAS_ERP = ['visao', 'financeiro', 'custos', 'estoque', 'operacoes', 'fechamento'];
D.usuarios.forEach(function (u) {
  ABAS_ERP.forEach(function (a) {
    teste('ERP: aba ' + a + ' renderiza para o perfil ' + u.papel + ' (' + u.id + ')', function () {
      App.usuario = u.id; Erp.reiniciar();
      App.view = 'erp'; App4.aba = a; App4.aviso = null;
      var html = App.render();
      if (!html || html.length < 400) throw new Error('HTML curto (' + (html ? html.length : 0) + ')');
      semLixo(html, 'ERP/' + a + '/' + u.id);
    });
  });
});

teste('ERP: todas as abas desenham gráficos', function () {
  App.usuario = 'U-01'; App.view = 'erp';
  var comGrafico = 0;
  ABAS_ERP.forEach(function (a) {
    App4.aba = a;
    var html = App4.viewErp();
    if (html.indexOf('<svg') >= 0) comGrafico++;
  });
  if (comGrafico < 5) throw new Error('só ' + comGrafico + ' de 6 abas desenharam gráfico');
});

teste('ERP: navegação entre abas e filtros por chip', function () {
  App.usuario = 'U-01'; App.render(); App.irPara('erp', 'financeiro');
  if (App.view !== 'erp' || App4.aba !== 'financeiro') throw new Error('App.irPara não levou para a aba do ERP');
  App4.filtrarTitulo('VENCIDO');
  var html = App4.viewErp();
  if (App4.filtroTitulo !== 'VENCIDO') throw new Error('filtro de títulos não aplicado');
  App4.filtrarTitulo('todos');
  App4.ir('custos');
  if (App4.aba !== 'custos') throw new Error('App4.ir não trocou de aba');
  App4.verTalhao('T-02');
  if (App4.talhao !== 'T-02' || App4.aba !== 'custos') throw new Error('seleção de talhão não abriu a aba de custos');
  App4.verTalhao(null);
  App4.ir('visao');
  semLixo(App.render(), 'ERP após navegação');
});

teste('ERP: ações da interface funcionam com o formulário preenchido', function () {
  App.usuario = 'U-01'; Erp.reiniciar(); App.view = 'erp'; App4.aba = 'estoque';
  var insumo = Erp.estoqueAtual({}).itens.filter(function (i) { return i.categoria === 'INSUMO'; })[0];
  elementos['cm-item'] = criarEl('cm-item'); elementos['cm-item'].value = insumo.id;
  elementos['cm-qtd'] = criarEl('cm-qtd'); elementos['cm-qtd'].value = '5';
  elementos['cm-preco'] = criarEl('cm-preco'); elementos['cm-preco'].value = '14,90';
  elementos['cm-forn'] = criarEl('cm-forn'); elementos['cm-forn'].value = 'Casa do Produtor Cacoal';
  elementos['cm-prazo'] = criarEl('cm-prazo'); elementos['cm-prazo'].value = '30';
  var saldoAntes = insumo.saldo;
  App4.registrarCompra();
  var item = Erp.estoqueAtual({}).itens.filter(function (i) { return i.id === insumo.id; })[0];
  if (Math.abs(item.saldo - (saldoAntes + 5)) > 0.001) throw new Error('a compra pela interface não entrou no estoque');

  App4.prepararAplicacao(item.id);
  elementos['ap-qtd'] = criarEl('ap-qtd'); elementos['ap-qtd'].value = '1';
  elementos['ap-talhao'] = criarEl('ap-talhao'); elementos['ap-talhao'].value = 'T-01';
  App4.aplicarInsumo();
  if (App4.aplicacao.item !== null) throw new Error('a aplicação deveria limpar a seleção do insumo');

  var lote = Erp.estoquePorLote({})[0];
  App4.prepararVenda(lote.lote);
  if (App4.venda.preco !== lote.precoIA.toFixed(2)) throw new Error('a venda deveria vir com o preço sugerido pela IA');
  elementos['vd-qtd'] = criarEl('vd-qtd'); elementos['vd-qtd'].value = '1';
  elementos['vd-preco'] = criarEl('vd-preco'); elementos['vd-preco'].value = String(lote.precoIA);
  elementos['vd-comprador'] = criarEl('vd-comprador'); elementos['vd-comprador'].value = 'Cooperativa';
  elementos['vd-prazo'] = criarEl('vd-prazo'); elementos['vd-prazo'].value = '30';
  App4.registrarVenda();
  if (App4.venda.lote !== null) throw new Error('a venda deveria limpar o lote selecionado');

  var tituloAberto = Erp.titulos({ status: 'ABERTO' }).filter(function (t) { return t.tipo === 'RECEBER'; })[0];
  App4.liquidar(tituloAberto.id);
  if (Erp.titulos({}).filter(function (t) { return t.id === tituloAberto.id; })[0].status === 'ABERTO') throw new Error('a liquidação pela interface não mudou a situação');
});

teste('ERP: fechamento pela interface prepara, ancora e prova a inclusão', function () {
  App.usuario = 'U-01'; App.view = 'erp'; App4.aba = 'fechamento';
  Ledger.iniciar();
  elementos['fc-mes'] = criarEl('fc-mes'); elementos['fc-mes'].value = '2026-09';
  App4.prepararFechamento();
  if (!App4.preparo || App4.mes !== '2026-09') throw new Error('preparação do fechamento pela interface falhou');
  App4.ancorar();
  if (!App4.ancoragem || !App4.ancoragem.transacao) throw new Error('ancoragem pela interface falhou: ' + JSON.stringify(App4.ancoragem && App4.ancoragem.motivo || ''));
  App4.conferir(App4.ancoragem.registro.id);
  if (!App4.prova || !App4.prova.confere) throw new Error('a prova de inclusão pela interface não conferiu');
  var html = App4.viewErp();
  if (html.indexOf('Prova de inclusão') < 0) throw new Error('a tela não mostrou a prova');
  semLixo(html, 'fechamento do ERP');
  App4.limpar();
  if (App4.preparo || App4.prova) throw new Error('App4.limpar não zerou o fechamento');
});

teste('Imersivo: abre em tela cheia, monta o painel e fecha com a tecla Esc', function () {
  App.usuario = 'U-01'; App.render();
  Imersivo.abrir();
  var el = elementos['imersivo'];
  if (!Imersivo.aberto) throw new Error('modo imersivo não abriu');
  if (el.className.indexOf('off') >= 0) throw new Error('a camada imersiva continua escondida');
  if (el.getAttribute('aria-hidden') !== 'false') throw new Error('acessibilidade: aria-hidden não foi atualizado');
  var html = el.innerHTML;
  if (html.length < 5000) throw new Error('painel imersivo curto demais: ' + html.length);
  ['Resultado do período', 'Caixa hoje', 'No campo, agora', 'Cotações e mercado', 'Estado da cadeia'].forEach(function (t) {
    if (html.indexOf(t) < 0) throw new Error('bloco ausente no painel imersivo: ' + t);
  });
  semLixo(html, 'painel imersivo');
  if (html.indexOf('id="im-relogio"') < 0) throw new Error('relógio do painel ausente');
  if (html.indexOf('kpi-hero') < 0) throw new Error('painel sem os KPIs em corpo grande');
  Imersivo.tick();
  Imersivo.contador = 4; Imersivo.tick();
  if (elementos['im-live'].innerHTML.indexOf('No campo, agora') < 0) throw new Error('o bloco ao vivo não foi recomposto no ciclo de 5 s');
  semLixo(elementos['im-live'].innerHTML, 'bloco ao vivo');
  Imersivo.fechar();
  if (Imersivo.aberto || el.className.indexOf('off') < 0) throw new Error('o painel imersivo não fechou');
});

teste('Imersivo: painel de todos os perfis e do consórcio sem valores inválidos', function () {
  D.usuarios.forEach(function (u) {
    App.usuario = u.id; Erp.reiniciar(); App.render();
    var html = Imersivo.html();
    if (html.indexOf('<svg') < 0) throw new Error('painel do perfil ' + u.id + ' sem gráficos');
    semLixo(html, 'imersivo/' + u.id);
  });
  App.usuario = 'U-01'; Erp.reiniciar(); App.render();
});

teste('Imersivo: fechar ao trocar de perfil e ao reiniciar a demonstração', function () {
  App.usuario = 'U-01'; App.render();
  Imersivo.abrir();
  App.trocarUsuario('U-02');
  if (Imersivo.aberto) throw new Error('o painel imersivo deveria fechar ao trocar de perfil');
  Imersivo.abrir();
  App.reiniciar();
  if (Imersivo.aberto) throw new Error('o painel imersivo deveria fechar ao reiniciar a demonstração');
  if (App.usuario !== 'U-01' || App.view !== 'painel') throw new Error('reiniciar não voltou ao estado inicial');
  if (App4.aba !== 'visao' || App4.preparo) throw new Error('reiniciar não zerou o estado do ERP');
  var v = Ledger.verificar();
  if (!v.integro) throw new Error('a cadeia ficou inconsistente depois de reiniciar');
});

teste('Painel geral e menu trazem o ERP e o atalho do modo imersivo', function () {
  App.usuario = 'U-01'; App.view = 'painel';
  var html = App.render();
  if (html.indexOf("App.irPara('erp')") < 0) throw new Error('menu sem o item do ERP');
  if (html.indexOf('ERP agro') < 0) throw new Error('menu sem o rótulo do ERP');
  if (html.indexOf('Imersivo.abrir()') < 0) throw new Error('topo sem o botão do modo imersivo');
});

"""

sub(REL, NOVAS + REL)

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('teste_app.js -> %d bytes' % len(s.encode('utf-8')))
print('patch_testes2 aplicado')
