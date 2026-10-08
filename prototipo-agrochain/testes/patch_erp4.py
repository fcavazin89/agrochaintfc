#!/usr/bin/env python3
# Correções v3 -> v4:
#  1) baixa do produto acontece DEPOIS da entrada dos lotes (custo médio correto)
#  2) estoque de produto valorizado lote a lote com o preço ajustado pela IA
#  3) orçamento construído do histórico anualizado com metas declaradas
P = '/home/user/prototipo-agrochain/src/55_erp.js'
s = open(P, encoding='utf-8').read()
orig = s

def sub(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'ocorrências: %d (esperado %d) para %r' % (c, n, old[:80])
    s = s.replace(old, new, n)

# ------------------------------------------------ 1) coleta as vendas de lote para depois
sub("""    var rnd = Dados.rnd(semente);
    var talhoes = D.talhoes.filter(function (t) { return t.produtor === produtorId; });
    var meses = mesesHistorico();""",
    """    var rnd = Dados.rnd(semente);
    var talhoes = D.talhoes.filter(function (t) { return t.produtor === produtorId; });
    var meses = mesesHistorico();
    /* vendas de lote rastreado: a baixa no estoque é feita depois da entrada da
       produção, para que o custo médio do estoque esteja formado */
    var pendentesVenda = [];""")

sub("""        /* baixa do produto acabado: só a venda de lote rastreado movimenta o
           estoque desta safra; as vendas de safras anteriores já saíram antes
           do período do ERP e não podem reduzir o saldo atual. */
        var itemProduto = plano.lote ? erp.itens.filter(function (i) {
          return i.produtor === produtorId && i.codigo === (ehCafe ? 'PRD-01' : 'PRD-02');
        })[0] : null;
        if (itemProduto) {
          itemProduto.saldo = arred(itemProduto.saldo - plano.qtd, 2);
          erp.movimentos.push({
            id: novoId('MV'), data: dia(22), item: itemProduto.id, itemNome: itemProduto.nome, categoria: 'PRODUTO',
            tipo: 'SAIDA', qtd: plano.qtd, custoUnit: itemProduto.custoMedio, valor: arred(plano.qtd * itemProduto.custoMedio, 2),
            saldoApos: itemProduto.saldo, motivo: 'Venda para ' + plano.cliente, produtor: produtorId,
            documento: doc, lote: plano.lote || null, precoVenda: preco, margem: arred(valor - plano.qtd * itemProduto.custoMedio, 2)
          });
        }""",
    """        /* A baixa do produto acabado só acontece para venda de lote rastreado,
           e é processada depois da entrada da produção (bloco dos lotes), para
           que o custo médio do estoque esteja formado. Vendas de safras
           anteriores já saíram do estoque antes do período do ERP. */
        if (plano.lote) {
          pendentesVenda.push({
            data: dia(22), lote: plano.lote, qtd: plano.qtd, preco: preco, cliente: plano.cliente,
            documento: doc, codigoItem: ehCafe ? 'PRD-01' : 'PRD-02', unidade: ehCafe ? 'saca' : 'arroba'
          });
        }""")

# ------------------------------------------------ processa as vendas pendentes depois dos lotes
sub("""    /* ---------- mínimo de estoque calibrado pelo consumo médio real ---------- */""",
    """    /* ---------- baixa das vendas de lote rastreado, em ordem cronológica ---------- */
    pendentesVenda.sort(function (a, b) { return a.data < b.data ? -1 : 1; }).forEach(function (v) {
      var item = erp.itens.filter(function (i) { return i.produtor === produtorId && i.codigo === v.codigoItem; })[0];
      if (!item) return;
      var custo = item.custoMedio;
      item.saldo = arred(item.saldo - v.qtd, 2);
      erp.movimentos.push({
        id: novoId('MV'), data: v.data, item: item.id, itemNome: item.nome, categoria: 'PRODUTO',
        tipo: 'SAIDA', qtd: v.qtd, custoUnit: custo, valor: arred(v.qtd * custo, 2), saldoApos: item.saldo,
        motivo: 'Venda para ' + v.cliente, produtor: produtorId, documento: v.documento, lote: v.lote,
        precoVenda: v.preco, margem: arred(v.qtd * (v.preco - custo), 2),
        unidade: v.unidade, observacao: 'Venda contra lote rastreado na cadeia (escrow)'
      });
    });

    /* ---------- mínimo de estoque calibrado pelo consumo médio real ---------- */""")

# ------------------------------------------------ 2) estoque por lote com preço da IA
sub("""  function movimentacoes(opts) {""",
    """  /* Estoque de produto rastreado lote a lote: o preço de cada lote é o que o
     modelo de IA devolve para a qualidade daquele lote (não uma média). */
  function estoquePorLote(opts) {
    opts = opts || {};
    var ps = produtoresDe(opts);
    var movs = erp().movimentos.filter(function (m) { return m.categoria === 'PRODUTO' && ps.indexOf(m.produtor) >= 0; });
    var porLote = {};
    movs.forEach(function (m) {
      if (!m.lote) return;
      porLote[m.lote] = porLote[m.lote] || { lote: m.lote, produtor: m.produtor, item: m.itemNome, entradas: 0, saidas: 0, valorEntrada: 0 };
      if (m.tipo === 'ENTRADA') { porLote[m.lote].entradas = arred(porLote[m.lote].entradas + m.qtd, 3); porLote[m.lote].valorEntrada = arred(porLote[m.lote].valorEntrada + m.valor, 2); }
      else porLote[m.lote].saidas = arred(porLote[m.lote].saidas + m.qtd, 3);
    });
    return Object.keys(porLote).map(function (k) {
      var x = porLote[k];
      var lote = Dados.lote(x.lote);
      var saldo = arred(x.entradas - x.saidas, 3);
      var custoUnit = x.entradas > 0 ? arred(x.valorEntrada / x.entradas, 2) : 0;
      var ajuste = lote ? IA.precoAjustado(lote) : null;
      var fator = lote && lote.produto === 'cacau' ? 15 : 1;
      var preco = ajuste ? arred(ajuste.ajustado * fator, 2) : arred(Dados.precoAtual(lote ? lote.produto : 'cafe_conilon') * fator, 2);
      return {
        lote: x.lote, produtor: x.produtor, produto: lote ? lote.produto : null,
        produtoRotulo: lote ? Dados.nomeProduto(lote.produto) : '—',
        talhao: lote ? lote.talhao : null, statusCadeia: lote ? lote.status : null,
        certificacao: lote ? lote.certificacao : null, unidade: lote ? lote.unidade : 'unidade',
        entradas: x.entradas, saidas: x.saidas, saldo: saldo,
        custoUnit: custoUnit, valorCusto: arred(saldo * custoUnit, 2),
        notaQualidade: ajuste ? ajuste.score : null, ajustePct: ajuste ? ajuste.ajustePct : null,
        precoIA: preco, valorMercado: arred(saldo * preco, 2),
        resultado: arred(saldo * (preco - custoUnit), 2),
        margemPct: preco ? arred((preco - custoUnit) / preco * 100, 1) : null,
        emEstoque: saldo > 0
      };
    }).filter(function (x) { return x.emEstoque; }).sort(function (a, b) { return b.valorMercado - a.valorMercado; });
  }

  function movimentacoes(opts) {""")

# projeção: disponível por lote
sub("""    /* Estoques disponíveis para venda, valorados pelo preço ajustado pela qualidade (IA) */
    var disponivel = [];
    erp().itens.filter(function (i) {
      return i.categoria === 'PRODUTO' && produtoresDe({}).indexOf(i.produtor) >= 0 && i.saldo > 0 && i.codigo !== 'PRD-03';
    }).forEach(function (i) {
      var produto = i.codigo === 'PRD-01' ? 'cafe_conilon' : 'cacau';
      var lote = D.lotes.filter(function (l) {
        return l.produtor === i.produtor && l.produto === produto && l.destino === 'venda' && l.status !== 'CONSUMIDO_PROPRIO';
      })[0];
      var preco = lote ? IA.precoAjustado(lote).ajustado : Dados.precoAtual(produto) * (produto === 'cacau' ? 15 : 1);
      disponivel.push({
        item: i.nome, produtor: i.produtor, unidade: i.unidade, quantidade: i.saldo,
        custoUnit: i.custoMedio, precoUnit: arred(preco, 2),
        liquido: arred(i.saldo * preco, 2), resultado: arred(i.saldo * (preco - i.custoMedio), 2),
        loteRef: lote ? lote.id : null
      });
    });""",
    """    /* Estoques disponíveis para venda, valorados lote a lote pelo preço que o
       modelo de IA devolve para a qualidade daquele lote. */
    var disponivel = estoquePorLote({}).map(function (x) {
      return {
        item: x.item || (x.produtoRotulo + ' — lote ' + x.lote), loteRef: x.lote, produtor: x.produtor,
        unidade: x.unidade, quantidade: x.saldo, custoUnit: x.custoUnit, precoUnit: x.precoIA,
        notaQualidade: x.notaQualidade, ajustePct: x.ajustePct, statusCadeia: x.statusCadeia,
        liquido: x.valorMercado, resultado: x.resultado, margemPct: x.margemPct
      };
    });""")

# ------------------------------------------------ 3) orçamento com metas declaradas
sub("""    var custoAno = soma(erp.lancamentos.filter(function (l) {
      return l.produtor === produtorId && l.data.slice(0, 4) === String(ANO) && l.tipo === 'CUSTO';
    }), function (l) { return l.valor; });
    var baseAnual = custoAno / Math.max(1, Number(mesCorrente().slice(5, 7))) * 12;
    [['4.1', 'Custos de produção (lavoura)', baseAnual * 0.78],
     ['5.1', 'Despesas operacionais e estrutura', baseAnual * 0.22],
     ['3.1', 'Receita bruta planejada', baseAnual * 1.42],
     ['6.1', 'Investimentos previstos', 48000]].forEach(function (x) {
      erp.orcamento.push({ id: 'OR-' + produtorId + '-' + x[0], produtor: produtorId, ano: ANO, grupo: x[0], nome: x[1], planejado: arred(x[2], 2) });
    });""",
    """    /* Orçamento do ano: parte do histórico anualizado e aplica metas explícitas */
    function anualizado(grupo) {
      return soma(erp.lancamentos.filter(function (l) {
        return l.produtor === produtorId && l.conta.slice(0, 3) === grupo && l.tipo !== 'BALANCO';
      }), function (l) { return l.valor; });
    }
    var anualLavoura = anualizado('4.1'), anualEstrutura = anualizado('5.1'), anualReceita = anualizado('3.1');
    [['4.1', 'Custos de produção da lavoura', anualLavoura * 0.96, 'meta: 4% de redução no custo por hectare'],
     ['5.1', 'Despesas operacionais e estrutura', anualEstrutura * 1.02, 'meta: manter a estrutura com a inflação'],
     ['3.1', 'Receita bruta do período', anualReceita * 1.06, 'meta: 6% de crescimento com prêmio de qualidade'],
     ['6.1', 'Investimentos previstos', 48000, 'renovação de 1 ha de cacaual e ampliação do terreiro']].forEach(function (x) {
      erp.orcamento.push({
        id: 'OR-' + produtorId + '-' + x[0], produtor: produtorId, ano: ANO, grupo: x[0],
        nome: x[1], planejado: arred(x[2], 2), meta: x[3]
      });
    });""")

# exporta as novas funções
sub("""    estoqueAtual: estoqueAtual, movimentacoes: movimentacoes,""",
    """    estoqueAtual: estoqueAtual, estoquePorLote: estoquePorLote, movimentacoes: movimentacoes,""")

open(P, 'w', encoding='utf-8').write(s)
print('patch v4 aplicado — %d -> %d bytes' % (len(orig), len(s)))
