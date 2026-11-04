/* =========================================================================
 * AGROCHAIN · CAMADA DE DADOS (seed + persistência)
 * Cadeia produtiva de café e cacau em Rondônia.
 * Cenário demonstrativo calibrado com indicadores reais de 06/10/2026:
 *   Café arábica (Cepea/Esalq): R$ 1.568,95 / saca 60 kg
 *   Café conilon  (Cepea/Esalq): R$   976,94 / saca 60 kg
 *   Cacau: R$ 25,80 / kg — amêndoa com Indicação de Procedência Rondônia
 *
 * NOTA DE MERCADO (cacau): o grão vive forte correção em 2026, após o pico
 * histórico de 2024 (quando chegou perto de R$ 70/kg). A referência internacional
 * caiu para ~US$ 5.400/t e o produtor brasileiro recebe hoje entre R$ 12 e R$ 26/kg,
 * conforme região, fermentação e certificação. O protótipo parte desse cenário
 * para que as recomendações da IA sejam realistas e não otimistas demais.
 * ========================================================================= */
(function (global) {
  'use strict';

  /* Preços-âncora (R$) — calibrados com cotações reais de 06/10/2026 */
  var PRECO_ANCORA = {
    'cafe_arabica': { preco: 1568.95, unidade: 'saca 60 kg', produto: 'Café Arábica', fonte: 'Cepea/Esalq' },
    'cafe_conilon': { preco: 976.94, unidade: 'saca 60 kg', produto: 'Café Conilon (Robusta)', fonte: 'Cepea/Esalq' },
    'cacau': { preco: 25.80, unidade: 'kg (amêndoa seca)', produto: 'Cacau IG Rondônia', fonte: 'Referência regional RO (pós-correção 2026)' }
  };

  /* Gerador pseudoaleatório determinístico — garante que os números do
     protótipo sejam sempre iguais (reprodutibilidade em demonstrações). */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* Série histórica de preços: 120 dias encerrando exatamente na cotação real.
     Modelo: trajetória geométrica (drift) + ruído autorregressivo AR(1),
     reproduzindo o comportamento de séries de commodities sem extremos irreais.
     driftTotal = variação acumulada no período (negativo = tendência de queda). */
  function gerarSerie(chave, dias, volatilidade, driftTotal) {
    var rnd = mulberry32(20261006 + chave.length * 977);
    var alvo = PRECO_ANCORA[chave].preco;
    var inicial = alvo / (1 + driftTotal);
    var serie = [], ruido = 0;
    var hoje = new Date('2026-10-06T00:00:00-04:00');
    for (var i = dias - 1; i >= 0; i--) {
      var t = (dias - 1 - i) / (dias - 1);                 // 0 -> início, 1 -> hoje
      var trajetoria = inicial * Math.pow(1 + driftTotal, t);
      ruido = ruido * 0.82 + (rnd() - 0.5) * volatilidade; // AR(1) mantém o ruído suave
      var valor = trajetoria * (1 + ruido);
      if (i === 0) valor = alvo;                           // fecha exatamente na cotação real
      serie.push({
        data: new Date(hoje.getTime() - i * 86400000).toISOString().slice(0, 10),
        preco: Math.round(valor * 100) / 100
      });
    }
    return serie;
  }

  var DB = {
    meta: {
      nome: 'AgroChain',
      versao: '1.0.0-prototipo',
      rede: 'AgroChain Consortium Testnet (simulada)',
      chainId: 'ACC-4713',
      algoritmo: 'SHA-256 + Prova de Trabalho (dificuldade 3)',
      consorcio: ['COOPRON', 'Torrefação Alta Mogiana', 'Chocolate Amazônia', 'Certificadora Rondônia IG', 'SEAGRI-RO'],
      criadoEm: '2026-10-06T08:00:00-04:00'
    },

    precos: {
      'cafe_arabica': gerarSerie('cafe_arabica', 120, 0.055, 0.085),
      'cafe_conilon': gerarSerie('cafe_conilon', 120, 0.048, 0.120),
      'cacau': gerarSerie('cacau', 120, 0.070, -0.285)
    },
    precoAncora: PRECO_ANCORA,

    usuarios: [
      { id: 'U-01', nome: 'João Silva', papel: 'produtor', org: 'Sítio Boa Esperança', municipio: 'Cacoal', uf: 'RO', area: '15,5 ha', desde: 2018, avatar: 'JS' },
      { id: 'U-02', nome: 'Maria Souza', papel: 'produtor', org: 'Fazenda Santa Luzia', municipio: 'Rolim de Moura', uf: 'RO', area: '14,0 ha', desde: 2015, avatar: 'MS' },
      { id: 'U-03', nome: 'Carlos Mendes', papel: 'cooperativa', org: 'COOPRON — Coop. Agropecuária de Rondônia', municipio: 'Cacoal', uf: 'RO', area: '412 produtores', desde: 2009, avatar: 'CM' },
      { id: 'U-04', nome: 'Ana Ribeiro', papel: 'industria', org: 'Torrefação Alta Mogiana S.A.', municipio: 'Franca', uf: 'SP', area: 'compra 2.400 t/ano', desde: 1996, avatar: 'AR' },
      { id: 'U-05', nome: 'Pierre Alencar', papel: 'industria', org: 'Chocolate Amazônia Bean-to-Bar', municipio: 'Porto Velho', uf: 'RO', area: 'compra 180 t/ano', desde: 2019, avatar: 'PA' },
      { id: 'U-06', nome: 'Luiza Prado', papel: 'certificadora', org: 'Certificadora Rondônia IG / Rainforest Alliance', municipio: 'Porto Velho', uf: 'RO', area: '310 selos ativos', desde: 2014, avatar: 'LP' },
      { id: 'U-07', nome: 'Auditoria Independente', papel: 'auditor', org: 'Verificador de Cadeia / MAPA', municipio: 'Brasília', uf: 'DF', area: 'acesso somente leitura', desde: 2026, avatar: 'AI' }
    ],

    talhoes: [
      { id: 'T-01', produtor: 'U-01', nome: 'Talhão Alto', produto: 'cafe_conilon', cultivar: 'Conilon Vitória (clones 12/14)', area: 3.2, geo: { lat: -11.4386, lon: -61.4472 }, plantio: 2019, sistema: 'Irrigado (gotejamento)', produtividadeMedia: 58, ndvi: 0.71, ultimaAnalise: '2026-09-28' },
      { id: 'T-02', produtor: 'U-01', nome: 'Talhão Baixo', produto: 'cafe_conilon', cultivar: 'Conilon BRS Ouro Preto', area: 3.3, geo: { lat: -11.4412, lon: -61.4501 }, plantio: 2022, sistema: 'Sequeiro', produtividadeMedia: 44, ndvi: 0.63, ultimaAnalise: '2026-09-28' },
      { id: 'T-03', produtor: 'U-01', nome: 'Cacau do Córrego', produto: 'cacau', cultivar: 'Clones CCN-51 / PS-1319', area: 4.0, geo: { lat: -11.4458, lon: -61.4435 }, plantio: 2016, sistema: 'Cacaueiro em consórcio com seringueira', produtividadeMedia: 880, ndvi: 0.68, ultimaAnalise: '2026-09-30' },
      { id: 'T-04', produtor: 'U-01', nome: 'Cacau Novo', produto: 'cacau', cultivar: 'Clones CCN-51', area: 4.0, geo: { lat: -11.4491, lon: -61.4462 }, plantio: 2020, sistema: 'Pleno sol com irrigação', produtividadeMedia: 760, ndvi: 0.60, ultimaAnalise: '2026-09-30' },
      { id: 'T-05', produtor: 'U-02', nome: 'Santa Luzia Norte', produto: 'cafe_conilon', cultivar: 'Conilon Vitória', area: 8.0, geo: { lat: -11.6901, lon: -61.7783 }, plantio: 2017, sistema: 'Irrigado (pivô)', produtividadeMedia: 62, ndvi: 0.74, ultimaAnalise: '2026-10-01' },
      { id: 'T-06', produtor: 'U-02', nome: 'Santa Luzia Cacau', produto: 'cacau', cultivar: 'Clones híbridos Bahia', area: 6.0, geo: { lat: -11.6935, lon: -61.7812 }, plantio: 2014, sistema: 'Cacaueiro em consórcio com açaí', produtividadeMedia: 910, ndvi: 0.70, ultimaAnalise: '2026-10-01' }
    ],

    /* Histórico de produtividade (sacas/ha para café, kg/ha para cacau) */
    historicoSafra: [
      { talhao: 'T-01', safras: [{ ano: 2022, valor: 48 }, { ano: 2023, valor: 54 }, { ano: 2024, valor: 51 }, { ano: 2025, valor: 60 }, { ano: 2026, valor: null }] },
      { talhao: 'T-02', safras: [{ ano: 2022, valor: null }, { ano: 2023, valor: 38 }, { ano: 2024, valor: 42 }, { ano: 2025, valor: 47 }, { ano: 2026, valor: null }] },
      { talhao: 'T-03', safras: [{ ano: 2022, valor: 780 }, { ano: 2023, valor: 850 }, { ano: 2024, valor: 910 }, { ano: 2025, valor: 860 }, { ano: 2026, valor: null }] },
      { talhao: 'T-04', safras: [{ ano: 2022, valor: null }, { ano: 2023, valor: 520 }, { ano: 2024, valor: 690 }, { ano: 2025, valor: 730 }, { ano: 2026, valor: null }] },
      { talhao: 'T-05', safras: [{ ano: 2022, valor: 55 }, { ano: 2023, valor: 58 }, { ano: 2024, valor: 61 }, { ano: 2025, valor: 66 }, { ano: 2026, valor: null }] },
      { talhao: 'T-06', safras: [{ ano: 2022, valor: 820 }, { ano: 2023, valor: 880 }, { ano: 2024, valor: 940 }, { ano: 2025, valor: 920 }, { ano: 2026, valor: null }] }
    ],

    /* Dados climáticos diários dos últimos 90 dias por região */
    clima: {
      'Cacoal': gerarClima('Cacoal', 2026, 90, 118),
      'Rolim de Moura': gerarClima('Rolim de Moura', 2026, 90, 132)
    },

    lotes: [
      {
        id: 'L-2026-0142', produto: 'cafe_conilon', talhao: 'T-01', produtor: 'U-01', cooperativa: 'U-03',
        safra: 2026, area: 3.2, quantidade: 62, unidade: 'sacas 60 kg', pesoKg: 3720,
        dataColheita: '2026-09-12', umidade: 12.4, tipo: 'Tipo 7, bebida dura',
        umidadeSecagem: 12.4, diasSecagem: 9, destino: 'venda',
        status: 'DISPONIVEL', qualidade: 84, certificacao: null,
        eventos: ['E-001', 'E-002', 'E-003', 'E-004'], hash: null, bloco: null,
        observacao: 'Lote de estreia da safra 2026. Grãos selecionados por peneira 13 acima.'
      },
      {
        id: 'L-2026-0143', produto: 'cafe_conilon', talhao: 'T-02', produtor: 'U-01', cooperativa: 'U-03',
        safra: 2026, area: 3.3, quantidade: 148, unidade: 'sacas 60 kg', pesoKg: 8880,
        dataColheita: '2026-09-20', umidade: 18.2, tipo: 'Tipo 8',
        umidadeSecagem: 18.2, diasSecagem: 5, destino: 'venda',
        status: 'EM_SECAGEM', qualidade: 71, certificacao: null,
        eventos: ['E-005', 'E-006'], hash: null, bloco: null,
        observacao: 'Colheita em andamento; secagem prevista até 08/10.'
      },
      {
        id: 'L-2026-0088', produto: 'cacau', talhao: 'T-03', produtor: 'U-01', cooperativa: 'U-03',
        safra: 2026, area: 4.0, quantidade: 40, unidade: 'arrobas (15 kg)', pesoKg: 600,
        dataColheita: '2026-08-28', umidade: 7.1, tipo: 'Fermentado 6 dias, amêndoa graúda',
        umidadeSecagem: 7.1, diasSecagem: 12, destino: 'venda',
        status: 'DISPONIVEL', qualidade: 91, certificacao: null,
        eventos: ['E-007', 'E-008', 'E-009'], hash: null, bloco: null,
        observacao: 'Fermentação controlada em cocho de madeira; corte e viragem a cada 24h.'
      },
      {
        id: 'L-2026-0091', produto: 'cacau', talhao: 'T-06', produtor: 'U-02', cooperativa: 'U-03',
        safra: 2026, area: 6.0, quantidade: 120, unidade: 'arrobas (15 kg)', pesoKg: 1800,
        dataColheita: '2026-08-15', umidade: 6.8, tipo: 'Fermentado 7 dias, IG Rondônia',
        umidadeSecagem: 6.8, diasSecagem: 14, destino: 'venda',
        status: 'CERTIFICADO', qualidade: 94, certificacao: 'CERT-RO-2026-0311',
        eventos: ['E-010', 'E-011', 'E-012', 'E-013'], hash: null, bloco: null,
        observacao: 'Lote apto ao selo de Indicação de Procedência Rondônia.'
      },
      {
        id: 'L-2026-0095', produto: 'cacau', talhao: 'T-04', produtor: 'U-01', cooperativa: 'U-03',
        safra: 2026, area: 4.0, quantidade: 28, unidade: 'arrobas (15 kg)', pesoKg: 420,
        dataColheita: '2026-09-25', umidade: 9.4, tipo: 'Fermentado 5 dias',
        umidadeSecagem: 9.4, diasSecagem: 6, destino: 'venda',
        status: 'EM_SECAGEM', qualidade: 78, certificacao: null,
        eventos: ['E-014'], hash: null, bloco: null,
        observacao: 'Secagem em terreiro suspenso.'
      },
      {
        id: 'L-2026-0145', produto: 'cacau', talhao: 'T-04', produtor: 'U-01', cooperativa: 'U-03',
        safra: 2026, area: 4.0, quantidade: 34, unidade: 'arrobas (15 kg)', pesoKg: 510,
        dataColheita: '2026-10-03', umidade: 54.0, tipo: 'Em fermentação — monitorada por sensor',
        umidadeSecagem: 54.0, diasSecagem: 0, destino: 'venda',
        status: 'EM_FERMENTACAO', qualidade: null, certificacao: null,
        eventos: ['E-022', 'E-023'], hash: null, bloco: null,
        observacao: 'Fermentação em cocho de madeira iniciada em 03/10. Temperatura da massa monitorada por sensor a cada 15 minutos.'
      },
      {
        id: 'L-2026-0139', produto: 'cafe_conilon', talhao: 'T-05', produtor: 'U-02', cooperativa: 'U-03',
        safra: 2026, area: 8.0, quantidade: 240, unidade: 'sacas 60 kg', pesoKg: 14400,
        dataColheita: '2026-09-05', umidade: 12.1, tipo: 'Tipo 7, bebida dura, peneira 14',
        umidadeSecagem: 12.1, diasSecagem: 11, destino: 'venda',
        status: 'NA_COOPERATIVA', qualidade: 88, certificacao: null,
        eventos: ['E-015', 'E-016', 'E-017', 'E-018'], hash: null, bloco: null,
        observacao: 'Recebido na COOPRON em 02/10; laudo de classificação emitido.'
      },
      {
        id: 'L-2026-0077', produto: 'cacau', talhao: 'T-03', produtor: 'U-01', cooperativa: null,
        safra: 2026, area: 1.2, quantidade: 18, unidade: 'arrobas (15 kg)', pesoKg: 270,
        dataColheita: '2026-08-10', umidade: 6.9, tipo: 'Fermentado 6 dias, fino',
        umidadeSecagem: 6.9, diasSecagem: 13, destino: 'consumo_proprio',
        status: 'CONSUMIDO_PROPRIO', qualidade: 93, certificacao: null,
        eventos: ['E-019', 'E-020'], hash: null, bloco: null,
        observacao: 'Destinado à produção artesanal de chocolate bean-to-bar do próprio sítio.'
      },
      {
        id: 'L-2026-0064', produto: 'cafe_conilon', talhao: 'T-01', produtor: 'U-01', cooperativa: null,
        safra: 2026, area: 1.0, quantidade: 14, unidade: 'sacas 60 kg', pesoKg: 840,
        dataColheita: '2026-07-28', umidade: 11.8, tipo: 'Tipo 6, bebida dura',
        umidadeSecagem: 11.8, diasSecagem: 10, destino: 'consumo_proprio',
        status: 'CONSUMIDO_PROPRIO', qualidade: 90, certificacao: null,
        eventos: ['E-021'], hash: null, bloco: null,
        observacao: 'Torra própria para consumo da família e venda direta na comunidade.'
      }
    ],

    eventos: [],      // preenchido por semearEventos()
    certificacoes: [
      { id: 'CERT-RO-2026-0311', lote: 'L-2026-0091', tipo: 'Indicação de Procedência Rondônia (INPI)', emissor: 'U-06', validoAte: '2028-08-20', status: 'ATIVO', scoreConformidade: 92, hash: null, bloco: null },
      { id: 'CERT-RA-2026-0188', lote: 'L-2026-0139', tipo: 'Rainforest Alliance — Boas Práticas Agrícolas', emissor: 'U-06', validoAte: '2027-09-30', status: 'EM_ANALISE', scoreConformidade: 78, hash: null, bloco: null }
    ],

    demandas: [
      { id: 'D-01', comprador: 'U-04', produto: 'cafe_conilon', quantidade: 300, unidade: 'sacas 60 kg', precoMax: 1035, especificacoes: 'Umidade ≤ 12,5% · Peneira 13+ · Tipo 7 ou melhor · Defeitos ≤ 80/300g', prazoEntrega: '2026-10-25', exigeRastreabilidade: true, exigeCertificacao: false },
      { id: 'D-02', comprador: 'U-05', produto: 'cacau', quantidade: 150, unidade: 'arrobas (15 kg)', precoMax: 28.50, especificacoes: 'Umidade ≤ 7,5% · Fermentação ≥ 6 dias · Amêndoa graúda · Preferência IG Rondônia', prazoEntrega: '2026-11-05', exigeRastreabilidade: true, exigeCertificacao: true },
      { id: 'D-03', comprador: 'U-04', produto: 'cafe_arabica', quantidade: 500, unidade: 'sacas 60 kg', precoMax: 1640, especificacoes: 'Bebida dura para melhor · Peneira 16+ · Umidade ≤ 12%', prazoEntrega: '2026-12-15', exigeRastreabilidade: true, exigeCertificacao: false },
      { id: 'D-04', comprador: 'U-05', produto: 'cacau', quantidade: 60, unidade: 'arrobas (15 kg)', precoMax: 26.00, especificacoes: 'Umidade ≤ 8% · Fermentação ≥ 5 dias', prazoEntrega: '2026-10-30', exigeRastreabilidade: false, exigeCertificacao: false }
    ],

    contratos: [
      {
        id: 'CT-2026-0041', tipo: 'COMPRA_VENDA_RASTREAVEL', vendedor: 'U-03', comprador: 'U-04',
        lotes: ['L-2026-0130'], produto: 'cafe_conilon', quantidade: 180, unidade: 'sacas 60 kg',
        precoUnitario: 1008.0, valorTotal: 181440.0, moeda: 'BRL', modoPagamento: 'ESCROW',
        status: 'EM_TRANSITO', criadoEm: '2026-09-28', prazoEntrega: '2026-10-10',
        garantiaPercentual: 10, toleranciaDivergenciaPeso: 2,
        etapas: [
          { nome: 'Proposta aceita', status: 'CONCLUIDA', data: '2026-09-28', bloco: null },
          { nome: 'Garantia depositada (escrow)', status: 'CONCLUIDA', data: '2026-09-30', bloco: null },
          { nome: 'Carga despachada', status: 'CONCLUIDA', data: '2026-10-03', bloco: null },
          { nome: 'Recebimento e conferência', status: 'PENDENTE', data: null, bloco: null },
          { nome: 'Liberação do pagamento', status: 'PENDENTE', data: null, bloco: null }
        ], hash: null, bloco: null
      }
    ],
    propostas: [
      { id: 'PR-2026-0102', de: 'U-01', para: 'U-03', lote: 'L-2026-0142', produto: 'cafe_conilon', quantidade: 62, unidade: 'sacas 60 kg', precoPretendido: 1042, status: 'AGUARDANDO_RESPOSTA', criadoEm: '2026-10-05' },
      { id: 'PR-2026-0101', de: 'U-03', para: 'U-04', lote: 'L-2026-0139', produto: 'cafe_conilon', quantidade: 240, unidade: 'sacas 60 kg', precoPretendido: 1025, status: 'EM_NEGOCIACAO', criadoEm: '2026-10-03' }
    ],
    recebimentos: [],

    /* ---------------------------------------------------------------------
     * PARQUE DE SENSORES IoT (camada de campo)
     * Dispositivos reais de mercado, com o protocolo e o consumo que se espera
     * no campo: LoRaWAN para longa distância com baixo consumo, NB-IoT onde há
     * cobertura celular, WiFi na estrutura da casa de fermentação.
     * ------------------------------------------------------------------- */
    sensores: [
      { id: 'EST-01', tipo: 'estacao_meteorologica', nome: 'Estação meteorológica', local: 'Sítio Boa Esperança', talhao: 'T-01', produtor: 'U-01', regiao: 'Cacoal',
        fabricante: 'MeteoRO M-200', protocolo: 'LoRaWAN', intervaloMin: 15, bateria: 87, sinal: -78, energia: 'Solar + bateria', status: 'ATIVO',
        mede: ['chuvaMm', 'tempMedia', 'umidadeRel', 'ventoMs', 'radiacaoMJ', 'et0Mm'], calibracao: '2026-03-14' },
      { id: 'SOL-01', tipo: 'sonda_solo', nome: 'Sonda de umidade do solo (3 profundidades)', local: 'Talhão Alto — irrigado', talhao: 'T-01', produtor: 'U-01', regiao: 'Cacoal',
        fabricante: 'SondaSolo TDR-3', protocolo: 'LoRaWAN', intervaloMin: 30, bateria: 72, sinal: -84, energia: 'Bateria (24 meses)', status: 'ATIVO',
        mede: ['vwc10', 'vwc30', 'vwc60', 'tempSolo'], calibracao: '2026-02-08' },
      { id: 'SOL-02', tipo: 'sonda_solo', nome: 'Sonda de umidade do solo (3 profundidades)', local: 'Talhão Baixo — sequeiro', talhao: 'T-02', produtor: 'U-01', regiao: 'Cacoal',
        fabricante: 'SondaSolo TDR-3', protocolo: 'LoRaWAN', intervaloMin: 30, bateria: 64, sinal: -92, energia: 'Bateria (24 meses)', status: 'ATIVO',
        mede: ['vwc10', 'vwc30', 'vwc60', 'tempSolo'], calibracao: '2026-02-08' },
      { id: 'FER-01', tipo: 'sensor_fermentacao', nome: 'Sensor de fermentação da massa', local: 'Casa de fermentação', talhao: 'T-04', produtor: 'U-01', regiao: 'Cacoal',
        lote: 'L-2026-0145', fabricante: 'FermentSense CS-2', protocolo: 'WiFi', intervaloMin: 15, bateria: 95, sinal: -58, energia: 'Rede elétrica', status: 'ATIVO',
        mede: ['tempMassa', 'tempAmbiente', 'phEst'], calibracao: '2026-09-20' },
      { id: 'SEC-01', tipo: 'sensor_secagem', nome: 'Sensor de secagem do terreiro', local: 'Terreiro suspenso', talhao: 'T-03', produtor: 'U-01', regiao: 'Cacoal',
        fabricante: 'DreyTec UM-500', protocolo: 'LoRaWAN', intervaloMin: 30, bateria: 81, sinal: -88, energia: 'Solar + bateria', status: 'ATIVO',
        mede: ['umidadeGrao', 'tempMedia', 'umidadeRel'], calibracao: '2026-04-02' },
      { id: 'SEC-03', tipo: 'sensor_secagem', nome: 'Sensor de secagem do terreiro novo', local: 'Terreiro suspenso do Talhão Novo', talhao: 'T-03', produtor: 'U-01', regiao: 'Cacoal',
        lote: 'L-2026-0088', fabricante: 'DreyTec UM-500', protocolo: 'LoRaWAN', intervaloMin: 30, bateria: 84, sinal: -87, energia: 'Solar + bateria', status: 'ATIVO',
        mede: ['umidadeGrao', 'tempMedia', 'umidadeRel'], calibracao: '2026-04-02' },
      { id: 'FOLHA-01', tipo: 'molhamento_foliar', nome: 'Sensor de molhamento foliar', local: 'Cacau do Córrego', talhao: 'T-03', produtor: 'U-01', regiao: 'Cacoal',
        fabricante: 'LeafSense LS-1', protocolo: 'LoRaWAN', intervaloMin: 15, bateria: 58, sinal: -95, energia: 'Solar + bateria', status: 'ATENCAO',
        mede: ['molhamentoFoliar', 'umidadeRel', 'tempMedia'], calibracao: '2025-11-30' },
      { id: 'FLUX-01', tipo: 'medidor_vazao', nome: 'Medidor de vazão do gotejamento', local: 'Talhão Alto — irrigado', talhao: 'T-01', produtor: 'U-01', regiao: 'Cacoal',
        fabricante: 'AgroFlow F-10', protocolo: 'NB-IoT', intervaloMin: 60, bateria: 91, sinal: -71, energia: 'Solar + bateria', status: 'ATIVO',
        mede: ['vazaoLh', 'mmAplicado'], calibracao: '2026-05-18' },
      { id: 'EST-02', tipo: 'estacao_meteorologica', nome: 'Estação meteorológica', local: 'Fazenda Santa Luzia', talhao: 'T-05', produtor: 'U-02', regiao: 'Rolim de Moura',
        fabricante: 'MeteoRO M-200', protocolo: 'LoRaWAN', intervaloMin: 15, bateria: 93, sinal: -74, energia: 'Solar + bateria', status: 'ATIVO',
        mede: ['chuvaMm', 'tempMedia', 'umidadeRel', 'ventoMs', 'radiacaoMJ', 'et0Mm'], calibracao: '2026-01-22' },
      { id: 'SOL-03', tipo: 'sonda_solo', nome: 'Sonda de umidade do solo (3 profundidades)', local: 'Santa Luzia Norte — pivô', talhao: 'T-05', produtor: 'U-02', regiao: 'Rolim de Moura',
        fabricante: 'SondaSolo TDR-3', protocolo: 'LoRaWAN', intervaloMin: 30, bateria: 69, sinal: -86, energia: 'Bateria (24 meses)', status: 'ATIVO',
        mede: ['vwc10', 'vwc30', 'vwc60', 'tempSolo'], calibracao: '2026-02-08' },
      { id: 'FER-02', tipo: 'sensor_fermentacao', nome: 'Sensor de fermentação da massa', local: 'Casa de fermentação Santa Luzia', talhao: 'T-06', produtor: 'U-02', regiao: 'Rolim de Moura',
        lote: 'L-2026-0091', fabricante: 'FermentSense CS-2', protocolo: 'WiFi', intervaloMin: 15, bateria: 88, sinal: -61, energia: 'Rede elétrica', status: 'ATIVO',
        mede: ['tempMassa', 'tempAmbiente', 'phEst'], calibracao: '2026-07-11' },
      { id: 'SEC-02', tipo: 'sensor_secagem', nome: 'Sensor do secador rotativo', local: 'Secador rotativo', talhao: 'T-05', produtor: 'U-02', regiao: 'Rolim de Moura',
        lote: 'L-2026-0095', fabricante: 'DreyTec UM-500', protocolo: 'NB-IoT', intervaloMin: 30, bateria: 77, sinal: -80, energia: 'Rede elétrica', status: 'ATIVO',
        mede: ['umidadeGrao', 'tempMedia', 'umidadeRel'], calibracao: '2026-06-05' },
      { id: 'GATE-01', tipo: 'gateway', nome: 'Gateway LoRaWAN da cooperativa', local: 'Armazém COOPRON — Cacoal', talhao: null, produtor: 'U-03', regiao: 'Cacoal',
        fabricante: 'COOPRON GW-8', protocolo: 'LoRaWAN (8 canais)', intervaloMin: 60, bateria: 100, sinal: 0, energia: 'Rede elétrica + nobreak', status: 'ATIVO',
        /* O gateway não mede a lavoura: mede a própria rede — pacotes recebidos,
           sensores conectados, latência e taxa de entrega. É a saúde do enlace. */
        mede: ['pacotesRecebidos', 'sensoresConectados', 'latenciaMs', 'taxaEntrega'], calibracao: '2026-01-10', dispositivosConectados: 8 }
    ],

    /* Lotes de leituras já ancorados na blockchain (histórico) */
    ancoragensIoT: [],
    /* Registro das leituras deliberadamente alteradas no modo demonstração:
       serve para provar que a prova de Merkle detecta a adulteração. */
    leiturasAdulteradas: [],
    alertas: []
  };

  /* Série climática diária — chuva (mm), temperatura média e umidade relativa */
  function gerarClima(regiao, ano, dias, semente) {
    var rnd = mulberry32(semente);
    /* Segundo gerador, independente: usado apenas para a temperatura mínima,
       para não alterar a sequência já validada de chuva/temperatura/umidade. */
    var rndMin = mulberry32(semente + 777);
    var out = [], hoje = new Date('2026-10-06T00:00:00-04:00');
    for (var i = dias - 1; i >= 0; i--) {
      var d = new Date(hoje.getTime() - i * 86400000);
      var mes = Number(d.toISOString().slice(5, 7));   // lido do rótulo UTC: independe do fuso do aparelho
      var chuvaBase = (mes >= 10 || mes <= 4) ? 9.5 : 3.2;       // período chuvoso amazônico
      var chuva = rnd() < ((mes >= 10 || mes <= 4) ? 0.55 : 0.28) ? chuvaBase * (0.4 + rnd() * 2.2) : 0;
      var tMedia = Math.round((26 + rnd() * 5) * 10) / 10;
      var tMax = Math.round((31 + rnd() * 5) * 10) / 10;
      out.push({
        data: d.toISOString().slice(0, 10),
        chuvaMm: Math.round(chuva * 10) / 10,
        tempMedia: tMedia,
        tempMax: tMax,
        /* amplitude térmica diurna típica da região: 6 a 10 °C */
        tempMin: Math.round((tMedia - (3.0 + rndMin() * 1.6)) * 10) / 10,
        umidadeRel: Math.round(70 + rnd() * 22),
        regiao: regiao
      });
    }
    return out;
  }

  /* Eventos da cadeia — cada um vira uma transação na blockchain */
  var EVENTOS_SEED = [
    ['E-001', 'COLHEITA', 'L-2026-0142', 'U-01', 'Talhão T-01, Sítio Boa Esperança — Cacoal/RO', 'Colheita mecanizada em 3,2 ha: 62 sacas colhidas, 4,8 sacas/hora', '2026-09-12T09:20:00-04:00'],
    ['E-002', 'SECAGEM', 'L-2026-0142', 'U-01', 'Terreiro suspenso, Sítio Boa Esperança', 'Secagem em terreiro suspenso por 9 dias; umidade final 12,4%', '2026-09-21T16:40:00-04:00'],
    ['E-003', 'CLASSIFICACAO', 'L-2026-0142', 'U-03', 'Laboratório COOPRON — Cacoal/RO', 'Laudo: Tipo 7, bebida dura, peneira 13+ (68%), defeitos 62/300g', '2026-09-26T11:05:00-04:00'],
    ['E-004', 'ANALISE_IA', 'L-2026-0142', 'U-01', 'Plataforma AgroChain', 'Julga-lote v1.0: score 84/100 · recomendação: vender no mercado futuro 30 dias', '2026-10-05T08:15:00-04:00'],
    ['E-005', 'COLHEITA', 'L-2026-0143', 'U-01', 'Talhão T-02, Sítio Boa Esperança — Cacoal/RO', 'Colheita manual parcial: 148 sacas colhidas em 3,3 ha', '2026-09-20T08:00:00-04:00'],
    ['E-006', 'SECAGEM', 'L-2026-0143', 'U-01', 'Secador mecânico, Sítio Boa Esperança', 'Secagem mecânica iniciada; umidade aferida 18,2% (em processo)', '2026-10-02T14:30:00-04:00'],
    ['E-007', 'COLHEITA', 'L-2026-0088', 'U-01', 'Talhão T-03, Sítio Boa Esperança — Cacoal/RO', 'Colheita de cacau: 600 kg de amêndoa úmida colhida', '2026-08-28T07:40:00-04:00'],
    ['E-008', 'FERMENTACAO', 'L-2026-0088', 'U-01', 'Casa de fermentação, Sítio Boa Esperança', 'Fermentação em cocho de madeira por 6 dias, viragem a cada 24h, 42°C pico', '2026-09-03T18:00:00-04:00'],
    ['E-009', 'SECAGEM', 'L-2026-0088', 'U-01', 'Terreiro suspenso, Sítio Boa Esperança', 'Secagem natural 12 dias; umidade final 7,1%. Teste de corte: 92% grãos bem fermentados', '2026-09-15T17:20:00-04:00'],
    ['E-010', 'COLHEITA', 'L-2026-0091', 'U-02', 'Talhão T-06, Fazenda Santa Luzia — Rolim de Moura/RO', 'Colheita de cacau: 1.800 kg colhidos, frutos maduros selecionados', '2026-08-15T07:10:00-04:00'],
    ['E-011', 'FERMENTACAO', 'L-2026-0091', 'U-02', 'Casa de fermentação, Fazenda Santa Luzia', 'Fermentação 7 dias em caixas de madeira; curva térmica registrada por sensores', '2026-08-22T18:30:00-04:00'],
    ['E-012', 'LAUDO_QUALIDADE', 'L-2026-0091', 'U-06', 'Laboratório da Certificadora Rondônia IG', 'Laudo IG: amêndoa graúda 88%, fermentação 7/7, defeitos 2%, umidade 6,8%', '2026-09-02T10:45:00-04:00'],
    ['E-013', 'CERTIFICACAO', 'L-2026-0091', 'U-06', 'Certificadora Rondônia IG', 'Selo Indicação de Procedência Rondônia emitido (CERT-RO-2026-0311)', '2026-09-03T09:00:00-04:00'],
    ['E-014', 'COLHEITA', 'L-2026-0095', 'U-01', 'Talhão T-04, Sítio Boa Esperança — Cacoal/RO', 'Colheita de cacau: 420 kg colhidos em 4 ha', '2026-09-25T07:30:00-04:00'],
    ['E-015', 'COLHEITA', 'L-2026-0139', 'U-02', 'Talhão T-05, Fazenda Santa Luzia — Rolim de Moura/RO', 'Colheita mecanizada: 240 sacas em 8 ha (30 sc/ha)', '2026-09-05T08:15:00-04:00'],
    ['E-016', 'SECAGEM', 'L-2026-0139', 'U-02', 'Secador rotativo, Fazenda Santa Luzia', 'Secagem e beneficiamento; umidade final 12,1%, peneira 14', '2026-09-17T15:00:00-04:00'],
    ['E-017', 'TRANSPORTE', 'L-2026-0139', 'U-02', 'Rolim de Moura → Cacoal (58 km)', 'Transporte rodoviário em carga lacrada; lacre nº 44.812-B; rastreio por satélite', '2026-10-01T06:50:00-04:00'],
    ['E-018', 'RECEBIMENTO_COOP', 'L-2026-0139', 'U-03', 'Armazém COOPRON — Cacoal/RO', 'Recebimento conferido: 240 sacas, peso 14.400 kg, umidade 12,1% — aprovado', '2026-10-02T10:20:00-04:00'],
    ['E-019', 'DESTINO_CONSUMO', 'L-2026-0077', 'U-01', 'Sítio Boa Esperança — unidade artesanal', 'Destinado à produção própria de chocolate bean-to-bar (270 kg de amêndoa)', '2026-09-16T09:00:00-04:00'],
    ['E-020', 'BENEFICIAMENTO_PROPRIO', 'L-2026-0077', 'U-01', 'Unidade artesanal, Sítio Boa Esperança', 'Torra, moagem e temperagem: 310 barras de 80g produzidas (marca "Cacau do Córrego")', '2026-09-28T18:30:00-04:00'],
    ['E-022', 'COLHEITA', 'L-2026-0145', 'U-01', 'Talhão T-04, Sítio Boa Esperança — Cacoal/RO', 'Colheita de cacau: 510 kg de amêndoa úmida colhida para fermentação monitorada', '2026-10-03T07:25:00-04:00'],
    ['E-023', 'FERMENTACAO', 'L-2026-0145', 'U-01', 'Casa de fermentação, Sítio Boa Esperança', 'Fermentação iniciada em cocho de madeira; sensor FER-01 instalado no centro da massa', '2026-10-03T18:00:00-04:00'],
    ['E-021', 'TORRA_PROPRIA', 'L-2026-0064', 'U-01', 'Unidade artesanal, Sítio Boa Esperança', 'Torra média de 14 sacas para consumo próprio e venda direta na comunidade', '2026-08-20T10:00:00-04:00']
  ];

  DB.eventos = EVENTOS_SEED.map(function (e) {
    return {
      id: e[0], tipo: e[1], lote: e[2], autor: e[3], local: e[4], descricao: e[5],
      timestamp: e[6], hash: null, bloco: null, assinatura: null
    };
  });

  /* ---------- Consultas utilitárias ---------- */
  function produtos() {
    return ['cafe_conilon', 'cafe_arabica', 'cacau'];
  }
  function nomeProduto(p) {
    return { cafe_conilon: 'Café Conilon', cafe_arabica: 'Café Arábica', cacau: 'Cacau' }[p] || p;
  }
  function nomeUsuario(id) {
    var u = DB.usuarios.filter(function (x) { return x.id === id; })[0];
    return u ? u.nome : id;
  }
  function orgUsuario(id) {
    var u = DB.usuarios.filter(function (x) { return x.id === id; })[0];
    return u ? u.org : id;
  }
  function talhao(id) { return DB.talhoes.filter(function (t) { return t.id === id; })[0]; }
  function lote(id) { return DB.lotes.filter(function (l) { return l.id === id; })[0]; }
  function eventosDoLote(id) { return DB.eventos.filter(function (e) { return e.lote === id; }); }
  function lotesDoProdutor(id) { return DB.lotes.filter(function (l) { return l.produtor === id; }); }
  function precoAtual(p) { return DB.precos[p][DB.precos[p].length - 1].preco; }
  function unidadePreco(p) { return DB.precoAncora[p].unidade; }

  /* Peso financeiro de um lote (normaliza arrobas/sacas para valor em R$) */
  function valorLote(l) {
    var preco = precoAtual(l.produto);
    if (l.produto === 'cacau') return l.pesoKg * preco;          // preço por kg
    return l.quantidade * preco;                                  // preço por saca 60 kg
  }

  /* ---------- Persistência ---------- */
  var CHAVE = 'agrochain:estado:v1';
  function serializar() {
    return JSON.stringify({ DB: DB, hashLedger: (global.Ledger && global.Ledger.hashCadeia) ? global.Ledger.hashCadeia() : null, salvoEm: new Date().toISOString() });
  }
  function reiniciar() { try { localStorage.removeItem(CHAVE); } catch (e) {} location.reload(); }

  /* Cópia profunda da semente, tirada no carregamento. Permite que o botão
     "Reiniciar demonstração" volte ao estado inicial sem recarregar a página
     — essencial no preview em iframe, onde o recarregamento pode ser bloqueado. */
  var SEMENTE = JSON.parse(JSON.stringify(DB));
  function restaurarSemente() {
    var copia = JSON.parse(JSON.stringify(SEMENTE));
    Object.keys(DB).forEach(function (k) { delete DB[k]; });
    Object.keys(copia).forEach(function (k) { DB[k] = copia[k]; });
    return DB;
  }

  global.DB = DB;
  global.Dados = {
    restaurarSemente: restaurarSemente,
    produtos: produtos, nomeProduto: nomeProduto, nomeUsuario: nomeUsuario, orgUsuario: orgUsuario,
    talhao: talhao, lote: lote, eventosDoLote: eventosDoLote, lotesDoProdutor: lotesDoProdutor,
    precoAtual: precoAtual, unidadePreco: unidadePreco, valorLote: valorLote,
    reiniciar: reiniciar, serializar: serializar, CHAVE: CHAVE, rnd: mulberry32
  };
})(typeof window !== 'undefined' ? window : globalThis);
