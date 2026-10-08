#!/usr/bin/env python3
# Correções de calibragem do módulo ERP (v1 -> v2)
import re, sys
P = '/home/user/prototipo-agrochain/src/55_erp.js'
s = open(P, encoding='utf-8').read()
orig = s

def sub(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'ocorrências: %d (esperado %d) para %r' % (c, n, old[:70])
    s = s.replace(old, new, n)

# ---------------------------------------------------------------- 1) caixa inicial
sub("""  var SALDO_CAIXA_INICIAL = { 'U-01': 42000, 'U-02': 61000 };""",
    """  var SALDO_CAIXA_INICIAL = { 'U-01': 96000, 'U-02': 132000 };""")

# ---------------------------------------------------------------- 2) venda escrow com prazo de 30 dias (gera título vencido)
sub("""'U-01|2026-08|cacau': { qtd: 32, lote: 'L-2026-0088', prazoDias: 45,""",
    """'U-01|2026-08|cacau': { qtd: 32, lote: 'L-2026-0088', prazoDias: 30,""")
sub("""'U-02|2026-08|cacau': { qtd: 84, lote: 'L-2026-0091', prazoDias: 45,""",
    """'U-02|2026-08|cacau': { qtd: 84, lote: 'L-2026-0091', prazoDias: 30,""")

# ---------------------------------------------------------------- 3) tabela de necessidade do mês (novo bloco antes de gerarPropriedade)
sub("""  function gerarPropriedade(erp, produtorId, semente) {""",
    """  /* ------------------------------------------------------------------
   * NECESSIDADE DE INSUMOS E EMBALAGENS DO MÊS
   * O orçamento técnico por hectare vira quantidade de estoque: o que é
   * aplicado sai do estoque pelo custo médio e entra no custo do talhão; a
   * compra repõe o que falta e gera conta a pagar. Nada de custo solto.
   * ------------------------------------------------------------------ */
  function alocacoesDoMes(produtorId, mm, talhoes, rnd) {
    var m = Number(mm.slice(5, 7));
    var cafe = talhoes.filter(function (t) { return t.produto !== 'cacau'; });
    var cacau = talhoes.filter(function (t) { return t.produto === 'cacau'; });
    var aCafe = soma(cafe, function (t) { return t.area; });
    var aCacau = soma(cacau, function (t) { return t.area; });
    var f = 0.92 + rnd() * 0.16;
    var out = [];
    function distribui(codigo, valor, alvos, motivo) {
      if (!(valor > 0) || !alvos.length) return;
      var areaAlvo = soma(alvos, function (t) { return t.area; });
      alvos.forEach(function (t) {
        out.push({ codigo: codigo, valor: arred(valor * (t.area / areaAlvo), 2), talhao: t.id, motivo: motivo, talhaoNome: t.nome });
      });
    }
    function pacote(linhas, valorTotal, alvos, motivo) {
      linhas.forEach(function (c) { distribui(c[0], valorTotal * c[1] * f, alvos, motivo); });
    }
    var mesesAdub = [10, 11, 1, 2, 3, 4], mesesDef = [10, 11, 12, 1, 2, 3, 4, 5];
    var ambos = cafe.concat(cacau);
    if (mesesAdub.indexOf(m) >= 0) {
      pacote([['INS-01', 0.40], ['INS-02', 0.30], ['INS-05', 0.15], ['INS-12', 0.15]],
        (3300 * aCafe + 1900 * aCacau) / mesesAdub.length, ambos, 'Adubação de cobertura');
    }
    if ([7, 8].indexOf(m) >= 0) distribui('INS-04', (500 * aCafe + 380 * aCacau) / 2, ambos, 'Calagem e correção do solo');
    if (mesesDef.indexOf(m) >= 0) {
      pacote([['INS-06', 0.35], ['INS-07', 0.30], ['INS-08', 0.20], ['INS-09', 0.15]],
        (1100 * aCafe + 620 * aCacau) / mesesDef.length, ambos, 'Aplicação de defensivo');
    }
    if ([3, 9].indexOf(m) >= 0) distribui('INS-10', (480 * aCafe + 280 * aCacau) / 2, ambos, 'Controle biológico e monitoramento');
    if (m === 11 && aCacau > 0) distribui('INS-11', 110 * aCacau, cacau, 'Replantio e sombreamento do cacaual');
    /* embalagens acompanham o volume colhido no mês */
    talhoes.forEach(function (t) {
      var volume = (COLHEITA_PLANEJADA[t.id] || {})[mm];
      if (!volume) return;
      var o = orc(t.produto);
      var unidades = volume / o.unidadeKg * o.rendimento;
      if (t.produto === 'cacau') distribui('EMB-02', Math.ceil(unidades / 60) * 42, [t], 'Big bags do lote de cacau');
      else distribui('EMB-01', Math.ceil(unidades) * 7.5, [t], 'Sacas de juta do café beneficiado');
      distribui('EMB-03', 6 * 0.85, [t], 'Etiquetas com QR Code do lote');
    });
    if (produtorId === 'U-01' && m >= 1) out.push({ codigo: 'INS-13', valor: 620, talhao: null, motivo: 'Açúcar, lecitina e rótulos da agroindústria' });
    return out;
  }

  function gerarPropriedade(erp, produtorId, semente) {""")

# ---------------------------------------------------------------- 4) custo do talhão: só mão de obra, máquinas, combustível, energia e poda
sub("""        /* atividades do calendário */
        if (cal.adubacao.indexOf(m) >= 0) {
          var fatia = 1 / cal.adubacao.length;
          custo('4.1.01', o.fixo.adubacao * area * fatia, 'Adubação de cobertura e foliar');
        }
        if (cal.corretivo.indexOf(m) >= 0) custo('4.1.01', o.fixo.material * 0 + 500 * area / cal.corretivo.length, 'Calagem e correção do solo');
        if (cal.defensivo.indexOf(m) >= 0) custo('4.1.02', o.fixo.defensivo * area / cal.defensivo.length, 'Aplicação de defensivo');
        if (cal.biotec.indexOf(m) >= 0) custo('4.1.12', o.fixo.biotec * area / cal.biotec.length, 'Controle biológico e monitoramento de pragas');
        if (cal.poda.indexOf(m) >= 0) custo('4.1.04', o.fixo.poda * area / cal.poda.length, 'Poda, desbrota e limpeza da lavoura');
        if (cal.material.indexOf(m) >= 0) custo('4.1.03', o.fixo.material * area, produto === 'cacau' ? 'Mudas para replantio e sombreamento' : 'Material de plantio e renovação');
""",
    """        /* poda e limpeza, que são serviço e não insumo */
        if (cal.poda.indexOf(m) >= 0) custo('4.1.04', o.fixo.poda * area / cal.poda.length, 'Poda, desbrota e limpeza da lavoura');
        /* Adubação, defensivo, biológico, mudas e embalagens NÃO entram aqui:
           saem do estoque como movimentação com custo médio (bloco abaixo). */
""")

# ---------------------------------------------------------------- 5) colheita: sem embalagem (vem do estoque)
sub("""          custo('4.1.10', unidades * o.porUnidade.posColheita, produto === 'cacau' ? 'Fermentação, secagem e classificação' : 'Secagem, benefício e classificação');
          custo('4.1.09', unidades * o.porUnidade.embalagem, produto === 'cacau' ? 'Big bags e etiquetas do lote' : 'Sacas de juta e etiquetas do lote');
          custo('4.1.06', unidades * o.porUnidade.beneficio, 'Processamento mecânico e classificação por peneira');""",
    """          custo('4.1.10', unidades * o.porUnidade.posColheita, produto === 'cacau' ? 'Fermentação, secagem e classificação' : 'Secagem, benefício e classificação');
          custo('4.1.06', unidades * o.porUnidade.beneficio, 'Processamento mecânico e classificação por peneira');""")

# ---------------------------------------------------------------- 6) substitui o bloco de insumos (consumo aleatório + reposição) pelo dirigido por orçamento
ini = s.index("      /* ---------- insumos consumidos no mês")
fim = s.index("      /* ---------- despesas administrativas, tecnologia e juros ---------- */")
novo = """      /* ---------- insumos e embalagens: reposição e baixa no mês ---------- */
      var alocacoes = alocacoesDoMes(produtorId, mm, talhoes, rnd);
      var porItem = {};
      alocacoes.forEach(function (a) {
        porItem[a.codigo] = porItem[a.codigo] || { total: 0, linhas: [] };
        porItem[a.codigo].total = arred(porItem[a.codigo].total + a.valor, 2);
        porItem[a.codigo].linhas.push(a);
      });
      Object.keys(porItem).forEach(function (codigo) {
        var item = erp.itens.filter(function (i) { return i.produtor === produtorId && i.codigo === codigo; })[0];
        if (!item) return;
        var plano = porItem[codigo];
        var disponivel = item.saldo * item.custoMedio;
        /* repõe o necessário para o mês e mais um mês de folga */
        if (disponivel < plano.total * 1.4 && dentroDaData(dia(4))) {
          var qtdCompra = arred(Math.max(plano.total * 2.2 - disponivel, 0) / item.custoMedio, item.unidade === 'un' ? 0 : 2);
          if (qtdCompra > 0) {
            var preco = arred(item.custoMedio * (0.95 + rnd() * 0.13), 2);
            var valorCompra = arred(qtdCompra * preco, 2);
            var docCompra = 'NF ' + (5000 + _seq.MV);
            var saldoAnterior = item.saldo;
            item.saldo = arred(item.saldo + qtdCompra, 3);
            item.custoMedio = arred((item.custoMedio * saldoAnterior + valorCompra) / item.saldo, 2);
            erp.movimentos.push({
              id: novoId('MV'), data: dia(4), item: item.id, itemNome: item.nome, categoria: item.categoria,
              tipo: 'ENTRADA', qtd: qtdCompra, custoUnit: preco, valor: valorCompra, saldoApos: item.saldo,
              motivo: 'Compra para a safra — ' + item.fornecedor, produtor: produtorId, documento: docCompra
            });
            lancar(erp, {
              data: dia(4), conta: item.conta, descricao: 'Compra de ' + item.nome + ' (' + qtdCompra + ' ' + item.unidade + ') de ' + item.fornecedor,
              valor: valorCompra, centro: 'ESTOQUE', produtor: produtorId, origem: 'COMPRA', documento: docCompra
            });
            var vencCompra = addDias(dia(4), 30);
            erp.titulos.push({
              id: novoId('TP'), tipo: 'PAGAR', contraparte: item.fornecedor,
              descricao: 'Compra de ' + item.nome + ' (' + qtdCompra + ' ' + item.unidade + ')', valor: valorCompra,
              emissao: dia(4), vencimento: vencCompra, produtor: produtorId, origem: 'COMPRA', documento: docCompra,
              insumo: item.nome, status: vencCompra < HOJE.toISOString().slice(0, 10) ? 'PAGO' : 'ABERTO'
            });
          }
        }
        /* baixa do que efetivamente foi aplicado, com rateio por talhão */
        plano.linhas.forEach(function (a, k) {
          if (!(a.valor > 0) || item.saldo <= 0) return;
          var qtd = arred(Math.min(a.valor, item.saldo * item.custoMedio) / item.custoMedio, item.unidade === 'un' ? 0 : 3);
          if (!(qtd > 0)) return;
          var valor = arred(qtd * item.custoMedio, 2);
          item.saldo = arred(item.saldo - qtd, 3);
          erp.movimentos.push({
            id: novoId('MV'), data: dia(10 + (k % 12)), item: item.id, itemNome: item.nome, categoria: item.categoria,
            tipo: 'SAIDA', qtd: qtd, custoUnit: item.custoMedio, valor: valor, saldoApos: item.saldo,
            talhao: a.talhao, motivo: a.motivo + (a.talhaoNome ? ' — ' + a.talhaoNome : ''),
            produtor: produtorId, documento: 'OS ' + (300 + _seq.MV), safra: ano
          });
          lancar(erp, {
            data: dia(10 + (k % 12)), conta: item.conta,
            descricao: a.motivo + ' — baixa de ' + item.nome + ' (' + arred(qtd, 2) + ' ' + item.unidade + ')',
            valor: valor, centro: a.talhao || 'BENEFICIAMENTO', talhao: a.talhao || null,
            produtor: produtorId, origem: 'ESTOQUE', safra: ano, documento: 'OS ' + (300 + _seq.MV)
          });
        });
        /* alerta de estoque: repõe no mês seguinte se ficou abaixo do mínimo */
      });

"""
s = s[:ini] + novo + s[fim:]

# ---------------------------------------------------------------- 7) baixa do produto: só quando há lote rastreado
sub("""        /* baixa do produto acabado no estoque */
        var itemProduto = erp.itens.filter(function (i) {
          return i.produtor === produtorId && i.codigo === (ehCafe ? 'PRD-01' : 'PRD-02');
        })[0];
        if (itemProduto) {""",
    """        /* baixa do produto acabado: só a venda de lote rastreado movimenta o
           estoque desta safra; as vendas de safras anteriores já saíram antes
           do período do ERP e não podem reduzir o saldo atual. */
        var itemProduto = plano.lote ? erp.itens.filter(function (i) {
          return i.produtor === produtorId && i.codigo === (ehCafe ? 'PRD-01' : 'PRD-02');
        })[0] : null;
        if (itemProduto) {""")

# ---------------------------------------------------------------- 8) preço premium do cacau por arroba
sub("""    var precoMercado = arred(Dados.precoAtual(produto) * (ehCafe ? 1 : 15), 2);
    var precoPremium = ajuste ? ajuste.ajustado : null;""",
    """    var fatorUnidade = ehCafe ? 1 : 15;                      /* arroba de 15 kg */
    var precoMercado = arred(Dados.precoAtual(produto) * fatorUnidade, 2);
    var precoPremium = ajuste ? arred(ajuste.ajustado * fatorUnidade, 2) : null;""")

# ---------------------------------------------------------------- 9) custo unitário realizado só com safra praticamente colhida
sub("""    var custoSacaProjetado = unidadesPrevistas ? arred(custoTotal / unidadesPrevistas, 2) : null;
    var custoUnitarioRealizado = unidadesRealizadas > 0 ? arred(custoTotal / unidadesRealizadas, 2) : null;""",
    """    var custoSacaProjetado = unidadesPrevistas ? arred(custoTotal / unidadesPrevistas, 2) : null;
    var progresso = unidadesPrevistas ? unidadesRealizadas / unidadesPrevistas : 0;
    /* enquanto a safra está no campo, dividir o custo do ano pelo que já foi
       colhido infla o custo unitário: o número parcial é informado como tal. */
    var custoUnitarioParcial = unidadesRealizadas > 0 ? arred(custoTotal * Math.min(progresso, 1) / unidadesRealizadas, 2) : null;
    var custoUnitarioRealizado = progresso >= 0.9 && unidadesRealizadas > 0 ? arred(custoTotal / unidadesRealizadas, 2) : null;""")
sub("""      custoSacaProjetado: custoSacaProjetado, custoUnitarioRealizado: custoUnitarioRealizado,
      precoMercado: precoMercado, precoPremium: precoPremium, loteRef: loteRef ? loteRef.id : null,""",
    """      custoSacaProjetado: custoSacaProjetado, custoUnitarioRealizado: custoUnitarioRealizado,
      custoUnitarioParcial: custoUnitarioParcial, progressoSafra: arred(progresso * 100, 0),
      precoMercado: precoMercado, precoPremium: precoPremium, loteRef: loteRef ? loteRef.id : null,""")
sub("""      progressoSafraPct: unidadesPrevistas ? arred(unidadesRealizadas / unidadesPrevistas * 100, 0) : null,
      unidadeNome: unidadeNome,""",
    """      progressoSafraPct: unidadesPrevistas ? arred(unidadesRealizadas / unidadesPrevistas * 100, 0) : null,
      unidadeNome: unidadeNome, fatorUnidade: fatorUnidade,""")

# ---------------------------------------------------------------- 10) fechamento de safra usa o realizado apenas quando fechado
sub("""      custoUnitario: c.custoUnitarioRealizado, custoSacaProjetado: c.custoSacaProjetado,""",
    """      custoUnitario: c.custoUnitarioRealizado || c.custoUnitarioParcial, custoSacaProjetado: c.custoSacaProjetado,
      custoUnitarioFechado: !!c.custoUnitarioRealizado,""")

open(P, 'w', encoding='utf-8').write(s)
print('patch aplicado — %d -> %d bytes' % (len(orig), len(s)))
