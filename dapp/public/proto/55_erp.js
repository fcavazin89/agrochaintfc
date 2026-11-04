/* =========================================================================
 * AGROCHAIN · ERP DA PROPRIEDADE
 * Gestão rural em ciclo completo: financeiro (contas a pagar e receber,
 * fluxo de caixa, DRE), custos por talhão e por saca, estoques de insumo e
 * de produto, compras e vendas, folha, máquinas e depreciação, orçamento,
 * fechamento contábil ancorado na blockchain.
 *
 * A base é gerada de forma DETERMINÍSTICA (semente fixa) no calendário
 * agrícola de café conilon e cacau de Rondônia. Cada número tem origem
 * rastreável: compra, aplicação no talhão, colheita, lote, venda.
 *
 * Integrações (exigidas no projeto):
 *  - IA .......... custo por saca projetado com a previsão de safra; preço de
 *                  cada venda é o preço ajustado pela qualidade lote a lote,
 *                  exatamente o que o modelo de preço devolve.
 *  - IoT ......... a leitura de sensor entra como EVIDÊNCIA do manejo: janela
 *                  de molhamento antes de cada aplicação e lâmina irrigada
 *                  conferida contra a ET0 medida, com o custo de energia.
 *  - Blockchain .. colheita registrada gera volume colhido no custo; insumo
 *                  aplicado e venda são ancorados na cadeia; venda em escrow
 *                  vira conta a receber; o fechamento do período é ancorado
 *                  com raiz de Merkle e prova de inclusão verificável.
 * ========================================================================= */
(function (global) {
  'use strict';

  var D = global.DB;
  var Dados = global.Dados;
  var IA = global.IA;

  /* Data de referência da demonstração (a mesma do restante do sistema) */
  var HOJE = new Date('2026-10-06T12:00:00-04:00');
  var PRODUTORES = ['U-01', 'U-02'];
  var ANO = 2026;

  /* =====================================================================
   * PLANO DE CONTAS
   * grupo: RECEITA | DEDUCAO | CUSTO | DESPESA | INVESTIMENTO
   * =================================================================== */
  var CONTAS = [
    { codigo: '1.1.01', nome: 'Caixa e contas bancárias', grupo: 'ATIVO' },
    { codigo: '1.1.02', nome: 'Estoque de insumos, embalagens e produto', grupo: 'ATIVO' },
    { codigo: '1.2.01', nome: 'Máquinas, benfeitorias e tecnologia', grupo: 'ATIVO' },
    { codigo: '2.1.01', nome: 'Custeio bancário e fornecedores', grupo: 'PASSIVO' },

    { codigo: '3.1.01', nome: 'Venda de café (saca 60 kg)', grupo: 'RECEITA' },
    { codigo: '3.1.02', nome: 'Venda de cacau (arroba 15 kg)', grupo: 'RECEITA' },
    { codigo: '3.1.03', nome: 'Produto beneficiado próprio (torra e chocolate)', grupo: 'RECEITA' },
    { codigo: '3.1.04', nome: 'Prêmio de qualidade e certificação', grupo: 'RECEITA' },
    { codigo: '3.1.05', nome: 'Serviço de beneficiamento a terceiros', grupo: 'RECEITA' },
    { codigo: '3.1.06', nome: 'Valor do consumo próprio (imputado, não entra no caixa)', grupo: 'RECEITA' },
    { codigo: '3.2.01', nome: '(-) Tributos sobre a venda', grupo: 'DEDUCAO' },

    { codigo: '4.1.01', nome: 'Fertilizantes e corretivos', grupo: 'CUSTO' },
    { codigo: '4.1.02', nome: 'Defensivos e biológicos', grupo: 'CUSTO' },
    { codigo: '4.1.03', nome: 'Mudas e material de plantio', grupo: 'CUSTO' },
    { codigo: '4.1.04', nome: 'Mão de obra de campo (fixa e diárias)', grupo: 'CUSTO' },
    { codigo: '4.1.05', nome: 'Colheita (diárias e empreita)', grupo: 'CUSTO' },
    { codigo: '4.1.06', nome: 'Serviço de máquinas e implementos', grupo: 'CUSTO' },
    { codigo: '4.1.07', nome: 'Combustíveis e lubrificantes', grupo: 'CUSTO' },
    { codigo: '4.1.08', nome: 'Energia e irrigação', grupo: 'CUSTO' },
    { codigo: '4.1.09', nome: 'Embalagens (sacas, big bag, etiquetas)', grupo: 'CUSTO' },
    { codigo: '4.1.10', nome: 'Pós-colheita: fermentação, secagem e classificação', grupo: 'CUSTO' },
    { codigo: '4.1.11', nome: 'Frete e transporte', grupo: 'CUSTO' },
    { codigo: '4.1.12', nome: 'Controle biológico e monitoramento', grupo: 'CUSTO' },

    { codigo: '5.1.01', nome: 'Administrativas, internet e contabilidade', grupo: 'DESPESA' },
    { codigo: '5.1.02', nome: 'Tributos, ITR e contribuições', grupo: 'DESPESA' },
    { codigo: '5.1.03', nome: 'Manutenção de máquinas e benfeitorias', grupo: 'DESPESA' },
    { codigo: '5.1.04', nome: 'Depreciação', grupo: 'DESPESA' },
    { codigo: '5.1.05', nome: 'Juros e tarifas do custeio', grupo: 'DESPESA' },
    { codigo: '5.1.06', nome: 'Certificação, laudos e conformidade', grupo: 'DESPESA' },
    { codigo: '5.1.07', nome: 'Tecnologia, conectividade e sensores', grupo: 'DESPESA' },
    { codigo: '5.1.08', nome: 'Capacitação e segurança do trabalho', grupo: 'DESPESA' },

    { codigo: '6.1.01', nome: 'Máquinas e equipamentos', grupo: 'INVESTIMENTO' },
    { codigo: '6.1.02', nome: 'Benfeitorias e instalações', grupo: 'INVESTIMENTO' },
    { codigo: '6.1.03', nome: 'Formação e renovação de lavoura', grupo: 'INVESTIMENTO' }
  ];
  function conta(codigo) { return CONTAS.filter(function (c) { return c.codigo === codigo; })[0] || null; }
  function nomeConta(codigo) { var c = conta(codigo); return c ? c.nome : codigo; }
  function grupoDa(codigo) { var c = conta(codigo); return c ? c.grupo : null; }

  /* =====================================================================
   * ORÇAMENTO TÉCNICO POR HECTARE E ANO
   * Valores de custo de produção para o calendário de Rondônia em 2026.
   * fixo  : custo por hectare/ano distribuído nos meses de atividade
   * porUnidade: custo que acompanha o volume colhido (saca 60 kg ou arroba 15 kg)
   * =================================================================== */
  var ORCAMENTO_HA = {
    cafe_conilon: {
      rotulo: 'Café conilon',
      fixo: { maoObra: 1500, adubacao: 3300, defensivo: 1100, biotec: 480, poda: 700, maquinas: 1600, combustivel: 560, energia: 300, material: 180 },
      porUnidade: { colheita: 85, posColheita: 34, embalagem: 7.5, frete: 22, beneficio: 6 },
      unidadeKg: 60, rendimento: 0.5,
      produtividadeRef: 45
    },
    cacau: {
      rotulo: 'Cacau',
      fixo: { maoObra: 1200, adubacao: 1900, defensivo: 620, biotec: 280, poda: 650, maquinas: 400, combustivel: 180, energia: 70, material: 110 },
      porUnidade: { colheita: 20.25, posColheita: 22, embalagem: 5, frete: 13, beneficio: 4 },
      unidadeKg: 15, rendimento: 1,
      produtividadeRef: 850
    }
  };
  function orc(produto) { return ORCAMENTO_HA[produto === 'cacau' ? 'cacau' : 'cafe_conilon']; }

  /* =====================================================================
   * CALENDÁRIO AGRÍCOLA (meses 1–12) E JANELAS DE SAFRA
   * =================================================================== */
  var CALENDARIO = {
    cafe_conilon: {
      adubacao: [10, 11, 1, 2, 4], corretivo: [7, 8], defensivo: [10, 11, 12, 1, 2, 3, 4, 5],
      biotec: [3, 9], poda: [6, 7], material: [10], colheita: [5, 6, 7, 8, 9, 10], venda: [9, 10, 11, 12, 1, 2]
    },
    cacau: {
      adubacao: [10, 11, 3, 4], corretivo: [7, 8], defensivo: [10, 11, 12, 1, 2, 3],
      biotec: [3, 9], poda: [6, 7], material: [11], colheita: [10, 11, 12, 1, 2, 3, 7, 8], venda: [8, 10, 11, 1, 2]
    }
  };
  var SAFRAS = {
    cafe_conilon: { rotulo: 'Safra 2026', de: '2026-05', ate: '2026-10' },
    cacau: { rotulo: 'Safra 2026/2027', de: '2026-07', ate: '2027-06' }
  };

  /* Volume efetivamente colhido, por talhão e mês.
     café: kg de café em coco (rendimento de 50% na secagem) · cacau: kg de amêndoa seca */
  var COLHEITA_PLANEJADA = {
    'T-01': { '2026-06': 2600, '2026-07': 4200, '2026-08': 4800, '2026-09': 4400, '2026-10': 1500 },
    'T-02': { '2026-06': 1800, '2026-07': 3200, '2026-08': 3600, '2026-09': 3000, '2026-10': 900 },
    'T-03': { '2025-10': 900, '2025-11': 1200, '2025-12': 1100, '2026-01': 800, '2026-02': 600, '2026-03': 500, '2026-07': 420, '2026-08': 480 },
    'T-04': { '2025-10': 700, '2025-11': 900, '2025-12': 820, '2026-01': 560, '2026-02': 430, '2026-03': 360, '2026-07': 230, '2026-08': 260 },
    'T-05': { '2026-05': 6000, '2026-06': 12000, '2026-07': 15000, '2026-08': 13000, '2026-09': 8000, '2026-10': 3000 },
    'T-06': { '2025-10': 1100, '2025-11': 1400, '2025-12': 1200, '2026-01': 800, '2026-02': 600, '2026-03': 500, '2026-07': 480, '2026-08': 560, '2026-09': 300, '2026-10': 200 }
  };

  /* =====================================================================
   * ESTOQUE: CATÁLOGO DE ITENS
   * =================================================================== */
  var ITENS_BASE = [
    { id: 'INS-01', nome: 'Ureia 45% N', categoria: 'INSUMO', unidade: 't', custo: 2900, minimo: 1.2, local: 'Galpão de insumos', conta: '4.1.01', fornecedor: 'Agro Insumos Cacoal' },
    { id: 'INS-02', nome: 'Cloreto de potássio (KCl)', categoria: 'INSUMO', unidade: 't', custo: 3400, minimo: 1.0, local: 'Galpão de insumos', conta: '4.1.01', fornecedor: 'Agro Insumos Cacoal' },
    { id: 'INS-03', nome: 'Sulfato de amônio', categoria: 'INSUMO', unidade: 't', custo: 1750, minimo: 0.8, local: 'Galpão de insumos', conta: '4.1.01', fornecedor: 'COOPRON — Coop. Agropecuária de Rondônia' },
    { id: 'INS-04', nome: 'Calcário dolomítico', categoria: 'INSUMO', unidade: 't', custo: 320, minimo: 6, local: 'Pátio de corretivos', conta: '4.1.01', fornecedor: 'Mineradora Rondônia' },
    { id: 'INS-05', nome: 'Micronutrientes (boro e zinco)', categoria: 'INSUMO', unidade: 'kg', custo: 22, minimo: 120, local: 'Galpão de insumos', conta: '4.1.01', fornecedor: 'Agro Insumos Cacoal' },
    { id: 'INS-06', nome: 'Fungicida cúprico', categoria: 'INSUMO', unidade: 'kg', custo: 42, minimo: 80, local: 'Depósito de defensivos', conta: '4.1.02', fornecedor: 'Defensivos Amazônia' },
    { id: 'INS-07', nome: 'Triazol + estrobilurina', categoria: 'INSUMO', unidade: 'L', custo: 168, minimo: 40, local: 'Depósito de defensivos', conta: '4.1.02', fornecedor: 'Defensivos Amazônia' },
    { id: 'INS-08', nome: 'Inseticida para broca', categoria: 'INSUMO', unidade: 'L', custo: 96, minimo: 25, local: 'Depósito de defensivos', conta: '4.1.02', fornecedor: 'Defensivos Amazônia' },
    { id: 'INS-09', nome: 'Óleo mineral agrícola', categoria: 'INSUMO', unidade: 'L', custo: 18, minimo: 100, local: 'Depósito de defensivos', conta: '4.1.02', fornecedor: 'Defensivos Amazônia' },
    { id: 'INS-10', nome: 'Biológico à base de Trichoderma', categoria: 'INSUMO', unidade: 'kg', custo: 68, minimo: 30, local: 'Depósito de defensivos', conta: '4.1.12', fornecedor: 'BioCacau Inoculantes' },
    { id: 'INS-11', nome: 'Mudas clonais de cacaueiro', categoria: 'INSUMO', unidade: 'un', custo: 9.5, minimo: 200, local: 'Viveiro', conta: '4.1.03', fornecedor: 'Viveiro CEPLAC' },
    { id: 'INS-12', nome: 'Adubo foliar', categoria: 'INSUMO', unidade: 'L', custo: 54, minimo: 40, local: 'Galpão de insumos', conta: '4.1.01', fornecedor: 'Agro Insumos Cacoal' },
    { id: 'INS-13', nome: 'Açúcar cristal e lecitina (agroindústria)', categoria: 'INSUMO', unidade: 'kg', custo: 6.2, minimo: 60, local: 'Cozinha de beneficiamento', conta: '4.1.09', fornecedor: 'Atacado Cacoal' },

    { id: 'EMB-01', nome: 'Saca de juta 60 kg', categoria: 'EMBALAGEM', unidade: 'un', custo: 7.5, minimo: 150, local: 'Barracão de beneficiamento', conta: '4.1.09', fornecedor: 'Sacaria Rondônia' },
    { id: 'EMB-02', nome: 'Big bag 1.000 kg', categoria: 'EMBALAGEM', unidade: 'un', custo: 42, minimo: 12, local: 'Barracão de beneficiamento', conta: '4.1.09', fornecedor: 'Sacaria Rondônia' },
    { id: 'EMB-03', nome: 'Etiqueta de lote com QR Code', categoria: 'EMBALAGEM', unidade: 'un', custo: 0.85, minimo: 400, local: 'Barracão de beneficiamento', conta: '4.1.09', fornecedor: 'Gráfica Cacoal' },

    { id: 'PRD-01', nome: 'Café conilon beneficiado (saca 60 kg)', categoria: 'PRODUTO', unidade: 'saca', custo: 0, minimo: 0, local: 'Armazém COOPRON', conta: null, fornecedor: null },
    { id: 'PRD-02', nome: 'Cacau seco fermentado (arroba 15 kg)', categoria: 'PRODUTO', unidade: 'arroba', custo: 0, minimo: 0, local: 'Casa de fermentação e terreiro', conta: null, fornecedor: null },
    { id: 'PRD-03', nome: 'Chocolate artesanal 70% (barra 90 g)', categoria: 'PRODUTO', unidade: 'un', custo: 0, minimo: 0, local: 'Cozinha de beneficiamento', conta: null, fornecedor: null }
  ];

  /* =====================================================================
   * PATRIMÔNIO — máquinas, veículos, benfeitorias e tecnologia
   * depreciaAno em %, horasAno para o custo/hora, valores de reposição
   * =================================================================== */
  var PATRIMONIO = {
    'U-01': [
      { id: 'AT-01', nome: 'Trator 75 cv 4x4', tipo: 'MAQUINA', valor: 145000, aquisicao: '2019-05-10', depreciaAno: 10, horasAno: 820, manutencaoAno: 8500, combustivelHora: 46, operadorHora: 32, uso: 'Preparo, trincha e transporte de carga' },
      { id: 'AT-02', nome: 'Microtrator 18 cv com carreta', tipo: 'MAQUINA', valor: 45000, aquisicao: '2021-08-02', depreciaAno: 12, horasAno: 540, manutencaoAno: 3000, combustivelHora: 14, operadorHora: 26, uso: 'Tratos culturais entre linhas' },
      { id: 'AT-03', nome: 'Pulverizador 600 L com barra', tipo: 'MAQUINA', valor: 30000, aquisicao: '2020-11-18', depreciaAno: 12, horasAno: 260, manutencaoAno: 1800, combustivelHora: 8, operadorHora: 26, uso: 'Aplicação de defensivos e foliares' },
      { id: 'AT-04', nome: 'Roçadeira e trincha', tipo: 'MAQUINA', valor: 18000, aquisicao: '2022-03-04', depreciaAno: 14, horasAno: 300, manutencaoAno: 1200, combustivelHora: 6, operadorHora: 26, uso: 'Roçada e manejo da cobertura' },
      { id: 'AT-05', nome: 'Caminhonete 4x4 (usada)', tipo: 'VEICULO', valor: 120000, aquisicao: '2021-01-22', depreciaAno: 10, horasAno: 1200, manutencaoAno: 9500, combustivelHora: 38, operadorHora: 0, uso: 'Logística, feira e visitas técnicas' },
      { id: 'AT-06', nome: 'Secador rotativo de café', tipo: 'BENFEITORIA', valor: 90000, aquisicao: '2018-06-30', depreciaAno: 8, horasAno: 700, manutencaoAno: 3600, combustivelHora: 0, operadorHora: 24, uso: 'Secagem de 700 sacas por safra' },
      { id: 'AT-07', nome: 'Terreiro suspenso e casa de fermentação', tipo: 'BENFEITORIA', valor: 70000, aquisicao: '2020-04-15', depreciaAno: 6, horasAno: 0, manutencaoAno: 2400, combustivelHora: 0, operadorHora: 0, uso: 'Fermentação e secagem do cacau' },
      { id: 'AT-08', nome: 'Irrigação por gotejamento (3,2 ha)', tipo: 'BENFEITORIA', valor: 60000, aquisicao: '2019-09-12', depreciaAno: 10, horasAno: 1600, manutencaoAno: 2800, combustivelHora: 0, operadorHora: 0, uso: 'Talhão Alto irrigado' },
      { id: 'AT-09', nome: 'Batedor e classificador de café', tipo: 'MAQUINA', valor: 40000, aquisicao: '2022-07-08', depreciaAno: 10, horasAno: 420, manutencaoAno: 2400, combustivelHora: 0, operadorHora: 24, uso: 'Beneficiamento e classificação por peneira' },
      { id: 'AT-10', nome: 'Nó de sensores LoRaWAN e gateway', tipo: 'TECNOLOGIA', valor: 28500, aquisicao: '2025-10-01', depreciaAno: 20, horasAno: 8760, manutencaoAno: 1200, combustivelHora: 0, operadorHora: 0, uso: 'Solo, clima, molhamento e fermentação' }
    ],
    'U-02': [
      { id: 'BT-01', nome: 'Trator 85 cv 4x4', tipo: 'MAQUINA', valor: 210000, aquisicao: '2018-10-05', depreciaAno: 10, horasAno: 900, manutencaoAno: 10400, combustivelHora: 52, operadorHora: 32, uso: 'Preparo, trincha e colheita' },
      { id: 'BT-02', nome: 'Pivô central (8 ha)', tipo: 'BENFEITORIA', valor: 168000, aquisicao: '2017-07-20', depreciaAno: 10, horasAno: 2200, manutencaoAno: 7800, combustivelHora: 0, operadorHora: 0, uso: 'Irrigação do Talhão Santa Luzia' },
      { id: 'BT-03', nome: 'Secador rotativo e terreiro', tipo: 'BENFEITORIA', valor: 112000, aquisicao: '2019-03-14', depreciaAno: 8, horasAno: 780, manutencaoAno: 4600, combustivelHora: 0, operadorHora: 24, uso: 'Secagem de café e cacau' },
      { id: 'BT-04', nome: 'Caminhonete 4x4', tipo: 'VEICULO', valor: 130000, aquisicao: '2022-02-11', depreciaAno: 10, horasAno: 1100, manutencaoAno: 9200, combustivelHora: 36, operadorHora: 0, uso: 'Logística e comercialização' },
      { id: 'BT-05', nome: 'Pulverizador 800 L', tipo: 'MAQUINA', valor: 46000, aquisicao: '2021-06-09', depreciaAno: 12, horasAno: 300, manutencaoAno: 2200, combustivelHora: 9, operadorHora: 26, uso: 'Aplicações nos dois cultivos' },
      { id: 'BT-06', nome: 'Descascador e classificador de café', tipo: 'MAQUINA', valor: 62000, aquisicao: '2020-08-27', depreciaAno: 10, horasAno: 460, manutencaoAno: 3200, combustivelHora: 0, operadorHora: 24, uso: 'Beneficiamento próprio' },
      { id: 'BT-07', nome: 'Nó de sensores LoRaWAN', tipo: 'TECNOLOGIA', valor: 21600, aquisicao: '2025-11-20', depreciaAno: 20, horasAno: 8760, manutencaoAno: 900, combustivelHora: 0, operadorHora: 0, uso: 'Solo, clima e fermentação' }
    ]
  };

  /* =====================================================================
   * PESSOAS — folha fixa e equipes de diaristas
   * =================================================================== */
  var PESSOAS = {
    'U-01': [
      { id: 'P-01', nome: 'Antônio Ferreira', funcao: 'Encarregado de campo e aplicações', vinculo: 'FIXO', salario: 2500, desde: '2019-03-01', nr31: '2025-04-10' },
      { id: 'P-02', nome: 'Joana Alves', funcao: 'Beneficiamento, torra e chocolate', vinculo: 'FIXO', salario: 2200, desde: '2021-08-16', nr31: '2025-06-22' },
      { id: 'P-03', nome: 'Equipe de colheita (6 pessoas)', funcao: 'Diaristas de colheita', vinculo: 'DIARIA', salario: 0, desde: '2026-06-01', nr31: '2026-05-20' },
      { id: 'P-04', nome: 'Equipe de pós-colheita (2 pessoas)', funcao: 'Diaristas de secagem e fermentação', vinculo: 'DIARIA', salario: 0, desde: '2026-06-01', nr31: '2026-05-20' }
    ],
    'U-02': [
      { id: 'Q-01', nome: 'Sérgio Bastos', funcao: 'Encarregado geral e irrigação', vinculo: 'FIXO', salario: 2500, desde: '2017-02-01', nr31: '2025-03-18' },
      { id: 'Q-02', nome: 'Eliane Costa', funcao: 'Administrativo e classificação', vinculo: 'FIXO', salario: 2100, desde: '2020-09-14', nr31: '2026-06-09' },
      { id: 'Q-03', nome: 'Equipe de colheita (9 pessoas)', funcao: 'Diaristas de colheita', vinculo: 'DIARIA', salario: 0, desde: '2026-05-15', nr31: '2026-04-28' },
      { id: 'Q-04', nome: 'Quebra-cacau (4 pessoas)', funcao: 'Diaristas de quebra e fermentação', vinculo: 'DIARIA', salario: 0, desde: '2026-01-10', nr31: '2026-01-08' }
    ]
  };
  var ENCARGOS = 0.34;
  var DIARIA = 130;
  var SALDO_CAIXA_INICIAL = { 'U-01': 96000, 'U-02': 132000 };

  /* =====================================================================
   * PLANO DE VENDAS — o que foi vendido, quando, para quem e de qual lote.
   * Vendas com "lote" usam o PREÇO AJUSTADO PELA QUALIDADE que a IA calcula
   * para aquele lote; vendas antigas usam a cotação do dia com fator de tipo.
   * =================================================================== */
  var PLANO_VENDAS = {
    /* U-01 — 6,5 ha de café e 8 ha de cacau */
    'U-01|2025-11|cafe_conilon': { qtd: 90, tipo: 0.97, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-01|2025-12|cafe_conilon': { qtd: 70, tipo: 0.99, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-01|2026-01|cafe_conilon': { qtd: 78, tipo: 0.98, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-01|2026-02|cafe_conilon': { qtd: 60, tipo: 1.0, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-01|2026-09|cafe_conilon': { qtd: 62, lote: 'L-2026-0142', prazoDias: 60, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', escrow: true, contrato: 'CT-2026-0042' },
    'U-01|2026-10|cafe_conilon': { qtd: 100, lote: 'L-2026-0143', prazoDias: 30, cliente: 'Torrefação Alta Mogiana S.A.', observacao: 'entrega após conclusão da secagem' },
    'U-01|2025-11|cacau': { qtd: 96, tipo: 0.94, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-01|2026-01|cacau': { qtd: 118, tipo: 0.95, prazoDias: 30, cliente: 'Corretora Cacau Amazônia', recebido: true },
    'U-01|2026-02|cacau': { qtd: 92, tipo: 0.96, prazoDias: 30, cliente: 'Corretora Cacau Amazônia', recebido: true },
    'U-01|2026-08|cacau': { qtd: 32, lote: 'L-2026-0088', prazoDias: 30, cliente: 'Chocolate Amazônia Bean-to-Bar', escrow: true, contrato: 'CT-2026-0039' },

    /* U-02 — 8 ha de café irrigado e 6 ha de cacau */
    'U-02|2025-11|cafe_conilon': { qtd: 180, tipo: 0.98, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-02|2026-01|cafe_conilon': { qtd: 150, tipo: 0.99, prazoDias: 30, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', recebido: true },
    'U-02|2026-09|cafe_conilon': { qtd: 150, lote: 'L-2026-0139', prazoDias: 60, cliente: 'COOPRON — Coop. Agropecuária de Rondônia', escrow: true, contrato: 'CT-2026-0043' },
    'U-02|2026-10|cafe_conilon': { qtd: 60, tipo: 1.0, prazoDias: 30, cliente: 'Torrefação Alta Mogiana S.A.' },
    'U-02|2025-12|cacau': { qtd: 126, tipo: 0.95, prazoDias: 30, cliente: 'Corretora Cacau Amazônia', recebido: true },
    'U-02|2026-02|cacau': { qtd: 110, tipo: 0.96, prazoDias: 30, cliente: 'Corretora Cacau Amazônia', recebido: true },
    'U-02|2026-08|cacau': { qtd: 84, lote: 'L-2026-0091', prazoDias: 30, cliente: 'Chocolate Amazônia Bean-to-Bar', escrow: true, contrato: 'CT-2026-0040' }
  };

  /* =====================================================================
   * UTILIDADES
   * =================================================================== */
  function mes(a, m) { return a + '-' + String(m).padStart(2, '0'); }
  function ultimoDia(a, m) { return new Date(a, m, 0).getDate(); }
  function arred(v, d) { var f = Math.pow(10, d === undefined ? 2 : d); return Math.round(v * f) / f; }
  function soma(arr, f) { return arr.reduce(function (a, b) { return a + f(b); }, 0); }
  function addDias(iso, n) { return new Date(new Date(iso + 'T12:00:00-04:00').getTime() + n * 86400000).toISOString().slice(0, 10); }
  function usuario(id) { return D.usuarios.filter(function (u) { return u.id === id; })[0] || null; }
  function nomeUsuario(id) { var u = usuario(id); return u ? u.nome : id; }
  function nomeOrg(id) { var u = usuario(id); return u ? (u.org || u.nome) : id; }

  /* Últimos 12 meses, terminando no mês corrente (mês em curso é parcial) */
  function mesesHistorico() {
    var lista = [], d = new Date(HOJE.getFullYear(), HOJE.getMonth(), 1);
    for (var i = 11; i >= 0; i--) {
      var x = new Date(d.getFullYear(), d.getMonth() - i, 1);
      lista.push(mes(x.getFullYear(), x.getMonth() + 1));
    }
    return lista;
  }
  function mesCorrente() { return HOJE.toISOString().slice(0, 7); }
  function dentroDaData(iso) { return new Date(iso + 'T12:00:00-04:00') <= HOJE; }

  /* =====================================================================
   * GERAÇÃO DA BASE
   * =================================================================== */
  /* A cadeia precisa estar montada antes de receber os eventos do ERP */
  function garantirCadeia() {
    if (global.Ledger && !global.Ledger.blocos()) global.Ledger.iniciar();
  }

  function baseVazia() {
    return {
      geradoEm: HOJE.toISOString(), planoContas: CONTAS.slice(),
      lancamentos: [], titulos: [], itens: [], movimentos: [], producao: [],
      patrimonio: [], pessoas: [], folha: [], orcamento: [], ancoragens: [],
      ultimoFechamento: null, sincronizadoEscrow: [], sequencia: { LC: 0, TP: 0, TR: 0, MV: 0, FP: 0 }
    };
  }
  var _seq = { LC: 0, TP: 0, TR: 0, MV: 0, FP: 0 };
  function novoId(tipo) { _seq[tipo] = (_seq[tipo] || 0) + 1; return tipo + '-' + _seq[tipo]; }
  function sincronizarSeq(erp) {
    erp.lancamentos.forEach(function (l) { var n = Number(l.id.split('-')[1]); if (n > _seq.LC) _seq.LC = n; });
    erp.titulos.forEach(function (t) { var k = t.tipo === 'PAGAR' ? 'TP' : 'TR'; var n = Number(t.id.split('-')[1]); if (n > _seq[k]) _seq[k] = n; });
    erp.movimentos.forEach(function (m) { var n = Number(m.id.split('-')[1]); if (n > _seq.MV) _seq.MV = n; });
    erp.folha.forEach(function (f) { var n = Number(f.id.split('-')[1]); if (n > _seq.FP) _seq.FP = n; });
  }

  function lancar(erp, dados) {
    var l = {
      id: novoId('LC'), data: dados.data, conta: dados.conta,
      descricao: dados.descricao, valor: arred(dados.valor, 2),
      tipo: grupoDa(dados.conta) === 'RECEITA' ? 'RECEITA'
        : grupoDa(dados.conta) === 'DESPESA' ? 'DESPESA'
        : grupoDa(dados.conta) === 'INVESTIMENTO' ? 'INVESTIMENTO'
        : (grupoDa(dados.conta) === 'ATIVO' || grupoDa(dados.conta) === 'PASSIVO') ? 'BALANCO' : 'CUSTO',
      centro: dados.centro || 'ADM', talhao: dados.talhao || null, produtor: dados.produtor,
      origem: dados.origem || 'MANUAL', safra: dados.safra || Number(dados.data.slice(0, 4)),
      documento: dados.documento || null, lote: dados.lote || null,
      quantidade: dados.quantidade || null, precoUnitario: dados.precoUnitario || null,
      contaNome: nomeConta(dados.conta)
    };
    erp.lancamentos.push(l);
    return l;
  }

  /* ------------------------------------------------------------------
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

  function gerarPropriedade(erp, produtorId, semente) {
    var rnd = Dados.rnd(semente);
    var talhoes = D.talhoes.filter(function (t) { return t.produtor === produtorId; });
    var meses = mesesHistorico();
    /* vendas de lote rastreado: a baixa no estoque é feita depois da entrada da
       produção, para que o custo médio do estoque esteja formado */
    var pendentesVenda = [];

    /* ---------- estoque de insumos e embalagens com saldo inicial ---------- */
    ITENS_BASE.forEach(function (it) {
      var item = {
        id: produtorId + '-' + it.id, codigo: it.id, nome: it.nome, categoria: it.categoria,
        unidade: it.unidade, custoMedio: it.custo, minimo: it.minimo, local: it.local,
        conta: it.conta, fornecedor: it.fornecedor, produtor: produtorId,
        saldo: it.categoria === 'PRODUTO' ? 0 : arred(it.minimo * (0.6 + rnd() * 1.1), it.unidade === 'un' ? 0 : 2)
      };
      erp.itens.push(item);
      if (it.categoria !== 'PRODUTO' && item.saldo > 0) {
        var valor = arred(item.saldo * it.custo, 2);
        var doc = 'NF ' + (1000 + Math.round(rnd() * 8000));
        erp.movimentos.push({
          id: novoId('MV'), data: meses[0] + '-03', item: item.id, itemNome: it.nome, categoria: it.categoria,
          tipo: 'ENTRADA', qtd: item.saldo, custoUnit: it.custo, valor: valor, saldoApos: item.saldo,
          motivo: 'Estoque inicial do período', produtor: produtorId, documento: doc
        });
        lancar(erp, {
          data: meses[0] + '-03', conta: '1.1.02', descricao: 'Formação do estoque inicial: ' + it.nome + ' (' + item.saldo + ' ' + item.unidade + ')',
          valor: valor, centro: 'ESTOQUE', produtor: produtorId, origem: 'COMPRA', documento: doc
        });
      }
    });

    /* ---------- produção, custos e receitas, mês a mês ---------- */
    meses.forEach(function (mm) {
      var ano = Number(mm.slice(0, 4)), m = Number(mm.slice(5, 7));
      var ultimo = ultimoDia(ano, m);
      function dia(d) { return mm + '-' + String(Math.min(d, ultimo)).padStart(2, '0'); }

      talhoes.forEach(function (t) {
        var o = orc(t.produto), cal = CALENDARIO[t.produto === 'cacau' ? 'cacau' : 'cafe_conilon'];
        var area = t.area, produto = t.produto === 'cacau' ? 'cacau' : 'cafe_conilon';
        function custo(codigo, valor, descricao, origem) {
          if (!(valor > 0) || !dentroDaData(dia(14))) return;
          lancar(erp, {
            data: dia(6 + Math.round(rnd() * 18)), conta: codigo, descricao: descricao, valor: valor,
            centro: t.id, talhao: t.id, produtor: produtorId, origem: origem || 'MANUAL', safra: ano
          });
        }
        /* custos fixos rateados nos 12 meses */
        custo('4.1.04', o.fixo.maoObra * area / 12, 'Mão de obra de tratos culturais');
        custo('4.1.06', o.fixo.maquinas * area / 12, 'Serviço de máquinas e implementos');
        custo('4.1.07', o.fixo.combustivel * area / 12, 'Combustível de tratores e implementos');
        var irrigado = t.sistema.toLowerCase().indexOf('irrigado') >= 0 || t.sistema.toLowerCase().indexOf('pivô') >= 0 || t.sistema.toLowerCase().indexOf('irrigação') >= 0;
        var fatorEnergia = irrigado ? ((m >= 6 && m <= 9) ? 1.9 : 0.75) : 0.3;
        custo('4.1.08', o.fixo.energia * area / 12 * fatorEnergia, irrigado ? 'Energia elétrica da irrigação (' + t.sistema + ')' : 'Energia de apoio, oficina e bombeamento');
        /* poda e limpeza, que são serviço e não insumo */
        if (cal.poda.indexOf(m) >= 0) custo('4.1.04', o.fixo.poda * area / cal.poda.length, 'Poda, desbrota e limpeza da lavoura');
        /* Adubação, defensivo, biológico, mudas e embalagens NÃO entram aqui:
           saem do estoque como movimentação com custo médio (bloco abaixo). */

        /* colheita: volume registrado na cadeia gera custo de colheita, pós-colheita e frete */
        var volume = (COLHEITA_PLANEJADA[t.id] || {})[mm];
        if (volume && cal.colheita.indexOf(m) >= 0) {
          var unidades = arred(volume / o.unidadeKg * o.rendimento, 2);
          custo('4.1.05', volume * (produto === 'cacau' ? o.porUnidade.colheita * 15 / 15 : o.porUnidade.colheita / o.unidadeKg * o.rendimento) * 0 + unidades * o.porUnidade.colheita, produto === 'cacau' ? 'Colheita e quebra de cacau (' + volume + ' kg colhidos)' : 'Colheita e derriça de café (' + volume + ' kg em coco)');
          custo('4.1.10', unidades * o.porUnidade.posColheita, produto === 'cacau' ? 'Fermentação, secagem e classificação' : 'Secagem, benefício e classificação');
          custo('4.1.06', unidades * o.porUnidade.beneficio, 'Processamento mecânico e classificação por peneira');
          erp.producao.push({
            produtor: produtorId, talhao: t.id, produto: produto, mes: mm, volumeKg: volume,
            unidades: unidades, tipo: produto === 'cacau' ? 'cacau_seco' : 'cafe_coco', safra: SAFRAS[produto].rotulo
          });
        }
      });

      /* ---------- folha fixa ---------- */
      var fixos = PESSOAS[produtorId].filter(function (x) { return x.vinculo === 'FIXO'; });
      var bruto = soma(fixos, function (x) { return x.salario; }) * (1 + (m === 12 ? 1 / 12 : 0));
      if (dentroDaData(dia(5))) {
        lancar(erp, {
          data: dia(5), conta: '4.1.04', descricao: 'Folha fixa e encargos (' + fixos.length + ' pessoas, ' + arred(ENCARGOS * 100, 0) + '% de encargos)',
          valor: bruto * (1 + ENCARGOS), centro: 'ADM', produtor: produtorId, origem: 'FOLHA', safra: ano
        });
        erp.folha.push({
          id: novoId('FP'), competencia: mm, produtor: produtorId,
          itens: fixos.map(function (x) {
            var extra = m === 12 ? arred(x.salario / 12, 2) : 0;
            return { pessoa: x.id, nome: x.nome, funcao: x.funcao, bruto: x.salario, decimo: extra, liquido: arred((x.salario + extra) * 0.88, 2) };
          }),
          bruto: arred(bruto, 2), encargos: arred(bruto * ENCARGOS, 2),
          lancamento: 'LC-' + _seq.LC, status: mm === mesCorrente() ? 'ABERTA' : 'PAGA'
        });
      }

      /* ---------- insumos e embalagens: reposição e baixa no mês ---------- */
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
              data: dia(4), conta: '1.1.02', descricao: 'Compra de ' + item.nome + ' (' + qtdCompra + ' ' + item.unidade + ') de ' + item.fornecedor + ' — entrada em estoque',
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
          /* dentro do mês corrente, a baixa é datada no dia de hoje */
          var dataBaixa = dia(10 + (k % 12));
          var hojeISO = HOJE.toISOString().slice(0, 10);
          if (dataBaixa > hojeISO) dataBaixa = hojeISO;
          var qtd = arred(Math.min(a.valor, item.saldo * item.custoMedio) / item.custoMedio, item.unidade === 'un' ? 0 : 3);
          if (!(qtd > 0)) return;
          var valor = arred(qtd * item.custoMedio, 2);
          item.saldo = arred(item.saldo - qtd, 3);
          erp.movimentos.push({
            id: novoId('MV'), data: dataBaixa, item: item.id, itemNome: item.nome, categoria: item.categoria,
            tipo: 'SAIDA', qtd: qtd, custoUnit: item.custoMedio, valor: valor, saldoApos: item.saldo,
            talhao: a.talhao, motivo: a.motivo + (a.talhaoNome ? ' — ' + a.talhaoNome : ''),
            produtor: produtorId, documento: 'OS ' + (300 + _seq.MV), safra: ano
          });
          lancar(erp, {
            data: dataBaixa, conta: item.conta,
            descricao: a.motivo + ' — baixa de ' + item.nome + ' (' + arred(qtd, 2) + ' ' + item.unidade + ')',
            valor: valor, centro: a.talhao || 'BENEFICIAMENTO', talhao: a.talhao || null,
            produtor: produtorId, origem: 'ESTOQUE', safra: ano, documento: 'OS ' + (300 + _seq.MV)
          });
        });
        /* alerta de estoque: repõe no mês seguinte se ficou abaixo do mínimo */
      });

      /* ---------- despesas administrativas, tecnologia e juros ---------- */
      if (dentroDaData(dia(10))) {
        lancar(erp, {
          data: dia(10), conta: '5.1.01', descricao: 'Contabilidade, internet rural e despesas administrativas',
          valor: (produtorId === 'U-01' ? 1250 : 1500) * (0.92 + rnd() * 0.16), centro: 'ADM', produtor: produtorId
        });
        lancar(erp, {
          data: dia(10), conta: '5.1.07', descricao: 'Plano de dados do gateway, plataforma AgroChain e manutenção dos sensores',
          valor: produtorId === 'U-01' ? 480 : 420, centro: 'ADM', produtor: produtorId
        });
        lancar(erp, {
          data: dia(12), conta: '5.1.05', descricao: 'Juros e tarifas do custeio bancário da safra',
          valor: (produtorId === 'U-01' ? 1000 : 1150) * (0.88 + rnd() * 0.24), centro: 'ADM', produtor: produtorId
        });
      }
      var pat = PATRIMONIO[produtorId];
      if ([4, 10].indexOf(m) >= 0 && dentroDaData(dia(20))) {
        lancar(erp, {
          data: dia(20), conta: '5.1.03', descricao: 'Manutenção preventiva de máquinas, veículos e benfeitorias',
          valor: soma(pat, function (x) { return x.manutencaoAno; }) / 2, centro: 'ADM', produtor: produtorId
        });
      }
      if (m === 8 && dentroDaData(dia(25))) {
        lancar(erp, { data: dia(25), conta: '5.1.06', descricao: 'Auditoria de certificação, laudos de qualidade e taxa do selo', valor: produtorId === 'U-01' ? 4200 : 3800, centro: 'ADM', produtor: produtorId });
        lancar(erp, { data: dia(26), conta: '5.1.08', descricao: 'Treinamento NR-31, reciclagem de aplicadores e EPI', valor: 1850, centro: 'ADM', produtor: produtorId });
      }
      if (m === 9 && dentroDaData(dia(30))) {
        lancar(erp, { data: dia(28), conta: '5.1.02', descricao: 'ITR, Funrural, contribuição sindical e taxas ambientais', valor: produtorId === 'U-01' ? 5400 : 6100, centro: 'ADM', produtor: produtorId });
      }
      if (dentroDaData(dia(28))) {
        lancar(erp, {
          data: dia(28), conta: '5.1.04', descricao: 'Depreciação de máquinas, benfeitorias e tecnologia',
          valor: soma(pat, function (x) { return x.valor * (x.depreciaAno / 100); }) / 12,
          centro: 'ADM', produtor: produtorId, origem: 'DEPRECIACAO'
        });
      }

      /* ---------- agroindústria própria (torra e chocolate) ---------- */
      if (produtorId === 'U-01' && dentroDaData(dia(18))) {
        lancar(erp, {
          data: dia(18), conta: '3.1.03', descricao: 'Venda de torra própria, nibs e barras de chocolate 70% para lojas de Cacoal e feira regional',
          valor: 2400, centro: 'BENEFICIAMENTO', produtor: produtorId, origem: 'VENDA'
        });
        lancar(erp, {
          data: dia(18), conta: '4.1.09', descricao: 'Insumos e embalagens da agroindústria (açúcar, lecitina, rótulos)',
          valor: 620, centro: 'BENEFICIAMENTO', produtor: produtorId
        });
      }

      /* ---------- vendas do plano ---------- */
      ['cafe_conilon', 'cacau'].forEach(function (produto) {
        var chave = produtorId + '|' + mm + '|' + produto;
        var plano = PLANO_VENDAS[chave];
        if (!plano || !dentroDaData(dia(22))) return;
        var ehCafeVenda = produto === 'cafe_conilon';
        var fatorVenda = ehCafeVenda ? 1 : 15;               /* arroba de 15 kg */
        var base = arred(Dados.precoAtual(produto) * fatorVenda, 2);
        var preco, origemPreco;
        if (plano.lote) {
          var lote = Dados.lote(plano.lote);
          var ajuste = lote ? IA.precoAjustado(lote) : null;
          preco = ajuste ? arred(ajuste.ajustado * fatorVenda, 2) : base;
          origemPreco = ajuste ? 'preço ajustado pela qualidade do lote (nota ' + ajuste.score + ', ' + (ajuste.ajustePct > 0 ? '+' : '') + ajuste.ajustePct + '% sobre a cotação)' : 'cotação do dia';
        } else {
          preco = arred(base * (plano.tipo || 1), 2);
          origemPreco = 'cotação do dia ajustada pelo tipo (' + arred((plano.tipo || 1) * 100, 0) + '%)';
        }
        var valor = arred(plano.qtd * preco, 2);
        var ehCafe = ehCafeVenda;
        var doc = 'NF ' + (4000 + _seq.LC);

        var tit = {
          id: novoId('TR'), tipo: 'RECEBER', contraparte: plano.cliente,
          descricao: 'Venda de ' + plano.qtd + ' ' + (ehCafe ? 'sacas de café' : 'arrobas de cacau') + (plano.lote ? ' (lote ' + plano.lote + ')' : ''),
          valor: valor, emissao: dia(22), vencimento: addDias(dia(22), plano.prazoDias),
          status: plano.recebido ? 'RECEBIDO' : (addDias(dia(22), plano.prazoDias) < HOJE.toISOString().slice(0, 10) ? 'VENCIDO' : 'ABERTO'),
          produtor: produtorId, origem: plano.escrow ? 'ESCROW' : 'VENDA', lote: plano.lote || null,
          contrato: plano.contrato || null, documento: doc,
          banco: plano.escrow ? 'Conta escrow do consórcio' : null
        };
        erp.titulos.push(tit);

        lancar(erp, {
          data: dia(22), conta: ehCafe ? '3.1.01' : '3.1.02',
          descricao: 'Venda de ' + plano.qtd + ' ' + (ehCafe ? 'sacas de café conilon' : 'arrobas de cacau') +
            ' a R$ ' + preco + '/' + (ehCafe ? 'saca' : 'arroba') + ' para ' + plano.cliente + (plano.observacao ? ' — ' + plano.observacao : ''),
          valor: valor, centro: 'COMERCIALIZACAO', produtor: produtorId,
          origem: plano.escrow ? 'ESCROW' : 'VENDA', quantidade: plano.qtd, precoUnitario: preco,
          lote: plano.lote || null, documento: doc
        });
        /* tributos sobre a venda: Funrural e contribuições */
        var aliquota = ehCafe ? 0.023 : 0.017;
        lancar(erp, {
          data: dia(22), conta: '3.2.01', descricao: 'Tributos sobre a venda (' + arred(aliquota * 100, 1) + '% — Funrural e contribuições)',
          valor: valor * aliquota, centro: 'COMERCIALIZACAO', produtor: produtorId, origem: 'VENDA'
        });
        /* frete da carga */
        lancar(erp, {
          data: addDias(dia(22), 2), conta: '4.1.11', descricao: 'Frete e transporte da carga para ' + plano.cliente,
          valor: valor * 0.021, centro: 'COMERCIALIZACAO', produtor: produtorId, origem: 'VENDA'
        });
        /* A baixa do produto acabado só acontece para venda de lote rastreado,
           e é processada depois da entrada da produção (bloco dos lotes), para
           que o custo médio do estoque esteja formado. Vendas de safras
           anteriores já saíram do estoque antes do período do ERP. */
        if (plano.lote) {
          pendentesVenda.push({
            data: dia(22), lote: plano.lote, qtd: plano.qtd, preco: preco, cliente: plano.cliente,
            documento: doc, codigoItem: ehCafe ? 'PRD-01' : 'PRD-02', unidade: ehCafe ? 'saca' : 'arroba'
          });
        }
      });
    });

    /* ---------- estoque de produto a partir dos lotes rastreáveis ---------- */
    D.lotes.filter(function (l) { return l.produtor === produtorId; }).forEach(function (l) {
      var ehCafe = l.produto === 'cafe_conilon';
      var item = erp.itens.filter(function (i) {
        return i.produtor === produtorId && i.codigo === (ehCafe ? 'PRD-01' : 'PRD-02');
      })[0];
      if (!item) return;
      var custoUnit = custoUnitarioDoTalhao(erp, produtorId, l.talhao);
      var anterior = item.saldo;
      item.saldo = arred(item.saldo + l.quantidade, 2);
      item.custoMedio = item.saldo > 0 ? arred((item.custoMedio * anterior + custoUnit * l.quantidade) / item.saldo, 2) : custoUnit;
      erp.movimentos.push({
        id: novoId('MV'), data: l.dataColheita, item: item.id, itemNome: item.nome, categoria: 'PRODUTO',
        tipo: 'ENTRADA', qtd: l.quantidade, custoUnit: custoUnit, valor: arred(l.quantidade * custoUnit, 2),
        saldoApos: item.saldo, motivo: 'Produção do lote ' + l.id + ' (' + Dados.talhao(l.talhao).nome + ')',
        produtor: produtorId, documento: l.id, lote: l.id
      });
      /* consumo próprio: sai do estoque e vira receita imputada (não passa pelo caixa) */
      if (l.destino === 'consumo_proprio') {
        var ajuste = IA.precoAjustado(l);
        item.saldo = arred(item.saldo - l.quantidade, 2);
        erp.movimentos.push({
          id: novoId('MV'), data: l.dataColheita, item: item.id, itemNome: item.nome, categoria: 'PRODUTO',
          tipo: 'SAIDA', qtd: l.quantidade, custoUnit: custoUnit, valor: arred(l.quantidade * custoUnit, 2),
          saldoApos: item.saldo, motivo: 'Consumo próprio — torra, chocolate e sementes', produtor: produtorId, documento: l.id, lote: l.id
        });
        lancar(erp, {
          data: addDias(l.dataColheita, 30), conta: '3.1.06',
          descricao: 'Consumo próprio do lote ' + l.id + ' (' + l.quantidade + ' ' + l.unidade + ') valorado ao preço ajustado pela qualidade — não entra no caixa',
          valor: l.quantidade * ajuste.ajustado, centro: 'BENEFICIAMENTO', produtor: produtorId, origem: 'CONSUMO', safra: Number(l.dataColheita.slice(0, 4))
        });
      }
    });

    /* ---------- baixa das vendas de lote rastreado, em ordem cronológica ---------- */
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

    /* ---------- mínimo de estoque calibrado pelo consumo médio real ---------- */
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
    PATRIMONIO[produtorId].forEach(function (p) { erp.patrimonio.push(Object.assign({}, p, { produtor: produtorId })); });
    PESSOAS[produtorId].forEach(function (p) { erp.pessoas.push(Object.assign({}, p, { produtor: produtorId })); });

    /* Orçamento do ano: parte do histórico anualizado e aplica metas explícitas */
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
    });
  }

  /* Custo por unidade produzida no talhão — usado como custo de entrada do lote */
  function custoUnitarioDoTalhao(erp, produtorId, talhaoId) {
    var talhao = Dados.talhao(talhaoId);
    if (!talhao) return 0;
    var o = orc(talhao.produto);
    var custos = erp.lancamentos.filter(function (l) { return l.produtor === produtorId && l.talhao === talhaoId && l.tipo === 'CUSTO'; });
    var producao = erp.producao.filter(function (p) { return p.produtor === produtorId && p.talhao === talhaoId; });
    var unidades = soma(producao, function (p) { return p.unidades || 0; });
    var direto = soma(custos, function (l) { return l.valor; });
    var adm = soma(erp.lancamentos.filter(function (l) {
      return l.produtor === produtorId && !l.talhao && l.centro === 'ADM' &&
        (l.tipo === 'CUSTO' || l.tipo === 'DESPESA');
    }), function (l) { return l.valor; });
    var areaTotal = soma(D.talhoes.filter(function (t) { return t.produtor === produtorId; }), function (t) { return t.area; });
    var rateio = areaTotal ? adm * (talhao.area / areaTotal) : 0;
    if (!(unidades > 0)) return talhao.produto === 'cacau' ? 380 : 620;
    return arred((direto + rateio) / unidades, 2);
  }

  /* =====================================================================
   * INICIALIZAÇÃO E ESCOPO
   * =================================================================== */
  function iniciar(forcar) {
    if (!D.erp || forcar) {
      D.erp = baseVazia();
      _seq = { LC: 0, TP: 0, TR: 0, MV: 0, FP: 0 };
      gerarPropriedade(D.erp, 'U-01', 20261006);
      gerarPropriedade(D.erp, 'U-02', 20261007);
      sincronizarSeq(D.erp);
    }
    return D.erp;
  }
  function reiniciar() { return iniciar(true); }
  function erp() { if (!D.erp) iniciar(); return D.erp; }

  function escopo(usuarioId) {
    var u = usuario(usuarioId);
    if (!u) return { tipo: 'PROPRIO', produtores: ['U-01'], podeEditar: false, usuario: null };
    if (u.papel === 'produtor') return { tipo: 'PROPRIO', produtores: [u.id], podeEditar: true, usuario: u };
    return {
      tipo: 'CONSORCIO', produtores: PRODUTORES.concat([u.id]), podeEditar: false, usuario: u,
      rotulo: (u.org || u.nome) + ' — visão consolidada das propriedades do consórcio e da posição do próprio perfil'
    };
  }
  function escopoAtual() { return escopo(usuarioAtual()); }
  function usuarioAtual() { return (global.App && global.App.usuario) || 'U-01'; }
  function produtoresDe(opts) { return (opts && opts.produtores) || escopoAtual().produtores; }

  function lancamentos(opts) {
    opts = opts || {};
    var ps = produtoresDe(opts);
    return erp().lancamentos.filter(function (l) {
      if (ps.indexOf(l.produtor) < 0) return false;
      if (opts.de && l.data < opts.de) return false;
      if (opts.ate && l.data > opts.ate) return false;
      if (opts.talhao && l.talhao !== opts.talhao) return false;
      if (opts.tipo && l.tipo !== opts.tipo) return false;
      if (opts.conta && l.conta !== opts.conta) return false;
      return true;
    }).sort(function (a, b) { return a.data < b.data ? -1 : a.data > b.data ? 1 : 0; });
  }
  function titulos(opts) {
    opts = opts || {};
    var ps = produtoresDe(opts);
    return erp().titulos.filter(function (t) {
      if (ps.indexOf(t.produtor) < 0) return false;
      if (opts.tipo && t.tipo !== opts.tipo) return false;
      if (opts.status && t.status !== opts.status) return false;
      return true;
    });
  }

  /* =====================================================================
   * DRE — DEMONSTRATIVO DE RESULTADO
   * =================================================================== */
  function dre(opts) {
    opts = opts || {};
    var ls = lancamentos(opts);
    if (opts.mes) ls = ls.filter(function (l) { return l.data.slice(0, 7) === opts.mes; });
    else if (opts.ano) ls = ls.filter(function (l) { return l.data.slice(0, 4) === String(opts.ano); });
    else if (opts.de && opts.ate) ls = ls.filter(function (l) { return l.data >= opts.de && l.data <= opts.ate; });

    function doGrupo(g) { return ls.filter(function (l) { return grupoDa(l.conta) === g; }); }
    function tot(arr) { return arred(soma(arr, function (l) { return l.valor; }), 2); }

    var receitas = doGrupo('RECEITA'), deducoes = doGrupo('DEDUCAO');
    var custosLavoura = doGrupo('CUSTO').filter(function (l) { return l.conta.indexOf('4.1') === 0; });
    var despesas = doGrupo('DESPESA').filter(function (l) { return l.conta !== '5.1.04'; });
    var depreciacao = doGrupo('DESPESA').filter(function (l) { return l.conta === '5.1.04'; });
    var investimentos = doGrupo('INVESTIMENTO');

    var receitaBruta = tot(receitas), tributos = tot(deducoes);
    var receitaLiquida = arred(receitaBruta - tributos, 2);
    var custoProducao = tot(custosLavoura);
    var margemBruta = arred(receitaLiquida - custoProducao, 2);
    var despesasOp = tot(despesas), depre = tot(depreciacao);
    var financeiras = tot(despesas.filter(function (l) { return l.conta === '5.1.05'; }));
    var resultadoOperacional = arred(margemBruta - (despesasOp - financeiras) - depre, 2);
    var resultado = arred(resultadoOperacional - financeiras, 2);

    function detalhar(g) {
      var mapa = {};
      doGrupo(g).forEach(function (l) {
        mapa[l.conta] = mapa[l.conta] || { codigo: l.conta, nome: nomeConta(l.conta), valor: 0, quantidade: 0 };
        mapa[l.conta].valor = arred(mapa[l.conta].valor + l.valor, 2);
        if (l.quantidade) mapa[l.conta].quantidade += l.quantidade;
      });
      return Object.keys(mapa).map(function (k) { return mapa[k]; }).sort(function (a, b) { return Math.abs(b.valor) - Math.abs(a.valor); });
    }
    function serieMensal() {
      return mesesHistorico().map(function (mm) {
        var doMes = ls.filter(function (l) { return l.data.slice(0, 7) === mm; });
        var r = soma(doMes.filter(function (l) { return l.tipo === 'RECEITA'; }), function (l) { return l.valor; });
        var c = soma(doMes.filter(function (l) { return l.tipo === 'CUSTO' || l.tipo === 'DESPESA'; }), function (l) { return l.valor; });
        return { mes: mm, receita: arred(r, 2), custo: arred(c, 2), resultado: arred(r - c, 2) };
      });
    }
    var escala = opcoesEscala(opts);

    return {
      periodo: opts.mes || (opts.ano ? 'Ano ' + opts.ano : escala.rotulo),
      contaEscala: escala.conta, parcelas: escala.parcelas,
      receitaBruta: receitaBruta, tributos: tributos, receitaLiquida: receitaLiquida,
      custoProducao: custoProducao, margemBruta: margemBruta,
      despesas: despesasOp, depreciacao: depre, financeiras: financeiras,
      resultadoOperacional: resultadoOperacional, resultado: resultado,
      margemBrutaPct: receitaLiquida ? arred(margemBruta / receitaLiquida * 100, 1) : 0,
      margemLiquidaPct: receitaLiquida ? arred(resultado / receitaLiquida * 100, 1) : 0,
      custoPorReal: receitaLiquida ? arred(custoProducao / receitaLiquida, 2) : 0,
      investimentos: tot(investimentos),
      contas: { receitas: detalhar('RECEITA'), custos: detalhar('CUSTO'), despesas: detalhar('DESPESA'), deducoes: detalhar('DEDUCAO') },
      meses: serieMensal(),
      cascata: [
        { nome: 'Receita bruta', valor: receitaBruta, tipo: 'entrada' },
        { nome: 'Tributos', valor: tributos, tipo: 'saida' },
        { nome: 'Custo de produção', valor: custoProducao, tipo: 'saida' },
        { nome: 'Despesas operacionais', valor: arred(despesasOp - financeiras, 2), tipo: 'saida' },
        { nome: 'Depreciação', valor: depre, tipo: 'saida' },
        { nome: 'Despesas financeiras', valor: financeiras, tipo: 'saida' },
        { nome: 'Resultado do período', valor: resultado, tipo: 'total' }
      ]
    };
  }
  function opcoesEscala(opts) {
    if (opts.mes) return { rotulo: opts.mes, conta: 1, parcelas: 'mês' };
    if (opts.ano) return { rotulo: 'Ano ' + opts.ano, conta: 1, parcelas: 'ano' };
    return { rotulo: 'Últimos 12 meses (' + mesesHistorico()[0] + ' a ' + mesCorrente() + ')', conta: 1, parcelas: '12 meses' };
  }

  /* =====================================================================
   * FLUXO DE CAIXA
   * =================================================================== */
  function fluxoCaixa(opts) {
    opts = opts || {};
    var ps = produtoresDe(opts);
    var meses = mesesHistorico();
    var ls = erp().lancamentos.filter(function (l) {
      return ps.indexOf(l.produtor) >= 0 && l.conta !== '3.1.06' && l.conta !== '5.1.04';
    });
    var saldoInicial = opts.saldoInicial !== undefined ? opts.saldoInicial
      : soma(ps, function (p) { return SALDO_CAIXA_INICIAL[p] || 0; });
    var aberto = saldoInicial;
    var serie = meses.map(function (mm, i) {
      var doMes = ls.filter(function (l) { return l.data.slice(0, 7) === mm; });
      var entradas = soma(doMes.filter(function (l) { return l.tipo === 'RECEITA'; }), function (l) { return l.valor; });
      var saidas = soma(doMes.filter(function (l) { return l.tipo !== 'RECEITA'; }), function (l) { return l.valor; });
      var linha = {
        mes: mm, entradas: arred(entradas, 2), saidas: arred(saidas, 2),
        resultado: arred(entradas - saidas, 2), saldo: arred(aberto + entradas - saidas, 2),
        parcial: mm === mesCorrente() && i === meses.length - 1
      };
      aberto = linha.saldo;
      return linha;
    });
    return { serie: serie, saldoInicial: arred(saldoInicial, 2), saldoFinal: serie[serie.length - 1].saldo, meses: serie };
  }

  /** Projeção de caixa: títulos em aberto + custeio corrente + estoque disponível para venda. */
  function projecaoCaixa(dias) {
    var horizonte = dias || 90;
    var hojeISO = HOJE.toISOString().slice(0, 10);
    var ts = titulos({});
    var fc = fluxoCaixa({});
    var saldoBase = fc.serie[Math.max(0, fc.serie.length - 2)].saldo;    // último mês fechado
    var custeioMes = soma(fc.serie.slice(-4, -1), function (m) { return m.saidas; }) / 3;
    var janelas = [];
    var saldo = saldoBase;
    for (var s = 1; s <= Math.ceil(horizonte / 30); s++) {
      var de = addDias(hojeISO, (s - 1) * 30), ate = addDias(hojeISO, s * 30);
      var rec = soma(ts.filter(function (t) { return t.tipo === 'RECEBER' && t.status !== 'RECEBIDO' && t.vencimento > de && t.vencimento <= ate; }), function (t) { return t.valor; });
      var pag = soma(ts.filter(function (t) { return t.tipo === 'PAGAR' && t.status !== 'PAGO' && t.vencimento > de && t.vencimento <= ate; }), function (t) { return t.valor; });
      saldo = saldo + rec - pag - custeioMes;
      janelas.push({
        rotulo: 'Dia ' + (s * 30), ate: ate, aReceber: arred(rec, 2), aPagar: arred(pag, 2),
        custeio: arred(custeioMes, 2), resultado: arred(rec - pag - custeioMes, 2), saldo: arred(saldo, 2)
      });
    }
    /* Estoques disponíveis para venda, valorados lote a lote pelo preço que o
       modelo de IA devolve para a qualidade daquele lote. */
    var disponivel = estoquePorLote({}).map(function (x) {
      return {
        item: x.item || (x.produtoRotulo + ' — lote ' + x.lote), loteRef: x.lote, produtor: x.produtor,
        unidade: x.unidade, quantidade: x.saldo, custoUnit: x.custoUnit, precoUnit: x.precoIA,
        notaQualidade: x.notaQualidade, ajustePct: x.ajustePct, statusCadeia: x.statusCadeia,
        liquido: x.valorMercado, resultado: x.resultado, margemPct: x.margemPct
      };
    });
    var menor = Math.min.apply(null, janelas.map(function (x) { return x.saldo; }));
    var liquidoEstoque = arred(soma(disponivel, function (x) { return x.liquido; }), 2);
    return {
      horizonte: horizonte, saldoPartida: arred(saldoBase, 2), custeioMensal: arred(custeioMes, 2),
      janelas: janelas, menorSaldo: arred(menor, 2), disponivel: disponivel, estoqueLiquido: liquidoEstoque,
      mesesDeFolego: custeioMes > 0 ? arred((menor + liquidoEstoque) / custeioMes, 1) : null,
      alerta: menor < 0
        ? 'Caixa projetado negativo em ' + horizonte + ' dias (menor saldo de R$ ' + arred(menor, 2) + '). Antecipar a venda do estoque de produto ou renegociar vencimentos.'
        : null,
      fonte: 'Títulos em aberto do ERP + custeio médio dos últimos 3 meses fechados · estoque valorado pelo preço ajustado pela qualidade'
    };
  }

  /* =====================================================================
   * ESTOQUE
   * =================================================================== */
  function estoqueAtual(opts) {
    opts = opts || {};
    var ps = produtoresDe(opts);
    var itens = erp().itens.filter(function (i) {
      return ps.indexOf(i.produtor) >= 0 && (!opts.categoria || i.categoria === opts.categoria);
    }).map(function (i) {
      var movs = erp().movimentos.filter(function (m) { return m.item === i.id; });
      var ultima = movs[movs.length - 1] || null;
      var entradas = soma(movs.filter(function (m) { return m.tipo === 'ENTRADA'; }), function (m) { return m.valor; });
      var saidas = soma(movs.filter(function (m) { return m.tipo === 'SAIDA'; }), function (m) { return m.valor; });
      return Object.assign({}, i, {
        valorTotal: arred(i.saldo * i.custoMedio, 2),
        coberturaPct: i.minimo > 0 ? arred(i.saldo / i.minimo * 100, 0) : null,
        critico: i.categoria !== 'PRODUTO' && i.minimo > 0 && i.saldo < i.minimo,
        ultimaMovimentacao: ultima ? ultima.data : null,
        entradasValor: arred(entradas, 2), saidasValor: arred(saidas, 2), movimentos: movs.length
      });
    });
    return {
      itens: itens,
      valorTotal: arred(soma(itens, function (i) { return i.valorTotal; }), 2),
      valorInsumo: arred(soma(itens.filter(function (i) { return i.categoria !== 'PRODUTO'; }), function (i) { return i.valorTotal; }), 2),
      valorProduto: arred(soma(itens.filter(function (i) { return i.categoria === 'PRODUTO'; }), function (i) { return i.valorTotal; }), 2),
      abaixoMinimo: itens.filter(function (i) { return i.critico; }).length,
      categorias: ['INSUMO', 'EMBALAGEM', 'PRODUTO'].map(function (c) {
        return { categoria: c, itens: itens.filter(function (i) { return i.categoria === c; }).length, valor: arred(soma(itens.filter(function (i) { return i.categoria === c; }), function (i) { return i.valorTotal; }), 2) };
      })
    };
  }

  /* Estoque de produto rastreado lote a lote: o preço de cada lote é o que o
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

  function movimentacoes(opts) {
    opts = opts || {};
    var ps = produtoresDe(opts);
    var mv = erp().movimentos.filter(function (m) { return ps.indexOf(m.produtor) >= 0; });
    if (opts.item) mv = mv.filter(function (m) { return m.item === opts.item; });
    if (opts.talhao) mv = mv.filter(function (m) { return m.talhao === opts.talhao; });
    if (opts.lote) mv = mv.filter(function (m) { return m.lote === opts.lote; });
    if (opts.categoria) mv = mv.filter(function (m) { return m.categoria === opts.categoria; });
    if (opts.de) mv = mv.filter(function (m) { return m.data >= opts.de; });
    mv = mv.slice().sort(function (a, b) { return a.data < b.data ? 1 : a.data > b.data ? -1 : 0; });
    return { total: mv.length, itens: opts.limite ? mv.slice(0, opts.limite) : mv };
  }

  /* =====================================================================
   * CUSTOS POR TALHÃO E POR UNIDADE PRODUZIDA
   * O denominador usa a produtividade PREVISTA PELA IA; o numerador, os
   * lançamentos e as baixas de estoque do ERP. Quando a lavoura rende menos
   * que o previsto, o custo por saca sobe imediatamente.
   * =================================================================== */
  function custoPorTalhao(talhaoId, opts) {
    var talhao = Dados.talhao(talhaoId);
    if (!talhao) return null;
    var produto = talhao.produto === 'cacau' ? 'cacau' : 'cafe_conilon';
    var o = orc(produto);
    var ehCafe = produto === 'cafe_conilon';
    var ls = erp().lancamentos.filter(function (l) { return l.talhao === talhaoId; });
    var direto = soma(ls, function (l) { return l.valor; });
    var porConta = {};
    ls.forEach(function (l) {
      porConta[l.conta] = porConta[l.conta] || { codigo: l.conta, nome: nomeConta(l.conta), valor: 0 };
      porConta[l.conta].valor = arred(porConta[l.conta].valor + l.valor, 2);
    });
    var admTotal = soma(erp().lancamentos.filter(function (l) {
      return l.produtor === talhao.produtor && !l.talhao && l.centro === 'ADM' &&
        (l.tipo === 'CUSTO' || l.tipo === 'DESPESA');
    }), function (l) { return l.valor; });
    var areaTotal = soma(D.talhoes.filter(function (t) { return t.produtor === talhao.produtor; }), function (t) { return t.area; });
    var rateio = areaTotal ? arred(admTotal * (talhao.area / areaTotal), 2) : 0;
    var custoTotal = arred(direto + rateio, 2);

    var producao = erp().producao.filter(function (p) { return p.talhao === talhaoId; });
    var safra = SAFRAS[produto];
    var unidadesRealizadas = soma(producao.filter(function (p) { return p.mes >= safra.de; }), function (p) { return p.unidades || 0; });
    var volumeTotal = soma(producao, function (p) { return p.volumeKg || 0; });
    var previsao = IA ? IA.preverSafra(talhaoId) : null;
    var unidadesPrevistas = previsao ? (ehCafe ? previsao.producaoTotal : previsao.producaoTotal / 15) : null;
    var loteRef = D.lotes.filter(function (l) {
      return l.produtor === talhao.produtor && l.talhao === talhaoId && l.destino === 'venda';
    })[0];
    var ajuste = loteRef && IA ? IA.precoAjustado(loteRef) : null;
    var fatorUnidade = ehCafe ? 1 : 15;                      /* arroba de 15 kg */
    var precoMercado = arred(Dados.precoAtual(produto) * fatorUnidade, 2);
    var precoPremium = ajuste ? arred(ajuste.ajustado * fatorUnidade, 2) : null;

    var unidadeNome = ehCafe ? 'saca 60 kg' : 'arroba 15 kg';
    var custoSacaProjetado = unidadesPrevistas ? arred(custoTotal / unidadesPrevistas, 2) : null;
    var progresso = unidadesPrevistas ? unidadesRealizadas / unidadesPrevistas : 0;
    /* enquanto a safra está no campo, dividir o custo do ano pelo que já foi
       colhido infla o custo unitário: o número parcial é informado como tal. */
    var custoUnitarioParcial = unidadesRealizadas > 0 ? arred(custoTotal * Math.min(progresso, 1) / unidadesRealizadas, 2) : null;
    var custoUnitarioRealizado = progresso >= 0.9 && unidadesRealizadas > 0 ? arred(custoTotal / unidadesRealizadas, 2) : null;
    var margemPct = custoSacaProjetado ? arred((precoMercado - custoSacaProjetado) / precoMercado * 100, 1) : null;
    var margemPremiumPct = (custoSacaProjetado && precoPremium) ? arred((precoPremium - custoSacaProjetado) / precoPremium * 100, 1) : null;
    var idade = ANO - talhao.plantio;

    return {
      talhao: talhaoId, nome: talhao.nome, produto: produto, produtoRotulo: o.rotulo, area: talhao.area,
      sistema: talhao.sistema, idade: idade, cultivar: talhao.cultivar,
      custoDireto: arred(direto, 2), rateio: rateio, custoTotal: custoTotal,
      custoPorHa: arred(custoTotal / talhao.area, 2),
      porConta: Object.keys(porConta).map(function (k) { return porConta[k]; }).sort(function (a, b) { return b.valor - a.valor; }),
      producaoKg: volumeTotal, safraRotulo: safra.rotulo,
      unidadesRealizadas: arred(unidadesRealizadas, 1), unidadesPrevistas: unidadesPrevistas ? arred(unidadesPrevistas, 1) : null,
      progressoSafraPct: unidadesPrevistas ? arred(unidadesRealizadas / unidadesPrevistas * 100, 0) : null,
      unidadeNome: unidadeNome, fatorUnidade: fatorUnidade,
      custoSacaProjetado: custoSacaProjetado, custoUnitarioRealizado: custoUnitarioRealizado,
      custoUnitarioParcial: custoUnitarioParcial, progressoSafra: arred(progresso * 100, 0),
      precoMercado: precoMercado, precoPremium: precoPremium, loteRef: loteRef ? loteRef.id : null,
      margemPct: margemPct, margemPremiumPct: margemPremiumPct,
      resultadoPorHa: custoSacaProjetado ? arred(precoMercado - custoSacaProjetado, 2) : null,
      produtividadePrevista: previsao ? previsao.previsto : null,
      produtividadeHistorica: talhao.produtividadeMedia,
      confiancaIA: previsao ? previsao.confianca : null,
      emFormacao: idade < 6 && !ehCafe,
      fonte: 'Custos: lançamentos do ERP + baixas de estoque aplicadas no talhão · Volume: eventos de colheita registrados na cadeia (' + safra.rotulo + ' em ' + (unidadesPrevistas ? arred(unidadesRealizadas / unidadesPrevistas * 100, 0) : 0) + '%) · Produtividade prevista: modelo de IA (' + (previsao ? previsao.confianca : 0) + '% de confiança)'
    };
  }

  function custosConsolidados() {
    var ps = produtoresDe({});
    var talhoes = D.talhoes.filter(function (t) { return ps.indexOf(t.produtor) >= 0; })
      .map(function (t) { return custoPorTalhao(t.id); }).filter(Boolean);
    var custoTotal = arred(soma(talhoes, function (x) { return x.custoTotal; }), 2);
    var area = arred(soma(talhoes, function (x) { return x.area; }), 2);
    return {
      talhoes: talhoes, custoTotal: custoTotal, area: area, custoPorHa: area ? arred(custoTotal / area, 2) : 0,
      criticos: talhoes.filter(function (x) { return x.margemPct !== null && x.margemPct < 10; }).map(function (x) { return x.talhao; })
    };
  }

  /** Fechamento de safra de um talhão: custo, produção, previsão da IA e resultado. */
  function fechamentoSafra(talhaoId) {
    var c = custoPorTalhao(talhaoId);
    if (!c) return null;
    var ls = erp().lancamentos.filter(function (l) { return l.talhao === talhaoId; });
    var receitaRateada = 0;
    var talhao = Dados.talhao(talhaoId);
    var nome = talhao.nome.toLowerCase();
    erp().lancamentos.filter(function (l) {
      return l.produtor === talhao.produtor && l.tipo === 'RECEITA' && l.descricao.toLowerCase().indexOf(nome) >= 0;
    }).forEach(function (l) { receitaRateada += l.valor; });
    /* parte da receita da propriedade atribuída a este talhão, proporcional ao volume de produção */
    var volumeTalhao = c.unidadesRealizadas;
    var volumeFazenda = soma(erp().producao.filter(function (p) {
      return p.produtor === talhao.produtor && p.produto === c.produto && p.mes >= SAFRAS[c.produto].de;
    }), function (p) { return p.unidades || 0; });
    var precoRef = c.precoMercado;
    var receita = arred(volumeTalhao * precoRef + receitaRateada, 2);
    var porMes = erp().producao.filter(function (p) { return p.talhao === talhaoId; })
      .map(function (p) { return { mes: p.mes, volumeKg: p.volumeKg, unidades: p.unidades }; });
    return {
      talhao: talhaoId, nome: talhao.nome, produto: c.produtoRotulo, area: talhao.area, safra: c.safraRotulo,
      custoTotal: c.custoTotal, custoPorHa: c.custoPorHa, unidade: c.unidadeNome,
      unidades: c.unidadesRealizadas, unidadesPrevistas: c.unidadesPrevistas,
      produtividadeRealizada: arred(c.unidadesRealizadas / talhao.area, 1),
      produtividadePrevista: c.unidadesPrevistas ? arred(c.unidadesPrevistas / talhao.area, 1) : null,
      custoUnitario: c.custoUnitarioRealizado || c.custoUnitarioParcial, custoSacaProjetado: c.custoSacaProjetado,
      custoUnitarioFechado: !!c.custoUnitarioRealizado,
      precoReferencia: precoRef, receita: receita,
      resultado: arred(receita - c.custoTotal, 2),
      margemPct: receita ? arred((receita - c.custoTotal) / receita * 100, 1) : null,
      porMes: porMes,
      volumeFazenda: arred(volumeFazenda, 1),
      comparativoIA: c.unidadesPrevistas ? {
        previsto: c.unidadesPrevistas, realizado: c.unidadesRealizadas,
        desvioPct: c.unidadesRealizadas ? arred((c.unidadesRealizadas - c.unidadesPrevistas) / c.unidadesPrevistas * 100, 1) : null,
        leitura: 'A previsão da IA e o volume registrado na cadeia alimentam o mesmo custo unitário — se a lavoura rende menos que o previsto, o custo por ' + c.unidadeNome + ' sobe na hora.'
      } : null
    };
  }

  /* =====================================================================
   * FOLHA, PATRIMÔNIO E MÁQUINAS
   * =================================================================== */
  function patrimonioFiltrado() {
    var ps = produtoresDe({});
    return erp().patrimonio.filter(function (p) { return ps.indexOf(p.produtor) >= 0; });
  }
  function folha(competencia) {
    var ps = produtoresDe({});
    var f = erp().folha.filter(function (x) { return ps.indexOf(x.produtor) >= 0 && (!competencia || x.competencia === competencia); });
    var anual = soma(f, function (x) { return x.bruto + x.encargos; });
    return {
      competencias: f.slice(-12),
      ultima: f[f.length - 1] || null,
      custo12meses: arred(anual, 2),
      custoMensalMedio: f.length ? arred(anual / f.length, 2) : 0,
      fixos: erp().pessoas.filter(function (p) { return ps.indexOf(p.produtor) >= 0 && p.vinculo === 'FIXO'; }),
      diaristas: erp().pessoas.filter(function (p) { return ps.indexOf(p.produtor) >= 0 && p.vinculo === 'DIARIA'; }),
      encargos: ENCARGOS, diaria: DIARIA
    };
  }
  function custoHoraMaquina(ativoId) {
    var a = erp().patrimonio.filter(function (x) { return x.id === ativoId; })[0];
    if (!a) return null;
    var depre = a.valor * (a.depreciaAno / 100);
    var horaDepre = a.horasAno > 0 ? depre / a.horasAno : 0;
    var horaManut = a.horasAno > 0 ? a.manutencaoAno / a.horasAno : 0;
    return {
      ativo: a.id, nome: a.nome, tipo: a.tipo, produtor: a.produtor, valor: a.valor, uso: a.uso,
      depreciacaoAno: arred(depre, 2), manutencaoAno: a.manutencaoAno, horasAno: a.horasAno,
      custoHora: arred(horaDepre + horaManut + a.combustivelHora + a.operadorHora, 2),
      composicao: [
        { nome: 'Depreciação', valor: arred(horaDepre, 2) },
        { nome: 'Manutenção', valor: arred(horaManut, 2) },
        { nome: 'Combustível', valor: a.combustivelHora },
        { nome: 'Operador', valor: a.operadorHora }
      ],
      idadeAnos: arred((HOJE - new Date(a.aquisicao + 'T12:00:00-04:00')) / 31536000000, 1),
      fonte: 'Depreciação linear pelo valor de reposição, manutenção declarada e consumo por hora do cadastro do ativo'
    };
  }
  /* Ativos com base horária de uso. O terreiro suspenso e a casa de
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
  }

  /* =====================================================================
   * ORÇADO × REALIZADO
   * =================================================================== */
  function orcadoRealizado(ano) {
    var anoRef = String(ano || ANO);
    var ps = produtoresDe({});
    var pctAno = arred((HOJE - new Date(anoRef + '-01-01T00:00:00-04:00')) / (new Date((Number(anoRef) + 1) + '-01-01T00:00:00-04:00') - new Date(anoRef + '-01-01T00:00:00-04:00')) * 100, 0);
    var ls = erp().lancamentos.filter(function (l) { return ps.indexOf(l.produtor) >= 0 && l.data.slice(0, 4) === anoRef; });
    var mapa = {};
    erp().orcamento.filter(function (o) { return ps.indexOf(o.produtor) >= 0 && String(o.ano) === anoRef; }).forEach(function (o) {
      mapa[o.grupo] = mapa[o.grupo] || { grupo: o.grupo, nome: o.nome, planejado: 0, realizado: 0 };
      mapa[o.grupo].planejado = arred(mapa[o.grupo].planejado + o.planejado, 2);
    });
    ls.forEach(function (l) {
      var g = l.conta.slice(0, 3);
      if (!mapa[g] || l.conta === '3.1.06') return;
      mapa[g].realizado = arred(mapa[g].realizado + l.valor, 2);
    });
    var linhas = Object.keys(mapa).sort().map(function (k) {
      var x = mapa[k];
      x.ehReceita = k === '3.1';
      x.atingimentoPct = x.planejado ? arred(x.realizado / x.planejado * 100, 0) : 0;
      x.esperadoPct = x.ehReceita ? pctAno : pctAno;
      x.desvio = arred(x.realizado - x.planejado, 2);
      x.situacao = x.ehReceita
        ? (x.atingimentoPct >= pctAno ? 'no ritmo ou acima' : x.atingimentoPct >= pctAno * 0.85 ? 'dentro do esperado' : 'abaixo do ritmo')
        : (x.atingimentoPct <= pctAno * 1.02 ? 'dentro do orçamento' : x.atingimentoPct <= pctAno * 1.15 ? 'levemente acima do ritmo' : 'acima do orçamento');
      return x;
    });
    return { ano: anoRef, linhas: linhas, progressoAnoPct: pctAno };
  }

  /* =====================================================================
   * EVIDÊNCIA DE SENSOR — cada real gasto confrontado com a medição
   * =================================================================== */
  /** Janela de molhamento anterior a uma data, montada a partir do clima
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
        indiceFermentacao: fer ? fer.indiceAcumulado : null, classeFermentacao: fer ? fer.classe : null,
        conclusao: 'Nota ' + ajuste.score + ' de qualidade (' + (ajuste.ajustePct > 0 ? '+' : '') + ajuste.ajustePct + '% sobre a cotação)' +
          (fer ? ' · índice de fermentação ' + fer.indiceAcumulado + ' °C·h (' + fer.classe + ')' : '')
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

  /* =====================================================================
   * ALERTAS DO ERP
   * =================================================================== */
  function alertas() {
    var out = [];
    var est = estoqueAtual({});
    est.itens.filter(function (i) { return i.critico; }).forEach(function (i) {
      out.push({
        severidade: i.coberturaPct < 50 ? 'critico' : 'atencao', area: 'Estoque',
        titulo: i.nome + ' abaixo do mínimo',
        detalhe: 'Saldo de ' + i.saldo + ' ' + i.unidade + ' contra mínimo de ' + i.minimo + ' ' + i.unidade + ' (' + i.coberturaPct + '% de cobertura). Última movimentação em ' + (i.ultimaMovimentacao || '—') + '.',
        acao: 'Programar reposição com ' + i.fornecedor + ' — a próxima aplicação depende deste insumo.',
        valor: i.valorTotal
      });
    });
    var vencidos = titulos({}).filter(function (t) { return t.status === 'VENCIDO'; });
    if (vencidos.length) {
      var v = arred(soma(vencidos, function (t) { return t.valor; }), 2);
      out.push({
        severidade: v > 20000 ? 'critico' : 'atencao', area: 'Financeiro',
        titulo: vencidos.length + ' título(s) vencido(s) — R$ ' + v,
        detalhe: vencidos.slice(0, 3).map(function (t) { return t.contraparte + ' (R$ ' + t.valor + ', venceu em ' + t.vencimento + ')'; }).join(' · '),
        acao: 'Renegociar prazo ou liquidar com o caixa disponível antes de virar inadimplência.', valor: v
      });
    }
    var proj = projecaoCaixa(90);
    if (proj.alerta) {
      out.push({
        severidade: 'critico', area: 'Financeiro', titulo: 'Caixa projetado negativo em 90 dias',
        detalhe: 'Menor saldo projetado: R$ ' + proj.menorSaldo + '. Há R$ ' + proj.estoqueLiquido + ' em estoque de produto disponível para venda.',
        acao: 'Antecipar a venda de estoque (o preço ajustado por qualidade já está calculado) ou renegociar os vencimentos do custeio.', valor: proj.menorSaldo
      });
    }
    custosConsolidados().talhoes.forEach(function (t) {
      if (t.margemPct === null) return;
      if (t.margemPct >= 10) return;
      var severidade = t.emFormacao ? 'atencao' : (t.margemPct < 0 ? 'critico' : 'atencao');
      var acao;
      if (t.emFormacao) {
        acao = 'Lavoura em formação (' + t.idade + ' anos): a produtividade prevista pela IA é de ' + t.produtividadePrevista + ' ' + (t.produto === 'cacau' ? 'kg/ha' : 'sacas/ha') + ' e o custo por ' + t.unidadeNome + ' cai conforme ela matura. Manter o trato e revisar o investimento antes de decidir a renovação.';
      } else if (t.produto === 'cacau') {
        acao = 'No preço de mercado o custo está ' + Math.abs(t.margemPct) + '% acima da receita' + (t.precoPremium ? ', mas o lote ' + t.loteRef + ' vale R$ ' + t.precoPremium + '/' + t.unidadeNome + ' (margem de ' + t.margemPremiumPct + '%): priorizar fermentação e classificação' : '') + '. Revisar o custo de colheita (' + DIARIA + ' por diária) e a produtividade do talhão.';
      } else {
        acao = 'Revisar adubação e colheita — as duas contas que mais pesam neste talhão — e conferir a produtividade prevista (' + t.produtividadePrevista + ' sc/ha com ' + t.confiancaIA + '% de confiança).';
      }
      out.push({
        severidade: severidade, area: 'Custo por talhão',
        titulo: t.nome + ' (' + t.produtoRotulo + '): margem de ' + t.margemPct + '% sobre o preço de mercado',
        detalhe: 'Custo de R$ ' + t.custoSacaProjetado + ' por ' + t.unidadeNome + ' contra preço de R$ ' + t.precoMercado + '. Custo por hectare de R$ ' + t.custoPorHa + ' e produção prevista de ' + t.produtividadePrevista + ' ' + (t.produto === 'cacau' ? 'kg/ha' : 'sacas/ha') + '.',
        acao: acao, valor: t.custoSacaProjetado
      });
    });
    var orc = orcadoRealizado(ANO);
    orc.linhas.forEach(function (l) {
      if (!l.ehReceita && l.atingimentoPct > orc.progressoAnoPct * 1.15) {
        out.push({
          severidade: 'atencao', area: 'Orçamento', titulo: l.nome + ' em ' + l.atingimentoPct + '% do orçamento anual',
          detalhe: 'Realizado de R$ ' + l.realizado + ' contra orçado de R$ ' + l.planejado + ' com ' + orc.progressoAnoPct + '% do ano decorrido.',
          acao: 'Revisar as compras do grupo ou readequar o orçamento com a cooperativa antes de fechar o semestre.'
        });
      }
    });
    var f = folha();
    f.fixos.forEach(function (p) {
      var meses = (HOJE - new Date(p.nr31 + 'T12:00:00-04:00')) / 2592000000;
      if (meses > 12) {
        out.push({
          severidade: 'atencao', area: 'Pessoas', titulo: 'Treinamento NR-31 vencido para ' + p.nome,
          detalhe: 'Último treinamento em ' + p.nr31 + ' (' + Math.round(meses) + ' meses).',
          acao: 'Agendar reciclagem — exigência legal para uso de defensivos e item verificado na auditoria de certificação.'
        });
      }
    });
    maquinas().forEach(function (m) {
      if (m.tipo === 'MAQUINA' && m.idadeAnos > 8) {
        out.push({
          severidade: 'atencao', area: 'Máquinas', titulo: m.nome + ' com ' + m.idadeAnos + ' anos de uso',
          detalhe: 'Custo de R$ ' + m.custoHora + ' por hora (' + m.custoAnoEstimado + ' por ano em ' + m.horasAno + ' h). Depreciação de R$ ' + m.depreciacaoAno + ' e manutenção de R$ ' + m.manutencaoAno + ' por ano.',
          acao: 'Avaliar renovação ou programar revisão geral antes da próxima safra — o custo por hora já embute o desgaste.'
        });
      }
    });
    var estouro = out.filter(function (x) { return x.severidade === 'critico'; }).length;
    return { itens: out, criticos: estouro, total: out.length, resumo: out.length + ' alertas (' + estouro + ' críticos) entre estoque, financeiro, custo, orçamento, pessoas e máquinas' };
  }

  /* =====================================================================
   * FECHAMENTO CONTÁBIL ANCORADO NA BLOCKCHAIN
   * =================================================================== */
  function prepararFechamento(competencia, autorId) {
    var d = dre({ mes: competencia });
    var fi = indicadores();
    var linhas = []
      .concat(d.contas.receitas.map(function (c) { return { codigo: c.codigo, nome: c.nome, tipo: 'RECEITA', valor: c.valor }; }))
      .concat(d.contas.custos.map(function (c) { return { codigo: c.codigo, nome: c.nome, tipo: 'CUSTO', valor: c.valor }; }))
      .concat(d.contas.despesas.map(function (c) { return { codigo: c.codigo, nome: c.nome, tipo: 'DESPESA', valor: c.valor }; }))
      .concat(d.contas.deducoes.map(function (c) { return { codigo: c.codigo, nome: c.nome, tipo: 'DEDUCAO', valor: -c.valor }; }));
    linhas.push({ codigo: 'RESULTADO', nome: 'Resultado do período', tipo: 'RESULTADO', valor: d.resultado });
    var resumo = {
      competencia: competencia, receitaLiquida: d.receitaLiquida, custoProducao: d.custoProducao,
      margemBruta: d.margemBruta, despesas: d.despesas, depreciacao: d.depreciacao,
      resultado: d.resultado, margemLiquidaPct: d.margemLiquidaPct,
      estoque: fi.estoque, aReceber: fi.aReceber, aPagar: fi.aPagar, saldoCaixa: fi.saldoCaixa,
      geradoEm: HOJE.toISOString(), contas: linhas.length,
      produtores: produtoresDe({}), escopo: escopoAtual().tipo
    };
    var hashes = linhas.map(function (l) { return global.Cripto.hashRecord({ competencia: competencia, conta: l.codigo, tipo: l.tipo, valor: l.valor }); });
    var raiz = global.Cripto.merkleRoot(hashes);
    return { competencia: competencia, linhas: linhas, resumo: resumo, hashes: hashes, raizMerkle: raiz, autor: autorId };
  }

  function ancorarFechamento(competencia, autorId) {
    var prep = prepararFechamento(competencia, autorId || (global.App && global.App.usuario) || 'U-01');
    garantirCadeia();
    var tx = global.Ledger.registrarTx('FECHAMENTO_CONTABIL', {
      competencia: competencia, contas: prep.linhas.length, raizMerkle: prep.raizMerkle,
      resultado: prep.resumo.resultado, receitaLiquida: prep.resumo.receitaLiquida,
      produtores: prep.resumo.produtores,
      descricao: 'Fechamento contábil de ' + competencia + ' — ' + prep.linhas.length + ' contas, resultado de R$ ' + prep.resumo.resultado
    }, prep.autor);
    if (tx.status !== 'PENDENTE') return { preparacao: prep, transacao: tx, bloco: null, recusado: true, motivo: tx.motivoRejeicao };
    var bloco = global.Ledger.minerar({ minerador: 'Controladoria do consórcio' });
    var registro = {
      id: 'FCH-' + (erp().ancoragens.length + 1), competencia: competencia, raizMerkle: prep.raizMerkle,
      txId: tx.id, bloco: bloco ? bloco.indice : null, hashBloco: bloco ? bloco.hash : null,
      contas: prep.linhas.length, resultado: prep.resumo.resultado,
      em: new Date().toISOString(), autor: prep.autor, resumo: prep.resumo
    };
    erp().ancoragens.unshift(registro);
    erp().ultimoFechamento = registro;
    return { preparacao: prep, transacao: tx, bloco: bloco, registro: registro };
  }

  function provarFechamento(fechamentoId) {
    var a = erp().ancoragens.filter(function (x) { return x.id === fechamentoId; })[0];
    if (!a) return null;
    var prep = prepararFechamento(a.competencia, a.autor);
    var i = prep.hashes.length - 1;                       // linha de resultado
    var caminho = [], nivel = prep.hashes.slice(), idx = i;
    while (nivel.length > 1) {
      var par = (idx % 2 === 0) ? nivel[idx + 1] : nivel[idx - 1];
      var duplicado = !par;
      caminho.push({ irmao: (par || nivel[idx]).slice(0, 16) + '…', posicao: idx % 2 === 0 ? 'direita' : 'esquerda', duplicado: duplicado });
      var proximo = [];
      for (var k = 0; k < nivel.length; k += 2) proximo.push(global.Cripto.sha256(nivel[k] + (nivel[k + 1] || nivel[k])));
      nivel = proximo; idx = Math.floor(idx / 2);
    }
    return {
      fechamento: a.id, competencia: a.competencia, linhas: prep.linhas, bloco: a.bloco, hashBloco: a.hashBloco,
      hashResultado: prep.hashes[i], caminho: caminho, niveis: caminho.length,
      raizCalculada: nivel[0], raizAncorada: a.raizMerkle, confere: nivel[0] === a.raizMerkle,
      resultado: prep.resumo.resultado,
      explicacao: 'Cada conta do fechamento de ' + a.competencia + ' gera um hash; os hashes formam a árvore de Merkle e a raiz foi gravada no bloco #' + a.bloco +
        '. A conferência recalcula a raiz subindo pelo caminho de prova a partir da linha de resultado: se qualquer valor do período tiver sido alterado depois do fechamento, as raízes divergem.'
    };
  }

  /* =====================================================================
   * ESCROW → CONTA A RECEBER
   * Contrato com pagamento em escrow vira título a receber no ERP, na conta
   * do vendedor, com o banco de custódia identificado. Quando a etapa de
   * liberação é concluída na cadeia, o título é liquidado.
   * =================================================================== */
  function sincronizarEscrow() {
    var criados = [], liquidados = [];
    var ps = produtoresDe({});
    var hojeISO = HOJE.toISOString().slice(0, 10);
    D.contratos.forEach(function (ct) {
      var vendedor = ct.vendedor;
      var euSouVendedor = ps.indexOf(vendedor) >= 0;
      var euSouComprador = usuarioAtual() === ct.comprador;
      if (!euSouVendedor && !euSouComprador) return;
      var liberacao = ct.etapas.filter(function (e) { return e.nome.indexOf('Liberação') >= 0; })[0];
      var concluida = !!(liberacao && liberacao.status === 'CONCLUIDA');
      var composicao = ct.etapas.map(function (e) { return { nome: e.nome, status: e.status, data: e.data }; });

      /* LADO DE QUEM VENDE — o recebível do contrato, no escopo do vendedor */
      if (euSouVendedor) {
        var rec = erp().titulos.filter(function (t) { return t.contrato === ct.id && t.tipo === 'RECEBER'; })[0];
        if (rec) {
          if (concluida && rec.status !== 'RECEBIDO') {
            rec.status = 'RECEBIDO'; rec.liquidadoEm = hojeISO; liquidados.push(rec);
          }
        } else {
          var recebivel = {
            id: 'TR-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.tipo === 'RECEBER'; }).length + 1),
            tipo: 'RECEBER', contraparte: nomeOrg(ct.comprador),
            descricao: 'Contrato ' + ct.id + ' em escrow — ' + ct.quantidade + ' ' + ct.unidade + ' de ' + Dados.nomeProduto(ct.produto) + ' (' + ct.lotes.join(', ') + ')',
            valor: ct.valorTotal, emissao: hojeISO, vencimento: addDias(hojeISO, 30),
            status: concluida ? 'RECEBIDO' : 'ABERTO', liquidadoEm: concluida ? hojeISO : undefined,
            produtor: vendedor, origem: 'ESCROW', contrato: ct.id, contrapartePapel: 'cliente',
            documento: ct.id, banco: 'Conta escrow do consórcio', composicao: composicao
          };
          erp().titulos.push(recebivel);
          criados.push(recebivel);
        }
      }

      /* LADO DE QUEM COMPRA — a obrigação de liberar o pagamento, no escopo do comprador */
      if (euSouComprador) {
        var pag = erp().titulos.filter(function (t) { return t.contrato === ct.id && t.tipo === 'PAGAR'; })[0];
        if (pag) {
          if (concluida && pag.status !== 'PAGO') {
            pag.status = 'PAGO'; pag.liquidadoEm = hojeISO; liquidados.push(pag);
          }
        } else {
          var obrigacao = {
            id: 'TP-E' + (erp().titulos.filter(function (t) { return t.origem === 'ESCROW' && t.tipo === 'PAGAR'; }).length + 1),
            tipo: 'PAGAR', contraparte: nomeOrg(ct.vendedor),
            descricao: 'Contrato ' + ct.id + ' em escrow — obrigação de liberar o pagamento de ' + ct.quantidade + ' ' + ct.unidade + ' de ' + Dados.nomeProduto(ct.produto),
            valor: ct.valorTotal, emissao: hojeISO, vencimento: addDias(hojeISO, 15),
            status: concluida ? 'PAGO' : 'ABERTO', liquidadoEm: concluida ? hojeISO : undefined,
            produtor: ct.comprador, origem: 'ESCROW', contrato: ct.id, contrapartePapel: 'fornecedor',
            documento: ct.id, banco: 'Conta escrow do consórcio', composicao: composicao
          };
          erp().titulos.push(obrigacao);
          criados.push(obrigacao);
        }
      }
    });
    if (criados.length || liquidados.length) {
      erp().sincronizadoEscrow = erp().sincronizadoEscrow.concat(criados.map(function (t) { return t.contrato; }));
    }
    return { criados: criados, liquidados: liquidados };
  }

  /* =====================================================================
   * REGISTRO DE OPERAÇÕES (o ERP operando, não só exibindo)
   * =================================================================== */
  function registrarCompra(itemId, qtd, precoUnit, fornecedor, prazoDias, autorId) {
    var item = erp().itens.filter(function (i) { return i.id === itemId; })[0];
    if (!item || !(qtd > 0)) return null;
    var data = HOJE.toISOString().slice(0, 10);
    var valor = arred(qtd * precoUnit, 2);
    var doc = 'NF ' + (9000 + erp().movimentos.length);
    var saldoAnterior = item.saldo;
    item.saldo = arred(item.saldo + qtd, 3);
    item.custoMedio = arred((item.custoMedio * saldoAnterior + valor) / item.saldo, 2);
    var mov = {
      id: novoId('MV'), data: data, item: item.id, itemNome: item.nome, categoria: item.categoria,
      tipo: 'ENTRADA', qtd: arred(qtd, 3), custoUnit: arred(precoUnit, 2), valor: valor, saldoApos: item.saldo,
      motivo: 'Compra de ' + (fornecedor || item.fornecedor), produtor: item.produtor, documento: doc
    };
    erp().movimentos.push(mov);
    var lanc = lancar(erp(), {
      data: data, conta: '1.1.02', descricao: 'Compra de ' + item.nome + ' (' + arred(qtd, 2) + ' ' + item.unidade + ') de ' + (fornecedor || item.fornecedor) + ' — entrada em estoque',
      valor: valor, centro: 'ESTOQUE', produtor: item.produtor, origem: 'COMPRA', documento: doc
    });
    var prazo = prazoDias === undefined ? 30 : prazoDias;
    var titulo = {
      id: novoId('TP'), tipo: 'PAGAR', contraparte: fornecedor || item.fornecedor,
      descricao: lanc.descricao, valor: valor, emissao: data, vencimento: addDias(data, prazo),
      status: prazo === 0 ? 'PAGO' : 'ABERTO', produtor: item.produtor, origem: 'COMPRA', documento: doc
    };
    erp().titulos.push(titulo);
    garantirCadeia();
    var tx = global.Ledger.registrarTx('COMPRA_INSUMO', {
      item: item.nome, quantidade: arred(qtd, 3) + ' ' + item.unidade, valor: valor,
      fornecedor: fornecedor || item.fornecedor, produtor: item.produtor, documento: doc,
      descricao: 'Compra de ' + arred(qtd, 2) + ' ' + item.unidade + ' de ' + item.nome + ' — ' + doc
    }, autorId || (global.App && global.App.usuario) || 'U-01');
    return { movimento: mov, lancamento: lanc, titulo: titulo, transacao: tx, custoMedioNovo: item.custoMedio };
  }

  function consumirInsumo(itemId, qtd, talhaoId, autorId) {
    var item = erp().itens.filter(function (i) { return i.id === itemId; })[0];
    var talhao = Dados.talhao(talhaoId);
    if (!item || !talhao || !(qtd > 0)) return null;
    if (qtd > item.saldo) return { erro: 'Saldo insuficiente de ' + item.nome + ': disponível ' + item.saldo + ' ' + item.unidade + '.' };
    var data = HOJE.toISOString().slice(0, 10);
    var valor = arred(qtd * item.custoMedio, 2);
    item.saldo = arred(item.saldo - qtd, 3);
    var mov = {
      id: novoId('MV'), data: data, item: item.id, itemNome: item.nome, categoria: item.categoria,
      tipo: 'SAIDA', qtd: arred(qtd, 3), custoUnit: item.custoMedio, valor: valor, saldoApos: item.saldo,
      talhao: talhaoId, motivo: 'Aplicação em ' + talhao.nome + ' (' + talhao.produto + ')',
      produtor: item.produtor, documento: 'OS ' + (900 + erp().movimentos.length)
    };
    erp().movimentos.push(mov);
    var lanc = lancar(erp(), {
      data: data, conta: item.conta || '4.1.01', descricao: 'Aplicação de ' + item.nome + ' (' + arred(qtd, 2) + ' ' + item.unidade + ')',
      valor: valor, centro: talhaoId, talhao: talhaoId, produtor: item.produtor,
      origem: 'ESTOQUE', documento: mov.documento
    });
    garantirCadeia();
    var tx = global.Ledger.registrarTx('APLICACAO_INSUMO', {
      talhao: talhaoId, item: item.nome, quantidade: arred(qtd, 3) + ' ' + item.unidade, custo: valor,
      produtor: item.produtor, documento: mov.documento,
      descricao: 'Aplicação de ' + arred(qtd, 2) + ' ' + item.unidade + ' de ' + item.nome + ' em ' + talhao.nome
    }, autorId || (global.App && global.App.usuario) || 'U-01');
    return { movimento: mov, lancamento: lanc, transacao: tx, evidencia: evidenciaSensor(talhaoId) };
  }

  function registrarVenda(loteId, qtd, precoUnit, comprador, prazoDias, autorId) {
    var lote = Dados.lote(loteId);
    if (!lote) return null;
    var ehCafe = lote.produto === 'cafe_conilon';
    var item = erp().itens.filter(function (i) {
      return i.produtor === lote.produtor && i.codigo === (ehCafe ? 'PRD-01' : 'PRD-02');
    })[0];
    if (item && qtd > item.saldo) return { erro: 'Estoque de ' + item.nome + ' insuficiente: saldo de ' + item.saldo + ' ' + item.unidade + '.' };
    var data = HOJE.toISOString().slice(0, 10);
    var valor = arred(qtd * precoUnit, 2);
    var doc = 'NF ' + (9500 + erp().movimentos.length);
    if (item) {
      item.saldo = arred(item.saldo - qtd, 3);
      erp().movimentos.push({
        id: novoId('MV'), data: data, item: item.id, itemNome: item.nome, categoria: 'PRODUTO',
        tipo: 'SAIDA', qtd: arred(qtd, 3), custoUnit: item.custoMedio, valor: arred(qtd * item.custoMedio, 2),
        saldoApos: item.saldo, motivo: 'Venda para ' + comprador, produtor: lote.produtor,
        documento: doc, lote: loteId, precoVenda: precoUnit, margem: arred(valor - qtd * item.custoMedio, 2)
      });
    }
    var lanc = lancar(erp(), {
      data: data, conta: ehCafe ? '3.1.01' : '3.1.02',
      descricao: 'Venda de ' + qtd + ' ' + (ehCafe ? 'sacas de café' : 'arrobas de cacau') + ' do lote ' + loteId + ' a R$ ' + arred(precoUnit, 2) + '/' + (ehCafe ? 'saca' : 'arroba'),
      valor: valor, centro: 'COMERCIALIZACAO', produtor: lote.produtor, origem: 'VENDA',
      quantidade: qtd, precoUnitario: arred(precoUnit, 2), lote: loteId, documento: doc
    });
    var titulo = {
      id: novoId('TR'), tipo: 'RECEBER', contraparte: comprador,
      descricao: 'Venda do lote ' + loteId + ' — ' + qtd + ' ' + lote.unidade,
      valor: valor, emissao: data, vencimento: addDias(data, prazoDias === undefined ? 30 : prazoDias),
      status: 'ABERTO', produtor: lote.produtor, origem: 'VENDA', lote: loteId, documento: doc
    };
    erp().titulos.push(titulo);
    garantirCadeia();
    var tx = global.Ledger.registrarTx('VENDA', {
      lote: loteId, quantidade: qtd + ' ' + lote.unidade, precoUnitario: arred(precoUnit, 2), valor: valor,
      comprador: comprador, produtor: lote.produtor,
      descricao: 'Venda de ' + qtd + ' ' + lote.unidade + ' do lote ' + loteId + ' para ' + comprador
    }, autorId || (global.App && global.App.usuario) || 'U-01');
    return { lancamento: lanc, titulo: titulo, transacao: tx };
  }

  function liquidarTitulo(tituloId) {
    var t = erp().titulos.filter(function (x) { return x.id === tituloId; })[0];
    if (!t) return null;
    t.status = t.tipo === 'RECEBER' ? 'RECEBIDO' : 'PAGO';
    t.liquidadoEm = HOJE.toISOString().slice(0, 10);
    return t;
  }

  /* =====================================================================
   * INDICADORES GERENCIAIS
   * =================================================================== */
  function indicadores() {
    var d = dre({});
    var fc = fluxoCaixa({});
    var est = estoqueAtual({});
    var ts = titulos({});
    var receber = soma(ts.filter(function (t) { return t.tipo === 'RECEBER' && t.status !== 'RECEBIDO'; }), function (t) { return t.valor; });
    var pagar = soma(ts.filter(function (t) { return t.tipo === 'PAGAR' && t.status !== 'PAGO'; }), function (t) { return t.valor; });
    var vencidos = ts.filter(function (t) { return t.status === 'VENCIDO'; });
    var c = custosConsolidados();
    var pe = pontoEquilibrio();
    var pat = patrimonioFiltrado();
    var valorPatrimonio = arred(soma(pat, function (p) { return p.valor; }), 2);
    var divida = soma(ts.filter(function (t) { return t.tipo === 'PAGAR' && t.contraparte.indexOf('Banco') >= 0; }), function (t) { return t.valor; });
    var depreAnual = arred(soma(pat, function (p) { return p.valor * (p.depreciaAno / 100); }), 2);
    var estoqueProduto = est.valorProduto;
    return {
      resultado: d.resultado, margemLiquida: d.margemLiquidaPct, margemBruta: d.margemBrutaPct,
      receita: d.receitaLiquida, receitaBruta: d.receitaBruta, custo: d.custoProducao,
      custoPorReal: d.custoPorReal, periodo: d.periodo,
      saldoCaixa: fc.saldoFinal, capitalGiro: arred(receber + estoqueProduto + est.valorInsumo - pagar, 2),
      aReceber: arred(receber, 2), aPagar: arred(pagar, 2),
      vencidos: vencidos.length, vencidosValor: arred(soma(vencidos, function (t) { return t.valor; }), 2),
      estoque: est.valorTotal, estoqueProduto: estoqueProduto, estoqueInsumo: est.valorInsumo,
      estoqueAbaixoMinimo: est.abaixoMinimo,
      custoPorHa: c.custoPorHa, custoTotalSafra: c.custoTotal, area: c.area,
      pontoEquilibrio: pe, patrimonio: valorPatrimonio, depreciacaoAnual: depreAnual,
      divida: arred(divida, 2),
      liquidez: pagar > 0 ? arred((receber + estoqueProduto) / pagar, 2) : null,
      endividamento: valorPatrimonio > 0 ? arred(divida / valorPatrimonio * 100, 1) : 0,
      produtoPorHa: d.receitaLiquida && c.area ? arred(d.receitaLiquida / c.area, 2) : null,
      ciclo: 'O custeio da safra começa 6 meses antes da colheita e o café só é pago 30 a 60 dias depois da venda em escrow — o caixa precisa financiar o ciclo inteiro de uma vez.'
    };
  }

  /** Ponto de equilíbrio: quantas sacas equivalentes cobrem a estrutura da propriedade. */
  function pontoEquilibrio() {
    var ps = produtoresDe({});
    var ls = erp().lancamentos.filter(function (l) { return ps.indexOf(l.produtor) >= 0; });
    var janela = mesesHistorico();
    var primeiros = janela[0];
    var fixos = soma(ls.filter(function (l) { return l.data >= primeiros && (l.conta === '5.1.01' || l.conta === '5.1.02' || l.conta === '5.1.03' || l.conta === '5.1.04' || l.conta === '5.1.05' || l.conta === '5.1.06' || l.conta === '5.1.07' || l.conta === '5.1.08' || l.conta === '4.1.04'); }), function (l) { return l.valor; });
    var d = dre({});
    var capacidade = d.receitaLiquida ? d.margemBruta / d.receitaLiquida : 0;
    var precoCafe = Dados.precoAtual('cafe_conilon');
    var receitaNecessaria = capacidade > 0 ? fixos / capacidade : 0;
    return {
      custoFixo12m: arred(fixos, 2),
      margemContribuicaoPct: arred(capacidade * 100, 1),
      receitaNecessaria: arred(receitaNecessaria, 2),
      sacasEquivalentes: arred(receitaNecessaria / precoCafe, 0),
      receitaRealizada: d.receitaLiquida,
      coberturaPct: receitaNecessaria ? arred(d.receitaLiquida / receitaNecessaria * 100, 0) : 0,
      fonte: 'Folha fixa, manutenção, depreciação e despesas da estrutura nos últimos 12 meses ÷ margem de contribuição apurada na DRE · preço do conilon de 06/10/2026'
    };
  }

  /* =====================================================================
   * EXPORTAÇÃO
   * =================================================================== */
  global.Erp = {
    HOJE: HOJE, CONTAS: CONTAS, ORCAMENTO_HA: ORCAMENTO_HA, PATRIMONIO: PATRIMONIO, PESSOAS: PESSOAS,
    ITENS_BASE: ITENS_BASE, COLHEITA_PLANEJADA: COLHEITA_PLANEJADA, CALENDARIO: CALENDARIO, SAFRAS: SAFRAS,
    PLANO_VENDAS: PLANO_VENDAS, MESES: mesesHistorico,
    conta: conta, nomeConta: nomeConta, grupoDa: grupoDa, orc: orc, nomeUsuario: nomeUsuario, nomeOrg: nomeOrg,
    iniciar: iniciar, reiniciar: reiniciar, erp: erp, escopo: escopo, escopoAtual: escopoAtual, produtoresDe: produtoresDe,
    lancamentos: lancamentos, titulos: titulos,
    dre: dre, fluxoCaixa: fluxoCaixa, projecaoCaixa: projecaoCaixa, indicadores: indicadores, pontoEquilibrio: pontoEquilibrio,
    estoqueAtual: estoqueAtual, estoquePorLote: estoquePorLote, movimentacoes: movimentacoes,
    custoPorTalhao: custoPorTalhao, custosConsolidados: custosConsolidados, fechamentoSafra: fechamentoSafra,
    folha: folha, custoHoraMaquina: custoHoraMaquina, maquinas: maquinas, patrimonioFiltrado: patrimonioFiltrado,
    orcadoRealizado: orcadoRealizado, evidenciaSensor: evidenciaSensor, alertas: alertas,
    patrimonioSemHoras: patrimonioSemHoras,
    prepararFechamento: prepararFechamento, ancorarFechamento: ancorarFechamento, provarFechamento: provarFechamento,
    sincronizarEscrow: sincronizarEscrow, custoUnitarioDoTalhao: custoUnitarioDoTalhao,
    registrarCompra: registrarCompra, consumirInsumo: consumirInsumo, registrarVenda: registrarVenda, liquidarTitulo: liquidarTitulo
  };
})(typeof window !== 'undefined' ? window : globalThis);
