# -*- coding: utf-8 -*-
"""
patch_icones2 — remate do patch de ícones: três trocas que ficaram pendentes
(âncoras erradas), limpeza de `'' + esc(...)` e registro do módulo 12_icones
no build e nos arneses de teste.
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
    print('  ok %s [%s]' % (p, etq or antigo[:36]))


# 1. menu lateral: o SVG do ícone entra no lugar do antigo emoji
sub('src/60_app.js',
    "'<span class=\"ic\">' + it.ic + '</span><span>' + it.n + '</span>'",
    "'<span class=\"ic\">' + (Ico.svg(it.ic, 'md') || it.ic) + '</span><span>' + it.n + '</span>'",
    1, 'render do icone do menu')

# 2. atalhos dos modelos de IA
sub('src/70_app2.js',
    "<div class=\"flex entre\"><b>' + m[1] + ' ' + esc(mod.nome)",
    "<div class=\"flex entre\"><b>' + (Ico.svg(m[1], 'md') || '') + ' ' + esc(mod.nome)",
    1, 'render do atalho do modelo')

# 3. sobras de concatenação vazia deixadas pela limpeza dos avisos
sub('src/85_erp_ui.js', "avisar('' + esc(r.erro)", "avisar(esc(r.erro)", 2, 'aviso de erro sem prefixo')
sub('src/85_erp_ui.js', ": '' + esc(r.transacao.motivoRejeicao", ": esc(r.transacao.motivoRejeicao", 2, 'motivo de rejeicao sem prefixo')

# 4. o módulo de ícones tem de entrar no build e nos arneses
sub('construir.py',
    "MODULOS = ['10_dados.js', '15_graficos.js', '20_ia.js', '30_crypto.js', '40_qr.js', '45_iot.js', '50_ledger.js', '55_erp.js']",
    "MODULOS = ['10_dados.js', '12_icones.js', '15_graficos.js', '20_ia.js', '30_crypto.js', '40_qr.js', '45_iot.js', '50_ledger.js', '55_erp.js']",
    1, 'MODULOS no construir.py')

sub('testes/teste_app.js',
    "['30_crypto', '10_dados', '15_graficos', '20_ia', '40_qr', '45_iot', '50_ledger', '55_erp',",
    "['30_crypto', '10_dados', '12_icones', '15_graficos', '20_ia', '40_qr', '45_iot', '50_ledger', '55_erp',",
    1, 'modulos do teste_app')

sub('testes/sonda_erp.js',
    "['30_crypto', '10_dados', '15_graficos', '20_ia',",
    "['30_crypto', '10_dados', '12_icones', '15_graficos', '20_ia',",
    1, 'modulos da sonda_erp')

# 5. o roteiro de auditoria de impressão (teste_app.js) roda só os módulos puros:
#    12_icones entra para o mapa de ícones existir caso algum texto o use
sub('testes/teste_app.js',
    '\'["30_crypto","10_dados","20_ia","40_qr","45_iot","50_ledger"].forEach(function(m){require(p+m+".js")});\\n\'',
    '\'["30_crypto","10_dados","12_icones","20_ia","40_qr","45_iot","50_ledger"].forEach(function(m){require(p+m+".js")});\\n\'',
    1, 'roteiro de impressao')

print()
if falhas:
    print('FALHAS:')
    for f in falhas: print('  ✗', f)
    sys.exit(1)
print('patch_icones2 aplicado')
