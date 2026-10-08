#!/usr/bin/env python3
# v4 -> v5: permissões dos eventos do ERP na cadeia, escrow do consórcio,
# datas de baixa de insumo no mês corrente, evidência de sensor por data da
# aplicação (clima do consórcio + sensor + qualidade do lote) e rótulos do
# orçado x realizado.
L = '/home/user/prototipo-agrochain/src/50_ledger.js'
P = '/home/user/prototipo-agrochain/src/55_erp.js'
sl = open(L, encoding='utf-8').read()
s = open(P, encoding='utf-8').read()

def sub(txt, old, new, n=1, alvo=''):
    c = txt.count(old)
    assert c == n, '[%s] ocorrências: %d (esperado %d) para %r' % (alvo, c, n, old[:70])
    return txt.replace(old, new, n)

# ------------------------------------------------- 1) permissões dos eventos do ERP
sl = sub(sl, """    produtor: ['COLHEITA', 'SECAGEM', 'FERMENTACAO', 'ANALISE_IA', 'DESTINO_CONSUMO', 'BENEFICIAMENTO_PROPRIO', 'TORRA_PROPRIA', 'TRANSPORTE', 'PROPOSTA', 'LEITURA_SENSOR'],
    cooperativa: ['RECEBIMENTO_COOP', 'CLASSIFICACAO', 'TRANSPORTE', 'LOTE_AGREGADO', 'PROPOSTA', 'CONTRATO', 'LEITURA_SENSOR'],""",
    """    produtor: ['COLHEITA', 'SECAGEM', 'FERMENTACAO', 'ANALISE_IA', 'DESTINO_CONSUMO', 'BENEFICIAMENTO_PROPRIO', 'TORRA_PROPRIA', 'TRANSPORTE', 'PROPOSTA', 'LEITURA_SENSOR',
               /* eventos do ERP: são do produtor e ficam na cadeia */
               'VENDA', 'COMPRA_INSUMO', 'APLICACAO_INSUMO', 'FECHAMENTO_CONTABIL'],
    cooperativa: ['RECEBIMENTO_COOP', 'CLASSIFICACAO', 'TRANSPORTE', 'LOTE_AGREGADO', 'PROPOSTA', 'CONTRATO', 'LEITURA_SENSOR', 'FECHAMENTO_CONTABIL'],""",
    alvo='ledger')
open(L, 'w', encoding='utf-8').write(sl)

# ------------------------------------------------- 2) garantir a cadeia inicializada
s = sub(s, """  function baseVazia() {""",
    """  /* A cadeia precisa estar montada antes de receber os eventos do ERP */
  function garantirCadeia() {
    if (global.Ledger && !global.Ledger.blocos()) global.Ledger.iniciar();
  }

  function baseVazia() {""", alvo='erp')
s = sub(s, """    var prep = prepararFechamento(competencia, autorId || (global.App && global.App.usuario) || 'U-01');
    var tx = global.Ledger.registrarTx('FECHAMENTO_CONTABIL', {""",
    """    var prep = prepararFechamento(competencia, autorId || (global.App && global.App.usuario) || 'U-01');
    garantirCadeia();
    var tx = global.Ledger.registrarTx('FECHAMENTO_CONTABIL', {""", alvo='erp')
s = sub(s, """    erp().titulos.push(titulo);
    var tx = global.Ledger.registrarTx('COMPRA_INSUMO', {""",
    """    erp().titulos.push(titulo);
    garantirCadeia();
    var tx = global.Ledger.registrarTx('COMPRA_INSUMO', {""", alvo='erp')
s = sub(s, """    var tx = global.Ledger.registrarTx('APLICACAO_INSUMO', {""",
    """    garantirCadeia();
    var tx = global.Ledger.registrarTx('APLICACAO_INSUMO', {""", alvo='erp')
s = sub(s, """    var tx = global.Ledger.registrarTx('VENDA', {""",
    """    garantirCadeia();
    var tx = global.Ledger.registrarTx('VENDA', {""", alvo='erp')

# ------------------------------------------------- 3) escopo do consórcio inclui o próprio usuário
s = sub(s, """    return { tipo: 'CONSORCIO', produtores: PRODUTORES.slice(), podeEditar: false, usuario: u, rotulo: (u.org || u.nome) + ' — visão consolidada das propriedades do consórcio' };""",
    """    return {
      tipo: 'CONSORCIO', produtores: PRODUTORES.concat([u.id]), podeEditar: false, usuario: u,
      rotulo: (u.org || u.nome) + ' — visão consolidada das propriedades do consórcio e da posição do próprio perfil'
    };""", alvo='erp')

# ------------------------------------------------- 4) escrow: receber do vendedor e pagar do comprador
s = sub(s, """    D.contratos.forEach(function (ct) {
      var chave = ct.id;
      var vendedor = ct.vendedor;
      if (ps.indexOf(vendedor) < 0) return;""",
    """    D.contratos.forEach(function (ct) {
      var vendedor = ct.vendedor;
      var euSouComprador = usuarioAtual() === ct.comprador;
      if (ps.indexOf(vendedor) < 0 && !euSouComprador) return;""", alvo='erp')
s = sub(s, """      var titulo = {
        id: 'TR-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.contrato; }).length + 1),
        tipo: 'RECEBER', contraparte: nomeOrg(ct.comprador),""",
    """      var titulo = {
        id: 'TR-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.contrato; }).length + 1),
        tipo: 'RECEBER', contraparte: nomeOrg(ct.comprador),""", alvo='erp')
s = sub(s, """      erp().titulos.push(titulo);
      criados.push(titulo);
    });""",
    """      erp().titulos.push(titulo);
      criados.push(titulo);
      /* o outro lado do escrow: quem compra tem a obrigação registrada */
      if (euSouComprador) {
        var pagavel = {
          id: 'TP-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.tipo === 'PAGAR'; }).length + 1),
          tipo: 'PAGAR', contraparte: nomeOrg(ct.vendedor),
          descricao: 'Contrato ' + ct.id + ' em escrow — obrigação de liberar o pagamento de ' + ct.quantidade + ' ' + ct.unidade + ' de ' + Dados.nomeProduto(ct.produto),
          valor: ct.valorTotal, emissao: HOJE.toISOString().slice(0, 10),
          vencimento: addDias(HOJE.toISOString().slice(0, 10), 15),
          status: (liberacao && liberacao.status === 'CONCLUIDA') ? 'PAGO' : 'ABERTO',
          produtor: vendedor, origem: 'ESCROW', contrato: ct.id, documento: ct.id,
          banco: 'Conta escrow do consórcio',
          composicao: ct.etapas.map(function (e) { return { nome: e.nome, status: e.status, data: e.data }; })
        };
        erp().titulos.push(pagavel);
        criados.push(pagavel);
      }
    });""", alvo='erp')
s = sub(s, """  function escopoAtual() { return escopo(global.App && global.App.usuario ? global.App.usuario : 'U-01'); }""",
    """  function escopoAtual() { return escopo(usuarioAtual()); }
  function usuarioAtual() { return (global.App && global.App.usuario) || 'U-01'; }""", alvo='erp')

# ------------------------------------------------- 5) baixa de insumo nunca no futuro
s = sub(s, """        plano.linhas.forEach(function (a, k) {
          if (!(a.valor > 0) || item.saldo <= 0) return;""",
    """        plano.linhas.forEach(function (a, k) {
          if (!(a.valor > 0) || item.saldo <= 0) return;
          /* dentro do mês corrente, a baixa é datada no dia de hoje */
          var dataBaixa = dia(10 + (k % 12));
          var hojeISO = HOJE.toISOString().slice(0, 10);
          if (dataBaixa > hojeISO) dataBaixa = hojeISO;""", alvo='erp')
s = sub(s, """          erp.movimentos.push({
            id: novoId('MV'), data: dia(10 + (k % 12)), item: item.id, itemNome: item.nome, categoria: item.categoria,
            tipo: 'SAIDA', qtd: qtd, custoUnit: item.custoMedio, valor: valor, saldoApos: item.saldo,""",
    """          erp.movimentos.push({
            id: novoId('MV'), data: dataBaixa, item: item.id, itemNome: item.nome, categoria: item.categoria,
            tipo: 'SAIDA', qtd: qtd, custoUnit: item.custoMedio, valor: valor, saldoApos: item.saldo,""", alvo='erp')
s = sub(s, """          lancar(erp, {
            data: dia(10 + (k % 12)), conta: item.conta,""",
    """          lancar(erp, {
            data: dataBaixa, conta: item.conta,""", alvo='erp')

# ------------------------------------------------- 6) evidência de sensor: janela por data da aplicação
ini = s.index("  function evidenciaSensor(talhaoId) {")
fim = s.index("  /* =====================================================================\n   * ALERTAS DO ERP")
novo = """  /** Janela de molhamento anterior a uma data, montada a partir do clima
      diário do consórcio (chuva e umidade) — vale para qualquer data, não só
      para os últimos 7 dias como a leitura instantânea do sensor. */
  function janelaClimatica(talhaoId, dataRef) {
    var t = Dados.talhao(talhaoId);
    var u = usuario(t.produtor);
    var serie = (D.clima[u.municipio] || []).filter(function (d) { return d.data < dataRef; });
    var janela = serie.slice(-7);
    if (!janela.length) return null;
    var chuva = soma(janela, function (d) { return d.chuvaMm; });
    var urMedia = arred(soma(janela, function (d) { return d.umidadeRel; }) / janela.length, 0);
    var diasChuvosos = janela.filter(function (d) { return d.chuvaMm >= 4; }).length;
    var diasUrAlta = janela.filter(function (d) { return d.umidadeRel > 88; }).length;
    /* condição de infecção: chuva acumulada relevante ou noites seguidas de UR alta */
    var favoravel = chuva >= 12 || diasUrAlta >= 4;
    return {
      de: janela[0].data, ate: janela[janela.length - 1].data, dias: janela.length,
      chuvaMm: arred(chuva, 1), urMedia: urMedia, diasChuvosos: diasChuvosos, diasUrAlta: diasUrAlta,
      favoravel: favoravel, municipio: u.municipio,
      formula: 'chuva acumulada ≥ 12 mm ou 4 noites com UR > 88% nos 7 dias anteriores · clima diário do consórcio (' + u.municipio + ')'
    };
  }

  function evidenciaSensor(talhaoId) {
    var talhao = Dados.talhao(talhaoId);
    if (!talhao) return null;
    var hojeISO = HOJE.toISOString().slice(0, 10);
    var aplicacoes = erp().lancamentos.filter(function (l) { return l.talhao === talhaoId && l.conta === '4.1.02'; })
      .slice(-3).reverse().map(function (l) {
        var janela = janelaClimatica(talhaoId, l.data);
        var recente = (HOJE - new Date(l.data + 'T12:00:00-04:00')) / 86400000 <= 7;
        var sensor = (recente && global.IoT) ? global.IoT.molhamentoFoliar(talhaoId, 7) : null;
        var justificada = sensor ? sensor.horasFavoraveis >= 18 : (janela ? janela.favoravel : null);
        return {
          lancamento: l.id, data: l.data, descricao: l.descricao, valor: l.valor,
          janela: janela ? (janela.de + ' a ' + janela.ate) : null,
          chuvaMm: janela ? janela.chuvaMm : null, urMedia: janela ? janela.urMedia : null,
          diasUrAlta: janela ? janela.diasUrAlta : null, diasChuvosos: janela ? janela.diasChuvosos : null,
          horasFavoraveis: sensor ? sensor.horasFavoraveis : null,
          sensor: sensor ? sensor.sensor : null,
          fonte: sensor ? (sensor.sensor ? 'sensor de molhamento foliar ' + sensor.sensor : 'estação meteorológica, últimos 7 dias')
                        : (janela ? 'clima diário do consórcio em ' + janela.municipio : 'sem medição'),
          leitura: sensor
            ? sensor.horasFavoraveis + ' h de molhamento favorável nos últimos 7 dias (máx. ' + sensor.maxHorasContinuas + ' h contínuas)'
            : (janela ? janela.chuvaMm + ' mm de chuva e ' + janela.diasUrAlta + ' noites com UR > 88% nos 7 dias anteriores' : 'sem medição no talhão'),
          justificada: justificada,
          conclusao: justificada === null ? 'Sem medição: o custo entra na conta sem evidência.'
            : justificada ? 'Aplicação justificada: a janela medida passou do limiar de ação para ' + (talhao.produto === 'cacau' ? 'vassoura-de-bruxa e podridão-parda' : 'ferrugem e cercosporiose') + '.'
            : 'Aplicação preventiva: a janela medida ficou abaixo do limiar — custo sem evidência de necessidade.'
        };
      });
    var irr = global.IoT ? global.IoT.eficienciaIrrigacao(talhaoId) : null;
    var energia = erp().lancamentos.filter(function (l) { return l.talhao === talhaoId && l.conta === '4.1.08'; });
    var custoEnergia = soma(energia, function (l) { return l.valor; });
    var periodoEnergia = energia.length ? (energia[0].data + ' a ' + energia[energia.length - 1].data) : null;
    /* qualidade do lote: o índice de fermentação medido e a nota que definiu o preço */
    var lotesDoTalhao = D.lotes.filter(function (l) { return l.talhao === talhaoId && l.produtor === talhao.produtor; }).map(function (l) {
      var ajuste = IA.precoAjustado(l);
      var fer = (global.IoT && l.produto === 'cacau') ? global.IoT.fermentacao(l.id) : null;
      return {
        lote: l.id, produto: l.produto, quantidade: l.quantidade, unidade: l.unidade, status: l.status,
        qualidade: l.qualidade, nota: ajuste.score, ajustePct: ajuste.ajustePct,
        precoBase: ajuste.base, precoAjustado: ajuste.ajustado * (l.produto === 'cacau' ? 15 : 1),
        indiceFermentacao: fer ? fer.indice : null, classeFermentacao: fer ? fer.classe : null,
        conclusao: 'Nota ' + ajuste.score + ' de qualidade (' + (ajuste.ajustePct > 0 ? '+' : '') + ajuste.ajustePct + '% sobre a cotação)' +
          (fer ? ' · índice de fermentação ' + fer.indice + ' °C·h (' + fer.classe + ')' : '')
      };
    });
    return {
      talhao: talhaoId, nome: talhao.nome, aplicacoes: aplicacoes,
      irrigacao: irr ? {
        lamina7d: irr.aplicado7d, chuva7d: irr.chuva7d, suprimento7d: irr.suprimento7d, et0_7d: irr.demandaEt0_7d,
        coberturaPct: irr.coberturaEt0Pct, situacao: irr.situacao,
        custoEnergia: arred(custoEnergia, 2), periodoEnergia: periodoEnergia,
        conclusao: 'A lâmina aplicada em 7 dias cobre ' + irr.coberturaEt0Pct + '% da ET0 medida; a energia do talhão soma R$ ' + arred(custoEnergia, 2) + ' no período. O ERP mostra o custo; o sensor mostra se o manejo que o gerou tinha base medida.'
      } : null,
      lotes: lotesDoTalhao,
      resumo: 'Cruzamento entre o lançamento de custo do ERP, a medição de campo e a nota de qualidade que definiu o preço: é isso que transforma nota fiscal em decisão agronômica auditável.'
    };
  }

"""
s = s[:ini] + novo + s[fim:]

# ------------------------------------------------- 7) rótulos do orçado x realizado
s = sub(s, """      x.situacao = x.ehReceita
        ? (x.atingimentoPct >= pctAno ? 'acima do ritmo' : x.atingimentoPct >= pctAno * 0.85 ? 'dentro do esperado' : 'abaixo do ritmo')
        : (x.atingimentoPct <= pctAno * 0.95 ? 'dentro do orçamento' : x.atingimentoPct <= pctAno * 1.15 ? 'atenção' : 'acima do orçamento');""",
    """      x.situacao = x.ehReceita
        ? (x.atingimentoPct >= pctAno ? 'no ritmo ou acima' : x.atingimentoPct >= pctAno * 0.85 ? 'dentro do esperado' : 'abaixo do ritmo')
        : (x.atingimentoPct <= pctAno * 1.02 ? 'dentro do orçamento' : x.atingimentoPct <= pctAno * 1.15 ? 'levemente acima do ritmo' : 'acima do orçamento');""",
    alvo='erp')

open(P, 'w', encoding='utf-8').write(s)
print('patch v5 aplicado — erp %d bytes, ledger %d bytes' % (len(s), len(sl)))
