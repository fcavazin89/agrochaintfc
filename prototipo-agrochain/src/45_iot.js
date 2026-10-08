/* =========================================================================
 * AGROCHAIN · CAMADA IoT — SENSORES, LEITURAS E INDICADORES DERIVADOS
 *
 * O que esta camada entrega:
 *   1. Parque de sensores de campo (estações, sondas de solo, molhamento
 *      foliar, fermentação, secagem, vazão) com bateria, sinal e calibração.
 *   2. Gerador de leituras fisicamente coerente — o clima horário é derivado
 *      da série diária já existente no sistema, e a evapotranspiração usa a
 *      equação de Hargreaves (FAO-56), com radiação extraterrestre calculada
 *      pela latitude real de cada município.
 *   3. INDICADORES DERIVADOS a partir das leituras: graus-dia acumulados,
 *      balanço hídrico, horas de molhamento foliar, índice de fermentação,
 *      taxa de secagem, taxa de aquecimento (derivada dT/dt) e estresse hídrico.
 *   4. Controle de qualidade do dado: bateria, calibração vencida, lacunas de
 *      comunicação e rejeição de leitura discrepante (z-score).
 *   5. Ancoragem das leituras na blockchain: a janela de leituras vira uma
 *      árvore de Merkle, e só a raiz vai para a cadeia.
 *
 * Princípio de projeto: o sensor não "opina". Ele entrega medição, e o sistema
 * deriva o indicador com a fórmula explícita, para que o agrônomo possa
 * conferir a conta.
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var Dados = global.Dados;
  var Cripto = global.Cripto;

  /* Momento da demonstração: relógio fixo para que as leituras de sensor sejam
     reprodutíveis entre uma consulta e outra. */
  var AGORA = new Date('2026-10-06T14:00:00-04:00');

  var TIPOS = {
    estacao_meteorologica: {
      nome: 'Estação meteorológica', icone: '🌦️', unidade: 'mm / °C / % / m·s⁻¹',
      funcao: 'a chuva, a temperatura, a umidade, o vento e a radiação que alimentam o cálculo de evapotranspiração (ET0) e os alertas de doença'
    },
    sonda_solo: {
      nome: 'Sonda de umidade do solo', icone: '🌱', unidade: '% VWC / °C',
      funcao: 'a água disponível no perfil do solo em três profundidades — é a medição que decide a hora de irrigar e a que confirma (ou desmente) o balanço hídrico calculado'
    },
    sensor_fermentacao: {
      nome: 'Sensor de fermentação', icone: '🍫', unidade: '°C',
      funcao: 'a temperatura na massa de cacau ou café, o que define o índice de fermentação, o momento da viragem e a nota de qualidade prevista do lote'
    },
    sensor_secagem: {
      nome: 'Sensor de secagem', icone: '☀️', unidade: '% umidade do grão',
      funcao: 'a umidade do grão no terreiro ou secador, que decide quando o lote está no ponto de estocagem e evita desconto por umidade na entrega'
    },
    molhamento_foliar: {
      nome: 'Sensor de molhamento foliar', icone: '💧', unidade: '% molhamento',
      funcao: 'as horas de folha molhada na temperatura favorável a fungos — é a medição que antecipa ferrugem no café e vassoura-de-bruxa no cacau dentro da copa, onde a estação não alcança'
    },
    medidor_vazao: {
      nome: 'Medidor de vazão', icone: '🚰', unidade: 'L/h · mm',
      funcao: 'a lâmina de água efetivamente aplicada na irrigação, insumo para a eficiência do bombeamento e para o balanço hídrico'
    },
    gateway: {
      nome: 'Gateway do consórcio', icone: '📡', unidade: '—',
      funcao: 'concentrar as transmissões dos sensores LoRaWAN do setor, agregar as leituras e enviar o pacote assinado para a cooperativa'
    }
  };

  /* Parâmetros de solo por talhão (argissolo/latossolo da região):
     capacidade de campo, ponto de murcha e densidade para converter VWC em mm. */
  var SOLO = {
    'T-01': { fc: 0.34, pwp: 0.18, densidade: 1.32 },
    'T-02': { fc: 0.31, pwp: 0.16, densidade: 1.35 },
    'T-03': { fc: 0.35, pwp: 0.20, densidade: 1.28 },
    'T-04': { fc: 0.33, pwp: 0.19, densidade: 1.30 },
    'T-05': { fc: 0.36, pwp: 0.21, densidade: 1.27 },
    'T-06': { fc: 0.34, pwp: 0.19, densidade: 1.31 }
  };

  /* Fuso fixo de Rondônia (UTC−4). Usar getHours()/getDate() do navegador faria
     o comportamento mudar conforme o fuso do aparelho — o mesmo sensor daria
     leituras diferentes em Cacoal e em Brasília. Aqui o fuso é explícito. */
  var FUSO_HORAS = -4;
  function horaLocal(t) { return new Date(t.getTime() + FUSO_HORAS * 3600000).getUTCHours(); }
  function diaLocal(t) { return new Date(t.getTime() + FUSO_HORAS * 3600000).getUTCDate(); }
  function dataLocal(t) { return new Date(t.getTime() + FUSO_HORAS * 3600000).toISOString().slice(0, 10); }

  function num(v, d) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function disp(id) { return D.sensores.filter(function (s) { return s.id === id; })[0]; }
  function sensoresDeTalhao(t) { return D.sensores.filter(function (s) { return s.talhao === t; }); }
  function sensoresDeLote(l) { return D.sensores.filter(function (s) { return s.lote === l; }); }

  /* ---------- aleatoriedade determinística por (sensor, instante) ---------- */
  function hash(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) { h ^= texto.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rnd(id, slot, sal) {
    return Dados.rnd(hash(id + ':' + slot + ':' + (sal || 0)))();
  }

  /* =========================================================================
   * CLIMA HORÁRIO — derivado da série diária já existente no sistema
   * ======================================================================= */
  function diaClima(regiao, data) {
    var serie = D.clima[regiao] || [];
    var chave = dataLocal(data);
    var achou = serie.filter(function (c) { return c.data === chave; })[0];
    if (achou) return achou;
    /* fora da janela da série: usa o dia mais próximo disponível */
    return serie[serie.length - 1];
  }

  /** Clima de uma hora específica: ciclo diurno de temperatura, umidade inversa
      e chuva concentrada no fim da tarde (padrão amazônico). */
  function climaHorario(regiao, data, hora) {
    var dia = diaClima(regiao, data);
    var amp = (dia.tempMax - dia.tempMedia);
    /* mínimo às 5h, máximo às 14h */
    var tmin = (dia.tempMin === undefined || dia.tempMin === null) ? dia.tempMedia - 5 : dia.tempMin;
    /* Curva diurna centrada no ponto médio entre a mínima e a máxima, com pico
       às 15h e vale às 3h — o formato que a série diária já declara, e não uma
       senoide deslocada que produziria amplitude menor que a registrada. */
    var centro = (dia.tempMax + tmin) / 2, amp = (dia.tempMax - tmin) / 2;
    var temp = centro + amp * Math.sin((hora - 9.5) / 24 * 2 * Math.PI);
    temp = Math.max(tmin, Math.min(dia.tempMax, temp));
    temp = Math.round(temp * 10) / 10;

    var ur = dia.umidadeRel - (temp - dia.tempMedia) * 2.4;
    ur = Math.max(38, Math.min(99, Math.round(ur + (rnd('ur', data.getTime() / 3600000 + hora, 3) - 0.5) * 6)));

    /* a chuva do dia se distribui: 70% entre 14h e 20h */
    var chuva = 0;
    if (dia.chuvaMm > 0) {
      var peso = (hora >= 14 && hora <= 20) ? 0.13 : (hora >= 9 && hora < 14 ? 0.04 : 0.015);
      chuva = Math.round(dia.chuvaMm * peso * 10) / 10;
    }
    /* radiação: ângulo horário, atenuada por nebulosidade quando chove */
    var rad = 0;
    if (hora >= 6 && hora <= 18) {
      var f = Math.sin((hora - 6) / 12 * Math.PI);
      rad = Math.round(30 * f * (dia.chuvaMm > 6 ? 0.45 : dia.chuvaMm > 0 ? 0.72 : 0.92) * 10) / 10;
    }
    var vento = Math.round((1.2 + rnd('v', data.getTime() / 3600000 + hora, 5) * 2.4) * 10) / 10;
    return { temp: temp, tempMax: dia.tempMax, tempMin: dia.tempMin, umidadeRel: ur, chuvaMm: chuva, radiacaoMJ: rad, ventoMs: vento, data: data };
  }

  /* =========================================================================
   * EVAPOTRANSPIRAÇÃO DE REFERÊNCIA — Hargreaves (FAO-56)
   * ET0 = 0,0023 · Ra · (Tmed + 17,8) · √(Tmax − Tmin)     [mm/dia]
   * Ra (radiação extraterrestre) calculada pela latitude e dia do ano.
   * ======================================================================= */
  /** Dia do ano (1–366) da data local de Rondônia, sem depender do fuso do aparelho. */
  function diaDoAno(data) {
    var d = new Date(dataLocal(data) + 'T00:00:00Z');
    return Math.floor((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000) + 1;
  }

  function radiacaoExtraterrestre(latGraus, data) {
    var phi = latGraus * Math.PI / 180;
    var J = diaDoAno(data);
    var dr = 1 + 0.033 * Math.cos(2 * Math.PI * J / 365);
    var decl = 0.409 * Math.sin(2 * Math.PI * J / 365 - 1.39);
    var x = Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl)));
    var ws = Math.acos(x);
    var Ra = (24 * 60 / Math.PI) * 0.0820 * dr * (ws * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(ws));
    return Ra / 2.45;   // converte MJ/m²/dia para mm/dia equivalente
  }

  function et0(regiao, data) {
    var municipalLat = { 'Cacoal': -11.4386, 'Rolim de Moura': -11.6901 };
    var dia = diaClima(regiao, data);
    var tmin = (dia.tempMin === undefined || dia.tempMin === null) ? dia.tempMedia - 5 : dia.tempMin;
    var Ra = radiacaoExtraterrestre(municipalLat[regiao] || -11.5, data);
    var et = 0.0023 * Ra * (dia.tempMedia + 17.8) * Math.sqrt(Math.max(2, dia.tempMax - tmin));
    return Math.round(et * 100) / 100;
  }

  /* =========================================================================
   * GERADORES DE LEITURA POR TIPO DE SENSOR
   * ======================================================================= */

  /* ---------------------------------------------------------------------
   * ESTADO HÍDRICO DO SOLO — fonte única da verdade
   * Integra o balanço (chuva + irrigação − ET0) ao longo de 30 dias. Sem isso
   * cada consulta começaria na capacidade de campo e nenhum talhão apareceria
   * em déficit — o sensor contaria uma história e o balanço, outra.
   * ------------------------------------------------------------------- */
  function irrigacaoDoDia(talhaoId, data) {
    var t = Dados.talhao(talhaoId);
    var irrigado = t.sistema.toLowerCase().indexOf('irrigado') >= 0;
    return (irrigado && (diaLocal(data) % 2 === 1)) ? 6 : 0;   // 6 mm a cada 2 dias
  }

  function estadoSoloDiario(talhaoId, dias) {
    var solo = SOLO[talhaoId] || SOLO['T-01'];
    var t = Dados.talhao(talhaoId);
    var regiao = D.usuarios.filter(function (u) { return u.id === t.produtor; })[0].municipio;
    var serie = D.clima[regiao].slice(-(dias || 30));
    var vwc = solo.fc;
    var saida = [];
    serie.forEach(function (c, i) {
      var data = new Date(c.data + 'T12:00:00-04:00');
      var e = et0(regiao, data);
      var irr = irrigacaoDoDia(talhaoId, data);
      /* Coeficiente de estresse hídrico (FAO-56, Ks): quando falta água, a
         planta não transpira o que a atmosfera pede. Sem esse fator, o balanço
         secaria o solo até o ponto de murcha, o que não acontece na realidade. */
      var ks = Math.max(0, Math.min(1, (vwc - solo.pwp) / (solo.fc - solo.pwp)));
      var etReal = e * ks;
      vwc += ((c.chuvaMm + irr) / 400) - (etReal / 400);
      if (vwc > solo.fc) vwc = solo.fc + (vwc - solo.fc) * 0.55;     // drenagem
      vwc = Math.max(solo.pwp * 0.82, vwc);                          // limite inferior
      saida.push({
        data: c.data, chuva: c.chuvaMm, et0: Math.round(e * 100) / 100,
        etReal: Math.round(etReal * 100) / 100, ks: Math.round(ks * 100) / 100,
        irrigacao: irr, vwc: vwc
      });
    });
    return saida;
  }

  function vwcAtual(talhaoId, dias) {
    var s = estadoSoloDiario(talhaoId, dias || 30);
    return s[s.length - 1].vwc;
  }

  /* --- Solo: série horária do sensor, ancorada no estado calculado do perfil --- */
  function serieSolo(dispositivo, horas) {
    var solo = SOLO[dispositivo.talhao] || SOLO['T-01'];
    var regiao = dispositivo.regiao;
    var irrigado = Dados.talhao(dispositivo.talhao).sistema.toLowerCase().indexOf('irrigado') >= 0;
    /* começa do estado calculado considerando a janela pedida */
    var diasEquivalentes = Math.max(2, Math.ceil(horas / 24) + 1);
    var estado = estadoSoloDiario(dispositivo.talhao, 30);
    var inicio = estado[Math.max(0, estado.length - diasEquivalentes)];
    var vwc = inicio ? inicio.vwc : solo.fc;
    var saida = [];
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(regiao, t, horaLocal(t));
      var et = et0(regiao, t) / 24;                         // mm por hora
      var chuva = cl.chuvaMm;
      /* irrigação: 8 mm a cada 2 dias às 5h da manhã (só onde há irrigação) */
      var irrig = (irrigado && horaLocal(t) === 5 && (diaLocal(t) % 2 === 1)) ? 6 : 0;   // mesmo critério do balanço diário
      var entradaMm = chuva + irrig;
      var profundidadeMm = 400;                              // 0–40 cm de perfil
      vwc += (entradaMm / profundidadeMm) - (et / profundidadeMm) * ((vwc - solo.pwp) / (solo.fc - solo.pwp));
      /* percolação: acima da capacidade de campo, drena exponencialmente */
      if (vwc > solo.fc) vwc = solo.fc + (vwc - solo.fc) * 0.55;
      vwc = Math.max(solo.pwp * 0.85, Math.min(0.46, vwc));

      var v10 = vwc + 0.02, v30 = vwc, v60 = vwc - 0.015 - (h % 12) * 0.0004;
      var ruido = function (s) { return (rnd(dispositivo.id, Math.round(t.getTime() / 3600000), s) - 0.5) * 0.008; };
      saida.push({
        ts: t.toISOString(),
        valores: {
          vwc10: Math.round((v10 + ruido(1)) * 1000) / 10,
          vwc30: Math.round((v30 + ruido(2)) * 1000) / 10,
          vwc60: Math.round((v60 + ruido(3)) * 1000) / 10,
          tempSolo: Math.round((cl.temp - 1.8 + rnd(dispositivo.id, Math.round(t.getTime() / 3600000), 7) * 0.8) * 10) / 10,
          chuvaMm: cl.chuvaMm, irrigacaoMm: irrig, et0Mm: Math.round(et * 100) / 100
        }
      });
    }
    return saida;
  }

  /* --- Estação meteorológica: leitura horária + acumulados --- */
  function serieEstacao(dispositivo, horas) {
    var saida = [];
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(dispositivo.regiao, t, horaLocal(t));
      saida.push({
        ts: t.toISOString(),
        valores: {
          /* Somente grandezas horárias. Máxima e mínima do dia são AGREGADOS:
             publicá-las junto com as leituras horárias faria o controle de
             qualidade tratá-las como série — e um degrau entre dois dias
             apareceria como "falha de sensor". Vão em resumoDiario(). */
          chuvaMm: cl.chuvaMm, tempMedia: cl.temp,
          umidadeRel: cl.umidadeRel, ventoMs: cl.ventoMs, radiacaoMJ: cl.radiacaoMJ,
          et0Mm: Math.round((et0(dispositivo.regiao, t) / 24) * 100) / 100
        }
      });
    }
    return saida;
  }

  /* --- Molhamento foliar: 0–100%; alto quando a umidade passa de 88% --- */
  function serieMolhamentoPorClima(regiao, horas, sal) {
    var saida = [], molhado = 0;
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(regiao, t, horaLocal(t));
      if (cl.chuvaMm > 0.5) molhado = Math.min(100, molhado + 45);
      else if (cl.umidadeRel > 88 && cl.temp < 26) molhado = Math.min(100, molhado + 12);
      else if (cl.radiacaoMJ > 8) molhado = Math.max(0, molhado - 22);
      else molhado = Math.max(0, molhado - 7);
      saida.push({ ts: t.toISOString(), valores: { molhamentoFoliar: Math.round(molhado), umidadeRel: cl.umidadeRel, tempMedia: cl.temp, chuvaMm: cl.chuvaMm }, estimativa: true });
    }
    return saida;
  }

  function serieMolhamento(dispositivo, horas) {
    var saida = [], molhado = 0;
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(dispositivo.regiao, t, horaLocal(t));
      if (cl.chuvaMm > 0.5) molhado = Math.min(100, molhado + 45);
      else if (cl.umidadeRel > 88 && cl.temp < 26) molhado = Math.min(100, molhado + 12);
      else if (cl.radiacaoMJ > 8) molhado = Math.max(0, molhado - 22);
      else molhado = Math.max(0, molhado - 7);
      saida.push({ ts: t.toISOString(), valores: { molhamentoFoliar: Math.round(molhado), umidadeRel: cl.umidadeRel, tempMedia: cl.temp, chuvaMm: cl.chuvaMm } });
    }
    return saida;
  }

  /* --- Fermentação do cacau: curva térmica da massa.
         Fases reais: latência (~12 h), elevação, pico (44–48 °C), platô e
         declínio. A derivada dT/dt indica o momento da viragem. --- */
  /* ---------------------------------------------------------------------
   * MODELO TÉRMICO DA FERMENTAÇÃO (cacau, cocho de madeira)
   * Quatro fases, como descritas na prática da cacauicultura: elevação lenta
   * nas primeiras 12 h, subida até o pico por volta de 66 h, platô entre 66 e
   * 96 h e resfriamento exponencial depois — quando a massa é virada e
   * espalhada para secar. O modelo é explícito para poder ser PROJETADO para
   * frente: com ele o sistema diz onde a fermentação vai chegar, não apenas
   * onde ela está, e o produtor ainda tem tempo de agir.
   * ------------------------------------------------------------------- */
  var PICO_FERMENTACAO = 46.2;          // °C — lote de 34 @ em cocho, com viragens regulares
  var TAU_RESFRIAMENTO = 20;            // h — constante de tempo do resfriamento após o platô
  var LIMITE_ATIVO_FERMENTACAO = 144;   // h — acima disso a fermentação está encerrada
  /* Faixas de calor acumulado acima de 40 °C, calibradas sobre esta curva:
     lote bem conduzido fecha entre 150 e 400 °C·h. */
  var LIMIAR_FERMENTACAO = { incompleta: 150, excesso: 400 };

  function tempFermentacaoModelo(horasDesde, tempAmbiente) {
    var amb = tempAmbiente, pico = PICO_FERMENTACAO;
    if (horasDesde < 0) return amb;
    if (horasDesde < 12) return amb + (pico - amb) * (horasDesde / 12) * 0.18;
    if (horasDesde < 66) {
      var f = (horasDesde - 12) / 54;
      return amb + (pico - amb) * (0.18 + 0.82 * Math.pow(f, 0.75));
    }
    if (horasDesde < 96) return pico - 0.9 - (horasDesde - 66) * 0.02;
    var saidaPlato = pico - 0.9 - 30 * 0.02;
    return amb + (saidaPlato - amb) * Math.exp(-(horasDesde - 96) / TAU_RESFRIAMENTO);
  }

  /** Calor acumulado acima de 40 °C ao longo da curva, no intervalo pedido. */
  function calorAcumuladoFermentacao(horasInicio, horasFim, tempAmbiente) {
    var soma = 0;
    for (var h = Math.ceil(horasInicio); h <= horasFim; h++) {
      var t = tempFermentacaoModelo(h, tempAmbiente);
      if (t > 40) soma += (t - 40);
    }
    return Math.round(soma);
  }

  function serieFermentacao(dispositivo, horas) {
    var lote = Dados.lote(dispositivo.lote);
    /* Início da fermentação: usa o evento registrado na cadeia; se não houver,
       assume 18h do dia da colheita (prática comum na região). */
    var inicio = inicioFermentacao(lote);
    var saida = [];
    var inicioMs = inicio.getTime();
    var ultimoTemp = null;
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var horasDesde = (t.getTime() - inicioMs) / 3600000;
      var cl = climaHorario(dispositivo.regiao, t, horaLocal(t));
      var temp = tempFermentacaoModelo(horasDesde, cl.temp);
      temp = Math.round((temp + (rnd(dispositivo.id, Math.round(t.getTime() / 3600000), 11) - 0.5) * 0.5) * 10) / 10;
      var dT = ultimoTemp === null ? 0 : Math.round((temp - ultimoTemp) * 100) / 100;
      ultimoTemp = temp;
      /* pH estimado: cai de ~4,5 para ~3,8 conforme os ácidos se formam */
      var ph = horasDesde < 0 ? 4.6 : Math.max(3.7, 4.6 - horasDesde * 0.011);
      saida.push({
        ts: t.toISOString(),
        valores: {
          tempMassa: temp, tempAmbiente: cl.temp, phEst: Math.round(ph * 100) / 100,
          dTdt: dT, horasFermentacao: Math.round(horasDesde * 10) / 10
        }
      });
    }
    return saida;
  }

  /* --- Secagem: umidade do grão caindo com taxa que depende do clima --- */
  function serieSecagem(dispositivo, horas) {
    var lote = Dados.lote(dispositivo.lote) ||
      D.lotes.filter(function (l) { return l.talhao === dispositivo.talhao && l.status === 'EM_SECAGEM'; })[0] ||
      D.lotes.filter(function (l) { return l.talhao === dispositivo.talhao; })[0];
    var umidade = lote ? (lote.umidade > 30 ? lote.umidade : lote.produto === 'cacau' ? 48 : 32) : 30;
    var alvo = (lote && lote.produto === 'cacau') ? 7 : 12.5;
    var saida = [];
    var v = umidade;
    var passo = (lote && lote.produto === 'cacau') ? 0.16 : 0.10;   // % por hora (referência de terreiro)
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(dispositivo.regiao, t, horaLocal(t));
      var sol = cl.radiacaoMJ / 30;
      var eficiencia = 0.35 + sol * 0.75 - (cl.umidadeRel > 85 ? 0.22 : 0);
      eficiencia = Math.max(0.05, eficiencia);
      if (h !== horas) v = v - passo * eficiencia * (v - alvo) / 22;
      var ruido = (rnd(dispositivo.id, Math.round(t.getTime() / 3600000), 13) - 0.5) * 0.22;
      saida.push({
        ts: t.toISOString(),
        valores: {
          umidadeGrao: Math.round(Math.max(alvo - 0.4, v + ruido) * 100) / 100,
          tempMedia: cl.temp, umidadeRel: cl.umidadeRel, radiacaoMJ: cl.radiacaoMJ,
          taxaDesidratacao: Math.round(0.79 * passo * eficiencia * 100) / 100
        }
      });
    }
    return saida;
  }

  /* --- Vazão: pulsos de irrigação --- */
  /** Início da fermentação: evento registrado na cadeia; sem ele, 18h do dia da colheita. */
  function inicioFermentacao(lote) {
    var ev = D.eventos.filter(function (e) { return e.lote === lote.id && e.tipo === 'FERMENTACAO'; })[0];
    return new Date(ev ? ev.timestamp : (lote.dataColheita + 'T18:00:00-04:00'));
  }

  /* --- Gateway: telemetria do enlace de rádio, não da lavoura ---
     O gateway não mede o campo: mede a própria rede. Chuva forte atenua o sinal,
     aumenta a latência e derruba a taxa de entrega dos pacotes — é a saúde do
     enlace que sustenta toda a telemetria acima. */
  function serieGateway(dispositivo, horas) {
    var conectados = dispositivo.dispositivosConectados || 8;
    var saida = [];
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(dispositivo.regiao, t, horaLocal(t));
      var atenuacao = cl.chuvaMm > 2 ? 0.82 : cl.chuvaMm > 0.5 ? 0.94 : 1;
      var entrega = Math.round(atenuacao * (97 + rnd(dispositivo.id, Math.round(t.getTime() / 3600000), 7) * 2.6) * 10) / 10;
      saida.push({
        ts: t.toISOString(),
        valores: {
          pacotesRecebidos: Math.round(conectados * 2 * entrega / 100),
          sensoresConectados: Math.max(conectados - (cl.chuvaMm > 2 ? 1 : 0), conectados - 1),
          latenciaMs: Math.round(180 + rnd(dispositivo.id, Math.round(t.getTime() / 3600000), 9) * 220 + (cl.chuvaMm > 2 ? 400 : 0)),
          taxaEntrega: entrega
        }
      });
    }
    return saida;
  }
  function serieVazao(dispositivo, horas) {
    var saida = [];
    for (var h = horas; h >= 0; h--) {
      var t = new Date(AGORA.getTime() - h * 3600000);
      var cl = climaHorario(dispositivo.regiao, t, horaLocal(t));
      var irrigando = (horaLocal(t) >= 5 && horaLocal(t) <= 6) && (diaLocal(t) % 2 === 1);
      saida.push({
        ts: t.toISOString(),
        valores: {
          vazaoLh: irrigando ? Math.round(980 + rnd(dispositivo.id, h, 17) * 60) : 0,
          mmAplicado: irrigando ? 3 : 0,
          pressaoBar: irrigando ? Math.round((1.5 + rnd(dispositivo.id, h, 19) * 0.3) * 100) / 100 : 0,
          chuvaMm: cl.chuvaMm
        }
      });
    }
    return saida;
  }

  /* =========================================================================
   * API DE LEITURAS
   * ======================================================================= */
  function leituras(dispositivoId, horas, opcoes) {
    opcoes = opcoes || {};
    var d = disp(dispositivoId);
    if (!d) return [];
    horas = horas || 24;
    var serie;
    if (d.tipo === 'estacao_meteorologica') serie = serieEstacao(d, horas);
    else if (d.tipo === 'sonda_solo') serie = serieSolo(d, horas);
    else if (d.tipo === 'molhamento_foliar') serie = serieMolhamento(d, horas);
    else if (d.tipo === 'sensor_fermentacao') serie = serieFermentacao(d, horas);
    else if (d.tipo === 'sensor_secagem') serie = serieSecagem(d, horas);
    else if (d.tipo === 'medidor_vazao') serie = serieVazao(d, horas);
    else if (d.tipo === 'gateway') serie = serieGateway(d, horas);
    else serie = [];

    /* ---------------------------------------------------------------------
     * CONTROLE DE QUALIDADE DO DADO
     * Usa mediana e desvio absoluto mediano (MAD), e não média e desvio-padrão.
     * Motivo prático: irrigação e chuva produzem séries legitimamente bimodais —
     * com média/desvio, um pulso de 3 mm de irrigação seria jogado fora como
     * "outlier". O MAD é robusto a esse tipo de distribuição.
     * ------------------------------------------------------------------- */
    var campos = d.mede.length ? d.mede : Object.keys(serie.length ? serie[0].valores : {});
    function mediana(arr) {
      if (!arr.length) return 0;
      var o = arr.slice().sort(function (a, b) { return a - b; });
      var m = Math.floor(o.length / 2);
      return o.length % 2 ? o[m] : (o[m - 1] + o[m]) / 2;
    }
    campos.forEach(function (campo) {
      var vals = serie.map(function (l) { return l.valores[campo]; }).filter(function (v) { return typeof v === 'number'; });
      if (vals.length < 8) return;
      var med = mediana(vals);
      var mad = mediana(vals.map(function (v) { return Math.abs(v - med); }));
      if (mad <= 0 && Math.abs(med) < 1) return;   // série constante em torno de zero: não há como julgar
      var madUso = mad > 0 ? mad : Math.abs(med) * 0.05;
      /* Piso de desvio: exigir também um afastamento relativo mínimo evita
         marcar como falha a oscilação normal de séries quase constantes —
         um gateway que entrega 15 ou 16 pacotes por hora não está com defeito. */
      var pisoDesvio = Math.max(0.2 * Math.abs(med), 1e-9);
      serie.forEach(function (l, idx) {
        var v = l.valores[campo];
        if (typeof v !== 'number') return;
        var z = 0.6745 * (v - med) / madUso;    // z-score robusto
        if (Math.abs(z) > 6 && Math.abs(v - med) > pisoDesvio) {
          var vizinhos = [serie[idx - 1], serie[idx + 1]].filter(Boolean)
            .map(function (x) { return x.valores[campo]; }).filter(function (x) { return typeof x === 'number'; });
          var substituto = vizinhos.length ? vizinhos.reduce(function (a, b) { return a + b; }, 0) / vizinhos.length : med;
          l.qualidade = 'suspeita';
          l.motivoQualidade = 'leitura ' + v + ' desvia ' + Math.abs(z).toFixed(1) + ' MADs da mediana da série (' + med + ') — provável falha de contato ou obstrução; valor substituído por interpolação dos vizinhos e excluído dos indicadores';
          l.valorSuspeito = v;
          l.valores[campo] = Math.round(substituto * 100) / 100;
        }
      });
    });
    /* Falha real de sensor, injetada de forma determinística: um pico absurdo
       no meio da janela, do tipo que acontece quando entra água no conector.
       O sistema precisa mostrar que rejeita esse dado antes de virar decisão. */
    /* Gateway fica de fora: é o dispositivo de referência da demonstração, sempre
       saudável, para que os alertas dos sensores apareçam por contraste. */
    if (serie.length > 12 && d.tipo !== 'gateway' && (hash(d.id) % 3 === 0)) {
      var iFalha = Math.floor(serie.length * 0.62);
      var campoFalha = (d.mede && d.mede[0]) || campos[0];
      if (campoFalha && typeof serie[iFalha].valores[campoFalha] === 'number') {
        var original = serie[iFalha].valores[campoFalha];
        var absurdo = campoFalha === 'umidadeGrao' ? 99.9 : campoFalha === 'tempMassa' ? 78.4 : campoFalha === 'molhamentoFoliar' ? 100 : Math.round((original * 3.1 + 9) * 100) / 100;
        serie[iFalha].valorSuspeito = absurdo;
        serie[iFalha].qualidade = 'suspeita';
        serie[iFalha].motivoQualidade = 'leitura de ' + campoFalha + ' em ' + absurdo + ' é fisicamente impossível para este sensor — descartada automaticamente e substituída pela interpolação dos vizinhos (' + original + ')';
        serie[iFalha].valores[campoFalha] = original;
      }
    }
    /* lacuna de comunicação determinística: a cada 48 h, uma janela sem dado */
    var horario = Math.round(AGORA.getTime() / 3600000);
    for (var i = 0; i < serie.length; i += 1) {
      var rel = horario - (serie.length - 1 - i);
      if (rel % 48 === 11) { serie[i].qualidade = 'lacuna'; serie[i].motivoQualidade = 'janela sem transmissão — o gateway não recebeu o pacote; o dado foi reconstruído por interpolação para o restante do cálculo'; }
    }
    /* Alterações do modo demonstração (botão "simular adulteração"): aplicadas
       por último, de propósito, para que a série saia diferente daquela que
       gerou a raiz gravada na blockchain. É assim que se demonstra o valor da
       ancoragem — sem alteração, a prova sempre confere e não prova nada. */
    if (D.leiturasAdulteradas && D.leiturasAdulteradas.length) {
      serie.forEach(function (l) {
        D.leiturasAdulteradas.forEach(function (t) {
          if (t.dispositivo === dispositivoId && t.ts === l.ts && l.valores[t.campo] !== undefined) {
            l.valores[t.campo] = t.valorNovo;
            l.adulterada = true;
            l.motivoAdulteracao = 'valor alterado manualmente no modo demonstração (era ' + t.valorOriginal + ')';
          }
        });
      });
    }
    return serie;
  }

  /** Resumo diário de uma estação: totais e extremos, que são o que o agrônomo usa. */
  function resumoDiario(dispositivoId, dias) {
    var d = disp(dispositivoId);
    if (!d || d.tipo !== 'estacao_meteorologica') return null;
    var serie = leituras(dispositivoId, 24 * (dias || 7));
    var porDia = {};
    serie.forEach(function (l) {
      var chave = dataLocal(new Date(l.ts));
      var p = porDia[chave] = porDia[chave] || { data: chave, chuvaMm: 0, tempMax: -99, tempMin: 99, et0Mm: 0, horas: 0, grausDia: 0 };
      p.chuvaMm += l.valores.chuvaMm;
      p.tempMax = Math.max(p.tempMax, l.valores.tempMedia);
      p.tempMin = Math.min(p.tempMin, l.valores.tempMedia);
      p.et0Mm += l.valores.et0Mm;
      p.horas++;
    });
    return Object.keys(porDia).map(function (k) {
      var p = porDia[k];
      p.chuvaMm = Math.round(p.chuvaMm * 10) / 10;
      p.et0Mm = Math.round(p.et0Mm * 100) / 100;
      p.tempMax = Math.round(p.tempMax * 10) / 10;
      p.tempMin = Math.round(p.tempMin * 10) / 10;
      return p;
    });
  }

  function ultimaLeitura(dispositivoId) {
    var s = leituras(dispositivoId, 1);
    return s[s.length - 1] || null;
  }

  /* =========================================================================
   * INDICADORES DERIVADOS
   * ======================================================================= */

  /** Graus-dia acumulados (GDD) — café usa base 10 °C, cacau base 12 °C.
      GDD = Σ max(0, (Tmax+Tmin)/2 − Tbase) */
  function grausDia(talhaoId, dias) {
    var t = Dados.talhao(talhaoId);
    var base = t.produto === 'cacau' ? 12 : 10;
    var regiao = D.usuarios.filter(function (u) { return u.id === t.produtor; })[0].municipio;
    var serie = D.clima[regiao].slice(-(dias || 30));
    var acumulado = 0, detalhe = [];
    serie.forEach(function (c) {
      var g = Math.max(0, ((c.tempMax + (c.tempMin || c.tempMedia - 6)) / 2) - base);
      acumulado += g;
      detalhe.push({ data: c.data, gdd: Math.round(g * 10) / 10 });
    });
    /* estádio fenológico estimado desde o florescimento (dado do produtor) */
    var florescimento = t.produto === 'cacau' ? 0 : 168;    // dias aproximados atrás
    var gddTotal = 0;
    if (florescimento) {
      for (var i = 1; i <= florescimento; i++) {
        var c2 = D.clima[regiao][Math.max(0, D.clima[regiao].length - i)];
        gddTotal += Math.max(0, ((c2.tempMax + (c2.tempMin || c2.tempMedia - 6)) / 2) - base);
      }
    }
    var estagio = t.produto === 'cacau'
      ? (acumulado > 600 ? 'frutificação' : 'floração/frutificação')
      : (gddTotal < 900 ? 'granação' : gddTotal < 1700 ? 'enchimento de grãos' : gddTotal < 2600 ? 'maturação' : 'maturação avançada — janela de colheita aberta');
    return {
      talhao: talhaoId, base: base, dias: dias || 30,
      acumulado30d: Math.round(acumulado * 10) / 10,
      mediaDiaria: Math.round(acumulado / (dias || 30) * 10) / 10,
      acumuladoCiclo: Math.round(gddTotal),
      estagio: estagio,
      fonte: 'temperaturas máxima e mínima da estação meteorológica do talhão',
      formula: 'GDD = Σ máx(0, (Tmáx + Tmín)/2 − ' + base + ' °C)',
      serie: detalhe
    };
  }

  /** Balanço hídrico: chuva + irrigação − ET0, com armazenamento no solo. */
  function balancoHidrico(talhaoId, dias) {
    var t = Dados.talhao(talhaoId);
    var solo = SOLO[talhaoId] || SOLO['T-01'];
    var regiao = D.usuarios.filter(function (u) { return u.id === t.produtor; })[0].municipio;
    var irrigado = t.sistema.toLowerCase().indexOf('irrigado') >= 0;
    /* Reutiliza exatamente a mesma integração que alimenta a sonda de solo:
       o balanço e o sensor precisam contar a mesma história. */
    var integrado = estadoSoloDiario(talhaoId, dias || 30);
    var chuva = 0, et = 0, etReal = 0, irrig = 0, diasEstresse = 0;
    var detalhe = [], minAgua = 100;
    integrado.forEach(function (c) {
      chuva += c.chuva; et += c.et0; etReal += (c.etReal !== undefined ? c.etReal : c.et0); irrig += c.irrigacao;
      var aguaDisponivel = Math.max(0, Math.min(100, (c.vwc - solo.pwp) / (solo.fc - solo.pwp) * 100));
      if (aguaDisponivel < minAgua) minAgua = aguaDisponivel;
      if (aguaDisponivel < 40) diasEstresse++;
      detalhe.push({ data: c.data, chuva: c.chuva, et0: c.et0, etReal: c.etReal, irrigacao: c.irrigacao, aguaDisponivel: Math.round(aguaDisponivel) });
    });
    var cad = Math.round((solo.fc - solo.pwp) * 400);   // mm de água disponível no perfil 0–40 cm
    var saldo = chuva + irrig - etReal;
    return {
      talhao: talhaoId, dias: dias || 30,
      chuva: Math.round(chuva * 10) / 10, irrigacao: Math.round(irrig * 10) / 10,
      et0: Math.round(et * 10) / 10, etReal: Math.round(etReal * 10) / 10,
      saldo: Math.round(saldo * 10) / 10,
      cad: cad, aguaDisponivelAtual: detalhe[detalhe.length - 1].aguaDisponivel,
      diasEstresse: diasEstresse, minAguaDisponivel: Math.round(minAgua),
      /* A classificação olha o saldo E o pior momento do período: um mês que
         fecha no zero pode ter passado 15 dias com a planta passando sede. */
      classificacao: (saldo > 40 && minAgua > 60) ? 'excedente hídrico'
        : (saldo >= -40 && minAgua >= 55) ? 'equilíbrio'
        : (minAgua >= 35 ? 'déficit moderado' : 'déficit severo'),
      formula: 'Balanço = chuva + irrigação − ET real, com ET real = ET0 × Ks (coeficiente de estresse hídrico, FAO-56) · CAD = (capacidade de campo − ponto de murcha) × 400 mm',
      serie: detalhe,
      fonte: 'estação meteorológica + sonda de solo + medidor de vazão'
    };
  }

  /** Horas de molhamento foliar em faixa favorável a doença.
      Café (ferrugem): molhamento contínuo ≥ 6 h com temperatura entre 18 e 25 °C.
      Cacau (vassoura/podridão): UR > 90% por mais de 12 h ao dia. */
  function molhamentoFoliar(talhaoId, dias) {
    var t = Dados.talhao(talhaoId);
    var s = sensoresDeTalhao(talhaoId).filter(function (x) { return x.tipo === 'molhamento_foliar'; })[0];
    var regiao = D.usuarios.filter(function (u) { return u.id === t.produtor; })[0].municipio;
    var horas = Math.min(24 * (dias || 7), 24 * 7);
    /* Sem sensor dedicado no talhão, o sistema estima o molhamento a partir da
       estação meteorológica — e diz isso na resposta, em vez de apresentar
       estimativa como se fosse medição. */
    var serie = s ? leituras(s.id, horas) : serieMolhamentoPorClima(regiao, horas, 'est-' + talhaoId);
    var favoraveis = 0, molhadas = 0, contagemContinua = 0, maxContinuo = 0, tempos = [];
    serie.forEach(function (l) {
      var v = l.valores;
      var m = s ? v.molhamentoFoliar : (v.umidadeRel > 88 ? 80 : 10);
      var temp = v.tempMedia !== undefined ? v.tempMedia : v.temp;
      var ehCacau = t.produto === 'cacau';
      var favoravel = ehCacau ? (m > 60 && v.umidadeRel > 90) : (m > 60 && temp >= 18 && temp <= 25);
      if (m > 60) molhadas++;
      if (favoravel) { favoraveis++; contagemContinua++; if (contagemContinua > maxContinuo) maxContinuo = contagemContinua; tempos.push(v.ts); }
      else contagemContinua = 0;
      if (favoravel) { /* guarda o horário para o produtor conferir */ }
    });
    return {
      talhao: talhaoId, dias: dias || 7, horasAnalisadas: serie.length,
      horasMolhadas: molhadas, horasFavoraveis: favoraveis,
      maxHorasContinuas: maxContinuo,
      limiar: t.produto === 'cacau' ? 'umidade relativa acima de 90%' : 'molhamento ≥ 6 h com 18–25 °C',
      janelasDeRisco: tempos.slice(0, 6),
      sensor: s ? s.id : null,
      formula: t.produto === 'cacau'
        ? 'horas com molhamento > 60% e UR > 90% (condição de vassoura-de-bruxa e podridão-parda)'
        : 'horas com molhamento > 60% e temperatura entre 18 e 25 °C (condição de infecção da ferrugem)',
      fonte: s ? 'sensor de molhamento foliar ' + s.id : 'umidade relativa da estação meteorológica (estimativa)'
    };
  }

  /** Índice de fermentação do cacau — integra a curva térmica.
      Usado de verdade na avaliação de qualidade: mede o calor acumulado acima
      de 40 °C, que é o que promove as reações de sabor. */
  function fermentacao(loteId) {
    var lote = Dados.lote(loteId);
    if (!lote || lote.produto !== 'cacau') return null;
    var s = sensoresDeLote(loteId).filter(function (x) { return x.tipo === 'sensor_fermentacao'; })[0];
    if (!s) return null;
    var inicio = inicioFermentacao(lote);
    var desdeInicio = Math.round((AGORA - inicio) / 3600000);
    /* ------------------------------------------------------------------
     * FERMENTAÇÃO ENCERRADA × EM ANDAMENTO
     * Um lote colhido há 45 dias não está fermentando: a massa já secou e o
     * que interessa é o ÍNDICE FINAL que aquele lote acumulou, não a leitura
     * de agora. Avaliar o passado como se fosse ao vivo produziria "0 °C·h,
     * classe incompleta" para um lote que fermentou bem — erro grave, porque
     * é justamente esse número que sustenta o laudo de qualidade.
     * Considera-se ativo o período de até 144 h após o início (elevação,
     * platô e declínio); depois disso, a fermentação está encerrada.
     * ---------------------------------------------------------------- */
    var LIMITE_ATIVO = LIMITE_ATIVO_FERMENTACAO;
    var encerrada = desdeInicio > LIMITE_ATIVO;
    var janela = Math.min(Math.max(desdeInicio + 2, 48), 24 * 75);
    var serie = leituras(s.id, janela).filter(function (l) {
      var h = l.valores.horasFermentacao;
      return h >= 0 && (!encerrada || h <= LIMITE_ATIVO);
    });
    if (!serie.length) return null;

    var integral = 0, picoTemp = -Infinity, picoEm = null, horasAcima40 = 0, ultima = serie[serie.length - 1];
    serie.forEach(function (l, i) {
      var temp = l.valores.tempMassa;
      if (temp > picoTemp) { picoTemp = temp; picoEm = l.valores.horasFermentacao; }
      if (temp > 40) { horasAcima40++; integral += (temp - 40); }
    });
    /* maior taxa de aquecimento (derivada dT/dt) e o momento em que ocorreu */
    var maxTaxa = 0, maxTaxaEm = 0;
    serie.forEach(function (l) {
      if (l.valores.dTdt > maxTaxa) { maxTaxa = l.valores.dTdt; maxTaxaEm = l.valores.horasFermentacao; }
    });
    var ultimaTaxa = ultima.valores.dTdt;
    var dias = ultima.valores.horasFermentacao / 24;
    var fase = encerrada ? 'encerrada' : ultima.valores.horasFermentacao < 48 ? 'elevação' :
      ultima.valores.horasFermentacao < 96 ? (ultimaTaxa > 0.12 ? 'elevação final' : 'platô térmico') :
      ultima.valores.horasFermentacao < 144 ? 'declínio' : 'secagem da massa';

    /* Classificação por calor acumulado — referência prática da cacauicultura:
       abaixo de 100 °C·h a fermentação fica incompleta; acima de 200 °C·h
       aumenta o risco de sabor amargo e ácido. */
    /* Índice acumulado até agora e PROJEÇÃO até o fim do período ativo. Para o
       lote em fermentação a decisão útil não é o número de hoje: é onde a curva
       vai chegar se ninguém mexer — e ainda há tempo de virar a massa. */
    var ambienteMedio = serie.reduce(function (a, l) { return a + l.valores.tempAmbiente; }, 0) / serie.length;
    var calorTotal = calorAcumuladoFermentacao(0, LIMITE_ATIVO, ambienteMedio);
    var projecao = encerrada ? integral : Math.round(calorTotal);
    var restante = Math.max(0, Math.round(calorTotal - integral));
    var classe = projecao < LIMIAR_FERMENTACAO.incompleta ? 'INCOMPLETA'
      : projecao <= LIMIAR_FERMENTACAO.excesso ? 'IDEAL' : 'EXCESSO';
    /* Nota prevista: teto na faixa ideal, queda acentuada quando a projeção sai
       dela para baixo (falta de precursor de aroma) ou para cima (amargor e
       acidez), com desconto extra se o pico passar de 47 °C — acima disso a
       massa queima e o sabor fica adstringente. */
    var centroIdeal = (LIMIAR_FERMENTACAO.incompleta + LIMIAR_FERMENTACAO.excesso) / 2;
    var nota;
    if (projecao < LIMIAR_FERMENTACAO.incompleta) nota = 45 + 33 * (projecao / LIMIAR_FERMENTACAO.incompleta);
    else if (projecao <= LIMIAR_FERMENTACAO.excesso) nota = 88 + 12 * (1 - Math.abs(projecao - centroIdeal) / centroIdeal);
    else nota = Math.max(30, 78 - (projecao - LIMIAR_FERMENTACAO.excesso) / 8);
    nota = Math.max(30, Math.min(100, nota - Math.max(0, picoTemp - 47) * 6));
    var recomendacao = encerrada
      ? (classe === 'IDEAL'
        ? 'Fermentação encerrada dentro da faixa ideal (' + projecao + ' °C·h). Este é o índice final do lote e pode ser citado no laudo e na negociação.'
        : classe === 'INCOMPLETA'
          ? 'Fermentação encerrada abaixo da faixa ideal (' + projecao + ' °C·h): o lote tem menos precursores de aroma do que poderia. Guardar o registro para calibrar a próxima safra.'
          : 'Fermentação encerrada acima da faixa ideal (' + projecao + ' °C·h): risco de amargor e acidez elevada. O lote deve ser separado na classificação, não misturado aos demais.')
      : classe === 'IDEAL'
      ? 'Ainda em fermentação, com ' + Math.round(integral) + ' °C·h acumulados e projeção de ' + projecao + ' °C·h — dentro da faixa ideal. Manter a viragem a cada 24 h e a cobertura da massa.'
      : classe === 'INCOMPLETA'
        ? 'Ainda em fermentação: a projeção (' + projecao + ' °C·h) fica abaixo da faixa ideal. Há tempo de agir — aumentar a massa por cocho, cobrir melhor ou adiantar a próxima viragem para elevar o calor acumulado.'
        : 'Ainda em fermentação e a projeção (' + projecao + ' °C·h) passa da faixa ideal. Há tempo de agir — encurtar o tempo no cocho, fracionar a massa ou adiantar a secagem, para não acumular calor demais e produzir amargor.';
    var proximaViragem = encerrada ? null
      : ultimaTaxa > 0.15 ? 'quando a temperatura desacelerar (dT/dt abaixo de 0,15 °C/h)'
      : 'agora — o platô térmico indica o momento da viragem';

    return {
      lote: loteId, sensor: s.id, produto: 'cacau',
      encerrada: encerrada,
      situacao: encerrada ? 'encerrada' : 'em andamento',
      horasDesdeTermino: encerrada ? Math.round(desdeInicio - LIMITE_ATIVO) : 0,
      indiceAcumulado: Math.round(integral),
      indiceProjetado: projecao,
      calorRestanteProjetado: restante,
      limiteAtivoHoras: LIMITE_ATIVO,
      faixa: 'abaixo de ' + LIMIAR_FERMENTACAO.incompleta + ' °C·h incompleta · ' +
        LIMIAR_FERMENTACAO.incompleta + ' a ' + LIMIAR_FERMENTACAO.excesso + ' °C·h ideal · acima de ' + LIMIAR_FERMENTACAO.excesso + ' °C·h excesso',
      horasMonitoradas: Math.round(ultima.valores.horasFermentacao),
      dias: Math.round(dias * 10) / 10,
      temperaturaPico: Math.round(picoTemp * 10) / 10,
      picoAtingidoEmHoras: Math.round(picoEm),
      horasAcima40C: horasAcima40,
      indiceFermentacao: Math.round(integral),
      classe: classe, notaPrevista: Math.round(nota),
      fase: fase, taxaAquecimentoMax: maxTaxa, taxaAquecimentoAtual: ultimaTaxa,
      momentoMaximaTaxa: Math.round(maxTaxaEm),
      proximaViragem: proximaViragem,
      recomendacao: recomendacao,
      phEstimado: ultima.valores.phEst,
      formula: 'Índice = Σ (T − 40 °C) por hora com T acima de 40 °C; projeção pela curva térmica do cocho até o fim do período ativo (144 h) · derivada dT/dt em °C/h',
      fonte: 'sensor ' + s.id + ' no interior da massa, leitura a cada ' + s.intervaloMin + ' min',
      serie: serie
    };
  }

  /** Secagem: taxa de desidratação (derivada da umidade) e previsão do ponto. */
  function secagem(loteId) {
    var lote = Dados.lote(loteId);
    if (!lote) return null;
    var s = sensoresDeLote(loteId).filter(function (x) { return x.tipo === 'sensor_secagem'; })[0] ||
      sensoresDeTalhao(lote.talhao).filter(function (x) { return x.tipo === 'sensor_secagem'; })[0];
    if (!s) return null;
    var serie = leituras(s.id, 72);
    /* Ancoragem na realidade do lote: a série do sensor é ajustada para terminar
       exatamente na umidade registrada do lote. Sem isso o sensor contaria uma
       história diferente da que está na cadeia — e é justamente esse o erro que
       o projeto existe para evitar. */
    if (lote.umidade && lote.umidade < 30) {
      var deslocamento = lote.umidade - serie[serie.length - 1].valores.umidadeGrao;
      serie.forEach(function (l) { l.valores.umidadeGrao = Math.round((l.valores.umidadeGrao + deslocamento) * 100) / 100; });
    }
    var primeiro = serie[0].valores.umidadeGrao, ultimo = serie[serie.length - 1].valores.umidadeGrao;
    var horas = serie.length - 1;
    var taxaDia = horas > 0 ? (primeiro - ultimo) / horas * 24 : 0;
    var alvo = lote.produto === 'cacau' ? 7 : 12.5;
    var faltando = ultimo - alvo;
    var diasRestantes = taxaDia > 0.02 ? faltando / taxaDia : Infinity;
    var umidadeAtualPct = Math.round(ultimo * 100) / 100;
    return {
      lote: loteId, sensor: s.id, produto: lote.produto,
      umidadeAtual: umidadeAtualPct, umidadeAlvo: alvo,
      taxaDesidratacaoDia: Math.round(taxaDia * 100) / 100,
      diasParaPontoIdeal: isFinite(diasRestantes) ? Math.max(0, Math.round(diasRestantes * 10) / 10) : null,
      noPonto: umidadeAtualPct <= alvo + 0.4,
      concluida: umidadeAtualPct <= alvo + 0.4,
      alerta: umidadeAtualPct > alvo + 4 && taxaDia < 0.35
        ? 'Secagem lenta: revise a espessura da camada no terreiro ou a ventilação do secador — risco de mofo e de perda de qualidade.'
        : null,
      formula: 'Taxa = (umidade inicial − umidade final) ÷ horas × 24 · Dias restantes = (umidade atual − alvo) ÷ taxa',
      fonte: 'sensor ' + s.id + ' a cada ' + s.intervaloMin + ' min',
      serie: serie
    };
  }

  /** Estresse hídrico atual, a partir da sonda de solo. */
  function estresseHidrico(talhaoId) {
    var s = sensoresDeTalhao(talhaoId).filter(function (x) { return x.tipo === 'sonda_solo'; })[0];
    if (!s) return null;
    var serie = leituras(s.id, 48);
    var solo = SOLO[talhaoId] || SOLO['T-01'];
    var ultimo = serie[serie.length - 1].valores;
    /* O estado vem do balanço integrado de 30 dias; a série horária apenas
       mostra a trajetória recente em torno dele. */
    var vwc = vwcAtual(talhaoId, 30);
    var aguaDisponivel = Math.max(0, Math.min(100, (vwc - solo.pwp) / (solo.fc - solo.pwp) * 100));
    var tendencia = ultimo.vwc30 - serie[0].valores.vwc30;   // variação em 48 h
    return {
      talhao: talhaoId, sensor: s.id,
      vwc10: ultimo.vwc10, vwc30: ultimo.vwc30, vwc60: ultimo.vwc60,
      aguaDisponivel: Math.round(aguaDisponivel),
      tendencia48h: Math.round((ultimo.vwc30 - serie[0].valores.vwc30) * 100) / 100,
      classificacao: aguaDisponivel < 30 ? 'CRÍTICO' : aguaDisponivel < 50 ? 'ATENÇÃO' : aguaDisponivel < 80 ? 'ADEQUADO' : 'CONFORTÁVEL',
      recomendacao: aguaDisponivel < 40
        ? 'Repor água: a cultura está consumindo mais do que o solo recebe. Em café conilon, o déficit nesta fase derruba o enchimento de grãos.'
        : 'Sem necessidade de irrigação nas próximas 24 h.',
      formula: 'Água disponível = (VWC − ponto de murcha) ÷ (capacidade de campo − ponto de murcha) × 100',
      fonte: 'sonda de solo ' + s.id + ' (média das profundidades de 10, 30 e 60 cm)'
    };
  }

  /** Eficiência do uso da água na irrigação. */
  function eficienciaIrrigacao(talhaoId) {
    var d = sensoresDeTalhao(talhaoId).filter(function (x) { return x.tipo === 'medidor_vazao'; })[0];
    if (!d) return null;
    var serie = leituras(d.id, 24 * 7);
    var aplicado = serie.reduce(function (a, l) { return a + (l.valores.mmAplicado || 0); }, 0);
    var chuva = serie.reduce(function (a, l) { return a + (l.valores.chuvaMm || 0); }, 0);
    var suprimento = aplicado + chuva;
    var t = Dados.talhao(talhaoId);
    var regiao = D.usuarios.filter(function (u) { return u.id === t.produtor; })[0].municipio;
    var demanda = 0;
    for (var i = 0; i < 7; i++) demanda += et0(regiao, new Date(AGORA.getTime() - i * 86400000));
    demanda = Math.round(demanda * 10) / 10;
    var balanco = Math.round((suprimento - demanda) * 10) / 10;
    return {
      talhao: talhaoId, sensor: d.id,
      aplicado7d: Math.round(aplicado * 10) / 10, chuva7d: Math.round(chuva * 10) / 10,
      suprimento7d: Math.round(suprimento * 10) / 10, demandaEt0_7d: demanda,
      coberturaEt0Pct: demanda ? Math.round(suprimento / demanda * 100) : null,
      balanco7d: balanco,
      situacao: balanco < -12 ? 'déficit — complementar a irrigação' : balanco > 25 ? 'excesso — risco de lixiviação e doença fúngica' : 'adequado',
      horasBombeamento7d: serie.filter(function (l) { return (l.valores.vazaoLh || 0) > 0; }).length,
      formula: 'Cobertura = (lâmina irrigada + chuva) ÷ ET0 acumulada em 7 dias · balanço em mm',
      fonte: 'medidor de vazão ' + d.id + ' + pluviômetro da estação + ET0 (Hargreaves FAO-56)'
    };
  }

  /* =========================================================================
   * PAINEL DE DERIVADOS
   * ======================================================================= */
  function derivadosTalhao(talhaoId) {
    return {
      talhao: talhaoId,
      grausDia: grausDia(talhaoId, 30),
      balanco: balancoHidrico(talhaoId, 30),
      molhamento: molhamentoFoliar(talhaoId, 7),
      estresse: estresseHidrico(talhaoId),
      irrigacao: eficienciaIrrigacao(talhaoId),
      sensores: sensoresDeTalhao(talhaoId).map(function (s) { return s.id; })
    };
  }

  /* =========================================================================
   * QUALIDADE DO DADO — o que o consórcio aceita como confiável
   * ======================================================================= */
  function qualidadeDispositivo(id) {
    var d = disp(id);
    if (!d) return null;
    var problemas = [];
    if (d.bateria < 60) problemas.push({ nivel: d.bateria < 35 ? 'critico' : 'atencao', texto: 'Bateria em ' + d.bateria + '%', acao: d.energia.indexOf('Solar') >= 0 ? 'Verificar painel e conexão de carga' : 'Programar troca do conjunto de pilhas' });
    if (d.sinal < -90 && d.protocolo.indexOf('LoRa') >= 0) problemas.push({ nivel: 'atencao', texto: 'Sinal em ' + d.sinal + ' dBm (limiar do consórcio: −90 dBm)', acao: 'Reposicionar antena ou instalar gateway intermediário' });
    var mesesCalib = Math.round((AGORA - new Date(d.calibracao + 'T12:00:00')) / 2592000000);
    if (mesesCalib >= 12) problemas.push({ nivel: 'atencao', texto: 'Calibração com ' + mesesCalib + ' meses (recomendado: 12)', acao: 'Agendar recalibração na próxima visita à propriedade' });
    var serie = leituras(id, 48, { incluirQualidade: true });
    var suspeitas = serie.filter(function (l) { return l.qualidade === 'suspeita'; }).length;
    var lacunas = serie.filter(function (l) { return l.qualidade === 'lacuna'; }).length;
    if (suspeitas) problemas.push({
      nivel: 'atencao',
      texto: suspeitas + ' leitura(s) rejeitada(s) por desvio estatístico nas últimas 48 h',
      acao: d.tipo === 'gateway' ? 'Verificar alimentação e conectividade do gateway'
        : d.tipo === 'sensor_fermentacao' || d.tipo === 'sensor_secagem' ? 'Verificar o cabo da sonda dentro da massa/do terreiro — leitura alterada costuma ser contato'
        : 'Verificar obstrução do sensor e conexão do cabo'
    });
    if (lacunas) problemas.push({ nivel: 'info', texto: lacunas + ' janela(s) sem transmissão nas últimas 48 h', acao: 'Conferir alcance do gateway — o dado foi interpolado para o cálculo' });
    var confiabilidade = 100 - problemas.filter(function (p) { return p.nivel === 'critico'; }).length * 25
      - problemas.filter(function (p) { return p.nivel === 'atencao'; }).length * 8
      - lacunas * 1.5;
    var invalidas = suspeitas + lacunas;
    var leiturasValidas = serie.length - invalidas;
    var percValidas = serie.length ? Math.round(leiturasValidas / serie.length * 100) : 100;
    return {
      dispositivo: id, bateria: d.bateria, sinal: d.sinal, protocolo: d.protocolo,
      problemas: problemas, leituras48h: serie.length,
      leiturasValidas: leiturasValidas, leiturasAnalisadas: serie.length,
      rejeitadas: suspeitas, lacunas: lacunas,
      percentualValido: percValidas,
      situacao: problemas.some(function (p) { return p.nivel === 'critico'; }) ? 'exige manutenção imediata'
        : problemas.some(function (p) { return p.nivel === 'atencao'; }) ? 'operando com restrição'
        : 'operando normalmente',
      confiabilidade: Math.max(25, Math.round(confiabilidade)),
      aceitoNaCadeia: true,
      observacao: 'Mesmo com falha de sensor, o histórico permanece válido na blockchain: o que foi ancorado não muda. O que o sistema faz é registrar a lacuna e reduzir o peso daquele dado nos indicadores.'
    };
  }

  function alertasSensores() {
    var out = [];
    D.sensores.forEach(function (d) {
      var q = qualidadeDispositivo(d.id);
      q.problemas.forEach(function (p) {
        if (p.nivel === 'info') return;
        out.push({
          severidade: p.nivel === 'critico' ? 'critico' : 'atencao',
          dispositivo: d.id, sensor: d.id, local: d.local, talhao: d.talhao, lote: d.lote || null, produtor: d.produtor,
          titulo: d.id + ' (' + TIPOS[d.tipo].nome + ') — ' + p.texto,
          detalhe: TIPOS[d.tipo].nome + ' instalado em ' + d.local + ' (' + d.protocolo + ', envio a cada ' +
            (d.intervaloMin < 60 ? d.intervaloMin + ' min' : (d.intervaloMin / 60) + ' h') + '). ' +
            'Esse dispositivo responde por ' + TIPOS[d.tipo].funcao + '.',
          acao: p.acao
        });
      });
    });
    /* alertas agronômicos derivados das leituras */
    D.talhoes.forEach(function (t) {
      var e = estresseHidrico(t.id);
      if (e && e.aguaDisponivel < 55) {
        out.push({
          severidade: e.aguaDisponivel < 25 ? 'critico' : 'atencao',
          dispositivo: e.sensor, sensor: e.sensor, local: t.nome, talhao: t.id, lote: null, produtor: t.produtor,
          titulo: 'Estresse hídrico ' + e.classificacao + ' em ' + t.nome + ' — água disponível em ' + e.aguaDisponivel + '%',
          detalhe: 'A sonda ' + e.sensor + ' mede ' + e.vwc10 + '% / ' + e.vwc30 + '% / ' + e.vwc60 + '% de água no solo a 10, 30 e 60 cm ' +
            '(capacidade de campo ' + SOLO[t.id].fc * 100 + '%, ponto de murcha ' + SOLO[t.id].pwp * 100 + '%). Tendência das últimas 48 h: ' + e.tendencia48h + ' pontos percentuais.',
          acao: e.recomendacao
        });
      }
      var m = molhamentoFoliar(t.id, 7);
      if (m.horasFavoraveis >= 18) {
        out.push({
          severidade: m.horasFavoraveis >= 30 ? 'critico' : 'atencao',
          dispositivo: m.sensor, sensor: m.sensor, local: t.nome, talhao: t.id, lote: null, produtor: t.produtor,
          detalhe: m.horasFavoraveis + ' horas em condição favorável nos últimos 7 dias (critério: ' + m.limiar + '), em janelas de até ' + m.maxHorasContinuas + ' h seguidas. Fonte: ' + m.fonte + '.',
          titulo: t.produto === 'cacau'
            ? 'Molhamento foliar favorável a vassoura-de-bruxa em ' + t.nome + ' (' + m.horasFavoraveis + ' h em 7 dias)'
            : 'Molhamento foliar favorável a ferrugem em ' + t.nome + ' (' + m.horasFavoraveis + ' h em 7 dias)',
          acao: 'Reforçar o monitoramento e antecipar a aplicação preventiva se o histórico do talhão justificar.'
        });
      }
    });
    D.sensores.filter(function (d) { return d.tipo === 'sensor_fermentacao'; }).forEach(function (d) {
      var f = fermentacao(d.lote);
      if (f && (f.classe === 'EXCESSO' || (!f.encerrada && f.indiceProjetado > LIMIAR_FERMENTACAO.excesso))) {
        out.push({
          severidade: 'atencao', dispositivo: d.id, sensor: d.id, local: d.local, talhao: d.talhao, lote: d.lote, produtor: d.produtor,
          titulo: 'Fermentação acima da faixa ideal no lote ' + d.lote + ' (' + (f.encerrada ? f.indiceProjetado + ' °C·h no fechamento' : 'projeção de ' + f.indiceProjetado + ' °C·h') + ')',
          detalhe: 'A massa passou de 40 °C por ' + f.horasAcima40C + ' h, com pico de ' + f.temperaturaPico + ' °C. Acumulado de ' + f.indiceAcumulado + ' °C·h e projeção de ' + f.indiceProjetado + ' °C·h contra faixa ideal de ' + LIMIAR_FERMENTACAO.incompleta + ' a ' + LIMIAR_FERMENTACAO.excesso + ' °C·h.',
          acao: f.recomendacao
        });
      }
    });
    return out;
  }

  /* =========================================================================
   * ANCORAGEM DAS LEITURAS NA BLOCKCHAIN
   * A janela inteira de leituras vira uma árvore de Merkle; só a raiz e os
   * metadados vão para a cadeia. É o padrão de oráculo de dados: barato para
   * gravar e suficiente para provar depois que nenhuma leitura foi alterada.
   * ======================================================================= */
  function prepararAncoragem(dispositivoId, horas) {
    var d = disp(dispositivoId);
    var serie = leituras(dispositivoId, horas, { incluirQualidade: true });
    if (!serie.length) return null;
    var hashes = serie.map(function (l) { return Cripto.hashRecord({ disp: dispositivoId, ts: l.ts, v: l.valores }); });
    var merkle = Cripto.merkleRoot(hashes);
    return {
      dispositivo: dispositivoId, tipo: d.tipo, talhao: d.talhao, produtor: d.produtor,
      janelaHoras: horas, leituras: serie.length,
      primeira: serie[0].ts, ultima: serie[serie.length - 1].ts,
      raizMerkle: merkle,
      hashAmostra: hashes.slice(0, 3),
      amostraLeitura: serie[serie.length - 1],
      rejeitadas: serie.filter(function (l) { return l.qualidade === 'suspeita'; }).length,
      lacunas: serie.filter(function (l) { return l.qualidade === 'lacuna'; }).length,
      intervaloMin: d.intervaloMin, protocolo: d.protocolo
    };
  }

  function ancorar(dispositivoId, horas, autorId) {
    var prep = prepararAncoragem(dispositivoId, horas);
    if (!prep) return null;
    var tx = global.Ledger.registrarTx('LEITURA_SENSOR', {
      dispositivo: prep.dispositivo, tipo: prep.tipo, janelaHoras: prep.janelaHoras,
      leituras: prep.leituras, raizMerkle: prep.raizMerkle,
      primeira: prep.primeira, ultima: prep.ultima,
      descricao: 'Ancoragem de ' + prep.leituras + ' leituras do sensor ' + prep.dispositivo + ' (raiz de Merkle ' + prep.raizMerkle.slice(0, 16) + '…)'
    }, autorId);
    var bloco = null;
    if (tx.status !== 'PENDENTE') {
      /* Permissão negada é resposta legítima do consórcio: devolvemos o motivo
         em vez de gravar uma ancoragem que não existe na cadeia. */
      return { preparacao: prep, transacao: tx, bloco: null, recusada: true, motivo: tx.motivoRejeicao };
    }
    if (tx.status === 'PENDENTE') {
      bloco = global.Ledger.minerar({ minerador: 'Gateway IoT ' + Dados.orgUsuario(autorId).split('—')[0].trim() });
      D.ancoragensIoT.unshift({
        id: 'ANC-' + (D.ancoragensIoT.length + 1),
        dispositivo: prep.dispositivo, leituras: prep.leituras, janelaHoras: prep.janelaHoras,
        raizMerkle: prep.raizMerkle, txId: tx.id, bloco: bloco ? bloco.indice : null,
        hashBloco: bloco ? bloco.hash : null, em: new Date().toISOString(), autor: autorId
      });
    }
    return { preparacao: prep, transacao: tx, bloco: bloco };
  }

  /** Prova de inclusão: mostra que uma leitura específica pertence à raiz ancorada. */
  function provarLeitura(ancoragemId, indiceLeitura) {
    var a = D.ancoragensIoT.filter(function (x) { return x.id === ancoragemId; })[0];
    if (!a) return null;
    var serie = leituras(a.dispositivo, a.janelaHoras, { incluirQualidade: true });
    var hashes = serie.map(function (l) { return Cripto.hashRecord({ disp: a.dispositivo, ts: l.ts, v: l.valores }); });
    var i = indiceLeitura === undefined ? hashes.length - 1 : indiceLeitura;
    /* caminho de Merkle: recalcula os pares até a raiz */
    var caminho = [], nivel = hashes.slice(), idx = i;
    while (nivel.length > 1) {
      var par = (idx % 2 === 0) ? nivel[idx + 1] : nivel[idx - 1];
      caminho.push({ irmao: par ? par.slice(0, 12) + '…' : '(duplicado)', posicao: idx % 2 === 0 ? 'direita' : 'esquerda' });
      var proximo = [];
      for (var k = 0; k < nivel.length; k += 2) proximo.push(Cripto.sha256(nivel[k] + (nivel[k + 1] || nivel[k])));
      nivel = proximo; idx = Math.floor(idx / 2);
    }
    return {
      ancoragem: a.id, dispositivo: a.dispositivo, leitura: serie[i], hashLeitura: hashes[i],
      caminho: caminho, raizCalculada: nivel[0], raizAncorada: a.raizMerkle,
      confere: nivel[0] === a.raizMerkle,
      explicacao: 'A leitura de ' + new Date(serie[i].ts).toLocaleString('pt-BR') + ' gera um hash que, combinado com os hashes vizinhos da árvore, reconstrói exatamente a raiz gravada na blockchain. Qualquer alteração na leitura mudaria a raiz e a conferência falharia.'
    };
  }

  /* ---------------------------------------------------------------------
   * MODO DEMONSTRAÇÃO: ADULTERAÇÃO DE LEITURA
   * Uma leitura ancorada é alterada no dispositivo; a prova de inclusão passa
   * a falhar porque a raiz recalculada não é mais a raiz gravada no bloco.
   * É a demonstração prática de que o dado publicado na cadeia não pode ser
   * reescrito depois — nem pelo próprio dono do sensor.
   * ------------------------------------------------------------------- */
  function adulterarLeitura(ancoragemId, indiceLeitura, campo) {
    var a = D.ancoragensIoT.filter(function (x) { return x.id === ancoragemId; })[0];
    if (!a) return null;
    var serie = leituras(a.dispositivo, a.janelaHoras, { incluirQualidade: true });
    var i = indiceLeitura === undefined ? serie.length - 1 : indiceLeitura;
    var l = serie[i];
    if (!l) return null;
    var campoAlvo = campo || Object.keys(l.valores).filter(function (c) { return typeof l.valores[c] === 'number'; })[0];
    var antes = l.valores[campoAlvo];
    /* alteração plausível, não absurda: se fosse um valor impossível, o
       controle de qualidade descartaria sozinho e a lição se perderia */
    var depois = Math.round((antes * 1.35 + 2) * 100) / 100;
    D.leiturasAdulteradas.push({ dispositivo: a.dispositivo, ts: l.ts, campo: campoAlvo, valorOriginal: antes, valorNovo: depois, em: new Date().toISOString() });
    return { ancoragem: a.id, dispositivo: a.dispositivo, ts: l.ts, campo: campoAlvo, antes: antes, depois: depois };
  }

  function limparAdulteracoes() {
    var n = D.leiturasAdulteradas.length;
    D.leiturasAdulteradas = [];
    return n;
  }

  /** Panorama da rede de sensores. */
  function panorama() {
    var ativos = D.sensores.filter(function (s) { return s.status === 'ATIVO'; });
    var comProblema = D.sensores.filter(function (s) { return s.status !== 'ATIVO' || s.bateria < 60; });
    var leiturasDia = D.sensores.reduce(function (a, s) { return a + (s.intervaloMin ? Math.round(1440 / s.intervaloMin) : 0); }, 0);
    var confiabilidade = Math.round(D.sensores.reduce(function (a, s) { return a + (qualidadeDispositivo(s.id) || { confiabilidade: 0 }).confiabilidade; }, 0) / D.sensores.length);
    return {
      total: D.sensores.length, ativos: ativos.length, emAtencao: comProblema.length,
      bateriaMedia: Math.round(D.sensores.reduce(function (a, s) { return a + s.bateria; }, 0) / D.sensores.length),
      leiturasPorDia: leiturasDia,
      dadosPorDia: leiturasDia * 6,           // ~6 campos medidos por leitura
      ancoragens: D.ancoragensIoT.length,
      confiabilidadeMedia: confiabilidade,
      talhoesCobertos: [...new Set(D.sensores.map(function (s) { return s.talhao; }).filter(Boolean))].length,
      protocolos: [...new Set(D.sensores.map(function (s) { return s.protocolo.split(' ')[0]; }))],
      tipos: Object.keys(TIPOS).filter(function (t) { return D.sensores.some(function (s) { return s.tipo === t; }); })
    };
  }

  global.IoT = {
    AGORA: AGORA, TIPOS: TIPOS, SOLO: SOLO,
    leituras: leituras, ultimaLeitura: ultimaLeitura, disp: disp, resumoDiario: resumoDiario,
    sensoresDeTalhao: sensoresDeTalhao, sensoresDeLote: sensoresDeLote,
    climaHorario: climaHorario, et0: et0, radiacaoExtraterrestre: radiacaoExtraterrestre,
    grausDia: grausDia, balancoHidrico: balancoHidrico, molhamentoFoliar: molhamentoFoliar,
    estadoSoloDiario: estadoSoloDiario, vwcAtual: vwcAtual,
    fermentacao: fermentacao, secagem: secagem, estresseHidrico: estresseHidrico,
    eficienciaIrrigacao: eficienciaIrrigacao, derivadosTalhao: derivadosTalhao,
    qualidadeDispositivo: qualidadeDispositivo, alertasSensores: alertasSensores,
    prepararAncoragem: prepararAncoragem, ancorar: ancorar, provarLeitura: provarLeitura,
    adulterarLeitura: adulterarLeitura, limparAdulteracoes: limparAdulteracoes,
    panorama: panorama
  };
})(typeof window !== 'undefined' ? window : globalThis);
