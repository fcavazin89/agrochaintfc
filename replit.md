# AgroChain

## Executar no Replit

O projeto é um protótipo HTML/JavaScript autocontido, sem dependências externas.
A estrutura e os módulos originais foram preservados.

O botão **Run** inicia o workflow **AgroChain**, com o comando:

```sh
python3 -m http.server 5000 --bind 0.0.0.0 --directory prototipo-agrochain
```

A prévia abre `index.html`, que redireciona para `AgroChain.html`.
Não são necessários segredos ou serviços externos para executar o protótipo.
Os sensores, a cadeia blockchain e os dados demonstrativos são simulações locais;
iniciar o servidor não conecta dispositivos, não publica contratos e não retreina a IA.

## Alterar o aplicativo

Edite os módulos em `prototipo-agrochain/src/` ou o `template.html` e reconstrua:

```sh
python3 prototipo-agrochain/construir.py
```

Os testes originais estão em `prototipo-agrochain/testes/` e usam Node.js.
Alguns scripts contêm caminhos absolutos do ambiente original; precisam ser
adaptados antes de serem executados diretamente neste ambiente.
