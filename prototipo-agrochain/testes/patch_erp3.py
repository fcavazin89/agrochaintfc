#!/usr/bin/env python3
# Correções de calibragem do módulo ERP (v2 -> v3):
#  1) compra de estoque vira ATIVO (não entra no custo duas vezes)
#  2) rateio da estrutura usa só contas de custo/despesa do centro ADM
#  3) venda de cacau com preço por arroba (15 kg)
#  4) mínimo de estoque calibrado pelo consumo médio real
import sys
P = '/home/user/prototipo-agrochain/src/55_erp.js'
s = open(P, encoding='utf-8').read()
orig = s

def sub(old, new, n=1):
    global s
    c = s.count(old)
    assert c == n, 'ocorrências: %d (esperado %d) para %r' % (c, n, old[:70])
    s = s.replace(old, new, n)

# ---------------------------------------------------------------- 1) contas de ativo
sub("""  var CONTAS = [
    { codigo: '3.1.01',""",
    """  var CONTAS = [
    { codigo: '1.1.01', nome: 'Caixa e contas bancárias', grupo: 'ATIVO' },
    { codigo: '1.1.02', nome: 'Estoque de insumos, embalagens e produto', grupo: 'ATIVO' },
    { codigo: '1.2.01', nome: 'Máquinas, benfeitorias e tecnologia', grupo: 'ATIVO' },
    { codigo: '2.1.01', nome: 'Custeio bancário e fornecedores', grupo: 'PASSIVO' },

    { codigo: '3.1.01',""")

sub("""      tipo: grupoDa(dados.conta) === 'RECEITA' ? 'RECEITA' : grupoDa(dados.conta) === 'DESPESA' ? 'DESPESA' : grupoDa(dados.conta) === 'INVESTIMENTO' ? 'INVESTIMENTO' : 'CUSTO',""",
    """      tipo: grupoDa(dados.conta) === 'RECEITA' ? 'RECEITA'
        : grupoDa(dados.conta) === 'DESPESA' ? 'DESPESA'
        : grupoDa(dados.conta) === 'INVESTIMENTO' ? 'INVESTIMENTO'
        : (grupoDa(dados.conta) === 'ATIVO' || grupoDa(dados.conta) === 'PASSIVO') ? 'BALANCO' : 'CUSTO',""")

# compra de estoque (inicial, reposição e lançamento manual) vai para 1.1.02
sub("""        lancar(erp, {
          data: meses[0] + '-03', conta: it.conta, descricao: 'Estoque inicial de ' + it.nome + ' (' + item.saldo + ' ' + it.unidade + ')',
          valor: valor, centro: 'ESTOQUE', produtor: produtorId, origem: 'COMPRA', documento: doc
        });""",
    """        lancar(erp, {
          data: meses[0] + '-03', conta: '1.1.02', descricao: 'Formação do estoque inicial: ' + it.nome + ' (' + item.saldo + ' ' + item.unidade + ')',
          valor: valor, centro: 'ESTOQUE', produtor: produtorId, origem: 'COMPRA', documento: doc
        });""")
sub("""            lancar(erp, {
              data: dia(4), conta: item.conta, descricao: 'Compra de ' + item.nome + ' (' + qtdCompra + ' ' + item.unidade + ') de ' + item.fornecedor,
              valor: valorCompra, centro: 'ESTOQUE', produtor: produtorId, origem: 'COMPRA', documento: docCompra
            });""",
    """            lancar(erp, {
              data: dia(4), conta: '1.1.02', descricao: 'Compra de ' + item.nome + ' (' + qtdCompra + ' ' + item.unidade + ') de ' + item.fornecedor + ' — entrada em estoque',
              valor: valorCompra, centro: 'ESTOQUE', produtor: produtorId, origem: 'COMPRA', documento: docCompra
            });""")
sub("""    var lanc = lancar(erp(), {
      data: data, conta: item.conta || '4.1.01', descricao: 'Compra de ' + item.nome + ' (' + arred(qtd, 2) + ' ' + item.unidade + ') de ' + (fornecedor || item.fornecedor),
      valor: valor, centro: 'ESTOQUE', produtor: item.produtor, origem: 'COMPRA', documento: doc
    });""",
    """    var lanc = lancar(erp(), {
      data: data, conta: '1.1.02', descricao: 'Compra de ' + item.nome + ' (' + arred(qtd, 2) + ' ' + item.unidade + ') de ' + (fornecedor || item.fornecedor) + ' — entrada em estoque',
      valor: valor, centro: 'ESTOQUE', produtor: item.produtor, origem: 'COMPRA', documento: doc
    });""")

# ---------------------------------------------------------------- 2) rateio: só custo/despesa, centro ADM
sub("""    var admTotal = soma(erp().lancamentos.filter(function (l) {
      return l.produtor === talhao.produtor && !l.talhao && ['ADM', 'ESTOQUE', 'COMERCIALIZACAO', 'BENEFICIAMENTO'].indexOf(l.centro) >= 0;
    }), function (l) { return l.valor; });
    var areaTotal = soma(D.talhoes.filter(function (t) { return t.produtor === talhao.produtor; }), function (t) { return t.area; });
    var rateio = areaTotal ? arred(admTotal * (talhao.area / areaTotal), 2) : 0;
    var custoTotal = arred(direto + rateio, 2);""",
    """    var admTotal = soma(erp().lancamentos.filter(function (l) {
      return l.produtor === talhao.produtor && !l.talhao && l.centro === 'ADM' &&
        (l.tipo === 'CUSTO' || l.tipo === 'DESPESA');
    }), function (l) { return l.valor; });
    var areaTotal = soma(D.talhoes.filter(function (t) { return t.produtor === talhao.produtor; }), function (t) { return t.area; });
    var rateio = areaTotal ? arred(admTotal * (talhao.area / areaTotal), 2) : 0;
    var custoTotal = arred(direto + rateio, 2);""")

sub("""    var adm = soma(erp.lancamentos.filter(function (l) {
      return l.produtor === produtorId && !l.talhao && ['ADM', 'ESTOQUE', 'COMERCIALIZACAO'].indexOf(l.centro) >= 0;
    }), function (l) { return l.valor; });""",
    """    var adm = soma(erp().lancamentos.filter(function (l) {
      return l.produtor === produtorId && !l.talhao && l.centro === 'ADM' &&
        (l.tipo === 'CUSTO' || l.tipo === 'DESPESA');
    }), function (l) { return l.valor; });""")

# ---------------------------------------------------------------- 3) preço de venda de cacau por arroba
sub("""        var base = Dados.precoAtual(produto);
        var preco, origemPreco;""",
    """        var ehCafeVenda = produto === 'cafe_conilon';
        var fatorVenda = ehCafeVenda ? 1 : 15;               /* arroba de 15 kg */
        var base = arred(Dados.precoAtual(produto) * fatorVenda, 2);
        var preco, origemPreco;""")
sub("""          var ajuste = lote ? IA.precoAjustado(lote) : null;
          preco = ajuste ? ajuste.ajustado : base;
          origemPreco = ajuste ? 'preço ajustado pela qualidade do lote (nota ' + ajuste.score + ', ' + (ajuste.ajustePct > 0 ? '+' : '') + ajuste.ajustePct + '% sobre a cotação)' : 'cotação do dia';
        } else {
          preco = arred(base * (plano.tipo || 1), 2);
          origemPreco = 'cotação do dia ajustada pelo tipo (' + arred((plano.tipo || 1) * 100, 0) + '%)';
        }
        var valor = arred(plano.qtd * preco, 2);
        var ehCafe = produto === 'cafe_conilon';""",
    """          var ajuste = lote ? IA.precoAjustado(lote) : null;
          preco = ajuste ? arred(ajuste.ajustado * fatorVenda, 2) : base;
          origemPreco = ajuste ? 'preço ajustado pela qualidade do lote (nota ' + ajuste.score + ', ' + (ajuste.ajustePct > 0 ? '+' : '') + ajuste.ajustePct + '% sobre a cotação)' : 'cotação do dia';
        } else {
          preco = arred(base * (plano.tipo || 1), 2);
          origemPreco = 'cotação do dia ajustada pelo tipo (' + arred((plano.tipo || 1) * 100, 0) + '%)';
        }
        var valor = arred(plano.qtd * preco, 2);
        var ehCafe = ehCafeVenda;""")

# ---------------------------------------------------------------- 4) mínimo de estoque pelo consumo médio
sub("""    /* ---------- patrimônio, pessoas e orçamento ---------- */
    PATRIMONIO[produtorId].forEach(function (p) {""",
    """    /* ---------- mínimo de estoque calibrado pelo consumo médio real ---------- */
    erp.itens.filter(function (i) { return i.produtor === produtorId && i.categoria !== 'PRODUTO'; }).forEach(function (item) {
      var saidas = erp.movimentos.filter(function (m) { return m.item === item.id && m.tipo === 'SAIDA'; });
      if (!saidas.length) return;
      var mesesComSaida = {};
      saidas.forEach(function (m) { mesesComSaida[m.data.slice(0, 7)] = true; });
      var n = Math.max(1, Object.keys(mesesComSaida).length);
      var media = soma(saidas, function (m) { return m.qtd; }) / n;
      item.minimo = item.unidade === 'un' ? Math.round(media * 0.7) : arred(media * 0.7, 2);
      item.minimo = Math.max(item.minimo, 0.2);
    });

    /* ---------- patrimônio, pessoas e orçamento ---------- */
    PATRIMONIO[produtorId].forEach(function (p) {""")

open(P, 'w', encoding='utf-8').write(s)
print('patch v3 aplicado — %d -> %d bytes' % (len(orig), len(s)))
