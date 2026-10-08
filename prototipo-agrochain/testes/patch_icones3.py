# -*- coding: utf-8 -*-
"""
patch_icones3 — devolve os sinais ✓ e ✗ que a varredura automática do
patch_icones1 removeu por engano.

O que aconteceu: a classe de "emoji" do varredor incluía os intervalos
U+2600–U+27BF, onde moram ✓ (U+2713) e ✗ (U+2717) — sinais de texto, não
emoji. O resultado é que trechos como `chip('✓ autêntico')` viraram
`chip('autêntico')` e o log de mineração perdeu o ✓ de cada bloco. Aqui os
sinais voltam, com âncora explícita e contagem conferida uma por uma.
"""
import io, sys

RAIZ = '/home/user/prototipo-agrochain/'
falhas = []


def ler(p): return io.open(RAIZ + p, encoding='utf-8').read()


def gravar(p, s): io.open(RAIZ + p, 'w', encoding='utf-8').write(s)


def sub(p, antigo, novo, n=1, etq=None):
    s = ler(p)
    c = s.count(antigo)
    if c != n:
        falhas.append('%s [%s]: esperava %d, achei %d' % (p, etq or antigo[:44], n, c))
        return
    gravar(p, s.replace(antigo, novo, n))
    print('  ok %s [%s]' % (p, etq or antigo[:34]))


P, Q, R, S, T = 'src/60_app.js', 'src/70_app2.js', 'src/80_iot_ui.js', 'src/85_erp_ui.js', 'src/88_imersivo.js'

# ---------------------------------------------------------------- painel geral
sub(P, "'<b class=\"positivo\">verificada </b>'", "'<b class=\"positivo\">verificada ✓</b>'", 1, 'integridade do painel')
sub(P, "chip('cadeia íntegra — nenhuma adulteração detectada', 'verde') : chip('' + ver.problemas.length + ' inconsistências detectadas'",
      "chip('✓ cadeia íntegra — nenhuma adulteração detectada', 'verde') : chip('✗ ' + ver.problemas.length + ' inconsistências detectadas'",
      1, 'chip da cadeia')
sub(P, "chip('georreferenciado', 'cinza')", "chip('✓ georreferenciado', 'cinza')", 1, 'chip do mapa')
sub(P, "(ver.integro ? 'Integridade confirmada' : 'Hash divergente')",
      "(ver.integro ? '✓ Integridade confirmada' : '✗ Hash divergente')", 1, 'selo do lote')
sub(P, "'<div class=\"caixa verde\" style=\"margin-bottom:13px\">' + esc(App.avisar())",
      "'<div class=\"caixa verde\" style=\"margin-bottom:13px\">✓ ' + esc(App.avisar())", 1, 'aviso de sucesso')

# ------------------------------------------------- blockchain, IA e auditoria
sub(Q, "(ver.valida ? 'Íntegra' : '' + ver.problemas.length + ' falh",
      "(ver.valida ? '✓ Íntegra' : '✗ ' + ver.problemas.length + ' falh", 2, 'KPI de integridade (2 telas)')
sub(Q, "(invalido ? chip('inválido', 'vermelho') : chip('validado', 'verde'))",
      "(invalido ? chip('✗ inválido', 'vermelho') : chip('✓ validado', 'verde'))", 1, 'chip do bloco')
sub(Q, "chip(v.integro ? 'autêntico' : 'divergente', v.integro ? 'verde' : 'vermelho')",
      "chip(v.integro ? '✓ autêntico' : '✗ divergente', v.integro ? 'verde' : 'vermelho')", 1, 'chip do selo do lote')
sub(Q, "{ t: 'Bloco #' + bloco.indice + ' minerado com sucesso'", "{ t: '✓ Bloco #' + bloco.indice + ' minerado com sucesso'", 1, 'log do bloco minerado')
sub(Q, "{ t: 'Cadeia íntegra. Nenhum bloco foi alterado.'", "{ t: '✓ Cadeia íntegra. Nenhum bloco foi alterado.'", 1, 'log da verificação')
sub(Q, "{ t: 'Foram encontradas ' + v.problemas.length + ' inconsistências:'", "{ t: '✗ Foram encontradas ' + v.problemas.length + ' inconsistências:'", 1, 'log das inconsistências')
sub(Q, "{ t: 'CADEIA INVÁLIDA — ' + v.problemas.length + ' inconsistências detectadas'", "{ t: '✗ CADEIA INVÁLIDA — ' + v.problemas.length + ' inconsistências detectadas'", 1, 'log de cadeia inválida')
sub(Q, "(v.integro ? '  ' : '  ') + l.id", "(v.integro ? '  ✓ ' : '  ✗ ') + l.id", 1, 'log da conferência de selos')
sub(Q, "chip('hash confere', 'verde') : chip('divergente', 'vermelho')",
      "chip('✓ hash confere', 'verde') : chip('✗ divergente', 'vermelho')", 1, 'chip da trilha de auditoria')

# ------------------------------------------------------------------------- IoT
sub(R, "'<div class=\"caixa verde\" style=\"margin-bottom:13px\">' + esc(App3.aviso)",
      "'<div class=\"caixa verde\" style=\"margin-bottom:13px\">✓ ' + esc(App3.aviso)", 1, 'aviso do IoT')
sub(R, "? 'Prova de inclusão conferida' : 'Prova de inclusão FALHOU'",
      "? '✓ Prova de inclusão conferida' : '✗ Prova de inclusão FALHOU'", 1, 'titulo da prova de inclusão')

# ------------------------------------------------------------------------- ERP
sub(S, ">Caixa projetado positivo nas três", ">✓ Caixa projetado positivo nas três", 1, 'caixa projetado')
sub(S, "(pr.confere ? 'conferida' : 'divergente')", "(pr.confere ? '✓ conferida' : '✗ divergente')", 1, 'titulo da prova no ERP')
sub(S, "? '<b>Prova de inclusão conferida</b>", "? '<b>✓ Prova de inclusão conferida</b>", 1, 'mensagem de prova conferida')
sub(S, ": '<b>Divergência na prova</b>", ": '<b>✗ Divergência na prova</b>", 1, 'mensagem de divergência')

print()
if falhas:
    print('FALHAS:')
    for f in falhas: print('  ✗', f)
    sys.exit(1)
print('patch_icones3 aplicado')
