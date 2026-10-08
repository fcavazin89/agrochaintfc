/* =========================================================================
 * BATERIA DE TESTES DA APLICAÇÃO
 * Renderiza todas as telas, para todos os perfis, e executa as ações
 * interativas com um DOM simulado — captura erros de execução que a
 * checagem de sintaxe não pega.
 * ========================================================================= */
'use strict';

/* ---------- DOM simulado ---------- */
var elementos = {};
function criarEl(id) {
  return {
    id: id, innerHTML: '', value: '', textContent: '', scrollTop: 0, scrollHeight: 100, className: '', attrs: {}, style: {},
    setAttribute: function (k, v) { this.attrs[k] = v; },
    getAttribute: function (k) { return this.attrs[k] === undefined ? null : this.attrs[k]; },
    removeAttribute: function (k) { delete this.attrs[k]; },
    appendChild: function () {}, focus: function () {}, remove: function () {},
    classList: { add: function () {}, remove: function () {}, contains: function () { return false; } }
  };
}
global.document = {
  readyState: 'complete',
  getElementById: function (id) { return elementos[id] || (elementos[id] = criarEl(id)); },
  querySelector: function (sel) { return sel === '.conteudo' ? { scrollTo: function () {} } : (elementos[sel] || null); },
  querySelectorAll: function () { return []; },
  addEventListener: function () {},
  createElement: function (tag) { return criarEl('<' + tag + '>'); },
  body: criarEl('body')
};
var memoriaLocal = {};
global.localStorage = {
  getItem: function (k) { return memoriaLocal[k] || null; },
  setItem: function (k, v) { memoriaLocal[k] = v; },
  removeItem: function (k) { delete memoriaLocal[k]; }
};
global.location = { reload: function () { global.__recarregou = true; } };

['30_crypto', '10_dados', '12_icones', '15_graficos', '20_ia', '40_qr', '45_iot', '50_ledger', '55_erp',
 '60_app', '70_app2', '80_iot_ui', '85_erp_ui', '88_imersivo'].forEach(function (m) {
  require('/home/user/prototipo-agrochain/src/' + m + '.js');
});

var App = global.App, App2 = global.App2, App3 = global.App3, App4 = global.App4, D = global.DB, IA = global.IA, Ledger = global.Ledger, IoT = global.IoT;
var Erp = global.Erp, Graf = global.Graf, Imersivo = global.Imersivo;

var falhas = [], total = 0;
function teste(nome, fn) {
  total++;
  try { fn(); }
  catch (e) { falhas.push({ nome: nome, erro: (e && e.message ? e.message : String(e)), pilha: e && e.stack ? e.stack.split('\n').slice(1, 3).join(' | ') : '' }); }
}

/* ---------- 1. inicialização ---------- */
teste('inicialização da aplicação', function () {
  if (!App.iniciar()) throw new Error('App.iniciar não retornou verdadeiro');
});

/* ---------- 2. renderização de todas as telas, em todos os perfis ---------- */
var TELAS = ['painel', 'lavoura', 'lotes', 'erp', 'ia', 'iot', 'blockchain', 'mercado', 'certificacao', 'auditoria', 'assistente', 'sobre'];
var ABAS_IA = ['safra', 'preco', 'sanidade', 'qualidade', 'destino', 'modelos'];
D.usuarios.forEach(function (u) {
  TELAS.forEach(function (t) {
    teste('render ' + t + ' / perfil ' + u.papel + ' (' + u.id + ')', function () {
      App.usuario = u.id; App.view = t;
      var html = App.render();
      if (!html || html.length < 400) throw new Error('HTML gerado muito curto (' + (html ? html.length : 0) + ' caracteres)');
      if (html.indexOf('undefined') >= 0 && />(undefined|NaN)</.test(html)) throw new Error('há "undefined" ou "NaN" visível na tela');
    });
  });
});
ABAS_IA.forEach(function (a) {
  teste('render aba de IA: ' + a, function () {
    App.usuario = 'U-01'; App.view = 'ia'; App.abaIA = a;
    var html = App.render();
    if (html.indexOf('NaN') >= 0) throw new Error('NaN encontrado na aba ' + a);
  });
});

/* ---------- 3. ações interativas ---------- */
teste('registrar colheita (formulário do produtor)', function () {
  App.usuario = 'U-01';
  elementos['f_talhao'] = criarEl('f_talhao'); elementos['f_talhao'].value = 'T-01';
  elementos['f_qtd'] = criarEl('f_qtd'); elementos['f_qtd'].value = '32';
  elementos['f_data'] = criarEl('f_data'); elementos['f_data'].value = '2026-10-04';
  elementos['f_umid'] = criarEl('f_umid'); elementos['f_umid'].value = '12.8';
  elementos['f_dias'] = criarEl('f_dias'); elementos['f_dias'].value = '8';
  elementos['f_destino'] = criarEl('f_destino'); elementos['f_destino'].value = 'venda';
  var antes = D.lotes.length;
  App.registrarColheita();
  if (D.lotes.length !== antes + 1) throw new Error('o lote não foi criado');
  var novo = D.lotes[0];
  if (!novo.qualidade) throw new Error('a IA não avaliou o lote novo');
  if (novo.bloco === null) throw new Error('o lote novo não foi ancorado em bloco');
});

teste('registrar colheita para consumo próprio', function () {
  App.usuario = 'U-01';
  elementos['f_talhao'].value = 'T-03';
  elementos['f_qtd'].value = '12'; elementos['f_dias'].value = '6'; elementos['f_umid'].value = '7.2';
  elementos['f_destino'].value = 'consumo_proprio';
  var antes = D.lotes.length;
  App.registrarColheita();
  var novo = D.lotes[0];
  if (novo.destino !== 'consumo_proprio') throw new Error('destino de consumo próprio não registrado');
  if (D.lotes.length !== antes + 1) throw new Error('lote não criado');
});

teste('permissão: auditor NÃO pode registrar colheita', function () {
  var tx = Ledger.registrarTx('COLHEITA', { lote: 'L-2026-0142' }, 'U-07');
  if (tx.status !== 'REJEITADA') throw new Error('o sistema aceitou transação de perfil sem permissão');
  if (!tx.motivoRejeicao) throw new Error('faltou o motivo da rejeição');
});

teste('permissão: certificadora NÃO pode registrar colheita', function () {
  var tx = Ledger.registrarTx('COLHEITA', { lote: 'L-2026-0142' }, 'U-06');
  if (tx.status !== 'REJEITADA') throw new Error('permissão indevida concedida');
});

teste('permissão: produtor PODE registrar colheita', function () {
  var tx = Ledger.registrarTx('COLHEITA', { lote: 'L-2026-0142', descricao: 'teste' }, 'U-01');
  if (tx.status !== 'PENDENTE') throw new Error('transação legítima foi rejeitada');
});

teste('criar proposta comercial gera contrato em escrow', function () {
  App.usuario = 'U-01';
  var antes = D.contratos.length;
  App2.propor('L-2026-0142', 'D-01');
  if (D.contratos.length !== antes + 1) throw new Error('contrato não foi criado');
  var ct = D.contratos[D.contratos.length - 1];
  if (ct.modoPagamento !== 'ESCROW') throw new Error('contrato não está em escrow');
  if (!ct.etapas.length) throw new Error('contrato sem etapas');
});

teste('contrato: sequência de etapas com divergência dentro da tolerância', function () {
  var ct = D.contratos[D.contratos.length - 1];
  Ledger.avancarEtapa(ct.id, { divergenciaPeso: 0.8 });
  Ledger.avancarEtapa(ct.id, { divergenciaPeso: 0.8 });
  Ledger.avancarEtapa(ct.id, { divergenciaPeso: 0.8 });
  if (ct.status === 'TRAVADO_DIVERGENCIA') throw new Error('contrato travou com divergência dentro da tolerância');
});

teste('contrato: divergência de peso ACIMA da tolerância trava o pagamento', function () {
  var ct = Ledger.criarContrato({
    vendedor: 'U-01', comprador: 'U-04', lote: 'L-2026-0142', produto: 'cafe_conilon',
    quantidade: 50, unidade: 'sacas 60 kg', precoUnitario: 1020, prazoEntrega: '2026-11-01'
  });
  Ledger.avancarEtapa(ct.id, {});
  Ledger.avancarEtapa(ct.id, {});
  Ledger.avancarEtapa(ct.id, { divergenciaPeso: 4.6 });
  if (ct.status !== 'TRAVADO_DIVERGENCIA') throw new Error('o contrato NÃO travou com divergência de 4,6% (tolerância 2%)');
});

teste('emitir selo de certificação', function () {
  App.usuario = 'U-06';
  var antes = D.certificacoes.length;
  App2.emitirSelo('L-2026-0088');
  if (D.certificacoes.length !== antes + 1) throw new Error('selo não foi criado');
  var cert = D.certificacoes[D.certificacoes.length - 1];
  if (cert.bloco === null || cert.bloco === undefined) throw new Error('selo não foi ancorado em bloco');
});

teste('verificação de integridade da cadeia permanece válida após todas as operações', function () {
  var v = Ledger.verificar();
  if (!v.valida) throw new Error('cadeia inválida: ' + JSON.stringify(v.problemas.slice(0, 2)));
});

teste('detecção de adulteração: a fraude é identificada', function () {
  Ledger.simularAdulteracao(1, 'descricao', 'CONTEÚDO FRAUDADO NO TESTE');
  var v = Ledger.verificar();
  if (v.valida) throw new Error('a adulteração NÃO foi detectada');
  if (!v.problemas.length) throw new Error('nenhum problema reportado');
  Ledger.restaurarIntegridade();
  if (!Ledger.verificar().valida) throw new Error('a cadeia não voltou ao estado íntegro');
});

/* ---------- 4. assistente ---------- */
var PERGUNTAS = [
  'Quando devo vender o lote de cacau?', 'Qual o risco de ferrugem na minha lavoura?',
  'Previsão de safra 2026', 'Quanto vale meu café hoje?', 'Como funciona a blockchain do consórcio?',
  'Compensa industrializar o cacau?', 'Situação do contrato em escrow', 'vai chover?',
  'Qual o melhor momento de vender?', 'meu lucro', 'pergunta aleatória sem intenção'
];
PERGUNTAS.forEach(function (p) {
  teste('assistente: "' + p.slice(0, 38) + '"', function () {
    var r = IA.conversar(p, 'U-01');
    if (!r.resposta || r.resposta.length < 40) throw new Error('resposta vazia ou curta demais');
    if (!r.fontes.length) throw new Error('resposta sem fonte citada');
  });
});

/* ---------- 5. mineração animada (assíncrona) ---------- */
teste('mineração com animação (prepararBloco + finalizarBloco)', function () {
  Ledger.registrarTx('COLHEITA', { lote: 'L-2026-0142', descricao: 'teste de mineração' }, 'U-01');
  var prep = Ledger.prepararBloco({});
  var nonce = 0;
  while (global.Cripto.hashBlock(prep.indice, prep.timestamp, prep.merkleRoot, prep.hashAnterior, nonce).indexOf(prep.prefixo) !== 0) nonce++;
  var bloco = Ledger.finalizarBloco(prep, nonce, { minerador: 'Teste' });
  if (bloco.hash.indexOf(prep.prefixo) !== 0) throw new Error('o hash do bloco não atende à dificuldade exigida');
  if (global.Cripto.hashBlock(bloco.indice, bloco.timestamp, bloco.merkleRoot, bloco.hashAnterior, bloco.nonce) !== bloco.hash)
    throw new Error('o nonce final não corresponde ao hash do bloco');
  if (!Ledger.verificar().valida) throw new Error('cadeia inválida após a mineração');
});

/* ---------- 6. reinício da demonstração ---------- */
teste('reiniciar demonstração restaura o estado', function () {
  var lotesAntes = D.lotes.length;
  App.reiniciar();
  if (D.lotes.length >= lotesAntes) throw new Error('o reinício não removeu os lotes criados nos testes');
  if (!Ledger.verificar().valida) throw new Error('cadeia inválida após o reinício');
});

/* ---------- 7. verificação dos dados de mercado ---------- */
teste('cotações ancoradas nos valores reais de 06/10/2026', function () {
  if (Dados.precoAtual('cafe_arabica') !== 1568.95) throw new Error('cotação do arábica divergente: ' + Dados.precoAtual('cafe_arabica'));
  if (Dados.precoAtual('cafe_conilon') !== 976.94) throw new Error('cotação do conilon divergente: ' + Dados.precoAtual('cafe_conilon'));
  if (D.precos.cacau[D.precos.cacau.length - 1].preco !== 25.80) throw new Error('cotação do cacau divergente');
});

teste('séries de preço têm 120 dias e tendências coerentes', function () {
  ['cafe_arabica', 'cafe_conilon', 'cacau'].forEach(function (p) {
    if (D.precos[p].length !== 120) throw new Error('série de ' + p + ' tem ' + D.precos[p].length + ' dias');
  });
  var cacau = D.precos.cacau;
  if (!(cacau[0].preco > cacau[119].preco)) throw new Error('a série do cacau deveria estar em queda em 2026');
});

/* =========================================================================
 * 9. IOT — SENSORES, LEITURAS, DERIVADOS E ANCORAGEM
 * ========================================================================= */

teste('IoT: rede de sensores carregada com 12 dispositivos e todos os tipos', function () {
  if (D.sensores.length !== 13) throw new Error('esperados 13 sensores, encontrados ' + D.sensores.length);
  var tipos = {};
  D.sensores.forEach(function (s) { tipos[s.tipo] = (tipos[s.tipo] || 0) + 1; });
  ['estacao_meteorologica', 'sonda_solo', 'sensor_fermentacao', 'sensor_secagem', 'molhamento_foliar', 'medidor_vazao', 'gateway'].forEach(function (t) {
    if (!tipos[t]) throw new Error('nenhum sensor do tipo ' + t);
  });
  var semCat = D.sensores.filter(function (s) {
    var basico = !s.protocolo || s.intervaloMin === undefined || s.bateria === undefined || !s.mede || !s.mede.length;
    var calib = s.tipo === 'gateway' ? false : !s.calibracao;   // gateway não passa por calibração de sensor
    return basico || calib;
  });
  if (semCat.length) throw new Error('sensor sem ficha técnica completa: ' + semCat.map(function (s) { return s.id; }).join(', '));
});

teste('IoT: leitura é determinística (mesma consulta, mesmo resultado)', function () {
  var a = JSON.stringify(IoT.leituras('EST-01', 48, { incluirQualidade: true }));
  var b = JSON.stringify(IoT.leituras('EST-01', 48, { incluirQualidade: true }));
  if (a !== b) throw new Error('duas chamadas iguais produziram séries diferentes');
});

teste('IoT: conjunto de dados independe do fuso horário do aparelho', function () {
  var exec = require('child_process').execSync;
  function impressao(IoT, D) {
    var partes = [];
    D.sensores.forEach(function (s) { partes.push(JSON.stringify(IoT.leituras(s.id, 24, { incluirQualidade: true }))); });
    ['T-01', 'T-02', 'T-03', 'T-05'].forEach(function (t) { partes.push(JSON.stringify(IoT.derivadosTalhao(t))); });
    partes.push(JSON.stringify(IoT.fermentacao('L-2026-0145')));
    partes.push(JSON.stringify(IoT.secagem('L-2026-0095')));
    partes.push(JSON.stringify(IoT.panorama()));
    partes.push(JSON.stringify(D.clima));
    return require('crypto').createHash('sha256').update(partes.join('|')).digest('hex');
  }
  var fs = require('fs');
  var roteiro = 'var p="/home/user/prototipo-agrochain/src/";\n' +
    '["30_crypto","10_dados","12_icones","20_ia","40_qr","45_iot","50_ledger"].forEach(function(m){require(p+m+".js")});\n' +
    'var IoT=globalThis.IoT, D=globalThis.DB;\n' + impressao.toString() + '\n' +
    'console.log(impressao(IoT, D));\n';
  fs.writeFileSync('/tmp/impressao_iot.js', roteiro);
  var extremo = exec('TZ=Pacific/Kiritimati node /tmp/impressao_iot.js', { encoding: 'utf-8' }).trim();
  var aqui = impressao(IoT, D);
  if (extremo !== aqui) throw new Error('o conjunto mudou com o fuso do aparelho (UTC+14): o fuso tem de ser fixo em Rondônia (UTC−4)');
});

teste('IoT: ET0 (Hargreaves FAO-56) dentro da faixa física para Cacoal', function () {
  var total = 0;
  IoT.resumoDiario('EST-01', 5).forEach(function (d) {
    if (d.et0Mm < 1 || d.et0Mm > 12) throw new Error('ET0 diária fora da faixa física em ' + d.data + ': ' + d.et0Mm + ' mm');
    total += d.et0Mm;
  });
  if (total < 5) throw new Error('ET0 acumulada irreal para o período: ' + total + ' mm');
  var foraDaFaixa = IoT.leituras('EST-01', 24).filter(function (l) { return l.valores.tempMedia < 18 || l.valores.tempMedia > 40; });
  if (foraDaFaixa.length) throw new Error('temperatura horária fora da realidade local: ' + foraDaFaixa[0].valores.tempMedia);
});

teste('IoT: temperatura horária nunca ultrapassa a máxima do dia', function () {
  var serie = IoT.leituras('EST-01', 72);
  var porDia = {};
  serie.forEach(function (l) {
    var dia = l.ts.slice(0, 10);
    porDia[dia] = porDia[dia] || { max: -99, min: 99 };
    porDia[dia].horas = (porDia[dia].horas || 0) + 1;
    porDia[dia].max = Math.max(porDia[dia].max, l.valores.tempMedia);
    porDia[dia].min = Math.min(porDia[dia].min, l.valores.tempMedia);
  });
  Object.keys(porDia).forEach(function (d) {
    if (porDia[d].horas < 20) return;   // dia parcial não permite avaliar amplitude
    var amp = porDia[d].max - porDia[d].min;
    if (amp < 4 || amp > 14) throw new Error('amplitude térmica irreal em ' + d + ': ' + amp.toFixed(1) + ' °C');
  });
});

teste('IoT: controle de qualidade rejeita valor impossível e marca a lacuna', function () {
  var ids = D.sensores.map(function (s) { return s.id; });
  var rejeitadas = 0, lacunas = 0, comMotivo = 0;
  ids.forEach(function (id) {
    IoT.leituras(id, 48, { incluirQualidade: true }).forEach(function (l) {
      if (l.qualidade === 'suspeita') { rejeitadas++; if (l.motivoQualidade && l.valorSuspeito !== undefined) comMotivo++; }
      if (l.qualidade === 'lacuna') lacunas++;
    });
  });
  if (!rejeitadas) throw new Error('nenhuma leitura ruim detectada em toda a rede — o controle de qualidade não está rodando');
  if (comMotivo !== rejeitadas) throw new Error('leitura rejeitada sem motivo registrado (auditoria precisa saber o que foi descartado)');
  if (!lacunas) throw new Error('nenhuma lacuna de comunicação marcada');
});

teste('IoT: pulsos legítimos de irrigação não são descartados como outlier', function () {
  var e = IoT.eficienciaIrrigacao('T-01');
  if (!e) throw new Error('medidor de vazão do T-01 não respondeu');
  if (!(e.aplicado7d > 0)) throw new Error('lâmina irrigada zerada: o detector de outlier está comendo os pulsos de irrigação');
  if (!(e.chuva7d > 0)) throw new Error('chuva do período zerada');
  if (typeof e.coberturaEt0Pct !== 'number' || e.coberturaEt0Pct < 30 || e.coberturaEt0Pct > 400) throw new Error('cobertura de ET0 implausível: ' + e.coberturaEt0Pct + '%');
});

teste('IoT: balanço hídrico coerente com a sonda de solo (irrigado × sequeiro)', function () {
  var i = IoT.balancoHidrico('T-01', 30), s = IoT.balancoHidrico('T-02', 30);
  if (i.irrigacao <= 0) throw new Error('talhão irrigado sem lâmina registrada');
  if (s.irrigacao !== 0) throw new Error('talhão de sequeiro com irrigação registrada');
  if (!(i.saldo > s.saldo)) throw new Error('o talhão irrigado deveria ter saldo hídrico maior que o de sequeiro');
  if (!(i.et0 > 0 && i.etReal > 0)) throw new Error('ET0/ET real não calculadas');
  if (i.etReal > i.et0 + 0.01) throw new Error('ET real não pode superar a ET0 de referência');
  ['T-01', 'T-02', 'T-05'].forEach(function (t) {
    var b = IoT.balancoHidrico(t, 30);
    if (!(b.cad > 40 && b.cad < 120)) throw new Error('CAD fora da faixa para o perfil de solo: ' + b.cad + ' mm em ' + t);
    if (b.minAguaDisponivel < 0 || b.minAguaDisponivel > 100) throw new Error('água disponível fora de 0–100% em ' + t);
  });
  var e = IoT.estresseHidrico('T-02');
  if (!e) throw new Error('sonda do T-02 não respondeu');
  if (e.classificacao === 'CONFORTÁVEL' && e.aguaDisponivel < 60) throw new Error('classificação de estresse incoerente com a água disponível');
});

teste('IoT: talhão sem sonda declara ausência de medição (não inventa indicador)', function () {
  ['T-03', 'T-04', 'T-06'].forEach(function (t) {
    if (IoT.estresseHidrico(t) !== null) throw new Error('talhão sem sonda de solo (' + t + ') não deveria produzir medição de estresse');
  });
  var m = IoT.molhamentoFoliar('T-01', 7);
  if (m.fonte.indexOf('estimativa') < 0) throw new Error('molhamento sem sensor dedicado precisa ser declarado como estimativa');
});

teste('IoT: índices de fermentação do lote em fermentação (L-2026-0145)', function () {
  var f = IoT.fermentacao('L-2026-0145');
  if (!f) throw new Error('sensor de fermentação do lote não respondeu');
  if (f.lote !== 'L-2026-0145') throw new Error('curva de fermentação ancorada no lote errado');
  if (f.horasMonitoradas < 24 || f.horasMonitoradas > 24 * 8) throw new Error('tempo de fermentação implausível: ' + f.horasMonitoradas + ' h');
  if (f.temperaturaPico < 40 || f.temperaturaPico > 50) throw new Error('pico térmico fora da faixa de fermentação de cacau: ' + f.temperaturaPico + ' °C');
  if (f.horasAcima40C < 10) throw new Error('poucas horas acima de 40 °C para um lote em plena fermentação: ' + f.horasAcima40C);
  if (f.indiceFermentacao < 60 || f.indiceFermentacao > 260) throw new Error('índice de fermentação fora da faixa: ' + f.indiceFermentacao);
  if (['INCOMPLETA', 'IDEAL', 'EXCESSO'].indexOf(f.classe) < 0) throw new Error('classe de fermentação inválida: ' + f.classe);
  if (f.notaPrevista < 50 || f.notaPrevista > 100) throw new Error('nota prevista implausível: ' + f.notaPrevista);
  if (!f.proximaViragem || f.proximaViragem.length < 10) throw new Error('viragem não calculada');
  if (f.serie.length < 24) throw new Error('série da fermentação curta demais para decisão');
  if (f.encerrada) throw new Error('o lote L-2026-0145 está em fermentação e foi tratado como encerrado');
  if (!(f.indiceProjetado > f.indiceAcumulado)) throw new Error('a projeção tem de superar o acumulado em lote em andamento: ' + f.indiceAcumulado + ' → ' + f.indiceProjetado);
  if (f.indiceProjetado < 150 || f.indiceProjetado > 400) throw new Error('projeção fora da faixa ideal para lote bem conduzido: ' + f.indiceProjetado + ' °C·h');
  if (!f.proximaViragem) throw new Error('lote em fermentação sem indicação de próxima viragem');
});

teste('IoT: lote com fermentação encerrada reporta o índice final, não a leitura de hoje', function () {
  var f = IoT.fermentacao('L-2026-0091');
  if (!f) throw new Error('sensor de fermentação do lote certificado não respondeu');
  if (!f.encerrada) throw new Error('fermentação iniciada há mais de 40 dias deveria estar encerrada');
  if (f.situacao !== 'encerrada') throw new Error('situação errada para lote encerrado: ' + f.situacao);
  if (f.classe === 'INCOMPLETA') throw new Error('lote bem fermentado foi classificado como INCOMPLETA — o passado está sendo lido como se fosse ao vivo');
  if (f.indiceProjetado < 150) throw new Error('índice final do lote encerrado fora da faixa esperada: ' + f.indiceProjetado);
  if (Math.abs(f.indiceProjetado - f.indiceAcumulado) > 10) throw new Error('para lote encerrado o índice final e o acumulado devem coincidir');
  if (f.proximaViragem !== null) throw new Error('não existe próxima viragem em fermentação encerrada');
  if (!(f.horasDesdeTermino > 24)) throw new Error('tempo desde o fim da fermentação não calculado');
  if (f.notaPrevista < 60 || f.notaPrevista > 100) throw new Error('nota final implausível: ' + f.notaPrevista);
  if (!f.recomendacao || f.recomendacao.indexOf('encerrada') < 0) throw new Error('recomendação de lote encerrado não explica que a fermentação terminou');
});

teste('IoT: secagem do lote bate com a umidade registrada na cadeia', function () {
  ['L-2026-0095', 'L-2026-0088', 'L-2026-0139'].forEach(function (id) {
    var lote = Dados.lote(id), sc = IoT.secagem(id);
    if (!sc) throw new Error('sensor de secagem do lote ' + id + ' não respondeu');
    if (sc.umidadeAlvo !== (lote.produto === 'cacau' ? 7 : 12.5)) throw new Error('umidade-alvo errada para ' + lote.produto);
    if (lote.umidade < 15 && Math.abs(sc.umidadeAtual - lote.umidade) > 0.35) {
      throw new Error('o sensor conta ' + sc.umidadeAtual + '% e o lote na cadeia registra ' + lote.umidade + '% — a medição tem de terminar no valor ancorado');
    }
    if (!(sc.taxaDesidratacaoDia > 0)) throw new Error('taxa de secagem nula em ' + id);
  });
});

teste('IoT: graus-dia acumulados e estádio fenológico coerentes', function () {
  var g = IoT.grausDia('T-01', 30);
  if (!(g.acumulado30d > 200 && g.acumulado30d < 900)) throw new Error('GD em 30 dias fora da faixa: ' + g.acumulado30d);
  if (!(g.mediaDiaria > 6 && g.mediaDiaria < 30)) throw new Error('média diária de GD implausível: ' + g.mediaDiaria);
  if (!g.estagio) throw new Error('estádio fenológico não definido');
  var c = IoT.grausDia('T-03', 30);
  if (c.base !== 12) throw new Error('base térmica do cacau deveria ser 12 °C');
  if (IoT.grausDia('T-01', 30).base !== 10) throw new Error('base térmica do café deveria ser 10 °C');
});

teste('IoT: ancoragem na blockchain com raiz de Merkle e prova de inclusão', function () {
  var r = IoT.ancorar('SOL-01', 48, 'U-01');
  if (!r || r.recusada) throw new Error('ancoragem recusada para o produtor: ' + (r && r.motivo));
  if (!r.bloco) throw new Error('a transação de ancoragem não foi minerada em bloco');
  if (r.transacao.tipo !== 'LEITURA_SENSOR') throw new Error('tipo de transação errado: ' + r.transacao.tipo);
  if (!/^[0-9a-f]{64}$/.test(r.preparacao.raizMerkle)) throw new Error('raiz de Merkle malformada');
  if (r.preparacao.leituras < 40) throw new Error('janela ancorada com poucas leituras: ' + r.preparacao.leituras);
  var anc = D.ancoragensIoT[0];
  if (anc.raizMerkle !== r.preparacao.raizMerkle) throw new Error('raiz gravada difere da raiz ancorada');
  var prova = IoT.provarLeitura(anc.id);
  if (!prova.confere) throw new Error('prova de inclusão não confere logo após a ancoragem');
  if (prova.raizCalculada !== anc.raizMerkle) throw new Error('raiz recalculada difere da ancorada');
  if (prova.caminho.length < 5) throw new Error('caminho de Merkle curto demais: ' + prova.caminho.length);
  if (!Ledger.verificar().valida) throw new Error('cadeia inválida após ancoragem de leituras');
});

teste('IoT: adulteração da leitura é detectada pela prova (e reversível)', function () {
  var anc = D.ancoragensIoT[0];
  var antes = IoT.provarLeitura(anc.id);
  if (!antes.confere) throw new Error('estado inicial deveria conferir');
  var ad = IoT.adulterarLeitura(anc.id);
  if (!ad || ad.antes === ad.depois) throw new Error('adulteração não alterou o valor');
  var depois = IoT.provarLeitura(anc.id);
  if (depois.confere) throw new Error('a prova continuou conferindo depois de alterar a leitura — a ancoragem não protege nada');
  IoT.limparAdulteracoes();
  if (!IoT.provarLeitura(anc.id).confere) throw new Error('a prova não voltou a conferir após restaurar a leitura original');
});

teste('IoT: permissão de ancoragem respeita o papel no consórcio', function () {
  var daCertificadora = IoT.ancorar('SOL-02', 24, 'U-06');
  if (!daCertificadora.recusada) throw new Error('a certificadora não deveria poder ancorar leitura de sensor');
  if (!daCertificadora.motivo || daCertificadora.motivo.indexOf('permissão') < 0) throw new Error('recusa sem motivo explicado ao usuário');
  var daCoop = IoT.ancorar('SOL-02', 24, 'U-03');
  if (daCoop.recusada) throw new Error('a cooperativa deveria poder ancorar os gateways do consórcio');
});

teste('IoT: ancoragem de leitura de sensor entra no bloco com autoria identificada', function () {
  var blocos = Ledger.blocos().filter(function (b) {
    return b.transacoes.some(function (t) { return t.tipo === 'LEITURA_SENSOR'; });
  });
  if (!blocos.length) throw new Error('nenhum bloco com ancoragem de leitura');
  var tx = null;
  blocos[0].transacoes.forEach(function (t) { if (t.tipo === 'LEITURA_SENSOR') tx = t; });
  if (!tx.payload.raizMerkle || !tx.payload.dispositivo) throw new Error('payload da ancoragem incompleto');
  if (!tx.autor) throw new Error('ancoragem sem autor: rastreabilidade exige saber quem registrou');
  if (!tx.hash) throw new Error('transação de ancoragem sem hash');
});

teste('IoT: panorama da rede fecha as contas', function () {
  var p = IoT.panorama();
  if (p.total !== D.sensores.length) throw new Error('panorama com total errado: ' + p.total);
  if (p.ativos + p.emAtencao !== p.total) throw new Error('sensores não classificados entre ativos e em atenção');
  if (p.bateriaMedia < 20 || p.bateriaMedia > 100) throw new Error('bateria média implausível: ' + p.bateriaMedia);
  if (p.ancoragens !== D.ancoragensIoT.length) throw new Error('contagem de ancoragens divergente');
  if (!(p.dadosPorDia > 0)) throw new Error('volume de dados por dia zerado');
});

teste('IoT: todas as abas do painel renderizam para todos os perfis', function () {
  var abas = ['mapa', 'leituras', 'derivados', 'ancoragem', 'alertas'];
  D.usuarios.forEach(function (u) {
    abas.forEach(function (a) {
      App.usuario = u.id; App.view = 'iot'; App3.aba = a; App3.prova = null;
      var html = App.render();
      if (!html || html.length < 600) throw new Error('painel IoT/' + a + ' vazio para ' + u.papel);
      if (/>\s*(undefined|NaN)\s*</.test(html)) throw new Error('valor inválido visível em IoT/' + a + ' (' + u.papel + ')');
      if (html.indexOf('R$ NaN') >= 0 || html.indexOf('undefined%') >= 0) throw new Error('número quebrado em IoT/' + a + ' (' + u.papel + ')');
    });
  });
  App.usuario = 'U-01'; App3.aba = 'mapa';
});

teste('IoT: produtor vê só os sensores dele; cooperativa vê a rede inteira', function () {
  App.usuario = 'U-01';
  var doProdutor = D.sensores.filter(function (s) { return s.produtor === 'U-01'; }).length;
  var html = App.render();
  D.sensores.forEach(function (s) {
    if (s.produtor === 'U-01') return;
    if (html.indexOf(s.id) >= 0 && s.lote === undefined) {
      // sensores de outros produtores não podem aparecer no inventário do U-01
      if (html.indexOf('App3.verSensor(\'' + s.id + '\')') >= 0) throw new Error('sensor de outro produtor exposto ao produtor: ' + s.id);
    }
  });
  if (doProdutor < 4) throw new Error('produtor com poucos sensores para a demonstração: ' + doProdutor);
  App.usuario = 'U-03';
  var htmlCoop = App.render();
  if (htmlCoop.length <= html.length) throw new Error('a cooperativa deveria ver mais informação que o produtor');
  App.usuario = 'U-01';
});

teste('IoT: ações do painel funcionam (ancorar, provar, adulterar, restaurar)', function () {
  App.usuario = 'U-01'; App.view = 'iot'; App3.aba = 'ancoragem';
  var antes = D.ancoragensIoT.length;
  App3.ancorarAgora('EST-01');
  if (D.ancoragensIoT.length !== antes + 1) throw new Error('o botão de ancorar não criou o registro');
  if (!App3.aviso || App3.aviso.indexOf('Ancoradas') !== 0) throw new Error('sem confirmação para o usuário após ancorar');
  var id = D.ancoragensIoT[0].id;
  App3.verProva(id);
  if (!App3.prova || !App3.prova.confere) throw new Error('prova não abriu conferindo');
  App3.adulterarAgora(id);
  if (App3.prova.confere) throw new Error('a tela não refletiu a adulteração detectada');
  App3.restaurarLeituras();
  if (!App3.prova.confere) throw new Error('a restauração não devolveu a integridade da prova');
  if (D.leiturasAdulteradas.length) throw new Error('alterações de demonstração ficaram pendentes no estado');
  App3.fecharProva();
  if (App3.prova !== null) throw new Error('prova não fechou');
});

teste('IoT: reiniciar a demonstração limpa adulterações e ancoragens', function () {
  IoT.adulterarLeitura(D.ancoragensIoT[0].id);
  if (!D.leiturasAdulteradas.length) throw new Error('adulteração de teste não foi registrada');
  App.reiniciar();
  if (D.leiturasAdulteradas.length) throw new Error('o reinício deixou leituras adulteradas pendentes');
  if (D.ancoragensIoT.length) throw new Error('o reinício deixou ancoragens antigas');
  if (!Ledger.verificar().valida) throw new Error('cadeia inválida após reiniciar');
  App3.prova = null;
});

teste('IoT: menu do app expõe a área de IoT com contador de alertas', function () {
  App.usuario = 'U-01'; App.view = 'painel';
  var html = App.render();
  if (html.indexOf('IoT e sensores') < 0) throw new Error('item de menu do IoT ausente');
  if (html.indexOf("App.irPara('iot')") < 0) throw new Error('item de menu sem navegação para o IoT');
  var alertas = IoT.alertasSensores().filter(function (a) { return a.produtor === 'U-01'; }).length;
  if (!alertas) throw new Error('o produtor U-01 deveria ter alertas de sensor para demonstrar o contador');
});

teste('IoT: assistente responde com dado medido sobre sensor e indicador', function () {
  App.usuario = 'U-01';
  var r1 = IA.conversar('como está a umidade do solo no meu talhão?', 'U-01');
  if (!r1.resposta || r1.resposta.length < 80) throw new Error('resposta vazia sobre umidade do solo');
  if (r1.resposta.indexOf('% da água disponível') < 0) throw new Error('a resposta não cita a medição de água no solo');
  if (r1.resposta.indexOf('sem sonda de solo') < 0) throw new Error('a resposta não admite onde não há medição');
  var r2 = IA.conversar('quando devo virar a massa do cacau?', 'U-01');
  if (r2.resposta.indexOf('°C·h') < 0 || r2.resposta.indexOf('viragem') < 0) throw new Error('resposta sobre viragem sem o índice de fermentação');
  var r3 = IA.conversar('quando colher o café?', 'U-01');
  if (r3.resposta.indexOf('graus-dia') < 0) throw new Error('resposta sobre colheita sem graus-dia');
  var r4 = IA.conversar('meus sensores estão funcionando?', 'U-01');
  if (r4.resposta.indexOf('confiabilidade') < 0) throw new Error('resposta sobre dispositivos sem confiabilidade');
  if (!r1.fontes || !r1.fontes.length) throw new Error('resposta sem fontes declaradas');
});

teste('IoT: gateway reporta a saúde do enlace de rádio', function () {
  var g = IoT.leituras('GATE-01', 24);
  if (g.length !== 25) throw new Error('gateway com série incompleta: ' + g.length);
  g.forEach(function (l) {
    var v = l.valores;
    if (v.taxaEntrega < 60 || v.taxaEntrega > 100) throw new Error('taxa de entrega fora do plausível: ' + v.taxaEntrega + '%');
    if (v.pacotesRecebidos < 0) throw new Error('pacotes negativos na telemetria');
    if (v.latenciaMs < 50 || v.latenciaMs > 2000) throw new Error('latência irreal: ' + v.latenciaMs + ' ms');
    if (v.sensoresConectados > 8 || v.sensoresConectados < 6) throw new Error('número de sensores conectados implausível: ' + v.sensoresConectados);
  });
  var q = IoT.qualidadeDispositivo('GATE-01');
  var graves = q.problemas.filter(function (p) { return p.nivel !== 'info'; });
  if (graves.length) throw new Error('gateway do consórcio com problema de manutenção: ' + JSON.stringify(graves));
  if (q.confiabilidade < 80) throw new Error('gateway com confiabilidade baixa: ' + q.confiabilidade + '%');
});

teste('IoT: painel geral traz o cartão de sensores com atalho para o IoT', function () {
  ['U-01', 'U-03'].forEach(function (id) {
    App.usuario = id; App.view = 'painel';
    var html = App.render();
    if (html.indexOf('Sensores em campo') < 0) throw new Error('cartão de sensores ausente no painel do perfil ' + id);
    if (html.indexOf("App.irPara('iot')") < 0) throw new Error('cartão de sensores sem atalho para o painel de IoT');
    if (html.indexOf('Ancoragens na blockchain') < 0) throw new Error('indicador de ancoragens ausente no painel');
  });
  App.usuario = 'U-01';
});

/* ======================================================================
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
  if (!(es.abaixoMinimo > 0)) throw new Error('o cenário deveria ter itens abaixo do mínimo (é o que gera alerta)');
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
  var abertoReceber = ts.filter(function (t) { return t.tipo === 'RECEBER' && t.status !== 'RECEBIDO'; }).reduce(function (a, t) { return a + t.valor; }, 0);
  if (Math.abs(abertoReceber - ind.aReceber) > 1) throw new Error('a receber do indicador (' + ind.aReceber + ') não bate com os títulos não recebidos (' + abertoReceber + ')');
  var abertoPagar = ts.filter(function (t) { return t.tipo === 'PAGAR' && t.status !== 'PAGO'; }).reduce(function (a, t) { return a + t.valor; }, 0);
  if (Math.abs(abertoPagar - ind.aPagar) > 1) throw new Error('a pagar do indicador não bate com os títulos não pagos');
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
  if (Math.abs(somaMeses - f.custo12meses) > 1) throw new Error('custo da folha não bate com a soma das competências: ' + somaMeses + ' vs ' + f.custo12meses);
  if (Math.abs(f.custoMensalMedio - f.custo12meses / 12) > 1) throw new Error('média mensal da folha inconsistente');
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

teste('ERP: estruturas sem base horária entram pela depreciação, não como custo/hora zero', function () {
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
    if (!j.rotulo || !j.ate) throw new Error('janela sem rótulo ou data limite');
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
  if (!Ledger.verificar().valida) throw new Error('a cadeia ficou inconsistente após ancorar o fechamento');
});

teste('ERP × cadeia: escrow vira conta a receber no vendedor e a pagar no comprador', function () {
  App.usuario = 'U-03'; Erp.reiniciar();
  var rv = Erp.sincronizarEscrow();
  if (!rv.criados.length) throw new Error('a sincronização não criou nenhum título para a cooperativa');
  var escopoV = Erp.escopoAtual().produtores;
  rv.criados.forEach(function (t) {
    if (t.tipo !== 'RECEBER') throw new Error('o lado do vendedor deveria ser conta a receber, veio ' + t.tipo);
    if (escopoV.indexOf(t.produtor) < 0) throw new Error('recebível fora do escopo consolidado: ' + t.produtor);
    if (!(t.valor > 0)) throw new Error('recebível sem valor');
    if (!t.composicao || !t.composicao.length) throw new Error('recebível sem a composição das etapas do contrato');
    if (t.origem !== 'ESCROW') throw new Error('recebível de escrow sem a marca de origem');
  });
  var segunda = Erp.sincronizarEscrow();
  if (segunda.criados.length) throw new Error('a segunda sincronização duplicou ' + segunda.criados.length + ' título(s)');
  var doContrato = rv.criados.filter(function (t) { return t.contrato === 'CT-2026-0041'; })[0];
  if (!doContrato) throw new Error('o contrato da cooperativa com a indústria não entrou no contas a receber');

  App.usuario = 'U-04'; Erp.reiniciar();
  var rc = Erp.sincronizarEscrow();
  var obrigacoes = rc.criados.filter(function (t) { return t.contrato === 'CT-2026-0041'; });
  if (obrigacoes.length !== 1) throw new Error('a indústria deveria ter exatamente 1 obrigação para o contrato, tem ' + obrigacoes.length);
  if (obrigacoes[0].tipo !== 'PAGAR') throw new Error('o lado do comprador deveria ser conta a pagar, veio ' + obrigacoes[0].tipo);
  if (obrigacoes[0].produtor !== 'U-04') throw new Error('a obrigação precisa ficar no escopo de quem compra, não de quem vende');
  if (Math.abs(obrigacoes[0].valor - doContrato.valor) > 0.05) throw new Error('os dois lados do escrow têm valores diferentes');
  if (!obrigacoes[0].composicao.length) throw new Error('obrigação sem a composição das etapas do contrato');
  App.usuario = 'U-01'; Erp.reiniciar();
});

teste('ERP: compra de insumo dá entrada no estoque, recalcula o custo médio e gera título', function () {
  Ledger.iniciar();
  var item = Erp.estoqueAtual({}).itens.filter(function (i) { return i.categoria === 'INSUMO'; })[0];
  var antes = { saldo: item.saldo, medio: item.custoMedio };
  var r = Erp.registrarCompra(item.id, 10, 12.5, 'Agro Insumos Cacoal', 30, 'U-01');
  if (!r) throw new Error('compra não registrada');
  var depois = Erp.estoqueAtual({}).itens.filter(function (i) { return i.id === item.id; })[0];
  if (Math.abs(depois.saldo - (antes.saldo + 10)) > 0.001) throw new Error('entrada não somou ao saldo');
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
  var saldoDepois = Erp.estoqueAtual({}).itens.filter(function (i) { return i.id === item.id; })[0].saldo;
  if (Math.abs(saldoDepois - (saldoAntes - 0.5)) > 0.001) throw new Error('baixa de estoque não ocorreu');
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
  if (!v.valida) throw new Error('cadeia inconsistente após as operações do ERP: ' + JSON.stringify((v.problemas || []).slice(0, 2)));
  var est = Ledger.estatisticas();
  if (est.transacoes < 20) throw new Error('poucas transações registradas: ' + est.transacoes);
  var tiposErp = ['COMPRA_INSUMO', 'APLICACAO_INSUMO', 'VENDA', 'FECHAMENTO_CONTABIL'];
  var pendentes = Ledger.filaPendente().filter(function (t) { return tiposErp.indexOf(t.tipo) >= 0; });
  if (pendentes.length < 2) throw new Error('esperados pelo menos 2 eventos do ERP na fila, há ' + pendentes.length);
  var bloco = Ledger.minerar({ minerador: 'Consórcio AgroChain' });
  if (!bloco) throw new Error('o minerador não fechou bloco com eventos do ERP na fila');
  var txsErp = Ledger.blocos().reduce(function (a, b) {
    return a + b.transacoes.filter(function (t) { return tiposErp.indexOf(t.tipo) >= 0; }).length;
  }, 0);
  if (txsErp < 3) throw new Error('as operações do ERP não chegaram à blockchain (' + txsErp + ' eventos em bloco)');
  if (!Ledger.verificar().valida) throw new Error('a cadeia ficou inválida depois de minerar os eventos do ERP');
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
  if (!v.valida) throw new Error('a cadeia ficou inconsistente depois de reiniciar');
});

teste('Painel geral e menu trazem o ERP e o atalho do modo imersivo', function () {
  App.usuario = 'U-01'; App.view = 'painel';
  var html = App.render();
  if (html.indexOf("App.irPara('erp')") < 0) throw new Error('menu sem o item do ERP');
  if (html.indexOf('ERP agro') < 0) throw new Error('menu sem o rótulo do ERP');
  if (html.indexOf('Imersivo.abrir()') < 0) throw new Error('topo sem o botão do modo imersivo');
});

/* ---------- 8. relatório ---------- */
console.log('\n' + '='.repeat(72));
console.log('BATERIA DE TESTES DA APLICAÇÃO — AGROCHAIN');
console.log('='.repeat(72));
console.log('Total de verificações: ' + total);
console.log('Aprovadas: ' + (total - falhas.length));
console.log('Falhas:    ' + falhas.length);
if (falhas.length) {
  console.log('\n--- DETALHE DAS FALHAS ---');
  falhas.forEach(function (f) {
    console.log('\n✗ ' + f.nome);
    console.log('  erro: ' + f.erro);
    if (f.pilha) console.log('  local: ' + f.pilha);
  });
  process.exit(1);
} else {
  console.log('\n✅ Todas as verificações passaram.');
}
