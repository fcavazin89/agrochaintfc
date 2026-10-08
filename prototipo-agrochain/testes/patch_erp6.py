#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
patch_erp6 — dois defeitos encontrados na revisão do v5:

1. evidenciaSensor lia `fer.indice`, campo que não existe em
   IoT.fermentacao() (o correto é `indiceAcumulado`) — o índice de fermentação
   aparecia como null justamente na tela que existe para provar a qualidade.

2. O título a pagar do escrow era gravado com `produtor: vendedor`, ou seja,
   caía no escopo de quem VENDE. A obrigação de quem compra ficaria invisível
   para o comprador e apareceria como dívida do vendedor. Também faltava
   distinguir o título existente por tipo: se o vendedor já tivesse o
   recebível criado, o comprador nunca recebia o seu a pagar.
"""
import io, sys

ARQ = 'src/55_erp.js'
s = io.open(ARQ, encoding='utf-8').read()

def sub(a, b, n=1):
    global s
    c = s.count(a)
    if c != n:
        sys.exit('FALHA: âncora encontrada %d vez(es) (esperado %d):\n%s' % (c, n, a[:180]))
    s = s.replace(a, b, n)

# 1) índice de fermentação
sub("        indiceFermentacao: fer ? fer.indice : null, classeFermentacao: fer ? fer.classe : null,",
    "        indiceFermentacao: fer ? fer.indiceAcumulado : null, classeFermentacao: fer ? fer.classe : null,")
sub("          (fer ? ' · índice de fermentação ' + fer.indice + ' °C·h (' + fer.classe + ')' : '')",
    "          (fer ? ' · índice de fermentação ' + fer.indiceAcumulado + ' °C·h (' + fer.classe + ')' : '')")

# 2) escrow: obrigação no escopo de quem compra
sub("""      var existente = erp().titulos.filter(function (t) { return t.contrato === ct.id; })[0];""",
    """      /* o título existente só conta se for do mesmo lado da relação: senão o
         recebível do vendedor impediria a criação do a pagar do comprador */
      var lado = euSouComprador ? 'PAGAR' : 'RECEBER';
      var existente = erp().titulos.filter(function (t) { return t.contrato === ct.id && t.tipo === lado; })[0];""")

sub("""          produtor: vendedor, origem: 'ESCROW', contrato: ct.id, documento: ct.id,
          banco: 'Conta escrow do consórcio',
          composicao: ct.etapas.map(function (e) { return { nome: e.nome, status: e.status, data: e.data }; })
        };
        erp().titulos.push(pagavel);""",
    """          produtor: ct.comprador, origem: 'ESCROW', contrato: ct.id, documento: ct.id,
          banco: 'Conta escrow do consórcio', contrapartePapel: 'fornecedor',
          composicao: ct.etapas.map(function (e) { return { nome: e.nome, status: e.status, data: e.data }; })
        };
        erp().titulos.push(pagavel);""")

# o título a receber continua no escopo do vendedor (garante que a variável siga usada)
sub("""        produtor: vendedor, origem: 'ESCROW', contrato: ct.id,
        documento: ct.id, banco: 'Conta escrow do consórcio',""",
    """        produtor: vendedor, origem: 'ESCROW', contrato: ct.id, contrapartePapel: 'cliente',
        documento: ct.id, banco: 'Conta escrow do consórcio',""")

io.open(ARQ, 'w', encoding='utf-8').write(s)
print('%s -> %d bytes' % (ARQ, len(s.encode('utf-8'))))
print('patch_erp6 aplicado')
