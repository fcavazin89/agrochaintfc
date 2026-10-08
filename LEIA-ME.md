# AgroChain · Protótipo de rastreabilidade de café e cacau com blockchain e IA

Piloto para a cadeia produtiva de Rondônia: origem verificável do lote, previsão de
safra e de preço, decisão de venda assistida por IA, pagamento em escrow,
certificação auditável — e um **ERP agrícola completo** que apura o resultado da
propriedade sobre os mesmos dados que alimentam a cadeia.

---

## 1. O que abrir primeiro

| Arquivo | O que é |
|---|---|
| **`prototipo-agrochain/AgroChain.html`** | **O protótipo.** Aplicação completa em arquivo único (625 KB), 14 módulos embutidos. Abre em qualquer navegador, funciona **sem internet**, sem instalar nada. |
| `docs/AgroChain-Documento-Tecnico.html` | Documento técnico (12 seções): problema, arquitetura, blockchain, IoT, IA, **ERP integrado**, métricas, riscos, plano de implantação e anexos. |
| `design.md` | **Sistema de design v3.0** — a fonte da verdade do layout: dois planos de cor (claro editorial + escopo escuro de campo), tipografia com serifa institucional, componentes, regras de gráfico e de ícone, movimento e acessibilidade. |
| `prototipo-agrochain/design/` | Dezesseis capturas de referência das telas (painel, ERP nas seis abas, IoT, blockchain, mercado, modo imersivo) e o script `capturar.js` que as gera. |
| `ia/relatorio_ml.txt` | Resultado do treinamento dos modelos de aprendizado de máquina. |
| `blockchain/contracts/AgroChainRastreio.sol` | Contrato inteligente de produção (compilado com solc 0.8.37). |

O protótipo também está no ar pelo servidor local desta sessão (`index.html` redireciona
para o aplicativo).

---

## 2. Como usar o protótipo (roteiro de 8 minutos)

1. **Painel** — entre como *João Silva (produtor)*: alertas da IA na lavoura, previsão de safra e o cartão de sensores em campo.
2. **Colheita e lotes** — registre uma colheita ao vivo: os eventos são criados, a IA dá o score de qualidade e o lote é ancorado na blockchain.
3. **IoT e sensores** — mapa dos 13 dispositivos, leituras ao vivo com o que foi **rejeitado** pelo controle de qualidade, indicadores derivados (graus-dia, balanço hídrico, fermentação, secagem) e, em *Ancoragem e provas*, clique em **⛓️ Ancorar** e depois em **🔧 Simular adulteração**: a prova de Merkle deixa de conferir. *Restaurar* devolve a integridade.
4. **Blockchain** — **⛏️ Minerar bloco** (o contador de tentativas é real) e **😈 Simular fraude**: a verificação acusa a adulteração na hora.
5. **Mercado e contratos** — avance um contrato em escrow com divergência de peso dentro e fora da tolerância: no segundo caso o pagamento trava sozinho.
6. **ERP agro** (novo) — seis abas:
   - *Visão*: resultado, margem, ponto de equilíbrio, alertas e o mapa de calor de custo/ha por talhão e mês.
   - *Financeiro*: contas a receber e a pagar com composição das etapas do contrato, fluxo de caixa de 12 meses, projeção de 90 dias, DRE em cascata, orçado × realizado e o painel do escrow.
   - *Custos*: custo por saca/arroba calculado com a **produtividade prevista pela IA**. Abra a ficha de um talhão: composição do custo, fechamento de safra, evidência de sensor de cada aplicação e o custo de energia da irrigação comparado à ET0.
   -   *Estoque*: insumos e produto, custo médio, mínimo de segurança, movimentações e o estoque valorizado ao preço que a IA dá para cada lote.
   - *Operações*: registre compra de insumo, aplicação no talhão (baixa de estoque + custo direto + evidência do sensor), venda do lote (receita + conta a receber), liquidação de título e sincronização do escrow.
   - *Fechamento*: 19 contas → 19 hashes → raiz de Merkle → ancoragem em bloco → prova de inclusão.
7. **Modo imersivo** — botão **⛶ Modo imersivo** no topo (ou `Esc` para sair): painel de tela cheia com KPIs em corpo grande, resultados acumulados, custo × preço por talhão, o que o campo mede agora e o estado da cadeia, atualizando a cada 5 segundos.
8. **Assistente** — pergunte *"quando devo vender o lote de cacau?"* e repare que a resposta cita as fontes dos próprios dados.

Troque o perfil no topo para ver o **mesmo sistema pelos olhos da cooperativa, da
indústria, da certificadora e da auditoria** — a auditoria é somente leitura e o sistema
rejeita registro por quem não tem permissão.

---

## 3. Estrutura do projeto

```
prototipo-agrochain/
  AgroChain.html          aplicação final (arquivo único, offline)
  index.html              atalho que abre o protótipo
  template.html           molde visual (HTML + CSS)
  construir.py            build do arquivo único
  src/
    10_dados.js           dados do cenário e séries de preço reais de 06/10/2026
    12_icones.js          conjunto de ícones SVG do produto (traço único, sem fonte nem emoji)
    15_graficos.js        biblioteca de gráficos em SVG (linha, área, barras, cascata,
                          rosca, medidor, heatmap, sparkline, anel, estado vazio)
    20_ia.js              IA: safra, preço, sanidade, qualidade, anomalias, assistente
    30_crypto.js          SHA-256 próprio, Merkle, prova de trabalho
    40_qr.js              gerador de QR Code próprio (validado por leitor real)
    45_iot.js             IoT: 13 sensores, séries de medição, controle de qualidade,
                          indicadores derivados, ancoragem por Merkle e prova de inclusão
    50_ledger.js          blockchain: blocos, mempool, permissões, escrow, selo
    55_erp.js             ERP: financeiro, estoques, custos por talhão e safra, compras,
                          vendas, pessoas, maquinário, fechamento contábil ancorado
    60_app.js             interface: navegação, painel, lavoura, lotes
    70_app2.js            interface: IA, blockchain, mercado, certificação, auditoria
    80_iot_ui.js          interface: painel de IoT
    85_erp_ui.js          interface: seis abas do ERP
    88_imersivo.js        modo imersivo (painel de tela cheia)
  design/
    capturar.js           captura as dezesseis telas de referência (Chrome headless)
    01-painel.png …       capturas de referência do sistema de design em uso
  testes/
    teste_app.js          221 verificações automatizadas
    smoke_html.js         executa o AgroChain.html construído em DOM simulado
    ensaio_erp.js         ensaio de ponta a ponta do ERP (números e ciclo contábil)
    sonda_erp.js          sonda de valores do ERP para conferência manual
ia/
  treinar_modelos.py      pipeline de ML (Gradient Boosting / Random Forest)
  modelos.json            métricas, importância de variáveis, cenário aplicado
blockchain/
  contracts/AgroChainRastreio.sol   contrato de produção
  build/                            ABI e bytecode compilados
docs/
  AgroChain-Documento-Tecnico.html  documento técnico completo (12 seções)
```

---

## 4. Comandos

```bash
# reconstruir o arquivo único depois de editar qualquer módulo em src/
cd prototipo-agrochain && python3 construir.py

# rodar a bateria de 221 verificações
node testes/teste_app.js

# ensaio de ponta a ponta do ERP (imprime os números apurados)
node testes/ensaio_erp.js

# executar o próprio AgroChain.html em DOM simulado (smoke do artefato)
node testes/smoke_html.js

# retreinar os modelos de IA (≈ 1,5 min)
python3 ia/treinar_modelos.py

# subir o app em servidor local
cd prototipo-agrochain && python3 -m http.server 8000
```

---

## 5. Números verificados

**Mercado (06/10/2026, Cepea/Esalq):** café arábica R$ 1.568,95/saca · conilon
R$ 976,94/saca. Cacau em correção em 2026, referência regional de R$ 25,80/kg.

**Qualidade técnica:**
- **221/221** verificações automatizadas aprovadas (12 telas × 5 perfis, 6 abas de IA, 5 abas de IoT, 6 abas do ERP, biblioteca de gráficos, modo imersivo, permissões, escrow, fechamento com Merkle, fraude, selo, assistente).
- SHA-256 conferido contra a biblioteca de referência do Python em 7 vetores de teste.
- QR Code próprio validado por leitor independente (versões 1 a 9 decodificadas).
- Prova de trabalho real: o nonce exibido na tela é o nonce do bloco finalizado.
- Contrato Solidity: 0 erros e 0 avisos no solc 0.8.37 · 14.397 bytes · 25 funções públicas · 12 eventos.
- Aplicação sem nenhuma dependência externa — nem CDN, nem fonte, nem biblioteca de gráficos, nem fonte de ícone.
- Layout v3.0 conferido em captura real de navegador: dezesseis telas + painel imersivo, sem quadradinho de emoji e sem etiqueta quebrada.

**ERP (propriedade de Cacoal, safra 2026 — 1.124 lançamentos, 87 títulos, 572 movimentações):**

| Indicador | Valor |
|---|---|
| Receita líquida (12 meses) | R$ 503.218,93 |
| Custo de produção | R$ 264.296,79 |
| **Resultado** | **R$ 119.770,13 — margem líquida de 23,8%** |
| Caixa | R$ 167.993,27 (partiu de R$ 96.000,00) |
| Estoque | R$ 158.022,28 (R$ 145.952 disponíveis para venda ao preço da IA) |
| Custo por hectare | R$ 24.774,33 |
| Ponto de equilíbrio | 107% de cobertura |
| Endividamento | 0% do patrimônio |

Custo por talhão: Talhão Alto R$ 518,62/saca (margem +46,9%) · Talhão Baixo R$ 720,03 (+26,3%) ·
Cacau do Córrego R$ 451,50/@ (−16,7%) · Cacau Novo R$ 656,42/@ (−69,6%). O denominador do
custo é a **produtividade prevista pela IA** — se a lavoura deve render menos, o custo por
saca sobe antes da colheita.

Fechamento contábil de 09/2026: 19 contas → 19 hashes → raiz de Merkle
`99933964c295…`, ancorada no bloco **#3** em uma transação `FECHAMENTO_CONTABIL`, com
prova de inclusão de 5 níveis conferindo contra a raiz gravada.

**Camada de IoT (sensores simulados por modelos físicos — Seção 5 do documento):**

- **13 dispositivos** de 7 tipos em 6 talhões, 3 protocolos (LoRaWAN, WiFi, NB-IoT) e 816 leituras por dia.
- **Controle de qualidade por mediana e MAD**: rejeita valor fisicamente impossível mantendo o bruto na trilha, sem descartar o pulso legítimo de irrigação.
- **Indicadores derivados**: 581 graus-dia em 30 dias; saldo hídrico de +29,0 mm no Talhão Alto e −13,7 mm no Talhão Baixo; molhamento foliar de 23 h (café) e 27 h (cacau) favoráveis em 7 dias.
- **Fermentação projetiva**: 122 °C·h acumulados com projeção de 271 °C·h (faixa ideal 150–400); o lote certificado fecha em 267 °C·h.
- **Ancoragem por Merkle**: 49 leituras → 1 raiz em uma transação `LEITURA_SENSOR`, com prova de inclusão de 6 níveis que falha de propósito quando a leitura é adulterada.

**Aprendizado de máquina (dados sintéticos calibrados — ressalva na Seção 7 do documento):**
- Produtividade de café conilon: R² 0,960 · MAPE 4,81%
- Produtividade de cacau: R² 0,956 · MAPE 5,24%
- Preço do conilon em 30 dias: R² 0,936 · MAPE 5,42% (≈ R$ 53/saca)
- Direção do preço do cacau: 71,6% de acerto · AUC 0,792

---

## 6. Aviso de escopo

Este é um **protótipo funcional de demonstração**. A blockchain é real em estrutura
criptográfica (SHA-256, Merkle, prova de trabalho, permissões), mas roda localmente em um
único ambiente — em produção, cada instituição do consórcio mantém o próprio nó. Os modelos
de IA embutidos no app são determinísticos e explicáveis; o pipeline de aprendizado de
máquina foi treinado com dados sintéticos calibrados e precisa ser revalidado com o
histórico real da cooperativa. O ERP apura resultado, estoque e custo com base nos
lançamentos do cenário, mas **não emite nota fiscal, não apura tributo por regime e não
assina SPED** — é sistema de gestão e de evidência, não sistema fiscal. Produtores e lotes
são fictícios; geografia, culturas, cotações e cenário de mercado correspondem à realidade
de Rondônia em 2026.
