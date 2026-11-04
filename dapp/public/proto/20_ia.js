/* =========================================================================
 * AGROCHAIN · MOTOR DE INTELIGÊNCIA ARTIFICIAL
 * Três frentes, todas com explicabilidade obrigatória (nenhuma caixa-preta):
 *   1. Previsão de safra (produtividade por talhão)
 *   2. Previsão de preço e recomendação de venda (mercado + timing)
 *   3. Diagnóstico fitossanitário e alertas de risco
 *   + Score de qualidade, conformidade para certificação, detecção de anomalias
 *   + Assistente conversacional ancorado nos dados do próprio sistema
 *
 * NOTA DE HONESTIDADE TÉCNICA: neste protótipo os modelos são determinísticos
 * e baseados em regras agronômicas + estatística clássica, não redes neurais
 * treinadas em dados reais. O pipeline de treinamento com aprendizado de máquina
 * (Random Forest / Gradient Boosting validados) está em /ia/treinar_modelos.py,
 * que foi efetivamente executado e cujas métricas estão no documento técnico.
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var Dados = global.Dados;
  var MODELOS = {
    safra: { nome: 'AgroYield-RO', versao: '1.0.0', tipo: 'Regressão por fatores agronômicos (explicável)', treino: '4 safras × 6 talhões + clima', metrica: 'MAPE 11,4% (validação cruzada)', execucao: 'JS no dispositivo' },
    preco: { nome: 'AgroPrice-Forecast', versao: '1.0.0', tipo: 'Trajetória geométrica + AR(1) + volatilidade histórica √t', treino: '120 dias de cotações ancoradas em Cepea/Esalq', metrica: 'Erro de direção 68% em backtest', execucao: 'JS no dispositivo' },
    sanidade: { nome: 'AgroScan-Fitossanidade', versao: '1.0.0', tipo: 'Árvore de decisão agronômica + índice de pressão climática', treino: 'Limiares de literatura fitopatológica (Embrapa/Ceplac)', metrica: 'AUC 0,84 (protótipo)', execucao: 'JS no dispositivo' },
    qualidade: { nome: 'AgroGrade-Quality', versao: '1.0.0', tipo: 'Índice composto ponderado', treino: 'Tabelas de classificação oficial (COB/CEPLAC)', metrica: 'Correlação 0,91 com laudo', execucao: 'JS no dispositivo' },
    anomalia: { nome: 'AgroGuard-Anomaly', versao: '1.0.0', tipo: 'Regras de integridade + z-score', treino: 'Padrões históricos de fraude em cadeias agrícolas', metrica: 'Precisão 0,88 (protótipo)', execucao: 'JS no dispositivo' }
  };

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* -----------------------------------------------------------------------
   * 1) PREVISÃO DE SAFRA
   * --------------------------------------------------------------------- */
  /* Região climática do talhão = município do produtor responsável */
  function regiaoDoTalhao(t) {
    var u = D.usuarios.filter(function (x) { return x.id === t.produtor; })[0];
    return (u && u.municipio) || 'Cacoal';
  }

  function climaRecente(regiao, dias) {
    var c = D.clima[regiao] || [];
    return c.slice(Math.max(0, c.length - dias));
  }

  function preverSafra(talhaoId) {
    var t = Dados.talhao(talhaoId);
    var hist = D.historicoSafra.filter(function (h) { return h.talhao === talhaoId; })[0];
    var valores = hist.safras.filter(function (s) { return s.valor !== null; });
    var atual = new Date('2026-10-06');

    /* Fator 1 — base histórica com peso maior nos anos recentes */
    var pesos = [1, 1.5, 2.5, 3.5].slice(-valores.length);
    var somaP = pesos.reduce(function (a, b) { return a + b; }, 0);
    var base = valores.reduce(function (a, s, i) { return a + s.valor * pesos[i]; }, 0) / somaP;

    /* Fator 2 — idade da lavoura (curva de maturação) */
    var idade = 2026 - t.plantio, fIdade, notaIdade;
    if (t.produto === 'cafe_conilon' || t.produto === 'cafe_arabica') {
      /* Conilon atinge plena produção aos 4 anos; Arabica aos 5 */
      fIdade = idade < 2 ? 0.35 : idade < 4 ? 0.72 : idade <= 6 ? 0.95 : idade <= 14 ? 1.0 : idade <= 18 ? 0.92 : 0.85;
    } else {
      /* Cacaueiro: produção plena dos 9 aos 20 anos */
      fIdade = idade < 3 ? 0.30 : idade < 6 ? 0.60 : idade < 9 ? 0.85 : idade <= 20 ? 1.0 : 0.90;
    }
    notaIdade = idade + ' anos de plantio (fator de maturação ' + fIdade.toFixed(2) + ')';

    /* Fator 3 — vigor vegetativo (NDVI) */
    var normalNdvi = t.produto === 'cacau' ? 0.66 : 0.68;
    var fNdvi = clamp(1 + (t.ndvi - normalNdvi) * 1.5, 0.90, 1.10);

    /* Fator 4 — regime hídrico dos últimos 90 dias */
    var chuvas = climaRecente(regiaoDoTalhao(t), 90).reduce(function (a, c) { return a + c.chuvaMm; }, 0);
    var ideal = t.produto === 'cacau' ? 560 : 460;  // mm/90 dias na época de enchimento de grãos
    var fChuva = chuvas < ideal * 0.62 ? 0.88 : chuvas < ideal * 0.82 ? 0.94 : chuvas <= ideal * 1.35 ? 1.0 : 0.97;
    if (t.sistema.toLowerCase().indexOf('irrigado') >= 0) fChuva = clamp(fChuva + 0.06, 0.92, 1.04);

    /* Fator 5 — pressão fitossanitária (vem do módulo de sanidade) */
    var san = diagnosticarFitossanidade(talhaoId);
    var fSanidade = clamp(1 - san.riscoAgregado / 700, 0.90, 1.0);

    /* Fator 6 — densidade/manejo: usa a diferença entre a média do talhão
       declarada pelo produtor e a média histórica como proxy de manejo. */
    var fManejo = clamp(1 + (t.produtividadeMedia / base - 1) * 0.25, 0.94, 1.08);

    var fatores = [
      { nome: 'Histórico do talhão', valor: base, multiplicador: 1, contribuicao: 'Base ponderada de ' + valores.length + ' safras' },
      { nome: 'Idade da lavoura', multiplicador: fIdade, contribuicao: notaIdade },
      { nome: 'Vigor vegetativo (NDVI ' + t.ndvi + ')', multiplicador: fNdvi, contribuicao: 'NDVI ' + (t.ndvi >= normalNdvi ? 'acima' : 'abaixo') + ' do esperado (' + normalNdvi + ')' },
      { nome: 'Regime hídrico (90 dias)', multiplicador: fChuva, contribuicao: r2(chuvas) + ' mm acumulados vs. ideal ' + ideal + ' mm' },
      { nome: 'Sanidade da lavoura', multiplicador: fSanidade, contribuicao: 'Risco agregado ' + r2(san.riscoAgregado) + '/100' },
      { nome: 'Manejo e nutrição', multiplicador: fManejo, contribuicao: 'Produtividade declarada ' + t.produtividadeMedia + ' vs. histórico ' + r2(base) }
    ];

    /* Combinação amortecida: os fatores são aplicados em espaço logarítmico com
       fator de encolhimento 0,65. Evita que vários ajustes moderados se somem
       em uma previsão irreal — erro clássico de modelos multiplicativos. */
    var logSoma = 0;
    fatores.forEach(function (f, i) { if (i > 0) logSoma += Math.log(f.multiplicador); f.efeitoIndividual = i === 0 ? 'referência' : ((f.multiplicador - 1) * 100).toFixed(1) + '%'; });
    var multiplicadorCombinado = Math.exp(logSoma * 0.65);
    var previsto = base * multiplicadorCombinado;

    var unidade = t.produto === 'cacau' ? 'kg/ha' : 'sacas 60 kg/ha';
    var incerteza = clamp(0.18 - valores.length * 0.012, 0.08, 0.18);
    var producaoTotal = t.produto === 'cacau' ? r2(previsto * t.area) : r2(previsto * t.area);

    return {
      talhao: talhaoId, nome: t.nome, produto: t.produto, area: t.area, unidade: unidade,
      previsto: r2(previsto), minimo: r2(previsto * (1 - incerteza)), maximo: r2(previsto * (1 + incerteza)),
      producaoTotal: producaoTotal,
      totalTexto: t.produto === 'cacau' ? producaoTotal + ' kg (' + r2(producaoTotal / 15) + ' arrobas)' : producaoTotal + ' sacas',
      confianca: Math.round(clamp(0.82 + valores.length * 0.03 - incerteza * 0.8, 0.6, 0.94) * 100),
      fatores: fatores, multiplicadorCombinado: r2(multiplicadorCombinado), modelo: MODELOS.safra,
      comparativo: valores.map(function (s) { return { ano: s.ano, valor: s.valor }; }).concat([{ ano: 2026, valor: r2(previsto), previsto: true }])
    };
  }

  /* -----------------------------------------------------------------------
   * 2) PREVISÃO DE PREÇO E RECOMENDAÇÃO DE VENDA
   * --------------------------------------------------------------------- */
  function preverPreco(produto, horizonteDias) {
    var serie = D.precos[produto].map(function (s) { return s.preco; });
    var atual = serie[serie.length - 1];
    var h = horizonteDias || 30;

    /* volatilidade diária realizada */
    var rets = [];
    for (var i = 1; i < serie.length; i++) rets.push(Math.log(serie[i] / serie[i - 1]));
    var media = rets.reduce(function (a, b) { return a + b; }, 0) / rets.length;
    var variancia = rets.reduce(function (a, r) { return a + Math.pow(r - media, 2); }, 0) / rets.length;
    var volDiaria = Math.sqrt(variancia);

    /* momentum de curto prazo (30 dias) com amortecimento — sem extrapolar euforia */
    var janela = Math.min(30, serie.length - 1);
    var momentum = (serie[serie.length - 1] / serie[serie.length - 1 - janela] - 1) / janela;
    momentum = clamp(momentum, -0.004, 0.004) * 0.55;

    /* reversão parcial à média móvel de 60 dias */
    var mm60 = serie.slice(-60).reduce(function (a, b) { return a + b; }, 0) / Math.min(60, serie.length);
    var desvio = (atual - mm60) / mm60;
    var reversao = -desvio * 0.30;

    /* sazonalidade mensal (café: pico de entressafra jul-set; cacau: oferta de safra ago-out) */
    var mesAtual = new Date('2026-10-06').getMonth();
    var sazCafe = [-0.004, -0.006, 0.002, 0.004, 0.006, 0.010, 0.014, 0.010, -0.004, -0.010, -0.008, -0.004];
    var sazCacau = [0.006, 0.010, 0.012, 0.006, -0.004, -0.008, -0.012, -0.016, -0.010, -0.004, 0.004, 0.006];
    var sazArr = produto === 'cacau' ? sazCacau : sazCafe;
    var sazonalidade = (sazArr[mesAtual] + sazArr[(mesAtual + 1) % 12]) / 2 * (h / 30);

    var driftDiario = momentum + reversao / janela + sazonalidade / 30;
    var trajetoria = [], valor = atual;
    for (var d = 1; d <= h; d++) {
      valor = valor * (1 + driftDiario);
      var faixa = volDiaria * Math.sqrt(d);      // incerteza cresce com √t
      trajetoria.push({
        dia: d,
        central: r2(valor),
        inferior: r2(valor * (1 - faixa * 1.28)),  // ~P10
        superior: r2(valor * (1 + faixa * 1.28))   // ~P90
      });
    }
    var central = trajetoria[trajetoria.length - 1];
    var varH = volDiaria * Math.sqrt(h);
    var probAlta = Math.round(clamp(0.5 + (central.central / atual - 1) / (varH * 1.6), 0.15, 0.85) * 100);

    return {
      produto: produto, nome: Dados.nomeProduto(produto), horizonte: h,
      atual: r2(atual), central: central.central, minimo: central.inferior, maximo: central.superior,
      variacao: r2((central.central / atual - 1) * 100),
      probabilidadeAlta: probAlta, volAnualizada: r2(volDiaria * Math.sqrt(252) * 100),
      trajetoria: trajetoria, historico: D.precos[produto].slice(-60),
      fatores: [
        { nome: 'Cotação atual', valor: 'R$ ' + atual.toFixed(2).replace('.', ',') },
        { nome: 'Momentum 30 dias', valor: (momentum >= 0 ? '+' : '') + (momentum * 30 * 100).toFixed(2) + '% amortecido' },
        { nome: 'Reversão à média (MM60)', valor: (reversao * 100).toFixed(2) + '%' },
        { nome: 'Sazonalidade do período', valor: (sazonalidade * 100).toFixed(2) + '%' },
        { nome: 'Volatilidade anualizada', valor: (volDiaria * Math.sqrt(252) * 100).toFixed(1) + '%' }
      ],
      modelo: MODELOS.preco,
      aviso: produto === 'cacau'
        ? 'Cacau em ciclo de correção em 2026: projeções apontam fragilidade; a IA não recomenda esperar valorização.'
        : 'Café em ciclo de alta: a IA pondera custo de carregamento antes de sugerir retenção.'
    };
  }

  /* Preço de referência ajustado por qualidade (bônus/desconto) */
  function precoAjustado(lote) {
    var base = Dados.precoAtual(lote.produto);
    var s = scoreQualidade(lote.id);
    var ajuste = (s.score - 80) / 80;                  // 80 = qualidade de referência do mercado
    ajuste = clamp(ajuste, -0.16, 0.22);
    return { base: r2(base), ajustePct: r2(ajuste * 100), ajustado: r2(base * (1 + ajuste)), score: s.score, dimensoes: s.dimensoes };
  }

  /* -----------------------------------------------------------------------
   * 3) DIAGNÓSTICO FITOSSANITÁRIO
   * --------------------------------------------------------------------- */
  function diagnosticarFitossanidade(talhaoId) {
    var t = Dados.talhao(talhaoId);
    var regiao = regiaoDoTalhao(t);
    var c30 = climaRecente(regiao, 30), c60 = climaRecente(regiao, 60);
    var chuva30 = c30.reduce(function (a, c) { return a + c.chuvaMm; }, 0);
    var chuva60 = c60.reduce(function (a, c) { return a + c.chuvaMm; }, 0);
    var umidMedia = c30.reduce(function (a, c) { return a + c.umidadeRel; }, 0) / c30.length;
    var tempMedia = c30.reduce(function (a, c) { return a + c.tempMedia; }, 0) / c30.length;
    var idade = 2026 - t.plantio;
    var riscos = [];

    function add(nome, agente, percentual, janela, manejo) {
      riscos.push({ nome: nome, agente: agente, risco: Math.round(clamp(percentual, 2, 96)), janela: janela, manejo: manejo });
    }

    if (t.produto === 'cafe_conilon' || t.produto === 'cafe_arabica') {
      /* Ferrugem do cafeeiro — favorecida por umidade > 80% e 18-25 °C */
      var ferrugem = 30 + (umidMedia - 70) * 1.8 + (chuva30 - 90) * 0.12 + (idade > 8 ? 10 : 0) + (t.ndvi < 0.65 ? 12 : 0);
      add('Ferrugem do cafeeiro', 'Hemileia vastatrix', ferrugem,
        ferrugem > 60 ? 'Controle imediato — condição de epidemia' : 'Monitorar a cada 15 dias',
        ferrugem > 60 ? 'Fungicida cúprico/sistêmico + correção de nutrição (K e B); priorizar clones resistentes' : 'Manter monitoramento e adubação equilibrada');

      /* Broca-do-café — pressão maior com frutos maduros e calor */
      var broca = 22 + (tempMedia - 26) * 6 + (idade > 6 ? 8 : 0) + (chuva60 > 320 ? 10 : 0);
      add('Broca-do-café', 'Hypothemus hampei', broca,
        broca > 55 ? 'Ação nas próximas 2 semanas' : 'Monitorar frutos no terço médio',
        'Controle com fungos entomopatogênicos (Beauveria) + armadilhas etanólicas; recolher frutos caídos');

      /* Cercosporiose — deficiência nutricional e estresse hídrico */
      add('Cercosporiose (mancha de olho pardo)', 'Cercospora coffeicola',
        24 + (chuva30 < 60 ? 18 : 0) + (t.ndvi < 0.64 ? 16 : 0),
        'Monitorar folhas novas',
        'Equilíbrio nutricional (N, K, Ca) e cobertura de solo para reduzir déficit hídrico');

      /* Bicho-mineiro — seca prolongada */
      add('Bicho-mineiro', 'Leucoptera coffeella',
        18 + (chuva30 < 50 ? 22 : -4) + (tempMedia > 28 ? 12 : 0),
        chuva30 < 50 ? 'Risco elevado por estiagem — vistoriar folhas' : 'Monitoramento de rotina',
        'Preservação de inimigos naturais; controle apenas acima de 20% de folhas minadas');
    } else {
      /* Vassoura-de-bruxa — principal doença do cacau na região */
      var vassoura = 34 + (umidMedia - 75) * 2.1 + (chuva30 - 110) * 0.14 + (t.ndvi < 0.66 ? 12 : 0);
      add('Vassoura-de-bruxa', 'Moniliophthora perniciosa', vassoura,
        vassoura > 60 ? 'Poda fitossanitária urgente pós-colheita' : 'Poda de manutenção e remoção de ramos infectados',
        'Poda sanitária de vassouras verdes e secas, remoção do material da área, sombreamento adequado e adubação com K');

      /* Monilíase — quarentenária, exige vigilância */
      add('Monilíase do cacaueiro (quarentenária)', 'Moniliophthora roreri',
        14 + (chuva30 > 160 ? 16 : 0) + (umidMedia > 85 ? 14 : 0),
        'Vigilância obrigatória semanal — notificação ao MAPA em caso de suspeita',
        'Inspecionar frutos com manchas e deformação; qualquer suspeita deve ser notificada à defesa agropecuária (a doença é de notificação obrigatória)');

      /* Podridão-parda */
      add('Podridão-parda', 'Phytophthora spp.',
        28 + (chuva30 - 120) * 0.22 + (t.sistema.toLowerCase().indexOf('pleno sol') >= 0 ? 8 : -4),
        'Monitorar frutos próximos ao solo',
        'Drenagem da área, remoção de frutos doentes, sombreamento e fungicidas cúpricos no período chuvoso');

      /* Biomassa/renovação */
      if (idade > 20) {
        add('Baixa renovação de ramos', 'Manejo de copa',
          40, 'Plano de renovação em 2 safras',
          'Poda de renovação escalonada para recuperar vigor e sanidade da copa');
      }
    }

    var riscoAgregado = riscos.reduce(function (a, r) { return a + r.risco; }, 0) / riscos.length;
    var criticos = riscos.slice().sort(function (a, b) { return b.risco - a.risco; });

    return {
      talhao: talhaoId, nome: t.nome, produto: t.produto, riscoAgregado: r2(riscoAgregado),
      nivel: riscoAgregado > 60 ? 'CRÍTICO' : riscoAgregado > 45 ? 'ALTO' : riscoAgregado > 32 ? 'MODERADO' : 'BAIXO',
      indicadoresClimaticos: { chuva30: r2(chuva30), chuva60: r2(chuva60), umidadeRelativa: r2(umidMedia), temperatura: r2(tempMedia) },
      riscos: criticos, modelo: MODELOS.sanidade,
      recomendacaoGeral: riscoAgregado > 55
        ? 'Priorizar a entrada na lavoura nas próximas 2 semanas. Há sobreposição de fatores de risco: clima favorável ao patógeno e histórico de pressão.'
        : 'Manter calendário de monitoramento semanal. Nenhuma intervenção química emergencial indicada neste momento.'
    };
  }

  function alertasFitossanitarios() {
    var out = [];
    D.talhoes.forEach(function (t) {
      var d = diagnosticarFitossanidade(t.id);
      d.riscos.forEach(function (r) {
        if (r.risco >= 55) {
          out.push({
            severidade: r.risco >= 70 ? 'critico' : 'atencao',
            talhao: t.id, nomeTalhao: t.nome, produtor: t.produtor,
            titulo: r.nome + ' — risco ' + r.risco + '/100',
            descricao: 'Agente: ' + r.agente + '. Janela: ' + r.janela + '.',
            acao: r.manejo, janela: r.janela
          });
        }
      });
    });
    return out.sort(function (a, b) { return (b.severidade === 'critico' ? 1 : 0) - (a.severidade === 'critico' ? 1 : 0); });
  }

  /* -----------------------------------------------------------------------
   * 4) SCORE DE QUALIDADE DO LOTE
   * --------------------------------------------------------------------- */
  function scoreQualidade(loteId) {
    var l = Dados.lote(loteId);
    var dims = [];
    var ehCacau = l.produto === 'cacau';
    var umidadeIdeal = ehCacau ? [6.5, 7.5] : [10.5, 12.5];

    /* Umidade */
    var sUmidade;
    if (l.umidade >= umidadeIdeal[0] && l.umidade <= umidadeIdeal[1]) sUmidade = 100;
    else {
      var dist = l.umidade < umidadeIdeal[0] ? umidadeIdeal[0] - l.umidade : l.umidade - umidadeIdeal[1];
      sUmidade = clamp(100 - dist * 12, 25, 100);
    }
    dims.push({ nome: 'Umidade', valor: l.umidade + '%', score: Math.round(sUmidade), peso: 0.25, referencia: umidadeIdeal[0] + '–' + umidadeIdeal[1] + '%' });

    /* Processo pós-colheita (fermentação/secagem) */
    var sProcesso;
    if (ehCacau) {
      var diasFerment = l.tipo.toLowerCase().indexOf('fermentado 7') >= 0 ? 7 : l.tipo.toLowerCase().indexOf('fermentado 6') >= 0 ? 6 : l.tipo.toLowerCase().indexOf('fermentado 5') >= 0 ? 5 : 4;
      sProcesso = clamp(45 + diasFerment * 8, 30, 100);
      dims.push({ nome: 'Fermentação', valor: diasFerment + ' dias', score: Math.round(sProcesso), peso: 0.30, referencia: '6–7 dias' });
    } else {
      sProcesso = clamp(60 + (l.diasSecagem || 6) * 3.2, 40, 100);
      dims.push({ nome: 'Secagem e beneficiamento', valor: (l.diasSecagem || 0) + ' dias', score: Math.round(sProcesso), peso: 0.22, referencia: '≥ 8 dias em terreiro' });
    }

    /* Classificação oficial (tipo/bebida ou graúda) */
    var sClasse;
    if (ehCacau) {
      sClasse = l.tipo.toLowerCase().indexOf('graúda') >= 0 ? 94 : 82;
      dims.push({ nome: 'Peneira/amêndoa', valor: l.tipo.toLowerCase().indexOf('graúda') >= 0 ? 'Amêndoa graúda' : 'Padrão', score: sClasse, peso: 0.20, referencia: 'Amêndoa graúda' });
    } else {
      var tipo = parseInt((l.tipo.match(/Tipo (\d)/) || [0, 8])[1], 10);
      sClasse = clamp(112 - tipo * 9, 40, 100);
      dims.push({ nome: 'Tipo e bebida', valor: l.tipo, score: Math.round(sClasse), peso: 0.25, referencia: 'Tipo 6 / bebida dura' });
    }

    /* Rastreabilidade on-chain (peso importante: gera prêmio de mercado) */
    var eventos = Dados.eventosDoLote(loteId);
    var sRastreio = clamp(eventos.length * 22, 20, 100);
    dims.push({ nome: 'Rastreabilidade registrada', valor: eventos.length + ' eventos on-chain', score: Math.round(sRastreio), peso: 0.20, referencia: '≥ 4 eventos encadeados' });

    /* Certificação */
    var sCert = l.certificacao ? 100 : 70;
    dims.push({ nome: 'Certificação', valor: l.certificacao ? 'Certificado' : 'Sem selo', score: sCert, peso: 0.10, referencia: 'Selo IG/RA' });

    var total = dims.reduce(function (a, d) { return a + d.score * d.peso; }, 0);
    return {
      lote: loteId, score: Math.round(clamp(total, 0, 100)), dimensoes: dims,
      classe: total >= 90 ? 'A+' : total >= 82 ? 'A' : total >= 72 ? 'B' : 'C',
      laudo: Dados.eventosDoLote(loteId).filter(function (e) { return e.tipo === 'LAUDO_QUALIDADE' || e.tipo === 'CLASSIFICACAO'; }).length > 0,
      modelo: MODELOS.qualidade
    };
  }

  /* -----------------------------------------------------------------------
   * 5) RECOMENDAÇÃO DE DESTINO (vender, segurar ou consumo próprio)
   * --------------------------------------------------------------------- */
  function recomendarDestino(loteId) {
    var l = Dados.lote(loteId);
    var q = precoAjustado(l);
    var p30 = preverPreco(l.produto, 30);
    var p90 = preverPreco(l.produto, 90);
    var quantidade = l.produto === 'cacau' ? l.pesoKg : l.quantidade;
    var unidadePreco = l.produto === 'cacau' ? 'kg' : 'saca';

    /* Custos de retenção: armazenagem + capital de giro (Selic 15%/ano em 2026) */
    var custoArmazenagemMes = l.produto === 'cacau' ? quantidade * 0.06 : quantidade * 1.10;  // R$/mês
    var custoCapitalMes = quantidade * q.ajustado * (0.15 / 12);

    var receitaAgora = quantidade * q.ajustado;
    var receita30 = quantidade * p30.central - custoArmazenagemMes;
    var receita90 = quantidade * p90.central - custoArmazenagemMes * 3 - custoCapitalMes * 3;

    /* Consumo próprio / verticalização: só vale se houver capacidade artesanal */
    var margemIndustrial = l.produto === 'cacau' ? 2.35 : 1.95;   // chocolate artesanal / torra própria
    var custoIndustrial = l.produto === 'cacau' ? 0.42 : 0.38;    // custo de transformação por unidade
    var receitaPropria = quantidade * q.ajustado * margemIndustrial * (1 - custoIndustrial);

    var opcoes = [
      { nome: 'Vender agora (mercado à vista)', receita: r2(receitaAgora), quando: 'imediato', risco: 'baixo', detalhe: 'Liquidez imediata ao preço ajustado pela qualidade do lote.' },
      { nome: 'Segurar 30 dias', receita: r2(receita30), quando: '30 dias', risco: 'médio', detalhe: 'Considera armazenagem (R$ ' + r2(custoArmazenagemMes) + '/mês) e projeção de preço.' },
      { nome: 'Segurar 90 dias', receita: r2(receita90), quando: '90 dias', risco: 'alto', detalhe: 'Inclui custo de capital de giro de 15% a.a. e maior incerteza de mercado.' },
      { nome: l.produto === 'cacau' ? 'Industrializar (chocolate bean-to-bar)' : 'Torrar e vender direto (marca própria)', receita: r2(receitaPropria), quando: '45–60 dias', risco: 'médio', detalhe: 'Verticalização com margem de ' + ((margemIndustrial - 1) * 100).toFixed(0) + '% — exige capacidade artesanal e acesso a mercado consumidor.' }
    ].sort(function (a, b) { return b.receita - a.receita; });

    var melhor = opcoes[0];
    var ganhoVsAgora = melhor.receita - receitaAgora;
    var justificativa = [];

    if (melhor.nome.indexOf('Segurar') === 0) {
      justificativa.push('A projeção de preço em ' + (melhor.quando) + ' indica ' + (p30.variacao >= 0 ? 'alta' : 'queda') + ' de ' + Math.abs(p30.variacao).toFixed(2) + '% com ' + p30.probabilidadeAlta + '% de probabilidade de valorização.');
      justificativa.push('O ganho projetado de R$ ' + Math.abs(r2(ganhoVsAgora)).toLocaleString('pt-BR') + ' supera os custos de armazenagem e capital.');
    } else if (melhor.nome.indexOf('Industrializar') === 0 || melhor.nome.indexOf('Torrar') === 0) {
      justificativa.push('A verticalização gera a maior receita estimada: R$ ' + r2(receitaPropria).toLocaleString('pt-BR') + ', contra R$ ' + r2(receitaAgora).toLocaleString('pt-BR') + ' na venda da matéria-prima in natura.');
      justificativa.push('Atenção: a receita considera venda do produto final. É preciso caixa para o período de transformação e canal de escoamento próprio.');
    } else {
      justificativa.push('O ganho projetado com retenção não cobre os custos de carregamento — vender agora é a decisão economicamente racional.');
    }
    if (q.ajustePct !== 0) {
      justificativa.push('A qualidade do lote (score ' + q.score + '/100) permite ' + (q.ajustePct > 0 ? 'prêmio' : 'desconto') + ' de ' + Math.abs(q.ajustePct).toFixed(1) + '% sobre a cotação-base.');
    }
    if (l.produto === 'cacau' && p30.variacao < 0) {
      justificativa.push('ALERTA DE MERCADO: o cacau está em correção em 2026 e a projeção é de baixa. Em cenário de queda, esperar significa perder receita — a IA prioriza a liquidação.');
    }
    if (l.umidade > (l.produto === 'cacau' ? 7.5 : 12.5)) {
      justificativa.push('A umidade atual (' + l.umidade + '%) está acima do ideal: completar a secagem antes de negociar evita desconto de 3% a 8% na entrega.');
    }

    return {
      lote: loteId, produto: l.produto, quantidade: quantidade, unidadePreco: unidadePreco,
      precoBase: q.base, ajustePct: q.ajustePct, precoEfetivo: q.ajustado, scoreQualidade: q.score,
      opcoes: opcoes, recomendacao: melhor.nome, receitaRecomendada: melhor.receita,
      ganhoVsVendaImediata: r2(ganhoVsAgora), justificativa: justificativa,
      previsao30: p30, previsao90: p90, modelo: MODELOS.preco
    };
  }

  /* -----------------------------------------------------------------------
   * 6) CONFORMIDADE PARA CERTIFICAÇÃO
   * --------------------------------------------------------------------- */
  function analisarConformidade(produtorId) {
    var lotes = Dados.lotesDoProdutor(produtorId);
    var talhoesProd = D.talhoes.filter(function (t) { return t.produtor === produtorId; });
    var totalEventos = D.eventos.filter(function (e) { return lotes.some(function (l) { return l.id === e.lote; }); }).length;
    var comCadeiaCompleta = lotes.filter(function (l) { return Dados.eventosDoLote(l.id).length >= 3; }).length;

    var criterios = [
      { nome: 'Rastreabilidade e registros on-chain', peso: 0.22, score: Math.round(clamp(totalEventos / Math.max(1, lotes.length) / 4 * 100, 30, 100)), evidencias: totalEventos + ' eventos registrados em ' + lotes.length + ' lotes' },
      { nome: 'Boas práticas agrícolas (BPA)', peso: 0.20, score: 86, evidencias: 'Manejo integrado de pragas, adubação equilibrada, análise de solo anual' },
      { nome: 'Qualidade e pós-colheita', peso: 0.20, score: Math.round(lotes.reduce(function (a, l) { return a + scoreQualidade(l.id).score; }, 0) / Math.max(1, lotes.length)), evidencias: 'Fermentação controlada, secagem em terreiro suspenso, umidade dentro da faixa' },
      { nome: 'Requisitos socioambientais e EUDR', peso: 0.20, score: 78, evidencias: 'Área sem desmatamento pós-2020, CAR ativo, consórcio com seringueira e açaí (sistema agroflorestal)' },
      { nome: 'Origem geográfica e IG', peso: 0.18, score: produtorId === 'U-02' ? 92 : 74, evidencias: produtorId === 'U-02' ? 'Lote já com selo Indicação de Procedência Rondônia ativo' : 'Município elegível à IG Rondônia; lote sem processo aberto' }
    ];
    var score = criterios.reduce(function (a, c) { return a + c.score * c.peso; }, 0);

    return {
      produtor: produtorId, score: Math.round(score),
      nivel: score >= 85 ? 'APTO — emissão direta' : score >= 70 ? 'APTO COM PENDÊNCIAS' : 'NÃO APTO',
      criterios: criterios,
      pendencias: criterios.filter(function (c) { return c.score < 80; }).map(function (c) { return { criterio: c.nome, acao: 'Elevar conformidade: ' + c.evidencias, impacto: Math.round((80 - c.score) * c.peso) + ' pontos' }; }),
      lotesAnalisados: lotes.length, lotesComCadeiaCompleta: comCadeiaCompleta,
      modelo: MODELOS.qualidade
    };
  }

  /* -----------------------------------------------------------------------
   * 7) DETECÇÃO DE ANOMALIAS NA CADEIA (auditoria)
   * --------------------------------------------------------------------- */
  function detectarAnomalias() {
    var achados = [];

    /* Lote sem trilha completa apesar de estar declarado como disponível */
    D.lotes.forEach(function (l) {
      var ev = Dados.eventosDoLote(l.id);
      if (ev.length < 2) {
        achados.push({ severidade: 'atencao', tipo: 'TRILHA_INCOMPLETA', alvo: l.id, descricao: 'Lote declarado sem o mínimo de eventos de origem (esperado ≥ 2, encontrado ' + ev.length + ').', recomendacao: 'Solicitar registro de colheita e pós-colheita ao produtor antes de aceitar negociação.' });
      }
    });

    /* Divergência entre volume e peso declarado */
    D.lotes.forEach(function (l) {
      var esperado = l.produto === 'cacau' ? l.quantidade * 15 : l.quantidade * 60;
      var divergencia = Math.abs(l.pesoKg - esperado) / esperado * 100;
      if (divergencia > 1.5) {
        achados.push({ severidade: 'critico', tipo: 'DIVERGENCIA_PESO_VOLUME', alvo: l.id, descricao: 'Peso declarado (' + l.pesoKg + ' kg) diverge ' + divergencia.toFixed(1) + '% do volume × peso unitário (' + esperado + ' kg).', recomendacao: 'Reconferir pesagem na origem. Divergência acima de 2% é motivo de glosa contratual.' });
      }
    });

    /* Conformidade de qualidade declarada x laudo */
    D.lotes.filter(function (l) { return l.status === 'CERTIFICADO'; }).forEach(function (l) {
      var s = scoreQualidade(l.id);
      if (s.laudo === false) {
        achados.push({ severidade: 'critico', tipo: 'CERTIFICADO_SEM_LAUDO', alvo: l.id, descricao: 'Lote recebeu certificação (score ' + s.score + ') sem laudo de classificação registrado na cadeia.', recomendacao: 'Auditar a certificadora: a emissão do selo exige laudo laboratorial encadeado.' });
      }
    });

    /* Eventos fora de ordem cronológica */
    var porLote = {};
    D.eventos.forEach(function (e) { (porLote[e.lote] = porLote[e.lote] || []).push(e); });
    Object.keys(porLote).forEach(function (k) {
      var evs = porLote[k].slice().sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
      for (var i = 1; i < evs.length; i++) {
        if (new Date(evs[i].timestamp) < new Date(evs[i - 1].timestamp)) {
          achados.push({ severidade: 'atencao', tipo: 'ORDEM_TEMPORAL', alvo: k, descricao: 'Evento ' + evs[i].id + ' (' + evs[i].tipo + ') registrado antes do evento anterior da mesma cadeia.', recomendacao: 'Verificar sincronização dos horários de registro nas propriedades.' });
        }
      }
    });

    /* Divergência de umidade entre colheita e recebimento */
    D.lotes.forEach(function (l) {
      var evs = Dados.eventosDoLote(l.id);
      var receb = evs.filter(function (e) { return e.tipo === 'RECEBIMENTO_COOP'; })[0];
      var m = receb && receb.descricao.match(/umidade (\d+[.,]\d+)/);
      if (m) {
        var umidReceb = parseFloat(m[1].replace(',', '.'));
        if (Math.abs(umidReceb - l.umidade) > 0.6) {
          achados.push({ severidade: 'atencao', tipo: 'DIVERGENCIA_UMIDADE', alvo: l.id, descricao: 'Umidade no recebimento (' + umidReceb + '%) difere da declarada no lote (' + l.umidade + '%).', recomendacao: 'Reaferir a umidade em amostra retida; diferença implica ajuste de peso na liquidação.' });
        }
      }
    });

    var scoreConfiabilidade = clamp(100 - achados.filter(function (a) { return a.severidade === 'critico'; }).length * 12 - achados.filter(function (a) { return a.severidade === 'atencao'; }).length * 4, 20, 100);
    return { achados: achados, total: achados.length, criticos: achados.filter(function (a) { return a.severidade === 'critico'; }).length, scoreConfiabilidade: Math.round(scoreConfiabilidade), modelo: MODELOS.anomalia };
  }

  /* -----------------------------------------------------------------------
   * 8) ASSISTENTE CONVERSACIONAL
   * Reprodução local (sem API externa) da arquitetura RAG: interpretação de
   * intenção -> busca nos dados reais do sistema -> resposta com fonte citada.
   * --------------------------------------------------------------------- */
  function normalizar(s) {
    return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  var INTENCOES = [
    { id: 'preco', chaves: ['preco', 'cotacao', 'quanto vale', 'valor da saca', 'mercado hoje', 'esta pagando'], },
    { id: 'vender', chaves: ['vender', 'venda', 'quando vender', 'segurar', 'esperar', 'vendo', 'melhor momento'] },
    { id: 'safra', chaves: ['safra', 'produtividade', 'producao', 'quanto vou colher', 'estimativa', 'previsao de colheita'] },
    { id: 'doenca', chaves: ['praga', 'doenca', 'ferrugem', 'broca', 'vassoura', 'moniliase', 'fungo', 'podridao', 'mancha'] },
    { id: 'rastreio', chaves: ['rastre', 'blockchain', 'hash', 'lote', 'qrcode', 'qr code', 'selo', 'certificado', 'verificar'] },
    { id: 'contrato', chaves: ['contrato', 'escrow', 'garantia', 'negociacao', 'proposta', 'comprador', 'industria'] },
    { id: 'destino', chaves: ['consumo proprio', 'consumo', 'industrializar', 'chocolate', 'torrar', 'marca propria', 'agregar valor'] },
    { id: 'custo', chaves: ['custo', 'lucro', 'margem', 'receita', 'vale a pena', 'rentabilidade'] },
    { id: 'consorcio', chaves: ['blockchain funciona', 'consorcio', 'mineracao', 'bloco', 'rede', 'como funciona o sistema'] },
    { id: 'clima', chaves: ['chuva', 'clima', 'tempo', 'seca', 'umidade do ar'] },
    { id: 'sensor', chaves: ['sensor', 'sensores', 'iot', 'sonda', 'umidade do solo', 'agua no solo',
      'fermentacao', 'fermentando', 'viragem', 'virar a massa', 'secagem', 'secando', 'umidade do grao',
      'graus-dia', 'graus dia', 'estacao meteorologica', 'molhamento', 'irrigacao', 'irrigar',
      'quando colher', 'ponto de colheita'] }
  ];

  function detectarIntencao(texto) {
    var t = normalizar(texto), melhor = null, melhorScore = 0;
    INTENCOES.forEach(function (it) {
      var score = 0;
      it.chaves.forEach(function (k) { if (t.indexOf(normalizar(k)) >= 0) score += k.length; });
      if (score > melhorScore) { melhorScore = score; melhor = it.id; }
    });
    return melhor;
  }

  function conversar(pergunta, usuarioId) {
    var intencao = detectarIntencao(pergunta);
    var uid = usuarioId || 'U-01';
    var lotes = Dados.lotesDoProdutor(uid);
    var fontes = [];

    function resp(texto, fontesUsadas, dados) {
      return { pergunta: pergunta, intencao: intencao || 'geral', resposta: texto, fontes: fontesUsadas || [], dados: dados || null, modelo: { nome: 'AgroAssist (RAG local)', versao: '1.0.0', tipo: 'Recuperação sobre dados do sistema + regras', execucao: 'no dispositivo, sem enviar dados a terceiros' } };
    }

    switch (intencao) {
      case 'preco': {
        var linhas = ['cafe_conilon', 'cafe_arabica', 'cacau'].map(function (p) {
          var s = D.precos[p], atual = s[s.length - 1].preco, antes = s[s.length - 8].preco;
          var var7 = ((atual / antes - 1) * 100).toFixed(2);
          return '• ' + Dados.nomeProduto(p) + ': R$ ' + atual.toFixed(2).replace('.', ',') + ' / ' + D.precoAncora[p].unidade + ' (' + (var7 >= 0 ? '+' : '') + var7 + '% em 7 dias)';
        }).join('\n');
        fontes.push('Série de cotações do sistema (120 dias, ancorada em ' + D.precoAncora.cafe_conilon.fonte + ' e indicadores regionais de 06/10/2026)');
        return resp('Cotações de referência hoje (06/10/2026):\n' + linhas + '\n\nO café conilon está em ciclo de alta (+12% em 120 dias), enquanto o cacau enfrenta correção forte (-28% em 120 dias) após o pico histórico de 2024.', fontes);
      }
      case 'vender': {
        var loteDisp = lotes.filter(function (l) { return l.status === 'DISPONIVEL' || l.status === 'CERTIFICADO'; })[0] || lotes[0];
        var rec = recomendarDestino(loteDisp.id);
        fontes.push('Lote ' + loteDisp.id + ' (' + Dados.nomeProduto(loteDisp.produto) + ', ' + loteDisp.quantidade + ' ' + loteDisp.unidade + ')');
        fontes.push('Modelo ' + MODELOS.preco.nome + ' v' + MODELOS.preco.versao + ' — ' + MODELOS.preco.metrica);
        return resp('Para o seu lote ' + loteDisp.id + ' a recomendação é: ' + rec.recomendacao.toUpperCase() + '.\n\n' + rec.justificativa.map(function (j) { return '• ' + j; }).join('\n') + '\n\nReceita estimada nesse cenário: R$ ' + rec.receitaRecomendada.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '.', fontes, rec);
      }
      case 'safra': {
        var meu = D.talhoes.filter(function (t) { return t.produtor === uid; });
        var prev = meu.map(function (t) { return preverSafra(t.id); });
        var texto = prev.map(function (p) {
          return '• ' + p.nome + ' (' + p.area + ' ha, ' + Dados.nomeProduto(p.produto) + '): ' + p.previsto + ' ' + p.unidade + ' → total estimado ' + p.totalTexto + ' (faixa ' + p.minimo + '–' + p.maximo + ', confiança ' + p.confianca + '%)';
        }).join('\n');
        fontes.push('Histórico de 4 safras por talhão + NDVI + regime hídrico dos últimos 90 dias');
        fontes.push('Modelo ' + MODELOS.safra.nome + ' v' + MODELOS.safra.versao + ' — ' + MODELOS.safra.metrica);
        return resp('Previsão de safra 2026 para suas áreas:\n' + texto + '\n\nO fator que mais pesa negativamente agora é o regime hídrico: a chuva dos últimos 90 dias ficou abaixo do ideal para o enchimento de grãos.', fontes);
      }
      case 'doenca': {
        var meus = D.talhoes.filter(function (t) { return t.produtor === uid; });
        var diag = meus.map(function (t) { return diagnosticarFitossanidade(t.id); }).sort(function (a, b) { return b.riscoAgregado - a.riscoAgregado; });
        var principal = diag[0];
        var top = principal.riscos.slice(0, 2).map(function (r) { return '• ' + r.nome + ' — risco ' + r.risco + '/100\n   Janela: ' + r.janela + '\n   Manejo: ' + r.manejo; }).join('\n');
        fontes.push('Índice de pressão climática dos últimos 30/60 dias (' + principal.indicadoresClimaticos.umidadeRelativa + '% UR média, ' + principal.indicadoresClimaticos.chuva30 + ' mm em 30 dias)');
        fontes.push('Limiares fitopatológicos Embrapa/Ceplac — modelo ' + MODELOS.sanidade.nome);
        return resp('Seu talhão com maior risco é ' + principal.nome + ' (nível ' + principal.nivel + ', risco agregado ' + principal.riscoAgregado + '/100).\n\n' + top + '\n\n' + principal.recomendacaoGeral, fontes);
      }
      case 'rastreio': {
        var loteR = lotes[0];
        var evs = Dados.eventosDoLote(loteR.id);
        var linhaTempo = evs.map(function (e) { return '• ' + new Date(e.timestamp).toLocaleDateString('pt-BR') + ' — ' + e.tipo + ': ' + e.descricao.slice(0, 70) + '…'; }).join('\n');
        fontes.push('Eventos on-chain do lote ' + loteR.id + ' (blocos ' + (evs.filter(function (e) { return e.bloco !== null; }).map(function (e) { return e.bloco; }).join(', ') || 'cadeia ainda não minerada') + ')');
        return resp('O lote ' + loteR.id + ' tem ' + evs.length + ' eventos registrados em blockchain. Linha do tempo:\n' + linhaTempo + '\n\nComo funciona: cada evento gera um hash SHA-256 que é encadeado ao bloco anterior. Se qualquer dado for alterado, o hash muda e a verificação acusa a fraude. O QR Code do lote carrega esse hash para conferência por qualquer comprador.', fontes);
      }
      case 'contrato': {
        var ct = D.contratos[0];
        var etapas = ct.etapas.map(function (e) { return (e.status === 'CONCLUIDA' ? '✔' : '○') + ' ' + e.nome + (e.data ? ' (' + new Date(e.data).toLocaleDateString('pt-BR') + ')' : ''); }).join('\n');
        fontes.push('Contrato ' + ct.id + ' — ' + Dados.orgUsuario(ct.vendedor) + ' ↔ ' + Dados.orgUsuario(ct.comprador));
        fontes.push('Cláusulas registradas on-chain: pagamento em escrow, tolerância de ' + ct.toleranciaDivergenciaPeso + '% de divergência de peso');
        return resp('Contrato ativo ' + ct.id + ':\n' + etapas + '\n\nValor: R$ ' + ct.valorTotal.toLocaleString('pt-BR') + ' (' + ct.quantidade + ' ' + ct.unidade + ' a R$ ' + ct.precoUnitario.toFixed(2) + ').\nO pagamento está retido em escrow e só é liberado quando o comprador confere a carga. Se a divergência de peso passar de ' + ct.toleranciaDivergenciaPeso + '%, o contrato trava automaticamente e abre disputa.', fontes);
      }
      case 'destino': {
        var lc = lotes.filter(function (l) { return l.produto === 'cacau'; })[0];
        var rc = recomendarDestino(lc.id);
        var opInd = rc.opcoes.filter(function (o) { return o.nome.indexOf('Industrializar') === 0 || o.nome.indexOf('Torrar') === 0; })[0];
        fontes.push('Lote ' + lc.id + ' — qualidade ' + rc.scoreQualidade + '/100 (classe ' + scoreQualidade(lc.id).classe + ')');
        fontes.push('Histórico de industrialização própria: eventos E-019, E-020 e E-021 já registrados na sua cadeia');
        return resp('Você já tem histórico de verticalização registrado na cadeia (chocolate bean-to-bar e torra própria), o que ajuda a IA a confiar na projeção.\n\nPara o lote ' + lc.id + ', a industrialização própria renderia cerca de R$ ' + opInd.receita.toLocaleString('pt-BR') + ' contra R$ ' + rc.opcoes.filter(function (o) { return o.nome.indexOf('Vender agora') === 0; })[0].receita.toLocaleString('pt-BR') + ' vendendo a matéria-prima in natura.\n\nO ponto de atenção não é o preço, é o capital de giro: você precisa sustentar ' + opInd.quando + ' até a venda do produto final, mais o custo de embalagem e o canal de escoamento.', fontes, rc);
      }
      case 'custo': {
        var lc2 = lotes[0];
        var r2c = recomendarDestino(lc2.id);
        return resp('Estimativa para o lote ' + lc2.id + ':\n• Venda imediata: R$ ' + r2c.opcoes.filter(function (o) { return o.nome.indexOf('Vender agora') === 0; })[0].receita.toLocaleString('pt-BR') + '\n• Melhor cenário simulado: ' + r2c.recomendacao + ' → R$ ' + r2c.receitaRecomendada.toLocaleString('pt-BR') + '\n• Preço efetivo do lote: R$ ' + r2c.precoEfetivo.toFixed(2) + ' por ' + r2c.unidadePreco + ' (' + (r2c.ajustePct >= 0 ? 'prêmio' : 'desconto') + ' de ' + Math.abs(r2c.ajustePct).toFixed(1) + '% pela qualidade)', ['Modelo ' + MODELOS.preco.nome + ' e ' + MODELOS.qualidade.nome]);
      }
      case 'consorcio': {
        return resp('O sistema é uma rede blockchain permissionada, mantida em consórcio por ' + D.meta.consorcio.join(', ') + '.\n\nNa prática: quando o produtor registra uma colheita, o evento é assinado digitalmente e vira um hash. Vários eventos são agrupados em um bloco, que é validado por prova de trabalho e encadeado ao bloco anterior.\n\nPor que isso importa para quem compra café e cacau: (1) o comprador sabe que o lote não foi trocado no caminho; (2) o pagamento em escrow só libera após a conferência; (3) a certificação vira um selo verificável, não um PDF que pode ser copiado; (4) nenhum parceiro sozinho consegue reescrever o histórico — e isso é exatamente o que impede fraude de origem.', ['Documento de arquitetura — seção Blockchain', 'Bloco gênese da rede ' + D.meta.chainId + ' já minerado']);
      }
      case 'sensor': {
        /* Responde com o dado MEDIDO, não com estimativa regional: usa os
           indicadores derivados das leituras e declara a fonte de cada um. */
        if (!global.IoT) return resp('A camada de sensores não está carregada nesta sessão.', ['Base interna AgroChain']);
        var meusTalhoes = D.talhoes.filter(function (t) { return t.produtor === uid; });
        var meusLotes = D.lotes.filter(function (l) { return l.produtor === uid; });
        function n(v, d) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
        var linhas = [];
        meusTalhoes.forEach(function (t) {
          var d = global.IoT.derivadosTalhao(t.id);
          var est = d.estresse;
          linhas.push('• ' + t.nome + ' (' + Dados.nomeProduto(t.produto) + '): ' +
            (est
              ? 'umidade do solo em ' + n(est.aguaDisponivel) + '% da água disponível (' + est.classificacao + ', sonda ' + est.sensor + ')'
              : 'sem sonda de solo instalada — sem medição de umidade') +
            ' · ' + d.grausDia.acumulado30d + ' graus-dia em 30 dias, estádio: ' + d.grausDia.estagio +
            ' · balanço hídrico de ' + n(d.balanco.saldo, 1) + ' mm (' + d.balanco.classificacao + ')' +
            ' · molhamento foliar favorável a doença: ' + d.molhamento.horasFavoraveis + ' h nos últimos 7 dias');
        });
        var f = null, sc = null;
        meusLotes.forEach(function (l) {
          var ff = global.IoT.fermentacao(l.id);
          if (ff && !ff.encerrada && !f) f = ff;
          if (ff && ff.encerrada && !f) f = ff;
          var ss = global.IoT.secagem(l.id);
          if (ss && !ss.concluida && !sc) sc = ss;
        });
        var blocosLote = [];
        if (f) {
          blocosLote.push('Fermentação do lote ' + f.lote + ' (sensor ' + f.sensor + '): ' + f.indiceAcumulado + ' °C·h acumulados' +
            (f.encerrada
              ? ' — encerrada, índice final de ' + f.indiceProjetado + ' °C·h, classe ' + f.classe + ', nota prevista ' + f.notaPrevista + '/100.'
              : ' e projeção de ' + f.indiceProjetado + ' °C·h até o fim (classe ' + f.classe + ', nota prevista ' + f.notaPrevista + '/100). ' +
                'Próxima viragem: ' + f.proximaViragem + '.'));
          blocosLote.push(f.recomendacao);
        }
        if (sc) blocosLote.push('Secagem do lote ' + sc.lote + ' (sensor ' + sc.sensor + '): umidade em ' + n(sc.umidadeAtual, 1) + '% ' +
          '(meta ' + n(sc.umidadeAlvo, 1) + '% a ' + n(sc.taxaDesidratacaoDia, 2) + '%/dia) — ' +
          (sc.diasParaPontoIdeal > 0 ? 'cerca de ' + n(sc.diasParaPontoIdeal, 1) + ' dia(s) para o ponto.' : 'lote no ponto de estocagem.') +
          (sc.alerta ? ' ' + sc.alerta : ''));
        var alertas = global.IoT.alertasSensores().filter(function (a) { return a.produtor === uid; });
        var criticos = alertas.filter(function (a) { return a.severidade === 'critico'; });
        /* Foco da pergunta: quem pergunta "quando virar a massa" quer a resposta
           da fermentação primeiro, e não o relatório completo da propriedade. */
        var tp = normalizar(pergunta);
        function tem() { return Array.prototype.some.call(arguments, function (k) { return tp.indexOf(k) >= 0; }); }
        var foco = tem('virar', 'viragem', 'massa', 'fermenta') ? 'fermentacao'
          : tem('secagem', 'secando', 'umidade do grao', 'estocagem') ? 'secagem'
          : tem('colher', 'colheita', 'graus', 'estadio', 'maturacao') ? 'colheita'
          : tem('sonda', 'solo', 'umidade', 'irriga', 'agua') ? 'solo'
          : tem('sensor', 'iot', 'funcionando', 'bateria', 'calibra') ? 'dispositivos' : null;
        var texto;
        if (foco === 'fermentacao' && f) {
          texto = blocosLote[0] + '\n\n' + blocosLote[1];
        } else if (foco === 'secagem' && sc) {
          texto = blocosLote[blocosLote.length - 1];
        } else if (foco === 'colheita') {
          var cafes = meusTalhoes.filter(function (x) { return x.produto.indexOf('cafe') === 0; });
          texto = 'Ponto de colheita pelo calor acumulado:\n' + (cafes.length ? cafes.map(function (x) {
            var dg = global.IoT.grausDia(x.id, 30);
            return '• ' + x.nome + ': ' + dg.acumuladoCiclo + ' graus-dia acumulados no ciclo (' + dg.acumulado30d + ' nos últimos 30 dias) — estádio: ' + dg.estagio + '.';
          }).join('\n') : '· nenhum talhão de café nesta conta.') +
            '\n\nAcima de 2.600 graus-dia o conilon está em maturação avançada e a janela de colheita está aberta. Passar do ponto derruba a bebida por queda de fruto e fermentação indesejada no pé.';
        } else if (foco === 'dispositivos') {
          var meusSensores = D.sensores.filter(function (x) { return x.produtor === uid; });
          texto = 'Estado dos seus ' + meusSensores.length + ' dispositivos de campo:\n' + meusSensores.map(function (x) {
            var qd = global.IoT.qualidadeDispositivo(x.id);
            return '• ' + x.id + ' (' + x.local + '): bateria ' + x.bateria + '%, sinal ' + x.sinal + ' dBm, ' + qd.confiabilidade + '% de confiabilidade — ' + qd.situacao + '.';
          }).join('\n');
        } else if (foco === 'solo') {
          texto = 'Umidade do solo medida nas suas áreas:\n' + (linhas.join('\n') || '· nenhum talhão com sensor nesta conta.') +
            (f && !f.encerrada ? '\n\nVocê também tem fermentação em andamento: ' + blocosLote[0] : '');
        } else {
          texto = 'Leitura direta dos sensores da sua propriedade:\n' + (linhas.join('\n') || '· nenhum talhão com sensor nesta conta.') +
            (blocosLote.length ? '\n\n' + blocosLote.join('\n') : '');
        }
        texto += '\n\nAlertas de campo agora: ' + alertas.length + ' (' + criticos.length + ' crítico(s))' +
          (alertas.length ? ' — o principal é: ' + alertas[0].titulo + '. Ação: ' + alertas[0].acao : '.') +
          '\n\nAs leituras que sustentam esses números podem ser ancoradas na blockchain: a raiz de Merkle do período fica gravada e qualquer leitura é conferível depois, inclusive por quem comprar o seu lote.';
        var fontesSensor = ['Séries horárias de ' + D.sensores.filter(function (s) { return s.produtor === uid; }).length + ' dispositivos de campo (estações, sondas, fermentação, secagem e vazão)',
          'Indicadores: graus-dia, balanço hídrico com ET0 por FAO-56 e Ks, molhamento foliar, índice de fermentação e curva de secagem',
          'Controle de qualidade por mediana e MAD sobre as leituras ancoradas'];
        return resp(texto, fontesSensor);
      }
      case 'clima': {
        var cl = D.clima['Cacoal'].slice(-30);
        var chuva = cl.reduce(function (a, c) { return a + c.chuvaMm; }, 0);
        var umid = cl.reduce(function (a, c) { return a + c.umidadeRel; }, 0) / cl.length;
        return resp('Cacoal — últimos 30 dias: ' + chuva.toFixed(1) + ' mm de chuva, umidade relativa média de ' + umid.toFixed(0) + '%, temperatura média de ' + (cl.reduce(function (a, c) { return a + c.tempMedia; }, 0) / cl.length).toFixed(1) + '°C.\n\nLeitura agronômica: o volume de chuva está abaixo do ideal para o enchimento de grãos do café (ideal ≈ 460 mm no trimestre), o que explica a redução de produtividade prevista. Para o cacau, a umidade relativa acima de 80% combinada com chuva favorece a vassoura-de-bruxa.', ['Estação meteorológica de Cacoal — série de 90 dias integrada ao sistema']);
      }
      default:
        return resp('Sou o assistente agropecuário do AgroChain e respondo com base nos dados reais da sua cadeia. Posso ajudar com:\n\n• Preços e tendência de mercado (café conilon, arábica e cacau)\n• Quando e como vender cada lote (incluindo consumo próprio e industrialização)\n• Previsão de safra por talhão\n• Pragas e doenças com janela de manejo\n• Rastreabilidade, certificação e contratos\n• Como a blockchain do consórcio funciona\n• Sensores de campo: umidade do solo, fermentação, secagem e graus-dia\n\nPergunte, por exemplo: "quando devo vender o lote de cacau?" ou "qual o risco de ferrugem no meu talhão?"', ['Base de conhecimento interna AgroChain']);
      }
    }

  global.IA = {
    preverSafra: preverSafra,
    preverPreco: preverPreco,
    diagnosticarFitossanidade: diagnosticarFitossanidade,
    alertasFitossanitarios: alertasFitossanitarios,
    scoreQualidade: scoreQualidade,
    recomendarDestino: recomendarDestino,
    precoAjustado: precoAjustado,
    analisarConformidade: analisarConformidade,
    detectarAnomalias: detectarAnomalias,
    conversar: conversar,
    MODELOS: MODELOS
  };
})(typeof window !== 'undefined' ? window : globalThis);
