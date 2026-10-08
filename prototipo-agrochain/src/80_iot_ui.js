/* =========================================================================
 * AGROCHAIN · PAINEL DE IOT E SENSORES
 * Rede de campo: estações meteorológicas, sondas de solo, sensores de
 * fermentação, secagem, molhamento foliar e medidores de vazão.
 * Da leitura bruta ao indicador agronômico e à âncora na blockchain.
 * ========================================================================= */
(function (global) {
  'use strict';

  var A = global.App;
  var D = global.DB;
  var IoT = global.IoT;
  var Dados = global.Dados;
  var Ledger = global.Ledger;

  var App3 = {
    aba: 'mapa',
    sensorSel: 'EST-01',
    janela: 48,
    campo: null,
    ancoragemAberta: null,
    prova: null,
    aviso: null,
    talhaoSelIoT: null,
    loteSelIoT: null
  };

  /* ---------------- utilidades ---------------- */
  function num(v, dec) { return Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 }); }
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function chip(t, c) { return '<span class="chip ' + (c || 'cinza') + '">' + t + '</span>'; }
  function barra(pct, cor) { return '<div class="barra-alt"><i style="width:' + Math.max(2, Math.min(100, pct)) + '%' + (cor ? ';background:' + cor : '') + '"></i></div>'; }
  function dataHora(iso) { var d = new Date(iso); return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function hora(iso) { return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  function usuario() { return D.usuarios.filter(function (u) { return u.id === A.usuario; })[0]; }

  /* Status de uma transação: procura nos blocos minerados e na fila pendente.
     A blockchain aqui é a local do protótipo, então a consulta é direta. */
  function statusTx(txId) {
    var achou = null;
    Ledger.blocos().forEach(function (b) {
      b.transacoes.forEach(function (t) { if (t.id === txId) achou = { status: t.status, bloco: b.indice }; });
    });
    if (!achou) Ledger.filaPendente().forEach(function (t) { if (t.id === txId) achou = { status: t.status, bloco: null }; });
    return achou;
  }

  var NOME_TIPO = {
    estacao_meteorologica: 'Estação meteorológica',
    sonda_solo: 'Sonda de umidade do solo',
    sensor_fermentacao: 'Sensor de fermentação',
    sensor_secagem: 'Sensor de secagem',
    molhamento_foliar: 'Molhamento foliar',
    medidor_vazao: 'Medidor de vazão',
    gateway: 'Gateway de campo'
  };
  var ICONE_TIPO = {
    estacao_meteorologica: 'estacao', sonda_solo: 'solo', sensor_fermentacao: 'fermentacao',
    sensor_secagem: 'secagem', molhamento_foliar: 'folha', medidor_vazao: 'agua', gateway: 'gateway'
  };
  var NOME_CAMPO = {
    chuvaMm: 'Chuva (mm)', tempMedia: 'Temperatura (°C)', umidadeRel: 'Umidade relativa (%)',
    ventoMs: 'Vento (m/s)', radiacaoMJ: 'Radiação (MJ/m²)', et0Mm: 'ET0 por hora (mm)',
    vwc10: 'Umidade do solo 10 cm (% vol.)', vwc30: 'Umidade do solo 30 cm (% vol.)',
    vwc60: 'Umidade do solo 60 cm (% vol.)', tempSolo: 'Temperatura do solo (°C)',
    irrigacaoMm: 'Irrigação (mm)', molhamentoFoliar: 'Molhamento foliar (%)',
    tempMassa: 'Temperatura da massa (°C)', tempAmbiente: 'Temperatura ambiente (°C)',
    phEst: 'pH estimado', dTdt: 'Taxa de aquecimento (°C/h)', horasFermentacao: 'Horas de fermentação',
    umidadeGrao: 'Umidade do grão (%)', taxaDesidratacao: 'Taxa de secagem (%/dia)',
    vazaoLh: 'Vazão (L/h)', mmAplicado: 'Lâmina aplicada (mm)', pressaoBar: 'Pressão (bar)',
    pacotesRecebidos: 'Pacotes recebidos por hora', sensoresConectados: 'Sensores conectados ao gateway',
    latenciaMs: 'Latência do enlace (ms)', taxaEntrega: 'Taxa de entrega dos pacotes (%)'
  };
  function nomeCampo(c) { return NOME_CAMPO[c] || c; }
  function unidadeCampo(c) { var m = (NOME_CAMPO[c] || '').match(/\(([^)]+)\)/); return m ? m[1] : ''; }

  /* ---------------------------------------------------------------------
   * VISIBILIDADE POR PAPEL
   * O produtor vê os sensores dele. A cooperativa vê a rede do consórcio
   * inteira (é ela que opera os gateways). Indústria, certificadora e
   * auditoria veem tudo, mas não ancoram — quem mede não escolhe o que
   * entra na cadeia, e quem compra não altera a medição.
   * ------------------------------------------------------------------- */
  function sensoresVisiveis() {
    var u = usuario();
    if (u.papel === 'produtor') return D.sensores.filter(function (s) { return s.produtor === u.id; });
    return D.sensores;
  }
  function lotesVisiveis() {
    var u = usuario();
    if (u.papel === 'produtor') return D.lotes.filter(function (l) { return l.produtor === u.id; });
    return D.lotes;
  }
  function talhoesVisiveis() {
    var u = usuario();
    if (u.papel === 'produtor') return D.talhoes.filter(function (t) { return t.produtor === u.id; });
    return D.talhoes;
  }
  function podeAncorar() { return ['produtor', 'cooperativa'].indexOf(usuario().papel) >= 0; }
  function alertasVisiveis() {
    var nomes = sensoresVisiveis().map(function (s) { return s.id; });
    var talhoes = talhoesVisiveis().map(function (t) { return t.id; });
    return IoT.alertasSensores().filter(function (a) {
      if (a.sensor) return nomes.indexOf(a.sensor) >= 0;
      if (a.talhao) return talhoes.indexOf(a.talhao) >= 0;
      return true;
    });
  }

  /* ---------------- gráfico de linha próprio (sem biblioteca) ---------------- */
  function grafico(serie, campo, opts) {
    opts = opts || {};
    var vals = serie.map(function (l) { return l.valores[campo]; }).filter(function (v) { return typeof v === 'number'; });
    if (vals.length < 2) return '<div class="nota">Sem dados suficientes para o gráfico.</div>';
    var L = 660, Alt = 190, ml = 54, mr = 14, mt = 14, mb = 26;
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    var folga = (mx - mn) * 0.15 || 1; mn -= folga; mx += folga;
    function px(i) { return ml + (L - ml - mr) * (i / (serie.length - 1)); }
    function py(v) { return mt + (Alt - mt - mb) * (1 - (v - mn) / (mx - mn)); }
    var svg = '<svg viewBox="0 0 ' + L + ' ' + Alt + '" style="width:100%;height:auto">';
    for (var g = 0; g <= 4; g++) {
      var vv = mn + (mx - mn) * g / 4, y = py(vv);
      svg += '<line x1="' + ml + '" y1="' + y + '" x2="' + (L - mr) + '" y2="' + y + '" class="grade-linha"/>';
      svg += '<text x="' + (ml - 7) + '" y="' + (y + 3.5) + '" style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">' + num(vv, 1) + '</text>';
    }
    /* faixas de referência agronômica (ex.: faixa ideal de fermentação) */
    (opts.faixas || []).forEach(function (f) {
      if (f.de > mx || f.ate < mn) return;
      var y1 = py(Math.min(mx, f.ate)), y2 = py(Math.max(mn, f.de));
      svg += '<rect x="' + ml + '" y="' + y1 + '" width="' + (L - ml - mr) + '" height="' + Math.max(1, y2 - y1) + '" fill="' + (f.cor || 'rgba(47,143,82,.12)') + '"/>';
      svg += '<text x="' + (L - mr - 4) + '" y="' + (y1 + 11) + '" style="fill:var(--texto-3)" font-size="9" text-anchor="end">' + esc(f.nome) + '</text>';
    });
    var d = '';
    serie.forEach(function (l, i) {
      var v = l.valores[campo];
      if (typeof v !== 'number') return;
      d += (d ? ' L' : 'M') + px(i) + ',' + py(v);
    });
    svg += '<path d="' + d + '" fill="none" stroke="' + (opts.cor || '#2f8f52') + '" stroke-width="2.3" stroke-linejoin="round"/>';
    /* marcadores: leitura rejeitada pelo controle de qualidade e lacuna */
    serie.forEach(function (l, i) {
      var v = l.valores[campo];
      if (typeof v !== 'number') return;
      if (l.qualidade === 'suspeita' && l.valorSuspeito !== undefined && campo === (opts.campoQC || campo)) {
        svg += '<circle cx="' + px(i) + '" cy="' + py(Math.max(mn, Math.min(mx, l.valorSuspeito))) + '" r="3.4" fill="#c0392b" style="stroke:var(--sup-1)" stroke-width="1.4"/>';
      }
      if (l.qualidade === 'lacuna') svg += '<circle cx="' + px(i) + '" cy="' + py(v) + '" r="2.6" fill="#c9a227" style="stroke:var(--sup-1)" stroke-width="1.2"/>';
      if (l.adulterada) svg += '<circle cx="' + px(i) + '" cy="' + py(v) + '" r="3.4" fill="#e0563f" style="stroke:var(--sup-1)" stroke-width="1.4"/>';
    });
    svg += '<circle cx="' + px(serie.length - 1) + '" cy="' + py(serie[serie.length - 1].valores[campo]) + '" r="4" fill="' + (opts.cor || '#2f8f52') + '"/>';
    svg += '<text x="' + ml + '" y="' + (Alt - 8) + '" style="fill:var(--texto-3)" font-size="9.5">' + dataHora(serie[0].ts) + '</text>';
    svg += '<text x="' + (L - mr) + '" y="' + (Alt - 8) + '" style="fill:var(--texto-3)" font-size="9.5" text-anchor="end">' + dataHora(serie[serie.length - 1].ts) + '</text>';
    svg += '</svg>';
    return svg;
  }

  /* =========================== NAVEGAÇÃO =========================== */
  App3.viewIoT = function () {
    var abas = [['mapa', 'Sensores e mapa'], ['leituras', 'Leituras'], ['derivados', 'Indicadores derivados'], ['ancoragem', 'Ancoragem e provas'], ['alertas', 'Alertas']];
    var h = '<h1>IoT e sensores de campo</h1><div class="sub">Toda medição que vira decisão — do sensor na lavoura até a âncora criptográfica na blockchain. ' +
      '<b>' + D.sensores.length + ' dispositivos</b> instalados em Cacoal e Rolim de Moura, com telemetria horária e controle de qualidade do dado.</div>';

    var al = alertasVisiveis();
    h += '<div class="abas">' + abas.map(function (a) {
      var badge = a[0] === 'alertas' && al.length ? ' <span class="badge">' + al.length + '</span>' : '';
      return '<div class="aba ' + (App3.aba === a[0] ? 'on' : '') + '" onclick="App3.ir(\'' + a[0] + '\')">' + a[1] + badge + '</div>';
    }).join('') + '</div>';

    if (App3.aviso) h += '<div class="caixa verde" style="margin-bottom:13px">✓ ' + esc(App3.aviso) + '</div>';

    if (App3.aba === 'mapa') h += abaMapa();
    else if (App3.aba === 'leituras') h += abaLeituras();
    else if (App3.aba === 'derivados') h += abaDerivados();
    else if (App3.aba === 'ancoragem') h += abaAncoragem();
    else h += abaAlertas();
    return h;
  };

  /* =========================== ABA 1: MAPA =========================== */
  function abaMapa() {
    var sensores = sensoresVisiveis();
    var p = IoT.panorama();
    var h = '';

    var ativos = sensores.filter(function (s) { return s.status === 'ATIVO'; }).length;
    var bateriaMedia = Math.round(sensores.reduce(function (a, s) { return a + s.bateria; }, 0) / (sensores.length || 1));
    var confMedia = Math.round(sensores.reduce(function (a, s) { return a + IoT.qualidadeDispositivo(s.id).confiabilidade; }, 0) / (sensores.length || 1));
    var talhoesCobertos = [];
    sensores.forEach(function (s) { if (s.talhao && talhoesCobertos.indexOf(s.talhao) < 0) talhoesCobertos.push(s.talhao); });

    h += '<div class="grade g4">' +
      cartaoKPI('Dispositivos na rede', sensores.length, ativos + ' ativos · ' + sensores.filter(function (s) { return s.status === 'ATENCAO'; }).length + ' em atenção') +
      cartaoKPI('Bateria média da rede', bateriaMedia + '%', 'sensores solares e a bateria primária') +
      cartaoKPI('Confiabilidade média', confMedia + '%', 'considera bateria, sinal, calibração e falhas') +
      cartaoKPI('Leituras por dia', num(sensores.reduce(function (a, s) { return a + (1440 / s.intervaloMin); }, 0), 0), talhoesCobertos.length + ' talhões cobertos · ' + D.ancoragensIoT.length + ' ancoragens na cadeia') +
      '</div>';

    /* mapa: talhões + sensores posicionados perto do talhão deles */
    h += '<div class="cartao" style="margin-top:14px"><h2>Onde está cada sensor</h2>';
    h += '<div class="nota" style="margin-bottom:8px">Cada ponto é um dispositivo em campo. Sensores de ferramenta seguem o lote, não o talhão: o de fermentação fica no cocho e o de secagem, no terreiro.</div><div class="mapa">';
    h += '<svg viewBox="0 0 680 280" style="width:100%;height:auto">';
    for (var i = 0; i <= 11; i++) {
      h += '<line x1="' + (i * 62) + '" y1="0" x2="' + (i * 62) + '" y2="280" stroke="rgba(47,143,82,.08)"/>';
      h += '<line x1="0" y1="' + (i * 25) + '" x2="680" y2="' + (i * 25) + '" stroke="rgba(47,143,82,.08)"/>';
    }
    var talhoes = talhoesVisiveis();
    var lats = talhoes.map(function (t) { return t.geo.lat; }), lons = talhoes.map(function (t) { return t.geo.lon; });
    var latMax = Math.max.apply(null, lats), lonMin = Math.min.apply(null, lons);
    function pos(t, dLat, dLon) {
      var x = 70 + ((t.geo.lon - lonMin) * 100000) / 2.5 + (dLon || 0);
      var y = 45 + ((latMax - t.geo.lat) * 100000) / 1.55 + (dLat || 0);
      return [x, y];
    }
    /* ligações gateway → sensores */
    var gws = sensores.filter(function (s) { return s.tipo === 'gateway'; });
    sensores.forEach(function (s) {
      if (!s.talhao) return;
      var t0 = Dados.talhao(s.talhao);
      if (!t0) return;
      var gw = gws.filter(function (g) { return g.talhao === s.talhao; })[0];
      if (!gw || gw.id === s.id) return;
      var a = pos(t0, 0, 0), b = pos(t0, 26, 30);
      h += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(142,200,238,.4)" stroke-width="1" stroke-dasharray="3 3"/>';
    });
    talhoes.forEach(function (t) {
      var pt = pos(t, 0, 0);
      var cor = t.produto === 'cacau' ? '#b07d4f' : '#2f8f52';
      h += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="5" fill="' + cor + '"/>';
      h += '<text x="' + (pt[0] + 9) + '" y="' + (pt[1] + 4) + '" fill="#e6f4ec" font-size="11">' + t.id + ' ' + esc(t.nome.replace(/^(Talhão|Fazenda) /, '')) + ' <tspan fill="#9db2a4">' + t.area + ' ha</tspan></text>';
    });
    sensores.forEach(function (s, i) {
      if (!s.talhao) return;
      var t0 = Dados.talhao(s.talhao);
      if (!t0) return;
      var mesmo = sensores.filter(function (x) { return x.talhao === s.talhao && x.id !== s.id; });
      var idx = mesmo.indexOf(s) < 0 ? 0 : mesmo.indexOf(s) + 1;
      var pt = pos(t0, 30 + (idx % 4) * 17, 42 + Math.floor(idx / 4) * 62);
      var corS = s.status === 'ATIVO' ? (s.bateria < 60 || s.sinal < -90 ? '#e0b03a' : '#8ec8ee') : '#c0392b';
      h += '<circle cx="' + pt[0] + '" cy="' + pt[1] + '" r="6.4" fill="' + corS + '" stroke="#0b2e1c" stroke-width="1.6"/>';
      h += '<text x="' + (pt[0] + 10) + '" y="' + (pt[1] + 3.6) + '" fill="#cfe0d7" font-size="10">' + s.id + ' <tspan fill="#9db2a4">' + esc(NOME_TIPO[s.tipo].split(' ')[0]) + '</tspan></text>';
    });
    h += '</svg></div>';
    h += '<div class="flex envolve" style="margin-top:10px">' +
      legenda('#8ec8ee', 'sensor operando bem') + legenda('#e0b03a', 'sensor em atenção (bateria ou sinal)') +
      legenda('#c0392b', 'sensor com falha') + legenda('#2f8f52', 'talhão de café') + legenda('#b07d4f', 'talhão de cacau') + '</div></div>';

    /* tabela de dispositivos */
    h += '<div class="cartao" style="margin-top:14px"><h2>Inventário dos dispositivos</h2>';
    h += '<div style="overflow-x:auto"><table class="tabela"><tr><th>ID</th><th>Tipo</th><th>Instalação</th><th>Rede</th><th>Envio</th><th>Bateria</th><th>Sinal</th><th>Confiabilidade</th><th>Status</th><th></th></tr>';
    sensores.forEach(function (s) {
      var q = IoT.qualidadeDispositivo(s.id);
      var u = s.talhao ? Dados.talhao(s.talhao) : null;
      var l = s.lote ? Dados.lote(s.lote) : null;
      var corB = s.bateria < 30 ? 'vermelho' : s.bateria < 60 ? 'ouro' : 'verde';
      h += '<tr>' +
        '<td><b>' + s.id + '</b><div class="nota">' + (ICONE_TIPO[s.tipo] ? Ico.svg(ICONE_TIPO[s.tipo], 'xs') : '') + ' ' + esc(s.fabricante) + '</div></td>' +
        '<td class="nota">' + esc(NOME_TIPO[s.tipo]) + '</td>' +
        '<td class="nota">' + esc(s.local) + '<br>' + (u ? u.id + ' · ' + esc(u.nome.replace(/^(Talhão|Fazenda) /, '')) : '') + (l ? ' · lote ' + l.id : '') + '</td>' +
        '<td>' + chip(s.protocolo, s.protocolo === 'LoRaWAN' ? 'azul' : s.protocolo === 'NB-IoT' ? 'roxo' : 'cinza') + '</td>' +
        '<td class="nota">' + (s.intervaloMin < 60 ? s.intervaloMin + ' min' : (s.intervaloMin / 60) + ' h') + '</td>' +
        '<td>' + chip(s.bateria + '%', corB) + '</td>' +
        '<td class="nota">' + s.sinal + ' dBm</td>' +
        '<td style="min-width:120px">' + barra(q.confiabilidade, q.confiabilidade > 85 ? '#2f8f52' : q.confiabilidade > 65 ? '#c9a227' : '#c0392b') + '<div class="nota">' + q.confiabilidade + '% · ' + q.leiturasValidas + ' de ' + q.leiturasAnalisadas + ' leituras válidas</div></td>' +
        '<td>' + chip(s.status === 'ATIVO' ? 'Operando' : 'Em atenção', s.status === 'ATIVO' ? 'verde' : 'ouro') + '</td>' +
        '<td><button class="mini sec" onclick="App3.verSensor(\'' + s.id + '\')">Leituras </button></td></tr>';
    });
    h += '</table></div>';
    h += '<div class="nota" style="margin-top:9px">Cada intervalo de envio define o volume de dados: uma sonda que envia a cada 30 minutos gera 48 pacotes por dia; ' +
      'por isso a série bruta <b>não</b> vai toda para a blockchain — o que entra na cadeia é a raiz de Merkle do período, e cada leitura individual é conferível contra ela.</div></div>';

    /* qualidade do dado: mostra que o sistema rejeita dado ruim */
    h += '<div class="cartao" style="margin-top:14px"><h2>Controle de qualidade do dado</h2>' +
      '<div class="nota" style="margin-bottom:9px">Sensor sujo, bateria fraca, conector molhado: dado ruim <b>entra</b>. O sistema precisa barrá-lo antes que vire decisão. ' +
      'A rotina usa <b>mediana e desvio absoluto mediano (MAD)</b>, e não média e desvio-padrão, porque chuva e irrigação produzem séries naturalmente bimodais — com média, um pulso de irrigação seria descartado como “outlier”.</div>';
    var exemplo = null, exemploLacuna = null, exemploSensor = null;
    for (var j = 0; j < sensores.length; j++) {
      var sj = sensores[j], qj = IoT.leituras(sj.id, 48, { incluirQualidade: true });
      var sus = qj.filter(function (l) { return l.qualidade === 'suspeita'; })[0];
      var lac = qj.filter(function (l) { return l.qualidade === 'lacuna'; })[0];
      if (sus && !exemplo) { exemplo = sus; exemploSensor = sj.id; }
      if (lac && !exemploLacuna) exemploLacuna = lac;
      if (exemplo && exemploLacuna) break;
    }
    h += '<div class="grade g2">';
    if (exemplo) {
      h += '<div class="caixa vermelha"><b>Leitura rejeitada automaticamente</b><div class="nota" style="margin-top:6px">' +
        '<b>' + exemploSensor + '</b> · ' + dataHora(exemplo.ts) + ' · valor bruto <b>' + exemplo.valorSuspeito + '</b> para ' + esc(nomeCampo(Object.keys(exemplo.valores).filter(function (c) { return typeof exemplo.valores[c] === 'number'; })[0])) + '. ' +
        esc(exemplo.motivoQualidade) + '. O valor foi mantido na trilha com a marca de suspeito — auditoria precisa ver o que foi descartado, não só o que foi aceito.' +
        '</div></div>';
    }
    if (exemploLacuna) {
      h += '<div class="caixa ouro"><b>Lacuna de comunicação tratada</b><div class="nota" style="margin-top:6px">' +
        esc(exemploLacuna.motivoQualidade) + ' Em vez de fingir continuidade, o sistema declara a lacuna e reduz a confiabilidade do dispositivo — o comprador que consultar o lote vê exatamente o que faltou.</div></div>';
    }
    h += '</div></div>';
    return h;
  }

  function legenda(cor, texto) {
    return '<span class="flex" style="gap:6px"><span style="width:11px;height:11px;border-radius:50%;background:' + cor + ';display:inline-block"></span><span class="nota">' + texto + '</span></span>';
  }
  function cartaoKPI(rot, val, obs) {
    return '<div class="cartao"><div class="kpi"><div class="rot">' + rot + '</div><div class="val">' + val + '</div><div class="obs">' + obs + '</div></div></div>';
  }

  /* =========================== ABA 2: LEITURAS =========================== */
  function abaLeituras() {
    var sensores = sensoresVisiveis();
    var h = '';
    var d = sensores.filter(function (s) { return s.id === App3.sensorSel; })[0] || sensores[0];
    if (!d) return '<div class="cartao"><div class="nota">Nenhum sensor disponível para este perfil.</div></div>';
    App3.sensorSel = d.id;

    h += '<div class="cartao"><h2>Selecione o dispositivo</h2><div class="flex envolve" style="gap:7px;margin-top:8px">';
    sensores.forEach(function (s) {
      h += '<button class="mini ' + (s.id === d.id ? '' : 'sec') + '" onclick="App3.verSensor(\'' + s.id + '\')" title="' + esc(NOME_TIPO[s.tipo]) + '">' +
        (ICONE_TIPO[s.tipo] ? Ico.svg(ICONE_TIPO[s.tipo], 'sm') : '') + ' ' + s.id + '</button>';
    });
    h += '</div></div>';

    var serie = IoT.leituras(d.id, App3.janela, { incluirQualidade: true });
    var ult = serie[serie.length - 1];
    var q = IoT.qualidadeDispositivo(d.id);
    var u = d.talhao ? Dados.talhao(d.talhao) : null;
    var lote = d.lote ? Dados.lote(d.lote) : null;

    h += '<div class="cartao" style="margin-top:14px"><div class="flex entre" style="flex-wrap:wrap;gap:10px">' +
      '<div><b style="font-size:16px">' + (ICONE_TIPO[d.tipo] ? Ico.svg(ICONE_TIPO[d.tipo], 'sm') : '') + ' ' + d.id + ' — ' + esc(NOME_TIPO[d.tipo]) + '</b>' +
      '<div class="nota">' + esc(d.local) + (u ? ' · ' + u.id + ' ' + esc(u.nome.replace(/^(Talhão|Fazenda) /, '')) : '') + (lote ? ' · lote ' + lote.id + ' (' + esc(Dados.nomeProduto(lote.produto)) + ')' : '') + '</div></div>' +
      '<div>' + chip(d.protocolo, 'azul') + ' ' + chip('envio a cada ' + (d.intervaloMin < 60 ? d.intervaloMin + ' min' : (d.intervaloMin / 60) + ' h'), 'cinza') + ' ' +
      chip('bateria ' + d.bateria + '%', d.bateria < 60 ? 'ouro' : 'verde') + ' ' + chip(d.sinal + ' dBm', d.sinal < -90 ? 'ouro' : 'verde') + '</div></div>';
    h += '<div class="grade g4" style="margin-top:12px">';
    Object.keys(ult.valores).forEach(function (c) {
      h += '<div class="caixa"><div class="nota">' + esc(nomeCampo(c)) + '</div><b style="font-size:17px">' + num(ult.valores[c], 1) + '</b> <span class="nota">' + unidadeCampo(c) + '</span></div>';
    });
    h += '</div>';
    h += '<div class="nota" style="margin-top:9px">Leitura de ' + dataHora(ult.ts) + ' · confiabilidade do dispositivo <b>' + q.confiabilidade + '%</b> (' + esc(q.situacao) + ')</div></div>';

    /* gráfico */
    h += '<div class="cartao" style="margin-top:14px"><div class="flex entre" style="flex-wrap:wrap;gap:9px">' +
      '<h2 style="margin:0">Série temporal</h2><div>' +
      [24, 48, 168].map(function (w) {
        return '<button class="mini ' + (App3.janela === w ? '' : 'sec') + '" onclick="App3.janelaDe(' + w + ')">' + (w === 168 ? '7 dias' : w + 'h') + '</button> ';
      }).join('') + '</div></div>';
    var campos = Object.keys(ult.valores).filter(function (c) { return typeof ult.valores[c] === 'number'; });
    var campo = campos.indexOf(App3.campo) >= 0 ? App3.campo : campos[0];
    h += '<div class="flex envolve" style="gap:6px;margin:10px 0 4px">' + campos.map(function (c) {
      return '<span class="chip ' + (c === campo ? 'verde' : 'cinza') + '" style="cursor:pointer" onclick="App3.verCampo(\'' + c + '\')">' + esc(nomeCampo(c)) + '</span>';
    }).join('') + '</div>';
    h += grafico(serie, campo, d.tipo === 'sensor_fermentacao' && campo === 'tempMassa' ? { cor: '#b26a06', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal de fermentação (40–48 °C)', cor: 'rgba(47,143,82,.10)' }] } :
      d.tipo === 'sensor_secagem' && campo === 'umidadeGrao' ? { cor: '#b07d4f', faixas: [{ de: 0, ate: 7.5, nome: 'ponto de secagem (≤ 7,5%)', cor: 'rgba(47,143,82,.10)' }] } : {});
    h += '<div class="flex envolve" style="margin-top:8px">' + legenda('#2f8f52', 'série aceita') + legenda('#c0392b', 'valor bruto rejeitado (plota o ponto descartado)') + legenda('#c9a227', 'lacuna de comunicação') + legenda('#e0563f', 'leitura adulterada no modo demonstração') + '</div>';
    h += '</div>';

    /* tabela de leituras com flag de qualidade */
    h += '<div class="cartao" style="margin-top:14px"><h2>Últimas 12 leituras recebidas</h2><div style="overflow-x:auto">';
    h += '<table class="tabela"><tr><th>Horário</th>';
    campos.slice(0, 5).forEach(function (c) { h += '<th>' + esc(nomeCampo(c)) + '</th>'; });
    h += '<th>Qualidade</th></tr>';
    serie.slice(-12).reverse().forEach(function (x) {
      var cor = x.qualidade === 'lacuna' ? 'ouro' : x.qualidade === 'suspeita' ? 'vermelho' : x.adulterada ? 'vermelho' : 'verde';
      var txt = x.qualidade === 'lacuna' ? 'lacuna tratada' : x.qualidade === 'suspeita' ? 'rejeitada' : x.adulterada ? 'alterada' : 'válida';
      h += '<tr><td class="nota">' + dataHora(x.ts) + '</td>';
      campos.slice(0, 5).forEach(function (c) { h += '<td>' + num(x.valores[c], 1) + '<span class="nota"> ' + unidadeCampo(c) + '</span></td>'; });
      h += '<td>' + chip(txt, cor) + (x.qualidade === 'suspeita' ? '<div class="nota">bruto: ' + x.valorSuspeito + '</div>' : '') + '</td></tr>';
    });
    h += '</table></div>';

    if (podeAncorar()) {
      h += '<div class="flex" style="gap:9px;margin-top:12px;flex-wrap:wrap">' +
        '<button class="mini" onclick="App3.ancorarAgora(\'' + d.id + '\')">Ancorar ' + App3.janela + 'h de leituras na blockchain</button>' +
        '<button class="mini sec" onclick="App3.ir(\'ancoragem\')">Ver ancoragens existentes </button></div>';
    } else {
      h += '<div class="caixa" style="margin-top:12px"><b>Perfil "' + usuario().papel + '": leitura permitida.</b> <span class="nota">Quem ancora leituras é o produtor dono do sensor ou a cooperativa que opera o gateway — assim ninguém escolhe depois o que registra sobre o outro.</span></div>';
    }
    h += '</div>';
    return h;
  }

  /* =========================== ABA 3: DERIVADOS =========================== */
  function abaDerivados() {
    var h = '';
    var talhoes = talhoesVisiveis();
    var loteSel = App3.loteSelIoT;
    var lotesDerivaveis = lotesVisiveis().filter(function (l) {
      return IoT.sensoresDeLote(l.id).length > 0;
    });
    if (!loteSel || !lotesDerivaveis.filter(function (l) { return l.id === loteSel; })[0]) loteSel = lotesDerivaveis.length ? lotesDerivaveis[0].id : null;

    h += '<div class="cartao"><h2>O que o dado bruto vira: indicadores agronômicos</h2>' +
      '<div class="nota" style="margin-bottom:10px">Nenhuma decisão sai de “temperatura = 31,2 °C”. Sai de graus-dia acumulado, de saldo hídrico e de índice de fermentação — ' +
      'cada um com uma fórmula publicada, para que o agrônomo possa discordar com argumento.</div>';
    h += '<div class="grade g2">';
    talhoes.forEach(function (t) {
      var der = IoT.derivadosTalhao(t.id);
      var prod = D.usuarios.filter(function (x) { return x.id === t.produtor; })[0];
      h += '<div class="caixa"><div class="flex entre"><b>' + t.id + ' · ' + esc(t.nome.replace(/^(Talhão|Fazenda) /, '')) + '</b>' + chip(esc(Dados.nomeProduto(t.produto)), t.produto === 'cacau' ? 'ouro' : 'verde') + '</div>';
      h += '<div class="nota" style="margin:5px 0 9px">' + esc(prod.municipio) + ' · ' + t.area + ' ha · ' + esc(t.cultivar) + ' · ' + esc(t.sistema) + '</div>';
      h += '<table class="tabela" style="font-size:12px">';
      h += linhaDer('Graus-dia acumulados', num(der.grausDia.acumulado30d, 0) + ' GD/30 dias', 'ciclo: ' + num(der.grausDia.acumuladoCiclo, 0) + ' GD · ' + esc(der.grausDia.estagio));
      if (der.balanco) {
        h += linhaDer('Balanço hídrico', num(der.balanco.saldo, 1) + ' mm em 30 dias', 'chuva ' + num(der.balanco.chuva, 0) + ' + irrigação ' + num(der.balanco.irrigacao, 0) + ' − ET real ' + num(der.balanco.etReal, 0) + ' mm · ' + esc(der.balanco.classificacao));
        h += linhaDer('Água no solo', der.estresse ? der.estresse.aguaDisponivel + '% da capacidade' : '—', der.estresse ? 'VWC 10/30/60 cm: ' + der.estresse.vwc10 + '/' + der.estresse.vwc30 + '/' + der.estresse.vwc60 + '% · tendência 48h: ' + der.estresse.tendencia48h + ' pontos' : 'déficit severo de sonda: sem medição direta');
      } else {
        h += linhaDer('Balanço hídrico', 'sem medição', 'nenhuma sonda de solo neste talhão — o balanço depende de medição para ser auditável');
      }
      if (der.molhamento) {
        h += linhaDer('Molhamento foliar', der.molhamento.horasMolhadas + ' h molhadas em 7 dias', der.molhamento.horasFavoraveis + ' h em faixa favorável a doença · ' + esc(der.molhamento.fonte));
      }
      if (der.irrigacao) {
        h += linhaDer('Cobertura hídrica 7 dias', der.irrigacao.coberturaEt0Pct + '% da ET0', esc(der.irrigacao.situacao) + ' · irrigado ' + der.irrigacao.aplicado7d + ' mm + chuva ' + der.irrigacao.chuva7d + ' mm');
      }
      h += '</table>';
      h += '<button class="mini sec" style="margin-top:9px" onclick="App3.verLavoura(\'' + t.id + '\')">Abrir lavoura e IA </button></div>';
    });
    h += '</div></div>';

    /* fermentação e secagem: indicadores com impacto direto no preço */
    h += '<div class="cartao" style="margin-top:14px"><h2>Fermentação e secagem: onde o lote ganha ou perde valor</h2>' +
      '<div class="nota" style="margin-bottom:9px">Duas falhas de pós-colheita explicam boa parte do desconto no cacau e no café fino: fermentação mal conduzida e secagem descontrolada. ' +
      'Estes indicadores acompanham o lote em tempo real e apontam o momento da viragem.</div>';
    if (!lotesDerivaveis.length) {
      h += '<div class="caixa ouro">Nenhum lote deste perfil tem sensor de fermentação ou secagem dedicado.</div>';
    } else {
      h += '<div class="flex envolve" style="gap:7px;margin-bottom:10px">' + lotesDerivaveis.map(function (l) {
        return '<button class="mini ' + (l.id === loteSel ? '' : 'sec') + '" onclick="App3.verLote(\'' + l.id + '\')">' + l.id + ' · ' + esc(Dados.nomeProduto(l.produto)) + '</button>';
      }).join('') + '</div>';

      var f = IoT.fermentacao(loteSel);
      var s = IoT.secagem(loteSel);
      h += '<div class="grade g2">';
      if (f) {
        var corClasse = f.classe.indexOf('IDEAL') >= 0 ? 'verde' : f.classe.indexOf('EXCESSO') >= 0 ? 'ouro' : 'vermelho';
        h += '<div class="caixa"><div class="flex entre"><b>Fermentação — lote ' + f.lote + '</b>' +
          chip(f.classe + (f.encerrada ? ' · encerrada' : ' · em andamento'), corClasse) + '</div>';
        h += '<div class="grade g4" style="margin:10px 0">' +
          '<div><div class="nota">Horas desde o início</div><b>' + num(f.horasMonitoradas, 0) + ' h</b><div class="nota">fase: ' + esc(f.fase) + '</div></div>' +
          '<div><div class="nota">Calor acumulado (T > 40 °C)</div><b>' + num(f.indiceAcumulado, 0) + ' °C·h</b><div class="nota">medido até agora</div></div>' +
          '<div><div class="nota">Projeção até o fim</div><b>' + num(f.indiceProjetado, 0) + ' °C·h</b><div class="nota">' + (f.encerrada ? 'valor de fechamento' : '+' + num(f.calorRestanteProjetado, 0) + ' °C·h ainda previstos') + '</div></div>' +
          '<div><div class="nota">Nota prevista de qualidade</div><b>' + f.notaPrevista + '/100</b><div class="nota">faixa ideal 150–400 °C·h</div></div></div>';
        h += grafico(f.serie, 'tempMassa', { cor: '#b26a06', faixas: [{ de: 40, ate: 48, nome: 'faixa ideal 40–48 °C', cor: 'rgba(47,143,82,.10)' }] });
        h += '<div class="nota" style="margin-top:8px">Pico de <b>' + f.temperaturaPico + ' °C</b> às ' + num(f.picoAtingidoEmHoras, 0) + ' h · <b>' + num(f.horasAcima40C, 0) + ' h</b> acima de 40 °C · taxa máxima de aquecimento <b>' + f.taxaAquecimentoMax + ' °C/h</b> · pH estimado ' + f.phEstimado + '.</div>';
        h += '<div class="caixa ' + (f.encerrada ? '' : 'ouro') + '" style="margin-top:9px">' +
          (f.encerrada
            ? '<b>Fermentação encerrada ' + num(Math.round(f.horasDesdeTermino / 24), 1) + ' dias atrás.</b> O valor acima é o índice final do lote — é ele que sustenta o laudo de qualidade e pode ser conferido contra a âncora de leituras na blockchain.'
            : '<b>Próxima viragem:</b> ' + esc(f.proximaViragem)) + '</div>';
        h += '<div class="nota" style="margin-top:7px">' + esc(f.recomendacao) + '</div>';
        h += '<div class="nota" style="margin-top:6px">Método: ' + esc(f.formula) + '</div>';
        h += '<div class="nota" style="margin-top:4px">Faixas de referência: ' + esc(f.faixa) + '.</div>';
        h += '</div>';
      } else {
        h += '<div class="caixa"><b>Fermentação</b><div class="nota" style="margin-top:6px">O lote ' + loteSel + ' não tem sensor de fermentação instalado — sem medição, o sistema declara a ausência em vez de estimar.</div></div>';
      }
      if (s) {
        var corSec = s.concluida ? 'verde' : (s.alerta ? 'ouro' : 'verde');
        h += '<div class="caixa"><div class="flex entre"><b>Secagem — lote ' + s.lote + '</b>' + chip(s.concluida ? 'no ponto' : 'em andamento', corSec) + '</div>';
        h += '<div class="grade g3" style="margin:10px 0">' +
          '<div><div class="nota">Umidade atual</div><b>' + s.umidadeAtual + '%</b><div class="nota">meta ' + s.umidadeAlvo + '%</div></div>' +
          '<div><div class="nota">Taxa de secagem</div><b>' + s.taxaDesidratacaoDia + '%/dia</b></div>' +
          '<div><div class="nota">Dias para o ponto</div><b>' + (s.diasParaPontoIdeal === 0 ? 'no ponto' : num(s.diasParaPontoIdeal, 1)) + '</b></div></div>';
        h += grafico(s.serie || [], 'umidadeGrao', { cor: '#b07d4f', faixas: [{ de: 0, ate: s.umidadeAlvo + 0.5, nome: 'faixa de segurança (≤ ' + s.umidadeAlvo + '%)', cor: 'rgba(47,143,82,.10)' }] });
        if (s.alerta) h += '<div class="caixa ouro" style="margin-top:9px">' + esc(s.alerta) + '</div>';
        h += '<div class="nota" style="margin-top:6px">Método: ' + esc(s.formula) + '</div>';
        h += '</div>';
      } else {
        h += '<div class="caixa"><b>Secagem</b><div class="nota" style="margin-top:6px">Sem sensor de secagem vinculado ao lote ' + loteSel + '.</div></div>';
      }
      h += '</div>';
    }
    h += '</div>';

    /* fórmulas e bases agronômicas */
    h += '<div class="cartao" style="margin-top:14px"><h2>Base técnica dos indicadores</h2><div style="overflow-x:auto"><table class="tabela">' +
      '<tr><th>Indicador</th><th>Como é calculado</th><th>Base</th></tr>';
    [['Graus-dia (GD)', 'Soma de (T média diária − temperatura base), com base 10 °C para café e 12 °C para cacau, limitada entre a mínima e a máxima do dia', 'Método clássico de soma térmica, base para prever estádio e época de colheita'],
     ['ET0 e ET real', 'ET0 por Hargreaves-Samani (FAO-56) a partir de temperatura e radiação extraterrestre na latitude real do município; ET real = ET0 × Ks', 'FAO-56 (Allen et al., 1998): coeficiente de estresse hídrico Ks'],
     ['Balanço hídrico', 'Chuva + irrigação − ET real, integrado em 30 dias sobre a capacidade de água disponível (CAD) do perfil de 0 a 40 cm', 'Modelo de balanço hídrico de cultura (FAO-56), com drenagem e limite de murcha'],
     ['Molhamento foliar', 'Horas com folha molhada e temperatura na faixa favorável a fungos: 18–25 °C por 6 h ou mais para ferrugem do café; UR > 90% para vassoura-de-bruxa', 'Recomendações da Embrapa e da literatura de fitopatologia para ferrugem e vassoura-de-bruxa'],
     ['Índice de fermentação', 'Soma das horas com temperatura da massa acima de 40 °C ponderada pelo excedente: < 100 incompleta, 100–200 ideal, > 200 excesso', 'Protocolo de fermentação controlada de cacau: tempo-temperatura determina precursores de aroma'],
     ['Secagem', 'Taxa de perda de umidade em %/dia e dias restantes até a umidade-alvo (7% para cacau, 12,5% para café)', 'Curva de secagem e umidade de estocagem segura (instrução normativa de classificação)']].forEach(function (x) {
      h += '<tr><td><b>' + esc(x[0]) + '</b></td><td class="nota">' + esc(x[1]) + '</td><td class="nota">' + esc(x[2]) + '</td></tr>';
    });
    h += '</table></div></div>';
    return h;
  }

  function linhaDer(rot, val, obs) {
    return '<tr><td style="width:34%"><b>' + rot + '</b></td><td><b>' + esc(val) + '</b><div class="nota">' + esc(obs) + '</div></td></tr>';
  }

  /* =========================== ABA 4: ANCORAGEM =========================== */
  function abaAncoragem() {
    var h = '';
    h += '<div class="cartao"><h2>Por que ancorar leituras de sensor</h2><div class="grade g3" style="margin-top:10px">' +
      '<div class="caixa azul"><b>1 · O dado nasce fora da cadeia</b><div class="nota" style="margin-top:6px">Um sensor envia 48 pacotes por dia. Gravar tudo na blockchain custaria caro, seria lento e exporia a rede a dados brutos sem valor de auditoria.</div></div>' +
      '<div class="caixa azul"><b>2 · O que entra é a raiz de Merkle</b><div class="nota" style="margin-top:6px">Cada leitura vira um hash. Os hashes formam uma árvore e a raiz — um único valor de 256 bits que resume milhares de leituras.</div></div>' +
      '<div class="caixa azul"><b>3 · Qualquer leitura é provável</b><div class="nota" style="margin-top:6px">Depois, com o caminho de Merkle, qualquer leitura individual é conferida contra a raiz gravada no bloco — sem revelar o resto da série.</div></div></div>' +
      '<div class="nota" style="margin-top:10px">É o <b>padrão oráculo</b>: a blockchain não inventa dado do mundo físico, ela <b>congela</b> o dado que existiu em determinado instante. ' +
      'Se o sensor mediu errado, isso não é falsificação — é defeito de medição, e é por isso que o controle de qualidade roda <b>antes</b> da ancoragem.</div></div>';

    var sensores = sensoresVisiveis().filter(function (s) { return s.tipo !== 'gateway'; });
    if (podeAncorar()) {
      h += '<div class="cartao" style="margin-top:14px"><h2>Ancorar um dispositivo</h2>' +
        '<div class="nota" style="margin-bottom:9px">Escolha o dispositivo e o período. A transação entra na fila, é minerada no bloco seguinte e a raiz fica gravada — inclusive os valores brutos rejeitados, que são o que a auditoria pede.</div>' +
        '<div class="flex envolve" style="gap:7px">' + sensores.map(function (s) {
          return '<button class="mini sec" onclick="App3.ancorarAgora(\'' + s.id + '\')">' + (ICONE_TIPO[s.tipo] ? Ico.svg(ICONE_TIPO[s.tipo], 'sm') : '') + ' ' + s.id + ' · ' + App3.janela + 'h</button>';
        }).join('') + '</div>' +
        '<div class="nota" style="margin-top:9px">O produtor ancora os sensores dele; a cooperativa ancora os gateways que agregam vários produtores. Indústria, certificadora e auditoria <b>não</b> ancoram — quem compra não deve poder mexer na medição.</div></div>';
    } else {
      h += '<div class="cartao" style="margin-top:14px"><div class="caixa"><b>Perfil ' + usuario().papel + ': somente leitura.</b><div class="nota" style="margin-top:6px">Ancoragem de leitura de sensor é ato do produtor dono do dispositivo ou da cooperativa que opera o gateway. Aqui você consulta e confere provas.</div></div></div>';
    }

    h += '<div class="cartao" style="margin-top:14px"><h2>Ancoragens registradas — ' + D.ancoragensIoT.length + '</h2>';
    if (!D.ancoragensIoT.length) {
      h += '<div class="caixa ouro">Nenhuma ancoragem ainda. Use os botões acima para gravar a janela de leituras na blockchain.</div>';
    } else {
      h += '<div style="overflow-x:auto"><table class="tabela"><tr><th>ID</th><th>Dispositivo</th><th>Janela</th><th>Leituras</th><th>Raiz de Merkle</th><th>Transação</th><th>Bloco</th><th>Quando</th><th></th></tr>';
      D.ancoragensIoT.forEach(function (a) {
        var tx = statusTx(a.txId);
        h += '<tr><td><b>' + a.id + '</b></td><td class="nota">' + a.dispositivo + '</td><td class="nota">' + a.janelaHoras + ' h</td>' +
          '<td>' + num(a.leituras, 0) + '</td><td class="mono nota">' + a.raizMerkle.slice(0, 18) + '…</td>' +
          '<td class="nota mono" style="font-size:10.5px">' + a.txId + '<br>' + (tx ? chip(tx.status === 'CONFIRMADA' ? 'confirmada no bloco #' + tx.bloco : tx.status, tx.status === 'CONFIRMADA' ? 'verde' : 'ouro') : chip('não encontrada', 'vermelho')) + '</td>' +
          '<td><b>#' + a.bloco + '</b><div class="nota mono">' + String(a.hashBloco || '').slice(0, 10) + '…</div></td>' +
          '<td class="nota">' + dataHora(a.em) + '</td>' +
          '<td><button class="mini sec" onclick="App3.verProva(\'' + a.id + '\')">Prova de inclusão </button></td></tr>';
      });
      h += '</table></div>';
    }
    h += '</div>';

    /* prova de inclusão + demonstração de adulteração */
    if (App3.prova) {
      var p = App3.prova;
      h += '<div class="cartao ' + (p.confere ? 'destaque' : 'alerta') + '" style="margin-top:14px"><h2>' + (p.confere ? '✓ Prova de inclusão conferida' : '✗ Prova de inclusão FALHOU') + '</h2>';
      h += '<div class="nota" style="margin-bottom:9px">' + esc(p.explicacao) + '</div>';
      h += '<div class="grade g2"><div class="caixa">' +
        '<div class="nota">Leitura conferida (' + dataHora(p.leitura.ts) + ')</div>' +
        '<table class="tabela" style="font-size:12px;margin-top:7px">' + Object.keys(p.leitura.valores).map(function (c) {
          return '<tr><td class="nota">' + esc(nomeCampo(c)) + '</td><td><b>' + num(p.leitura.valores[c], 1) + '</b></td></tr>';
        }).join('') + '</table>' +
        (p.leitura.adulterada ? '<div class="caixa vermelha" style="margin-top:8px">' + esc(p.leitura.motivoAdulteracao) + '</div>' : '') +
        '</div><div class="caixa">' +
        '<div class="nota">Hash da leitura</div><div class="mono" style="font-size:10.5px;word-break:break-all">' + p.hashLeitura + '</div>' +
        '<div class="nota" style="margin-top:9px">Caminho de Merkle (' + p.caminho.length + ' níveis)</div>' +
        '<div class="mono" style="font-size:10.5px;word-break:break-all;max-height:120px;overflow:auto">' + p.caminho.map(function (c, i) {
          return (i + 1) + '. irmão à ' + c.posicao + ': ' + c.irmao;
        }).join('<br>') + '</div>' +
        '<div class="nota" style="margin-top:9px">Raiz recalculada × raiz ancorada</div>' +
        '<div class="mono" style="font-size:10.5px;word-break:break-all">recalculada: ' + p.raizCalculada + '<br>na cadeia: ' + p.raizAncorada + '</div>' +
        '<div style="margin-top:9px">' + (p.confere ? chip('raízes idênticas — dado íntegro', 'verde') : chip('raízes diferentes — dado alterado depois da ancoragem', 'vermelho')) + '</div>' +
        '</div></div>';
      h += '<div class="flex" style="gap:9px;margin-top:11px;flex-wrap:wrap">' +
        (p.confere ? '<button class="mini" style="background:var(--veu-critico);border-color:var(--critico);color:var(--critico)" onclick="App3.adulterarAgora(\'' + p.ancoragem + '\')">Simular adulteração da leitura</button>'
          : '<button class="mini" onclick="App3.restaurarLeituras()">Restaurar leitura original</button>') +
        '<button class="mini sec" onclick="App3.fecharProva()">Fechar prova</button></div>';
      if (!p.confere) {
        h += '<div class="nota" style="margin-top:9px">O dado adulterado continua no dispositivo — mas a cadeia não aceita mais a leitura. É exatamente o que se espera: ' +
          'a ancoragem não impede a alteração local, ela <b>torna a alteração detectável</b> por qualquer terceiro, sem depender da palavra de ninguém.</div>';
      }
      h += '</div>';
    }

    /* exemplo de bloco contendo a ancoragem */
    var blocosComAnc = [];
    (Ledger.blocks ? Ledger.blocks() : []).forEach(function (b) {
      if (b.transacoes.some(function (t) { return t.tipo === 'LEITURA_SENSOR'; })) blocosComAnc.push(b);
    });
    if (blocosComAnc.length) {
      var b0 = blocosComAnc[blocosComAnc.length - 1];
      h += '<div class="cartao" style="margin-top:14px"><h2>Como a ancoragem aparece no bloco #' + b0.indice + '</h2>' +
        '<div class="nota" style="margin-bottom:9px">O bloco carrega o hash anterior, a raiz de Merkle das transações, o nonce da prova de trabalho e a lista de transações. A ancoragem do sensor é uma delas — com o tipo e o autor no payload.</div>';
      h += '<div class="caixa mono" style="font-size:11px;line-height:1.75">' +
        'bloco #' + b0.indice + '<br>hash anterior: ' + String(b0.hashAnterior).slice(0, 34) + '…<br>raiz de Merkle: ' + String(b0.merkleRoot).slice(0, 34) + '…<br>' +
        'nonce: ' + b0.nonce + ' · dificuldade: ' + b0.dificuldade + ' · tentativas: ' + num(b0.tentativas || 0, 0) + '<br>hash do bloco: ' + b0.hash + '</div>';
      h += '<table class="tabela" style="margin-top:10px"><tr><th>Transação</th><th>Tipo</th><th>Autor</th><th>Resumo do payload</th></tr>';
      b0.transacoes.forEach(function (t) {
        h += '<tr><td class="mono nota">' + t.id + '</td><td>' + chip(t.tipo, t.tipo === 'LEITURA_SENSOR' ? 'azul' : 'cinza') + '</td><td class="nota">' + esc(Dados.nomeUsuario(t.autor)) + '</td>' +
          '<td class="nota">' + esc(t.payload.descricao || t.payload.lote || '—') + '</td></tr>';
      });
      h += '</table></div>';
    }
    return h;
  }

  /* =========================== ABA 5: ALERTAS =========================== */
  function abaAlertas() {
    var al = alertasVisiveis();
    var h = '<div class="cartao"><h2>Alertas da rede de sensores — ' + al.length + '</h2>' +
      '<div class="nota" style="margin-bottom:11px">Dois tipos: <b>alerta de dispositivo</b> (bateria, sinal, calibração, leitura rejeitada) e <b>alerta agronômico</b> (condição medida que favorece doença, ' +
      'déficit hídrico, fermentação fora da faixa). Cada um diz o que aconteceu, por que importa e o que fazer — alerta sem ação é ruído.</div>';
    if (!al.length) h += '<div class="caixa verde">Nenhum alerta ativo para este perfil.</div>';
    al.forEach(function (a) {
      var cor = a.severidade === 'critico' ? 'vermelha' : a.severidade === 'atencao' ? 'ouro' : 'azul';
      var ch = a.severidade === 'critico' ? 'critico' : a.severidade === 'atencao' ? 'ouro' : 'azul';
      h += '<div class="caixa ' + cor + '" style="margin-bottom:9px"><div class="flex entre" style="flex-wrap:wrap;gap:7px">' +
        '<b>' + esc(a.titulo) + '</b>' + chip(a.severidade === 'critico' ? 'crítico' : 'atenção', ch) + '</div>' +
        '<div class="nota" style="margin-top:6px">' + esc(a.detalhe) + '</div>' +
        (a.acao ? '<div style="margin-top:7px"><b style="font-size:12.5px">Ação recomendada:</b> <span class="nota">' + esc(a.acao) + '</span></div>' : '') +
        (a.sensor ? '<div class="nota" style="margin-top:5px">dispositivo: ' + a.sensor + (a.talhao ? ' · talhão ' + a.talhao : '') + (a.lote ? ' · lote ' + a.lote : '') + '</div>' : '') +
        '</div>';
    });
    h += '</div>';

    /* leitura cruzada com a IA fitossanitária */
    h += '<div class="cartao" style="margin-top:14px"><h2>O que o sensor acrescenta ao diagnóstico da IA</h2>' +
      '<div class="nota" style="margin-bottom:10px">O diagnóstico fitossanitário deixou de ser opinião quando passou a ter série medida por trás.</div><div style="overflow-x:auto"><table class="tabela">' +
      '<tr><th>Doença</th><th>Condição medida</th><th>O que muda com o sensor</th></tr>';
    [['Ferrugem do café', 'Molhamento foliar ≥ 6 h com 18–25 °C e UR acima de 80%',
        'A janela de infecção passa a ser contada hora a hora no talhão, e não estimada por média regional. No Talhão Santa Luzia Norte a série aponta 31 h favoráveis em 7 dias — o alerta sobe para crítico e antecipa a pulverização.'],
       ['Vassoura-de-bruxa do cacau', 'UR acima de 90% por mais de 12 h com temperatura amena',
        'O sensor de molhamento confirma a condição dentro da copa, onde a estação não alcança. Sem ele, o sistema declara que a estimativa é climática e não medição.'],
       ['Broca e bicho-mineiro', 'Graus-dia acumulados definem geração e pico populacional',
        'A contagem de graus-dia pelo microclima do talhão substitui o calendário fixo de aplicação — menos aplicação e no momento certo.'],
       ['Qualidade da fermentação', 'Tempo e temperatura acima de 40 °C aferidos na massa',
        'A nota de qualidade prevista deixa de depender do olfato do comprador e vira indicador com histórico por lote.'],
       ['Umidade do lote na entrega', 'Umidade do grão medida no terreiro e no recebimento',
       'Divergência de peso por umidade na indústria é conferida contra a medição do produtor: some a discussão de “o lote secou no caminho”.']].forEach(function (x) {
      h += '<tr><td><b>' + esc(x[0]) + '</b></td><td class="nota">' + esc(x[1]) + '</td><td class="nota">' + esc(x[2]) + '</td></tr>';
    });
    h += '</table></div></div>';
    return h;
  }

  /* =========================== AÇÕES =========================== */
  App3.ir = function (a) { App3.aba = a; App3.aviso = null; App.render(); };
  App3.verSensor = function (id) { App3.sensorSel = id; App3.campo = null; App3.aba = 'leituras'; App3.aviso = null; App.render(); };
  App3.janelaDe = function (w) { App3.janela = w; App.render(); };
  App3.verCampo = function (c) { App3.campo = c; App.render(); };
  App3.verLavoura = function (id) { A.talhaoSel = id; App.irPara('lavoura'); };
  App3.verLote = function (id) { App3.loteSelIoT = id; App.render(); };
  App3.fecharProva = function () { App3.prova = null; App.render(); };

  App3.ancorarAgora = function (dispId) {
    var r = IoT.ancorar(dispId, App3.janela, A.usuario);
    if (!r) { App3.aviso = 'Não há leituras para ancorar neste dispositivo.'; App.render(); return; }
    if (r.recusada) {
      App3.aviso = null;
      App3.aba = 'ancoragem';
      App3.prova = null;
      App.render();
      return;
    }
    App3.aviso = 'Ancoradas ' + r.preparacao.leituras + ' leituras de ' + dispId + ' no bloco #' + r.bloco.indice +
      ' — raiz de Merkle ' + r.preparacao.raizMerkle.slice(0, 16) + '… · transação ' + r.transacao.id + ' confirmada.';
    App3.aba = 'ancoragem';
    App.render();
  };

  App3.verProva = function (ancId) {
    App3.prova = IoT.provarLeitura(ancId);
    App3.ancoragemAberta = ancId;
    App3.aviso = null;
    App3.aba = 'ancoragem';
    App.render();
  };

  App3.adulterarAgora = function (ancId) {
    var r = IoT.adulterarLeitura(ancId);
    if (!r) { App3.aviso = 'Não foi possível alterar a leitura.'; App.render(); return; }
    App3.prova = IoT.provarLeitura(ancId);
    App3.aviso = null;
    App.render();
  };

  App3.restaurarLeituras = function () {
    var n = IoT.limparAdulteracoes();
    if (App3.prova) App3.prova = IoT.provarLeitura(App3.ancoragemAberta);
    App3.aviso = n + ' alteração(ões) desfeita(s): a leitura do dispositivo voltou ao valor original e a prova volta a conferir.';
    App.render();
  };

  global.App3 = App3;
})(typeof window !== 'undefined' ? window : globalThis);
