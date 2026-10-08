#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_testes3 — corrige asserções que estavam erradas no arnês (não no app):

1. Ledger.verificar() devolve {valida, ...} e não {integro} — usava-se o campo
   errado em três checagens, que então "falhavam" com a cadeia íntegra.
2. estoque.abaixoMinimo é um NÚMERO, não uma lista.
3. Conta a receber em aberto inclui os títulos VENCIDOS (continuam a receber).
4. A folha dos 12 meses já inclui os encargos.
5. As janelas da projeção de caixa trazem rótulo e data final, não uma data
   inicial.
6. registrarCompra/consumirInsumo devolvem movimento, título e transação — o
   saldo atualizado se lê do estoque.
7. Escopo do teste de escrow: a bateria cria contratos adicionais, então a
   verificação passou a ser por contrato (nenhum lado duplicado).
8. O DOM simulado ganhou createElement, usado pelo sistema de avisos.
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

# 8) DOM: createElement e um #toasts de verdade
sub("""  querySelectorAll: function () { return []; },
  addEventListener: function () {}
};""",
    """  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  createElement: function (tag) { return criarEl('<' + tag + '>'); },
  body: criarEl('body')
};""")

# 1) campo de verificação da cadeia
sub("  if (!Ledger.verificar().integro) throw new Error('a cadeia ficou inconsistente após ancorar o fechamento');",
    "  if (!Ledger.verificar().valida) throw new Error('a cadeia ficou inconsistente após ancorar o fechamento');")
sub("""  var v = Ledger.verificar();
  if (!v.integro) throw new Error('cadeia inconsistente após as operações do ERP: ' + JSON.stringify(v.problemas || []));""",
    """  var v = Ledger.verificar();
  if (!v.valida) throw new Error('cadeia inconsistente após as operações do ERP: ' + JSON.stringify((v.problemas || []).slice(0, 2)));""")
sub("""  var v = Ledger.verificar();
  if (!v.integro) throw new Error('a cadeia ficou inconsistente depois de reiniciar');""",
    """  var v = Ledger.verificar();
  if (!v.valida) throw new Error('a cadeia ficou inconsistente depois de reiniciar');""")

# 2) abaixo do mínimo é contagem
sub("  if (!es.abaixoMinimo.length) throw new Error('o cenário deveria ter itens abaixo do mínimo (é o que gera alerta)');",
    "  if (!(es.abaixoMinimo > 0)) throw new Error('o cenário deveria ter itens abaixo do mínimo (é o que gera alerta)');")

# 3) a receber inclui vencidos
sub("""  var abertoReceber = ts.filter(function (t) { return t.tipo === 'RECEBER' && t.status === 'ABERTO'; }).reduce(function (a, t) { return a + t.valor; }, 0);
  if (abertoReceber < ind.aReceber - 1) throw new Error('a receber do indicador maior que a soma dos títulos em aberto');""",
    """  var abertoReceber = ts.filter(function (t) { return t.tipo === 'RECEBER' && t.status !== 'RECEBIDO'; }).reduce(function (a, t) { return a + t.valor; }, 0);
  if (Math.abs(abertoReceber - ind.aReceber) > 1) throw new Error('a receber do indicador (' + ind.aReceber + ') não bate com os títulos não recebidos (' + abertoReceber + ')');
  var abertoPagar = ts.filter(function (t) { return t.tipo === 'PAGAR' && t.status !== 'PAGO'; }).reduce(function (a, t) { return a + t.valor; }, 0);
  if (Math.abs(abertoPagar - ind.aPagar) > 1) throw new Error('a pagar do indicador não bate com os títulos não pagos');""")

# 4) folha: o custo dos 12 meses já inclui encargos
sub("""  var somaMeses = f.competencias.reduce(function (a, c) { return a + c.bruto + c.encargos; }, 0);
  if (Math.abs(somaMeses - f.custo12meses * (1 + f.encargos)) / Math.max(1, f.custo12meses) > 0.15) throw new Error('custo da folha não bate com as competências');""",
    """  var somaMeses = f.competencias.reduce(function (a, c) { return a + c.bruto + c.encargos; }, 0);
  if (Math.abs(somaMeses - f.custo12meses) > 1) throw new Error('custo da folha não bate com a soma das competências: ' + somaMeses + ' vs ' + f.custo12meses);
  if (Math.abs(f.custoMensalMedio - f.custo12meses / 12) > 1) throw new Error('média mensal da folha inconsistente');""")

# 5) janelas da projeção não têm data inicial
sub("""    if (j.ate <= j.de.slice(0, 10) && j.ate === j.de) throw new Error('janela com intervalo nulo');
    if (Math.abs(j.resultado - (j.aReceber - j.aPagar - j.custeio)) > 0.05) throw new Error('resultado da janela ' + j.rotulo + ' não bate');""",
    """    if (!j.rotulo || !j.ate) throw new Error('janela sem rótulo ou data limite');
    if (Math.abs(j.resultado - (j.aReceber - j.aPagar - j.custeio)) > 0.05) throw new Error('resultado da janela ' + j.rotulo + ' não bate');""")

# 6) compra: o saldo se lê do estoque, não do retorno
sub("""  var r = Erp.registrarCompra(item.id, 10, 12.5, 'Agro Insumos Cacoal', 30, 'U-01');
  if (!r) throw new Error('compra não registrada');
  if (Math.abs(r.item.saldo - (antes.saldo + 10)) > 0.001) throw new Error('entrada não somou ao saldo');""",
    """  var r = Erp.registrarCompra(item.id, 10, 12.5, 'Agro Insumos Cacoal', 30, 'U-01');
  if (!r) throw new Error('compra não registrada');
  var depois = Erp.estoqueAtual({}).itens.filter(function (i) { return i.id === item.id; })[0];
  if (Math.abs(depois.saldo - (antes.saldo + 10)) > 0.001) throw new Error('entrada não somou ao saldo');""")

# 6b) aplicação: idem
sub("""  var r = Erp.consumirInsumo(item.id, 0.5, 'T-01', 'U-01');
  if (!r || r.erro) throw new Error('aplicação falhou: ' + (r && r.erro));
  if (Math.abs(r.item.saldo - (saldoAntes - 0.5)) > 0.001) throw new Error('baixa de estoque não ocorreu');""",
    """  var r = Erp.consumirInsumo(item.id, 0.5, 'T-01', 'U-01');
  if (!r || r.erro) throw new Error('aplicação falhou: ' + (r && r.erro));
  var saldoDepois = Erp.estoqueAtual({}).itens.filter(function (i) { return i.id === item.id; })[0].saldo;
  if (Math.abs(saldoDepois - (saldoAntes - 0.5)) > 0.001) throw new Error('baixa de estoque não ocorreu');""")

# 7) escrow: verificação por contrato, tolerante aos contratos criados pelos testes anteriores
sub("""teste('ERP × cadeia: escrow vira conta a receber no vendedor e a pagar no comprador', function () {
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
});""",
    """teste('ERP × cadeia: escrow vira conta a receber no vendedor e a pagar no comprador', function () {
  App.usuario = 'U-03'; Erp.reiniciar();
  Erp.sincronizarEscrow();
  Erp.sincronizarEscrow();                                   // segunda chamada não pode duplicar
  var recebiveis = Erp.titulos({ tipo: 'RECEBER' }).filter(function (t) { return t.origem === 'ESCROW'; });
  if (!recebiveis.length) throw new Error('a cooperativa não recebeu nenhum recebível de escrow');
  var porContrato = {};
  recebiveis.forEach(function (t) {
    if (t.produtor !== 'U-03') throw new Error('recebível de escrow fora do escopo do vendedor: ' + t.produtor);
    if (porContrato[t.contrato]) throw new Error('recebível duplicado para o contrato ' + t.contrato);
    porContrato[t.contrato] = t;
    if (!t.composicao || !t.composicao.length) throw new Error('recebível sem a composição das etapas do contrato');
  });
  if (!porContrato['CT-2026-0041']) throw new Error('o contrato da cooperativa com a indústria não entrou no contas a receber');
  App.usuario = 'U-04'; Erp.reiniciar();
  Erp.sincronizarEscrow();
  Erp.sincronizarEscrow();
  var obrigacoes = Erp.titulos({ tipo: 'PAGAR' }).filter(function (t) { return t.origem === 'ESCROW'; });
  var obrigacoesCtg = obrigacoes.filter(function (t) { return t.contrato === 'CT-2026-0041'; });
  if (obrigacoesCtg.length !== 1) throw new Error('a indústria deveria ter exatamente 1 obrigação para o contrato, tem ' + obrigacoesCtg.length);
  if (obrigacoesCtg[0].produtor !== 'U-04') throw new Error('a obrigação precisa ficar no escopo de quem compra, não de quem vende');
  if (obrigacoesCtg[0].valor <= 0) throw new Error('obrigação sem valor');
  if (!obrigacoesCtg[0].composicao.length) throw new Error('obrigação sem a composição das etapas do contrato');
  App.usuario = 'U-01'; Erp.reiniciar();
});""")

# bônus: o maquinário sem base horária passa a ser verificado
sub("""teste('ERP: patrimônio, dívida e endividamento coerentes', function () {""",
    """teste('ERP: estruturas sem base horária entram pela depreciação, não como custo/hora zero', function () {
  var semHoras = Erp.patrimonioSemHoras();
  if (!semHoras.length) throw new Error('o cenário tem terreiro e casa de fermentação sem horas de uso medidas');
  semHoras.forEach(function (a) {
    if (a.custoAnoEstimado <= 0) throw new Error('estrutura ' + a.nome + ' sem custo anual: a depreciação e a manutenção precisam aparecer');
    if (!a.motivo) throw new Error('estrutura sem explicação do porquê não tem custo por hora');
  });
  Erp.maquinas().forEach(function (m) {
    if (!(m.custoHora > 0)) throw new Error('ativo ' + m.nome + ' na lista de custo/hora com valor zero');
  });
});

teste('ERP: patrimônio, dívida e endividamento coerentes', function () {""")

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('teste_app.js -> %d bytes' % len(s.encode('utf-8')))
print('patch_testes3 aplicado')
