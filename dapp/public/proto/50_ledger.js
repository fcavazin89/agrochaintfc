/* =========================================================================
 * AGROCHAIN · LEDGER BLOCKCHAIN
 * Rede permissionada de consórcio (café + cacau). Implementa de verdade:
 *   · Bloco gênese com identidade da rede
 *   · Mempool de transações assinadas
 *   · Mineração com prova de trabalho (dificuldade configurável)
 *   · Árvore de Merkle e encadeamento por hash do bloco anterior
 *   · Verificação de integridade da cadeia inteira
 *   · Simulação de adulteração (para provar que a fraude é detectada)
 *   · Selo de rastreio do lote (QR Code + trilha de verificação)
 *   · Controle de permissão por papel no consórcio
 *
 * É uma blockchain real em funcionamento, porém operando de forma local e
 * didática: a rede de consórcio em produção usa Hyperledger Besu / Polygon
 * (ver contrato AgroChainRastreio.sol e documento de arquitetura).
 * ========================================================================= */
(function (global) {
  'use strict';

  var Cripto = global.Cripto;
  var D = global.DB;

  var ledger = null;
  var mempool = [];
  var DIFICULDADE = 3;   // zeros hexadecimais exigidos no início do hash do bloco

  /* Matriz de permissões do consórcio (quem pode registrar o quê).
     LEITURA_SENSOR: o produtor ancora os dados dos seus próprios sensores e a
     cooperativa ancora os gateways que agregam vários produtores. A indústria e
     a certificadora só leem — quem mede não deve poder escolher o que registra. */
  var PERMISSOES = {
    produtor: ['COLHEITA', 'SECAGEM', 'FERMENTACAO', 'ANALISE_IA', 'DESTINO_CONSUMO', 'BENEFICIAMENTO_PROPRIO', 'TORRA_PROPRIA', 'TRANSPORTE', 'PROPOSTA', 'LEITURA_SENSOR',
               /* eventos do ERP: são do produtor e ficam na cadeia */
               'VENDA', 'COMPRA_INSUMO', 'APLICACAO_INSUMO', 'FECHAMENTO_CONTABIL'],
    cooperativa: ['RECEBIMENTO_COOP', 'CLASSIFICACAO', 'TRANSPORTE', 'LOTE_AGREGADO', 'PROPOSTA', 'CONTRATO', 'LEITURA_SENSOR', 'FECHAMENTO_CONTABIL'],
    industria: ['CONTRATO', 'ACEITE_LOTE', 'PAGAMENTO_ESCROW', 'INSPECAO_RECEBIMENTO'],
    certificadora: ['LAUDO_QUALIDADE', 'CERTIFICACAO', 'AUDITORIA'],
    auditor: []   // somente leitura
  };

  function papelDe(usuarioId) {
    var u = D.usuarios.filter(function (x) { return x.id === usuarioId; })[0];
    return u ? u.papel : null;
  }

  function podeRegistrar(usuarioId, tipo) {
    var p = papelDe(usuarioId);
    if (!p) return false;
    if (p === 'auditor') return false;
    return (PERMISSOES[p] || []).indexOf(tipo) >= 0;
  }

  /* ---------------------------------------------------------------------
   * BLOCO GÊNESE
   * ------------------------------------------------------------------- */
  function criarGenesis() {
    var timestamp = D.meta.criadoEm;
    var txGenesis = {
      id: 'TX-GENESIS', tipo: 'GENESIS', autor: 'SISTEMA',
      payload: {
        rede: D.meta.nome, chainId: D.meta.chainId,
        consorcio: D.meta.consorcio,
        algoritmo: D.meta.algoritmo,
        finalidade: 'Rastreabilidade de café e cacau de Rondônia — origem verificável, pagamento em escrow e certificação auditável.',
        regras: [
          'Todo evento da cadeia é assinado pelo autor e registrado de forma imutável.',
          'Divergência de peso acima da tolerância contratual trava o pagamento automaticamente.',
          'Selo de certificação só é emitido com laudo laboratorial encadeado.',
          'Nenhum participante pode reescrever o histórico sozinho.'
        ]
      },
      timestamp: timestamp
    };
    txGenesis.autor = 'SISTEMA';
    txGenesis.assinatura = Cripto.sha256('SISTEMA|' + timestamp + '|' + Cripto.canonical(txGenesis.payload)).slice(0, 32);
    txGenesis.status = 'CONFIRMADA';
    /* O hash DEVE ser calculado sobre exatamente os mesmos campos que a função
       de verificação recalcula, senão a própria gênese aparece como adulterada. */
    txGenesis.hash = Cripto.hashRecord({
      id: txGenesis.id, tipo: txGenesis.tipo, autor: txGenesis.autor,
      payload: txGenesis.payload, timestamp: txGenesis.timestamp, assinatura: txGenesis.assinatura
    });
    var merkle = Cripto.merkleRoot([txGenesis.hash]);
    var pow = Cripto.proofOfWork(0, timestamp, merkle, '0'.repeat(64), DIFICULDADE);
    return {
      indice: 0, timestamp: timestamp, transacoes: [txGenesis],
      merkleRoot: merkle, hashAnterior: '0'.repeat(64),
      nonce: pow.nonce, tentativas: pow.tentativas, hash: pow.hash,
      minerador: 'Consórcio AgroChain', dificuldade: DIFICULDADE
    };
  }

  function iniciar() {
    ledger = [criarGenesis()];
    mempool = [];
    /* Reconstrói a cadeia a partir dos eventos já existentes no sistema,
       agrupando em blocos — simula um sistema que já está em operação. */
    var eventos = D.eventos.slice().sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    eventos.forEach(function (e) { registrarTx(e.tipo, { lote: e.lote, local: e.local, descricao: e.descricao, eventoId: e.id }, e.autor, e.timestamp, true); });
    if (mempool.length) minerar({ minerador: 'COOPRON', silencioso: true });
    D.certificacoes.forEach(function (c) {
      if (c.status === 'ATIVO') registrarTx('CERTIFICACAO', { certificacao: c.id, lote: c.lote, tipo: c.tipo }, c.emissor, null, true);
    });
    if (mempool.length) minerar({ minerador: 'Certificadora Rondônia IG', silencioso: true });
    return ledger;
  }

  /* ---------------------------------------------------------------------
   * TRANSAÇÕES
   * ------------------------------------------------------------------- */
  function registrarTx(tipo, payload, autor, timestamp, silencioso) {
    var permitido = podeRegistrar(autor, tipo) || tipo === 'GENESIS';
    var ts = timestamp || new Date().toISOString();
    var tx = {
      id: 'TX-' + Cripto.sha256(tipo + autor + ts + JSON.stringify(payload)).slice(0, 10).toUpperCase(),
      tipo: tipo, autor: autor, payload: payload, timestamp: ts,
      assinatura: Cripto.sha256(autor + '|' + ts + '|' + Cripto.canonical(payload)).slice(0, 32),
      status: permitido ? 'PENDENTE' : 'REJEITADA',
      motivoRejeicao: permitido ? null : 'Papel "' + papelDe(autor) + '" não tem permissão para registrar evento do tipo ' + tipo + ' neste consórcio.',
      hash: null, bloco: null
    };
    tx.hash = Cripto.hashRecord({ id: tx.id, tipo: tx.tipo, autor: tx.autor, payload: tx.payload, timestamp: tx.timestamp, assinatura: tx.assinatura });
    if (permitido) { mempool.push(tx); } else { tx.silencioso = silencioso; }
    return tx;
  }

  /* Vincula o evento da cadeia (DB.eventos) ao seu registro na blockchain */
  function registrarEvento(evento, autorId, silencioso) {
    var tx = registrarTx(evento.tipo, {
      lote: evento.lote, local: evento.local, descricao: evento.descricao, eventoId: evento.id
    }, autorId, evento.timestamp, silencioso);
    if (tx.status === 'PENDENTE') { evento.txId = tx.id; evento.hash = tx.hash; }
    return tx;
  }

  /* ---------------------------------------------------------------------
   * MINERAÇÃO
   * Preparação e finalização são separadas para que a interface possa
   * percorrer os nonces ao vivo (mostrando as tentativas reais) e depois
   * finalizar o bloco com EXATAMENTE o mesmo timestamp e merkle root que
   * foram usados na busca — assim o nonce exibido é o nonce do bloco real.
   * ------------------------------------------------------------------- */
  function prepararBloco(opcoes) {
    opcoes = opcoes || {};
    return {
      indice: ledger.length,
      timestamp: new Date().toISOString(),
      transacoes: mempool.slice(),
      merkleRoot: Cripto.merkleRoot(mempool.map(function (t) { return t.hash; })),
      hashAnterior: ledger[ledger.length - 1].hash,
      dificuldade: opcoes.dificuldade || DIFICULDADE,
      prefixo: new Array((opcoes.dificuldade || DIFICULDADE) + 1).join('0')
    };
  }

  function finalizarBloco(prep, nonce, opcoes) {
    opcoes = opcoes || {};
    var pendentes = prep.transacoes;
    var hash = Cripto.hashBlock(prep.indice, prep.timestamp, prep.merkleRoot, prep.hashAnterior, nonce);
    var bloco = {
      indice: prep.indice, timestamp: prep.timestamp, transacoes: pendentes,
      merkleRoot: prep.merkleRoot, hashAnterior: prep.hashAnterior, nonce: nonce,
      tentativas: nonce + 1, hash: hash,
      minerador: opcoes.minerador || 'COOPRON', dificuldade: prep.dificuldade
    };
    pendentes.forEach(function (t) {
      t.status = 'CONFIRMADA'; t.bloco = bloco.indice;
      /* Atualiza o registro original (evento/certificado/contrato) com o bloco e o hash */
      if (t.tipo === 'CERTIFICACAO' && t.payload.certificacao) {
        var c = D.certificacoes.filter(function (x) { return x.id === t.payload.certificacao; })[0];
        if (c) { c.hash = t.hash; c.bloco = bloco.indice; }
      }
      if (t.payload && t.payload.eventoId) {
        var e = D.eventos.filter(function (x) { return x.id === t.payload.eventoId; })[0];
        if (e) { e.hash = t.hash; e.bloco = bloco.indice; e.txId = t.id; e.assinatura = t.assinatura; }
      }
      if (t.tipo === 'CONTRATO' && t.payload.contrato) {
        var ct = D.contratos.filter(function (x) { return x.id === t.payload.contrato; })[0];
        if (ct) { ct.hash = t.hash; ct.bloco = bloco.indice; }
      }
    });
    mempool = mempool.filter(function (t) { return t.status !== 'CONFIRMADA'; });
    ledger.push(bloco);

    /* Marca o lote como registrado na blockchain */
    var lotesNoBloco = {};
    pendentes.forEach(function (t) { if (t.payload && t.payload.lote) lotesNoBloco[t.payload.lote] = true; });
    Object.keys(lotesNoBloco).forEach(function (lid) {
      var l = D.lotes.filter(function (x) { return x.id === lid; })[0];
      if (l) {
        var eventos = D.eventos.filter(function (e) { return e.lote === lid; });
        if (eventos.length >= 3) {
          l.hash = Cripto.sha256(eventos.map(function (e) { return e.hash || e.id; }).join('|'));
          l.bloco = bloco.indice;
        }
      }
    });
    return bloco;
  }

  /* Mineração em passo único (usada no carregamento da rede e nas operações
     automáticas). A interface usa prepararBloco/finalizarBloco para animar. */
  function minerar(opcoes) {
    opcoes = opcoes || {};
    if (!mempool.length) return null;
    var prep = prepararBloco(opcoes);
    var pow = Cripto.proofOfWork(prep.indice, prep.timestamp, prep.merkleRoot, prep.hashAnterior, prep.dificuldade);
    var bloco = finalizarBloco(prep, pow.nonce, opcoes);
    bloco.tentativas = pow.tentativas;
    return bloco;
  }

  /* ---------------------------------------------------------------------
   * VERIFICAÇÃO DE INTEGRIDADE
   * ------------------------------------------------------------------- */
  function verificar() {
    var problemas = [];
    for (var i = 0; i < ledger.length; i++) {
      var b = ledger[i];
      /* 1) o hash do bloco bate com seu conteúdo? */
      var hashCalculado = Cripto.hashBlock(b.indice, b.timestamp, b.merkleRoot, b.hashAnterior, b.nonce);
      if (hashCalculado !== b.hash) {
        problemas.push({ bloco: b.indice, tipo: 'HASH_INVALIDO', descricao: 'O hash armazenado do bloco ' + b.indice + ' não corresponde ao conteúdo (bloco adulterado).' });
      }
      /* 2) o Merkle root bate com as transações? */
      var merkleCalculado = Cripto.merkleRoot(b.transacoes.map(function (t) { return t.hash; }));
      if (merkleCalculado !== b.merkleRoot) {
        problemas.push({ bloco: b.indice, tipo: 'MERKLE_INVALIDO', descricao: 'A árvore de Merkle do bloco ' + b.indice + ' não corresponde às transações (transação alterada).' });
      }
      /* 3) o elo com o bloco anterior está correto? */
      if (i > 0 && b.hashAnterior !== ledger[i - 1].hash) {
        problemas.push({ bloco: b.indice, tipo: 'ENCADEAMENTO_ROMPIDO', descricao: 'O bloco ' + b.indice + ' aponta para um bloco anterior diferente do atual (cadeia substituída).' });
      }
      /* 4) cada transação: o hash bate com o conteúdo? */
      b.transacoes.forEach(function (t) {
        var h = Cripto.hashRecord({ id: t.id, tipo: t.tipo, autor: t.autor, payload: t.payload, timestamp: t.timestamp, assinatura: t.assinatura });
        if (h !== t.hash) {
          problemas.push({ bloco: b.indice, tipo: 'TRANSACAO_ADULTERADA', descricao: 'A transação ' + t.id + ' (bloco ' + b.indice + ') teve seu conteúdo alterado.', transacao: t.id });
        }
      });
      /* 5) integridade da assinatura do autor */
      b.transacoes.forEach(function (t) {
        if (t.autor === 'SISTEMA') return;
        var assinaturaEsperada = Cripto.sha256(t.autor + '|' + t.timestamp + '|' + Cripto.canonical(t.payload)).slice(0, 32);
        if (assinaturaEsperada !== t.assinatura) {
          problemas.push({ bloco: b.indice, tipo: 'ASSINATURA_INVALIDA', descricao: 'A assinatura da transação ' + t.id + ' não confere com a chave do autor declarado.', transacao: t.id });
        }
      });
    }
    return {
      valida: problemas.length === 0, problemas: problemas, blocos: ledger.length,
      transacoes: ledger.reduce(function (a, b) { return a + b.transacoes.length; }, 0),
      verificadoEm: new Date().toISOString()
    };
  }

  /* ---------------------------------------------------------------------
   * SIMULAÇÃO DE ADULTERAÇÃO — demonstração de segurança
   * Altera o conteúdo de uma transação já minerada SEM recalcular o hash.
   * Toda a cadeia a partir daquele ponto passa a acusar inconsistência.
   * ------------------------------------------------------------------- */
  function simularAdulteracao(blocoIndice, campo, novoValor) {
    var b = ledger[blocoIndice] || ledger[ledger.length - 1];
    /* escolhe uma transação de evento, de preferência ligada a lote */
    var t = b.transacoes.filter(function (x) { return x.payload && x.payload.lote; })[0] || b.transacoes[0];
    var anterior = JSON.stringify(t.payload);
    t.payload[campo || 'descricao'] = novoValor || 'CONTEÚDO ALTERADO FRAUDULENTAMENTE';
    return {
      transacao: t.id, bloco: b.indice, payloadAnterior: anterior,
      payloadAtual: JSON.stringify(t.payload),
      explicacao: 'A transação ' + t.id + ' foi alterada diretamente na base do nó. O hash original continua gravado no bloco, então a verificação acusa a divergência e todos os blocos seguintes ficam inválidos — é exatamente isso que impede a fraude: para esconder a alteração, o fraudador teria de refazer a prova de trabalho de todo o histórico e convencer a maioria do consórcio.'
    };
  }

  function restaurarIntegridade() { iniciar(); }

  /* ---------------------------------------------------------------------
   * SELO DE RASTREIO DO LOTE (QR + trilha)
   * ------------------------------------------------------------------- */
  function seloLote(loteId) {
    var l = D.lotes.filter(function (x) { return x.id === loteId; })[0];
    if (!l) return null;
    var eventos = D.eventos.filter(function (e) { return e.lote === loteId; }).sort(function (a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    var certificacoes = D.certificacoes.filter(function (c) { return c.lote === loteId; });
    var talhao = D.talhoes.filter(function (t) { return t.id === l.talhao; })[0];
    var produtor = D.usuarios.filter(function (u) { return u.id === l.produtor; })[0];

    /* Hash do lote: encadeia o hash de cada evento na ordem cronológica */
    var hashLote = Cripto.sha256(eventos.map(function (e) { return e.hash || (e.id + ':pendente'); }).join('|'));
    if (!l.hash) { l.hash = hashLote; }

    /* O conteúdo do QR é normalizado para ASCII: leitores antigos e coletores
       de campo lidam mal com acentuação, e o selo precisa ser lido em qualquer aparelho. */
    function semAcento(txt) {
      return String(txt).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '');
    }
    var conteudoQR = [
      'AGROCHAIN/' + D.meta.chainId,
      'LOTE:' + l.id,
      'PRODUTO:' + semAcento(Dados.nomeProduto(l.produto)).toUpperCase(),
      'PRODUTOR:' + semAcento(produtor ? produtor.org : l.produtor),
      'PESO:' + l.pesoKg + 'KG',
      'BLOCO:' + (eventos.length && eventos[0].bloco !== null ? eventos[0].bloco : 'pendente'),
      'HASH:' + hashLote.slice(0, 24)
    ].join('|');

    return {
      lote: loteId, produto: l.produto, produtoNome: Dados.nomeProduto(l.produto),
      origem: produtor ? produtor.org + ' — ' + produtor.municipio + '/' + produtor.uf : l.produtor,
      talhao: talhao ? talhao.nome : null, safra: l.safra,
      quantidade: l.quantidade, unidade: l.unidade, pesoKg: l.pesoKg,
      hashLote: hashLote, eventos: eventos, certificacoes: certificacoes,
      conteudoQR: conteudoQR, qr: (global.QRCode ? global.QRCode.toSVG(conteudoQR) : null),
      blocos: eventos.map(function (e) { return e.bloco; }).filter(function (x) { return x !== null && x !== undefined; }),
      verificavel: eventos.length > 0 && eventos.every(function (e) { return e.hash; })
    };
  }

  /* Verifica um lote específico: recalcula o hash e compara com o selo */
  function verificarLote(loteId) {
    var selo = seloLote(loteId);
    var recalculado = Cripto.sha256(selo.eventos.map(function (e) { return e.hash || (e.id + ':pendente'); }).join('|'));
    var integro = recalculado === selo.hashLote || !D.lotes.filter(function (x) { return x.id === loteId; })[0].hash;
    var comBloco = selo.eventos.filter(function (e) { return e.bloco !== null && e.bloco !== undefined; });
    return {
      lote: loteId, integro: integro, hashSelo: selo.hashLote, hashRecalculado: recalculado,
      eventosNaCadeia: comBloco.length, eventosTotal: selo.eventos.length,
      blocos: selo.blocos, certificado: selo.certificacoes.length > 0
    };
  }

  /* ---------------------------------------------------------------------
   * CONTRATOS INTELIGENTES
   * ------------------------------------------------------------------- */
  function criarContrato(dados) {
    var id = 'CT-' + new Date().getFullYear() + '-' + String(1000 + D.contratos.length + 1).slice(1);
    var ct = {
      id: id, tipo: 'COMPRA_VENDA_RASTREAVEL', vendedor: dados.vendedor, comprador: dados.comprador,
      lotes: [dados.lote], produto: dados.produto, quantidade: dados.quantidade, unidade: dados.unidade,
      precoUnitario: dados.precoUnitario, valorTotal: Math.round(dados.quantidade * dados.precoUnitario * 100) / 100,
      moeda: 'BRL', modoPagamento: 'ESCROW', status: 'AGUARDANDO_GARANTIA',
      criadoEm: new Date().toISOString().slice(0, 10), prazoEntrega: dados.prazoEntrega,
      garantiaPercentual: 10, toleranciaDivergenciaPeso: 2,
      etapas: [
        { nome: 'Proposta aceita', status: 'CONCLUIDA', data: new Date().toISOString().slice(0, 10), bloco: null },
        { nome: 'Garantia depositada (escrow)', status: 'PENDENTE', data: null, bloco: null },
        { nome: 'Carga despachada', status: 'PENDENTE', data: null, bloco: null },
        { nome: 'Recebimento e conferência', status: 'PENDENTE', data: null, bloco: null },
        { nome: 'Liberação do pagamento', status: 'PENDENTE', data: null, bloco: null }
      ], hash: null, bloco: null
    };
    D.contratos.push(ct);
    var l = D.lotes.filter(function (x) { return x.id === dados.lote; })[0];
    if (l) { l.status = 'EM_CONTRATO'; l.contrato = id; }
    registrarTx('CONTRATO', { contrato: id, lote: dados.lote, valor: ct.valorTotal, comprador: dados.comprador }, dados.vendedor);
    return ct;
  }

  function avancarEtapa(contratoId, dados) {
    var ct = D.contratos.filter(function (x) { return x.id === contratoId; })[0];
    if (!ct) return null;
    var i = ct.etapas.findIndex(function (e) { return e.status === 'PENDENTE'; });
    if (i < 0) return ct;
    var etapa = ct.etapas[i];
    etapa.status = 'CONCLUIDA';
    etapa.data = new Date().toISOString().slice(0, 10);

    var resultado = { etapa: etapa.nome, status: 'CONCLUIDA', divergencia: null, alerta: null };

    if (etapa.nome === 'Garantia depositada (escrow)') {
      ct.status = 'GARANTIA_DEPOSITADA';
      resultado.mensagem = 'Garantia de R$ ' + (ct.valorTotal * ct.garantiaPercentual / 100).toLocaleString('pt-BR') + ' depositada em escrow pelo comprador. O vendedor já pode despachar com segurança.';
    }
    if (etapa.nome === 'Carga despachada') {
      ct.status = 'EM_TRANSITO';
      resultado.mensagem = 'Carga lacrada e em trânsito com rastreio por satélite. O lote está bloqueado para venda enquanto durar o contrato.';
    }
    if (etapa.nome === 'Recebimento e conferência') {
      ct.status = 'EM_CONFERENCIA';
      var divergencia = dados && dados.divergenciaPeso !== undefined ? dados.divergenciaPeso : 0.8;
      resultado.divergencia = divergencia;
      if (Math.abs(divergencia) > ct.toleranciaDivergenciaPeso) {
        ct.status = 'TRAVADO_DIVERGENCIA';
        resultado.alerta = 'DIVERGÊNCIA DE PESO DE ' + Math.abs(divergencia).toFixed(2) + '% ACIMA DA TOLERÂNCIA CONTRATUAL (' + ct.toleranciaDivergenciaPeso + '%). O contrato foi travado automaticamente pelo smart contract e o pagamento em escrow NÃO será liberado até a resolução da disputa. Um laudo de recontagem é exigido.';
      } else {
        resultado.mensagem = 'Carga conferida com divergência de ' + Math.abs(divergencia).toFixed(2) + '% — dentro da tolerância de ' + ct.toleranciaDivergenciaPeso + '%. O smart contract libera a etapa de pagamento automaticamente.';
      }
    }
    if (etapa.nome === 'Liberação do pagamento') {
      ct.status = 'CONCLUIDA';
      var loteC = D.lotes.filter(function (x) { return x.id === ct.lotes[0]; })[0];
      if (loteC) loteC.status = 'VENDIDO';
      resultado.mensagem = 'Pagamento de R$ ' + ct.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' liberado do escrow para o vendedor. Contrato encerrado e registrado na blockchain.';
    }
    registrarTx('CONTRATO', { contrato: ct.id, etapa: etapa.nome, status: ct.status, divergencia: resultado.divergencia }, ct.comprador);
    return ct;
  }

  /* ---------------------------------------------------------------------
   * REGISTRO DE NOVO LOTE (fluxo do produtor)
   * ------------------------------------------------------------------- */
  function registrarLote(dados, usuarioId) {
    var id = 'L-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);
    var l = {
      id: id, produto: dados.produto, talhao: dados.talhao, produtor: usuarioId, cooperativa: 'U-03',
      safra: 2026, area: Dados.talhao(dados.talhao).area, quantidade: Number(dados.quantidade),
      unidade: dados.produto === 'cacau' ? 'arrobas (15 kg)' : 'sacas 60 kg',
      pesoKg: dados.produto === 'cacau' ? Number(dados.quantidade) * 15 : Number(dados.quantidade) * 60,
      dataColheita: dados.dataColheita || new Date().toISOString().slice(0, 10),
      umidade: Number(dados.umidade), tipo: dados.tipo || (dados.produto === 'cacau' ? 'Fermentado (declarado)' : 'Tipo 7'),
      umidadeSecagem: Number(dados.umidade), diasSecagem: Number(dados.diasSecagem || 0),
      destino: dados.destino || 'venda',
      status: dados.destino === 'consumo_proprio' ? 'CONSUMIDO_PROPRIO' : 'DISPONIVEL',
      qualidade: null, certificacao: null, eventos: [], hash: null, bloco: null,
      observacao: dados.observacao || 'Lote registrado pelo produtor via aplicativo AgroChain.'
    };
    D.lotes.unshift(l);

    /* Cria automaticamente os eventos da cadeia */
    var base = [
      { tipo: 'COLHEITA', autor: usuarioId, local: Dados.talhao(dados.talhao).nome + ', ' + Dados.orgUsuario(usuarioId), descricao: 'Colheita registrada no talhão ' + dados.talhao + ': ' + l.quantidade + ' ' + l.unidade + '.', timestamp: new Date().toISOString() }
    ];
    if (dados.produto === 'cacau' && Number(dados.diasSecagem) >= 4) {
      base.push({ tipo: 'FERMENTACAO', autor: usuarioId, local: 'Casa de fermentação', descricao: 'Fermentação declarada de ' + dados.diasSecagem + ' dias.', timestamp: new Date().toISOString() });
    }
    base.push({
      tipo: dados.destino === 'consumo_proprio' ? 'DESTINO_CONSUMO' : 'SECAGEM', autor: usuarioId,
      local: 'Unidade de pós-colheita', timestamp: new Date().toISOString(),
      descricao: dados.destino === 'consumo_proprio'
        ? 'Lote destinado ao consumo próprio / transformação artesanal.'
        : 'Secagem declarada; umidade informada ' + l.umidade + '%.'
    });

    var criados = [];
    base.forEach(function (b, i) {
      var ev = {
        id: 'E-' + (D.eventos.length + 1 + i), tipo: b.tipo, lote: l.id, autor: b.autor,
        local: b.local, descricao: b.descricao, timestamp: b.timestamp, hash: null, bloco: null, assinatura: null
      };
      D.eventos.push(ev); l.eventos.push(ev.id); criados.push(ev);
      registrarEvento(ev, b.autor);
    });

    /* A IA avalia o lote imediatamente */
    l.qualidade = IA.scoreQualidade(l.id).score;
    var analise = {
      id: 'E-' + (D.eventos.length + 1), tipo: 'ANALISE_IA', lote: l.id, autor: usuarioId,
      local: 'Plataforma AgroChain', timestamp: new Date().toISOString(),
      descricao: 'AgroGrade v1.0: score de qualidade ' + l.qualidade + '/100 — ' + IA.scoreQualidade(l.id).classe + '.', hash: null, bloco: null, assinatura: null
    };
    D.eventos.push(analise); l.eventos.push(analise.id);
    registrarEvento(analise, usuarioId);

    return { lote: l, eventos: criados.concat([analise]), minerado: minerar({ minerador: Dados.orgUsuario(usuarioId) }) };
  }

  /* ---------------------------------------------------------------------
   * ESTATÍSTICAS DA REDE
   * ------------------------------------------------------------------- */
  function estatisticas() {
    var txs = ledger.reduce(function (a, b) { return a + b.transacoes.length; }, 0);
    var tempoMedio = 0, n = 0;
    for (var i = 1; i < ledger.length; i++) {
      tempoMedio += (new Date(ledger[i].timestamp) - new Date(ledger[i - 1].timestamp)) / 1000; n++;
    }
    return {
      blocos: ledger.length, transacoes: txs, pendentes: mempool.length,
      ultimoBloco: ledger.length - 1, ultimoHash: ledger[ledger.length - 1].hash,
      dificuldade: DIFICULDADE,
      tempoMedioBloco: n ? Math.round(tempoMedio / n) : 0,
      tentativasUltimoBloco: ledger[ledger.length - 1].tentativas,
      participantes: D.meta.consorcio.length,
      hashCadeia: Cripto.sha256(ledger.map(function (b) { return b.hash; }).join('|'))
    };
  }

  function hashCadeia() { return ledger ? Cripto.sha256(ledger.map(function (b) { return b.hash; }).join('|')) : null; }
  function blocos() { return ledger; }
  function filaPendente() { return mempool; }
  function permissoes() { return PERMISSOES; }

  global.Ledger = {
    iniciar: iniciar, minerar: minerar, prepararBloco: prepararBloco, finalizarBloco: finalizarBloco,
    registrarTx: registrarTx, registrarEvento: registrarEvento,
    registrarLote: registrarLote, verificar: verificar, simularAdulteracao: simularAdulteracao,
    restaurarIntegridade: restaurarIntegridade, seloLote: seloLote, verificarLote: verificarLote,
    criarContrato: criarContrato, avancarEtapa: avancarEtapa, estatisticas: estatisticas,
    blocos: blocos, filaPendente: filaPendente, permissoes: permissoes, podeRegistrar: podeRegistrar,
    hashCadeia: hashCadeia, DIFICULDADE: DIFICULDADE
  };
})(typeof window !== 'undefined' ? window : globalThis);
