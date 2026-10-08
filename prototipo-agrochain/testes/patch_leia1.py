# -*- coding: utf-8 -*-
"""
patch_leia1 — atualiza o LEIA-ME.md para a versão 3.0 do produto:
tamanho do artefato (625 KB / 14 módulos), módulo de ícones, sistema de
design (design.md) e as capturas de referência em design/.
"""
import io, sys

P = '/home/user/LEIA-ME.md'
falhas = []


def ler(): return io.open(P, encoding='utf-8').read()


def gravar(s): io.open(P, 'w', encoding='utf-8').write(s)


def sub(antigo, novo, n=1, etq=None):
    s = ler()
    c = s.count(antigo)
    if c != n:
        falhas.append('[%s]: esperava %d, achei %d' % (etq or antigo[:50], n, c))
        return
    gravar(s.replace(antigo, novo, n))
    print('  ok [%s]' % (etq or antigo[:40]))


# ------------------------------------------------------------- tabela inicial
sub('Aplicação completa em arquivo único (615 KB), 13 módulos embutidos.',
    'Aplicação completa em arquivo único (625 KB), 14 módulos embutidos.', 1, 'tamanho do artefato')

sub('| `design.md` | Sistema de design aplicado à interface: cores, tipografia, movimento, componentes e o catálogo de gráficos. |',
    '| `design.md` | **Sistema de design v3.0** — a fonte da verdade do layout: dois planos de cor (claro editorial + escopo escuro de campo), tipografia com serifa institucional, componentes, regras de gráfico e de ícone, movimento e acessibilidade. |\n'
    '| `prototipo-agrochain/design/` | Dezesseis capturas de referência das telas (painel, ERP nas seis abas, IoT, blockchain, mercado, modo imersivo) e o script `capturar.js` que as gera. |',
    1, 'linhas de design')

# -------------------------------------------------------------- estrutura
sub('''    10_dados.js           dados do cenário e séries de preço reais de 06/10/2026''',
    '''    10_dados.js           dados do cenário e séries de preço reais de 06/10/2026
    12_icones.js          conjunto de ícones SVG do produto (traço único, sem fonte nem emoji)''',
    1, 'modulo 12_icones')

sub('''  testes/
    teste_app.js          221 verificações automatizadas''',
    '''  design/
    capturar.js           captura as dezesseis telas de referência (Chrome headless)
    01-painel.png …       capturas de referência do sistema de design em uso
  testes/
    teste_app.js          221 verificações automatizadas''',
    1, 'pasta design')

# --------------------------------------------------------- números verificados
sub('- Aplicação sem nenhuma dependência externa — nem CDN, nem fonte, nem biblioteca de gráficos.',
    '- Aplicação sem nenhuma dependência externa — nem CDN, nem fonte, nem biblioteca de gráficos, nem fonte de ícone.\n'
    '- Layout v3.0 conferido em captura real de navegador: dezesseis telas + painel imersivo, sem quadradinho de emoji e sem etiqueta quebrada.',
    1, 'qualidade técnica')

print()
if falhas:
    print('FALHAS:')
    for f in falhas: print('  ✗', f)
    sys.exit(1)
print('patch_leia1 aplicado')
