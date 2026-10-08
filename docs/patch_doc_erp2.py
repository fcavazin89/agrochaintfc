#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Acrescenta o ERP e o modo imersivo ao roteiro de demonstração e atualiza
a versão do documento no rodapé."""
import io, sys

ARQ = 'docs/AgroChain-Documento-Tecnico.html'
s = io.open(ARQ, encoding='utf-8').read()

def sub(a, b, n=1):
    global s
    c = s.count(a)
    if c != n:
        sys.exit('FALHA: âncora %d vez(es) (esperado %d):\n%s' % (c, n, a[:180]))
    s = s.replace(a, b, n)

ROTEIRO_ANTIGO = '''  <li><b>Assistente</b> — perguntar "quando devo vender o cacau?" e destacar que a resposta cita as fontes dos próprios dados.</li>
</ol>'''

ROTEIRO_NOVO = '''  <li><b>Assistente</b> — perguntar "quando devo vender o cacau?" e destacar que a resposta cita as fontes dos próprios dados.</li>
  <li><b>ERP agro</b> — abrir a aba de custos e mostrar que o custo por saca do Talhão Alto usa a produtividade que a IA previu; lançar uma aplicação de insumo e ver o custo do talhão mudar na mesma tela, com a leitura de campo justificando ou contestando o gasto.</li>
  <li><b>Fechamento ancorado</b> — preparar o fechamento do mês, mostrar os hashes conta a conta, ancorar a raiz na blockchain e conferir a prova de inclusão. É o passo que fecha o argumento com quem cuida do dinheiro.</li>
  <li><b>Modo imersivo</b> — deixar o painel de tela cheia aberto como pano de fundo: resultado, caixa, estoque ao preço da qualidade, custo por talhão, o que o campo está medindo agora e o estado da cadeia, atualizando sozinho.</li>
</ol>'''

sub(ROTEIRO_ANTIGO, ROTEIRO_NOVO)

sub('Documento técnico versão 1.0 · Outubro de 2026',
    'Documento técnico versão 1.1 · Outubro de 2026')

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('%s -> %d bytes' % (ARQ, len(s.encode('utf-8'))))
print('patch_doc_erp2 aplicado')
