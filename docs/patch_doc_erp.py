#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Atualiza o documento técnico para a versão 1.1:
- insere a SEÇÃO 9 (o ERP integrado, os gráficos e o modo imersivo);
- renumera as seções seguintes (9->10, 10->11, 11->12) e seus anexos;
- atualiza os números verificados: 136 -> 221 verificações, 363 KB -> 615 KB,
  onze -> doze áreas, e a lista de arquivos entregues.
"""
import io, sys

ARQ = 'docs/AgroChain-Documento-Tecnico.html'
s = io.open(ARQ, encoding='utf-8').read()

def sub(a, b, n=1):
    global s
    c = s.count(a)
    if c != n:
        sys.exit('FALHA: âncora %d vez(es) (esperado %d):\n%s' % (c, n, a[:200]))
    s = s.replace(a, b, n)

# ------------------------------------------------------------------ 1. renumeração
sub('<h2><span class="num">SEÇÃO 11</span>Anexos técnicos</h2>',
    '<h2><span class="num">SEÇÃO 12</span>Anexos técnicos</h2>')
sub('<h2><span class="num">SEÇÃO 10</span>Plano de implantação</h2>',
    '<h2><span class="num">SEÇÃO 11</span>Plano de implantação</h2>')
sub('<h2><span class="num">SEÇÃO 9</span>O que o protótipo prova — e o que ainda não é</h2>',
    '<h2><span class="num">SEÇÃO 10</span>O que o protótipo prova — e o que ainda não é</h2>')
sub('<h3>9.1 Como apresentar o protótipo em cinco minutos</h3>',
    '<h3>10.1 Como apresentar o protótipo em cinco minutos</h3>')
for a, b in [('11.1', '12.1'), ('11.2', '12.2'), ('11.3', '12.3'), ('11.4', '12.4')]:
    sub('<h3>%s ' % a, '<h3>%s ' % b)

# ------------------------------------------------------------------ 2. nova seção 9
NOVA = '''<!-- ====================== 9 ====================== -->
<h2><span class="num">SEÇÃO 9</span>O ERP integrado: a contabilidade que enxerga a lavoura</h2>
<div class="fio"></div>

<p>Rastreabilidade sem gestão vira obrigação contábil: o produtor registra eventos, cumpre auditoria e continua sem saber se ganhou dinheiro. Por isso o protótipo ganhou um <b>ERP agrícola completo</b>, e não um relatório a mais: financeiro, estoques, custos por talhão e por safra, compras e fornecedores, vendas e pedidos, pessoas e maquinário — tudo apurado sobre os mesmos dados que alimentam a cadeia e a inteligência artificial.</p>

<div class="duas">
  <div class="bloco verde">
    <h4>A diferença central: o custo por saca usa a previsão da IA</h4>
    <p class="nota-rodape">Em um ERP comum, o custo por unidade só existe depois da colheita, dividindo o gasto pelo volume que apareceu. Aqui o denominador é a <b>produtividade prevista pelo modelo de IA</b> para aquele talhão. Se a lavoura deve render menos, o custo por saca sobe <i>antes</i> da colheita — e o produtor descobre o problema a tempo de reagir, não no dia da venda.</p>
  </div>
  <div class="bloco ouro">
    <h4>Nenhum número vem de fora do sistema</h4>
    <p class="nota-rodape">Consumo de insumo sai do estoque e entra no custo do talhão; a colheita registrada na cadeia define o volume produzido; a leitura do sensor justifica (ou contesta) cada aplicação; o escrow do contrato vira conta a receber; e o fechamento do mês é ancorado na blockchain. É a mesma base de dados, vista de quatro ângulos.</p>
  </div>
</div>

<h3>9.1 O que o ERP cobre</h3>
<table>
  <thead><tr><th>Módulo</th><th>O que entrega</th><th>De onde vem o dado</th></tr></thead>
  <tbody>
    <tr><td><b>Financeiro</b></td><td>Contas a receber e a pagar com composição, fluxo de caixa de 12 meses, projeção de 90 dias, DRE com cascata, ponto de equilíbrio, orçado × realizado, índices de liquidez e endividamento</td><td>1.124 lançamentos contábeis gerados a partir de 87 títulos, folha, patrimônio e planos de venda do cenário</td></tr>
    <tr><td><b>Estoques</b></td><td>19 itens entre insumos e produto acabado, custo médio ponderado, mínimo de segurança, ponto de reposição e rastreio do lote até o talhão</td><td>572 movimentações de entrada e saída, ligadas às compras, às aplicações e às vendas</td></tr>
    <tr><td><b>Custos</b></td><td>Custo direto e rateio da estrutura por talhão, custo por hectare, custo por saca ou arroba, margem contra o preço de mercado e contra o preço do lote rastreado, fechamento de safra</td><td>Lançamentos com centro de custo por talhão + baixas de estoque + previsão de safra da IA</td></tr>
    <tr><td><b>Operações</b></td><td>Compra de insumo com recálculo do custo médio, aplicação no talhão com baixa de estoque, venda com baixa do lote, liquidação de título, sincronização do escrow</td><td>Ações do próprio usuário, gravadas em lançamento, movimentação, título e transação na cadeia</td></tr>
    <tr><td><b>Pessoas e máquinas</b></td><td>Folha de 12 competências com encargos, equipes de diaristas de colheita, conformidade de NR-31 por pessoa, custo por hora de 9 ativos com depreciação, manutenção, combustível e operador</td><td>Cadastro de patrimônio do cenário, com horas de uso medidas e depreciação linear pelo valor de reposição</td></tr>
    <tr><td><b>Fechamento</b></td><td>Balancete do mês com um hash por conta, raiz de Merkle, ancoragem na blockchain e prova de inclusão de qualquer conta</td><td>Os lançamentos do período, recalculados na hora da conferência</td></tr>
  </tbody>
</table>

<h3>9.2 A integração com IA, sensores e blockchain</h3>
<p>Cinco ligações fazem o ERP deixar de ser um sistema isolado. Todas funcionam no protótipo e podem ser acionadas na demonstração:</p>
<table>
  <thead><tr><th>Ligação</th><th>Como funciona na prática</th></tr></thead>
  <tbody>
    <tr><td><b>IA → custo</b></td><td>O denominador do custo por unidade é a previsão de safra do talhão. Para o Talhão Alto, a IA prevê 52,9 sacas/ha em 3,2 ha (169,4 sacas) e o custo projetado fica em R$ 518,62 por saca — usado em toda a apuração de margem, antes de a colheita terminar.</td></tr>
    <tr><td><b>Estoque → custo</b></td><td>Ao lançar uma aplicação, o insumo é baixado do estoque pelo custo médio e o valor entra direto como custo direto daquele talhão, com o documento da operação. Aplicar 0,5 L do defensivo baixa o saldo na hora e altera o custo por saca do talhão.</td></tr>
    <tr><td><b>Sensor → evidência</b></td><td>Cada aplicação é confrontada com a medição de campo: horas de molhamento foliar na faixa de infecção (ferrugem no café, vassoura-de-bruxa no cacau) ou a janela climática de chuva e umidade relativa anterior à data. O sistema diz, sem rodeio, se o gasto tinha base medida — e o mesmo vale para a energia da irrigação, comparada à lâmina aplicada contra a ET0.</td></tr>
    <tr><td><b>Escrow → contas a receber</b></td><td>Contrato em escrow gera o título a receber no escopo de quem vende e a obrigação a pagar no escopo de quem compra, com as cinco etapas do contrato na composição do título. Quando a etapa de liberação é concluída na cadeia, a sincronização quita o título — sem digitação e sem conciliação.</td></tr>
    <tr><td><b>Operação → bloco</b></td><td>Compra, aplicação, venda e fechamento geram eventos assinados (<span class="mono">COMPRA_INSUMO</span>, <span class="mono">APLICACAO_INSUMO</span>, <span class="mono">VENDA</span>, <span class="mono">FECHAMENTO_CONTABIL</span>) com permissão conferida por papel. O auditor não registra nada; o produtor registra o que é dele.</td></tr>
  </tbody>
</table>

<h3>9.3 Os números do cenário (propriedade de Cacoal, safra 2026)</h3>
<table>
  <thead><tr><th>Indicador</th><th class="num">Valor</th><th>Leitura</th></tr></thead>
  <tbody>
    <tr><td>Receita líquida do período</td><td class="num">R$ 503.218,93</td><td>Sobre receita bruta de R$ 513.368,32 e R$ 10.149,39 de tributos</td></tr>
    <tr><td>Custo de produção</td><td class="num">R$ 264.296,79</td><td>Consome R$ 0,53 de cada real de receita</td></tr>
    <tr><td>Resultado do período</td><td class="num">R$ 119.770,13</td><td><b>Margem líquida de 23,8%</b> em 12 meses de apuração</td></tr>
    <tr><td>Caixa</td><td class="num">R$ 167.993,27</td><td>Partiu de R$ 96.000,00; a receber de R$ 75.568,90</td></tr>
    <tr><td>Estoque</td><td class="num">R$ 158.022,28</td><td>Insumos e produto; ao preço ajustado pela qualidade, R$ 145.952 disponíveis para venda</td></tr>
    <tr><td>Custo por hectare</td><td class="num">R$ 24.774,33</td><td>Média dos 4 talhões, já com o rateio da estrutura</td></tr>
    <tr><td>Ponto de equilíbrio</td><td class="num">107% de cobertura</td><td>A receita do período cobre os custos fixos dos últimos 12 meses</td></tr>
    <tr><td>Endividamento</td><td class="num">0% do patrimônio</td><td>O custeio do cenário foi quitado dentro da safra</td></tr>
    <tr><td>Exercício orçamentário</td><td class="num">76% decorrido</td><td>Receita em 57% do orçado (abaixo do ritmo), custos em 85%, investimentos em 0% — o alerta aponta os três</td></tr>
  </tbody>
</table>

<p><b>Custo por talhão — onde o dinheiro se perde e onde se ganha.</b> O mesmo sistema, no mesmo dia, mostra quatro realidades diferentes:</p>
<table>
  <thead><tr><th>Talhão</th><th>Cultura</th><th class="num">Custo por unidade</th><th class="num">Preço de mercado</th><th class="num">Margem</th><th>Leitura</th></tr></thead>
  <tbody>
    <tr><td>Talhão Alto</td><td>Conilon irrigado</td><td class="num">R$ 518,62/saca</td><td class="num">R$ 976,94</td><td class="num">+46,9%</td><td>O lote rastreado da IA chega a R$ 989,15 (+1,25%)</td></tr>
    <tr><td>Talhão Baixo</td><td>Conilon sequeiro</td><td class="num">R$ 720,03/saca</td><td class="num">R$ 976,94</td><td class="num">+26,3%</td><td>Sem irrigação, o custo por saca é 39% maior</td></tr>
    <tr><td>Cacau do Córrego</td><td>Cacau consorciado</td><td class="num">R$ 451,50/@</td><td class="num">R$ 387,00</td><td class="num">−16,7%</td><td>Preço em correção: alerta crítico, com ação sugerida</td></tr>
    <tr><td>Cacau Novo</td><td>Cacau pleno sol</td><td class="num">R$ 656,42/@</td><td class="num">R$ 387,00</td><td class="num">−69,6%</td><td>Lavoura de 6 anos em formação: manter e revisar investimento</td></tr>
  </tbody>
</table>
<p class="nota-rodape">É essa a diferença entre registrar e gerir: a queda média da propriedade esconderia dois talhões saudáveis e dois no vermelho. Com o custo por unidade previsto, a decisão de onde cortar deixa de ser intuição.</p>

<h3>9.4 Gráficos: biblioteca própria, sem dependência externa</h3>
<p>Todo o desenho é feito em <b>SVG escrito à mão</b>, dentro de um arquivo único que funciona sem internet — requisito do projeto, não preferência estética. A biblioteca cobre nove tipos, com tooltip por elemento, paleta fixa definida no sistema de design e animação respeitando a preferência do sistema por menos movimento:</p>
<table>
  <thead><tr><th>Gráfico</th><th>Onde aparece</th></tr></thead>
  <tbody>
    <tr><td>Linha e área</td><td>Saldo projetado, resultado acumulado, curvas de temperatura e umidade do lote, séries de preço</td></tr>
    <tr><td>Barras (simples, agrupadas, empilhadas e horizontais)</td><td>Receita × custo por mês, custo × preço por talhão, folha por competência, tonelagem por safra</td></tr>
    <tr><td>Cascata</td><td>DRE: da receita bruta até o resultado, mostrando cada subtração</td></tr>
    <tr><td>Rosca e anel</td><td>Composição do custo direto, composição do custo por hora do maquinário, margem por talhão</td></tr>
    <tr><td>Medidor</td><td>Endividamento, cobertura do ponto de equilíbrio</td></tr>
    <tr><td>Heatmap</td><td>Custo por hectare de cada talhão mês a mês</td></tr>
    <tr><td>Sparkline</td><td>Cotação das últimas 60 sessões em cada cartão de mercado</td></tr>
  </tbody>
</table>

<h3>9.5 Modo imersivo: a propriedade em uma tela</h3>
<p>Um painel de tela cheia, pensado para ficar aberto no escritório da cooperativa ou na parede da sala de classificação: quatro indicadores em corpo grande (resultado, receita líquida, caixa e estoque valorizado pela qualidade), resultado acumulado da safra, entradas e saídas mês a mês, custo × preço por talhão, margem com anel de progresso, o <b>que o campo está medindo agora</b> — água disponível no solo, balanço hídrico de 30 dias, graus-dia, molhamento foliar, temperatura da massa de cacau em fermentação e umidade do grão em secagem —, cotações com o mercado do dia, o estado da cadeia com o hash do encadeamento e a faixa de alertas. O relógio corre a cada segundo e os blocos de campo se recompõem a cada cinco segundos; <b>Esc</b> fecha. Não há etapa de configuração: qualquer perfil abre o mesmo painel com os dados do seu escopo.</p>

<h3>9.6 Fechamento ancorado: a contabilidade assinada por bloco</h3>
<p>O fechamento do mês percorre quatro passos visíveis na tela: (1) cada conta com movimento gera um <b>hash de 256 bits</b>; (2) os hashes formam a <b>árvore de Merkle</b> e a raiz é gravada em uma transação <span class="mono">FECHAMENTO_CONTABIL</span>; (3) o bloco é minerado com prova de trabalho e o registro guarda bloco, hash e raiz; (4) a conferência recalcula a raiz subindo o caminho de prova a partir de qualquer conta. No cenário, o fechamento de setembro de 2026 reúne <b>19 contas</b>, resulta em R$ 26.271,42 e sua raiz <span class="mono">99933964c295…</span> foi ancorada no bloco <b>#3</b>, com prova de inclusão de 5 níveis conferindo contra a raiz gravada. Se um único valor do período for alterado depois do fechamento, as raízes divergem — auditoria de livro-caixa sem abrir o livro-caixa.</p>

<h3>9.7 O que o ERP ainda não é</h3>
<ul>
  <li><b>Não é sistema fiscal.</b> O protótipo não emite nota fiscal, não apura tributo por regime nem assina SPED. A estrutura de contas já segue um plano de contas agrícola, para que a integração com o sistema fiscal seja trabalho de mapeamento, não de remodelagem.</li>
  <li><b>Não tem folha legal nem eSocial.</b> A folha apura custo de mão de obra e conformidade de NR-31; encargos são aplicados em alíquota única declarada.</li>
  <li><b>Não integra bancos.</b> Conciliação bancária e liquidação financeira de títulos são registradas manualmente na demonstração; em produção, entram por API do banking-as-a-service da cooperativa.</li>
  <li><b>Não substitui contador.</b> O fechamento ancorado é evidência de integridade, não peça contábil assinada por profissional habilitado.</li>
</ul>

'''

sub('<!-- ====================== 9 ====================== -->', '<!-- ====================== 9 antigo (agora 10) ====================== -->')
sub('<h2><span class="num">SEÇÃO 10</span>O que o protótipo prova — e o que ainda não é</h2>',
    NOVA + '<h2><span class="num">SEÇÃO 10</span>O que o protótipo prova — e o que ainda não é</h2>')

# ------------------------------------------------------------------ 3. números atualizados
sub('<li><b>Protótipo navegável</b> em arquivo único, sem internet, com cinco perfis de usuário (produtor, cooperativa, indústria, certificadora e auditor), onze áreas de operação (incluindo o painel de IoT e sensores) e <b>136 verificações automatizadas aprovadas</b>.</li>',
    '<li><b>Protótipo navegável</b> em arquivo único, sem internet, com cinco perfis de usuário (produtor, cooperativa, indústria, certificadora e auditor), <b>doze áreas de operação</b> (incluindo o painel de IoT e sensores, o ERP agrícola e o modo imersivo de acompanhamento) e <b>221 verificações automatizadas aprovadas</b>.</li>')

sub('<li><b>136 verificações automatizadas aprovadas</b>, cobrindo as onze telas nos cinco perfis, as seis abas de IA, as cinco abas do painel de IoT, a determinismo e independência de fuso das séries de sensores, o controle de qualidade do dado, a prova de inclusão de Merkle com adulteração e restauração, as permissões de rede e de ancoragem, escrow com e sem fraude de peso, emissão de selo e detecção de adulteração da cadeia.</li>',
    '''<li><b>221 verificações automatizadas aprovadas</b>, cobrindo as doze telas nos cinco perfis, as seis abas de IA, as cinco abas do painel de IoT, as <b>seis abas do ERP</b>, <b>toda a biblioteca de gráficos</b> (barras, linha, área, cascata, rosca, medidor, heatmap, sparkline, anel e estado vazio), a <b>identidade contábil</b> (a DRE fecha, o caixa encadeia, o estoque soma, o custo por unidade é o custo dividido pela produção prevista pela IA), o rateio da estrutura, a folha com encargos, o custo por hora do maquinário, a projeção de caixa, o <b>fechamento com raiz de Merkle, ancoragem e prova de inclusão</b>, o <b>modo imersivo</b> em todos os perfis, o determinismo e a independência de fuso das séries de sensores, o controle de qualidade do dado, a prova de inclusão de leitura de sensor com adulteração e restauração, as permissões de rede e de ancoragem, escrow com e sem fraude de peso, emissão de selo e detecção de adulteração da cadeia.</li>''')

sub('<li><b>Aplicação sem nenhuma dependência externa:</b> arquivo único de 363 KB, inclusive o gerador de QR Code e os gráficos em SVG, funcionando sem rede.</li>',
    '<li><b>Aplicação sem nenhuma dependência externa:</b> arquivo único de 615 KB, inclusive o gerador de QR Code e a biblioteca de gráficos em SVG, funcionando sem rede.</li>')

sub('<tr><td class="mono">prototipo-agrochain/AgroChain.html</td><td>Aplicação completa em arquivo único (363 KB), sem dependência externa. <b>É o protótipo.</b></td></tr>',
    '<tr><td class="mono">prototipo-agrochain/AgroChain.html</td><td>Aplicação completa em arquivo único (615 KB), sem dependência externa. <b>É o protótipo.</b></td></tr>')

sub('<tr><td class="mono">prototipo-agrochain/testes/teste_app.js</td><td>Bateria de 136 verificações automatizadas, incluindo as 26 do painel de IoT</td></tr>',
    '<tr><td class="mono">prototipo-agrochain/testes/teste_app.js</td><td>Bateria de 221 verificações automatizadas, incluindo as 26 do painel de IoT, as 30 do ERP, as 12 da biblioteca de gráficos e as 4 do modo imersivo</td></tr>')

# ------------------------------------------------------------------ 4. anexo: arquivos de código
sub('<h3>12.1 Arquivos entregues</h3>',
    '''<h3>12.1 Arquivos entregues</h3>
<p>Aplicação em arquivo único (13 módulos embutidos por <span class="mono">construir.py</span>): dados do cenário, biblioteca de gráficos, IA, criptografia, QR Code, IoT, blockchain, ERP, interface principal, interface de IA e mercado, painel de IoT, interface do ERP e modo imersivo.</p>''')

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('%s -> %d bytes' % (ARQ, len(s.encode('utf-8'))))
print('documento atualizado')
