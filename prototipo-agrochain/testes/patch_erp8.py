#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_erp8 — três ajustes que vieram da bateria de testes:

1. E.maquinas() listava o terreiro suspenso e a casa de fermentação (AT-07)
   com custo por hora ZERO, porque a estrutura não tem horas de uso medidas.
   Custo zero por hora não existe: a estrutura entra pela depreciação e pela
   manutenção anuais. Agora a lista de custo/hora só traz ativos com base
   horária, e a diferença fica declarada na tela.
2. A aba de custos não tinha nenhum gráfico quando nenhum talhão estava
   aberto; agora abre com o comparativo custo × preço por talhão.
3. A aba de fechamento mostrava o balancete só depois de preparar; agora
   traz a cascata da DRE do mês selecionado antes de gerar os hashes.
"""
import io, sys

def sub(caminho, pares):
    s = io.open(caminho, encoding='utf-8').read()
    for i, (a, b) in enumerate(pares, 1):
        c = s.count(a)
        if c != 1:
            sys.exit('FALHA em %s [%d]: âncora encontrada %d vez(es):\n%s' % (caminho, i, c, a[:200]))
        s = s.replace(a, b, 1)
        print('  ok %s [%d]' % (caminho, i))
    io.open(caminho, 'w', encoding='utf-8').write(s)
    print('%s -> %d bytes' % (caminho, len(s.encode('utf-8'))))

# ---------------------------------------------------------------- 55_erp.js
ERP = [
    ("""  function maquinas() {
    return patrimonioFiltrado().map(function (p) {
      var c = custoHoraMaquina(p.id);
      var horasAno = p.horasAno || 0;
      return Object.assign({}, c, { custoAnoEstimado: arred(c.custoHora * horasAno, 2) });
    }).sort(function (a, b) { return b.custoAnoEstimado - a.custoAnoEstimado; });
  }""",
     """  /* Ativos com base horária de uso. O terreiro suspenso e a casa de
     fermentação (AT-07) não têm horas medidas: eles entram na DRE e no
     patrimônio pela depreciação e manutenção anuais, mas não podem
     aparecer com "custo por hora" igual a zero, que não significa nada.
     patrimonioSemHoras() declara essa diferença para a interface. */
  function maquinas() {
    return patrimonioFiltrado().filter(function (p) { return (p.horasAno || 0) > 0; }).map(function (p) {
      var c = custoHoraMaquina(p.id);
      var horasAno = p.horasAno || 0;
      return Object.assign({}, c, { custoAnoEstimado: arred(c.custoHora * horasAno, 2) });
    }).sort(function (a, b) { return b.custoAnoEstimado - a.custoAnoEstimado; });
  }

  function patrimonioSemHoras() {
    return patrimonioFiltrado().filter(function (p) { return !((p.horasAno || 0) > 0); }).map(function (p) {
      var c = custoHoraMaquina(p.id);
      return {
        ativo: p.id, nome: p.nome, tipo: p.tipo, valor: p.valor, produtor: p.produtor, uso: p.uso,
        depreciacaoAno: c.depreciacaoAno, manutencaoAno: c.manutencaoAno,
        custoAnoEstimado: arred(c.depreciacaoAno + c.manutencaoAno, 2),
        motivo: 'Estrutura sem horas de uso medidas: entra pela depreciação e manutenção anuais, sem custo por hora.'
      };
    }).sort(function (a, b) { return b.custoAnoEstimado - a.custoAnoEstimado; });
  }"""),

    ("    orcadoRealizado: orcadoRealizado, evidenciaSensor: evidenciaSensor, alertas: alertas,",
     "    orcadoRealizado: orcadoRealizado, evidenciaSensor: evidenciaSensor, alertas: alertas,\n    patrimonioSemHoras: patrimonioSemHoras,"),
]

# ---------------------------------------------------------------- 85_erp_ui.js
UI = [
    # gráfico comparativo na abertura da aba de custos
    ("""    html += cartao('', kpi('Talhões monitorados', num(c.talhoes.length, 0), 'custo, produção e preço lote a lote'));
    html += '</div>';""",
     """    html += cartao('', kpi('Talhões monitorados', num(c.talhoes.length, 0), 'custo, produção e preço lote a lote'));
    html += '</div>';

    html += cartao('Custo por unidade produzida × preço que o mercado paga',
      '<div class="graf">' + Graf.barras(c.talhoes.map(function (t) { return t.talhao + ' ' + t.unidadeNome.slice(0, 10); }), [
        { nome: 'Custo por unidade (projetado com a IA)', dados: c.talhoes.map(function (t) { return t.custoSacaProjetado; }), cor: Graf.CORES.cacau },
        { nome: 'Preço de mercado', dados: c.talhoes.map(function (t) { return t.precoMercado; }), cor: Graf.CORES.verde },
        { nome: 'Preço do lote rastreado', dados: c.talhoes.map(function (t) { return t.precoPremium; }), cor: Graf.CORES.ouro }
      ], { formato: function (v) { return 'R$ ' + Graf.compacto(v); }, unidade: 'R$', altura: 240 }) + '</div>' +
      '<div class="nota">Quando a barra de custo alcança a de preço, o talhão está trabalhando no limite — são os casos de ' +
      esc(c.criticos.length ? c.criticos.join(', ') : 'nenhum talhão') + ' neste período. O custo por unidade usa a produtividade PREVISTA pela IA: se a lavoura render menos, a barra de custo sobe antes mesmo da colheita.</div>');"""),

    # prévia da cascata do mês na aba de fechamento
    ("""    if (App4.preparo) {
      var p = App4.preparo;
      html += '<div class="cartao" style="margin-top:14px"><h2>Fechamento de ' + esc(p.competencia) + ' — ' + p.linhas.length + ' contas</h2>' +""",
     """    var dMes = E.dre({ mes: comp });
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
      html += '<div class="cartao" style="margin-top:14px"><h2>Fechamento de ' + esc(p.competencia) + ' — ' + p.linhas.length + ' contas</h2>' +"""),

    # nota sobre ativos sem base horária
    ("""    html += '<div class="cartao" style="margin-top:14px"><h2>Máquinas, veículos e benfeitorias ' + chip('custo por hora com depreciação, manutenção, combustível e operador', 'cinza') + '</h2>' +""",
     """    var semHoras = E.patrimonioSemHoras();
    html += '<div class="cartao" style="margin-top:14px"><h2>Máquinas, veículos e benfeitorias ' + chip('custo por hora com depreciação, manutenção, combustível e operador', 'cinza') + '</h2>' +"""),

    ("""    html += '</div>';

    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Patrimônio e depreciação',""",
     """    if (semHoras.length) {
      html += '<div class="caixa" style="margin-top:10px"><b>Estruturas sem horas de uso medidas</b>' +
        semHoras.map(function (a) {
          return '<div class="flex entre" style="padding:5px 0;border-bottom:1px solid var(--linha)"><span>' + esc(a.nome) +
            '<div class="nota">' + esc(a.uso) + '</div></span><b>' + brl(a.custoAnoEstimado, 0) + '/ano</b></div>';
        }).join('') +
        '<div class="nota" style="margin-top:7px">Terreiro e casa de fermentação não têm horas de uso medidas: entram na DRE e no patrimônio pela depreciação e manutenção anuais. Reportar um custo por hora igual a zero faria a estrutura parecer gratuita.</div></div>';
    }
    html += '</div>';

    html += '<div class="grade g2" style="margin-top:14px">';
    html += cartao('Patrimônio e depreciação',"""),
]

sub('src/55_erp.js', ERP)
sub('src/85_erp_ui.js', UI)
print('patch_erp8 aplicado')
