# 🚀 QuickStart • AgroChain Web3 Certificador

Guia ultrarrápido para começar em 5 minutos.

## 1️⃣ Pré-requisitos (2 min)

```bash
# Node.js 18+ instalado?
node --version

# Dependências NPM?
npm install

# MetaMask instalado no navegador?
# https://metamask.io
```

## 2️⃣ Configuração Sepolia (1 min)

### Obtenha ETH de teste
1. Acesse: https://www.sepoliafaucet.com
2. Conecte com MetaMask
3. Clique "Send Me 1 ETH"
4. Espere ~30 segundos ✓

### Configure MetaMask para Sepolia
- MetaMask deve detectar automaticamente
- Se não: Network Selector → "Add a custom network"
  - Name: Sepolia
  - RPC: https://sepolia.infura.io/v3/
  - Chain ID: 11155111
  - Símbolo: ETH

## 3️⃣ Setup ZK (1 min)

```bash
# Compilar contratos
npm run blockchain:compile

# Preparar circuito ZK
npm run zk:setup:prod
```

Resultado: arquivos gerados em `blockchain/circuits/` e `blockchain/artifacts/`

## 4️⃣ Usar Certificador (1 min)

### Via Navegador (Interface Web3)

1. Abra `prototipo-agrochain/certificador.html` no navegador
2. Clique **Conectar** (MetaMask pede aprovação)
3. Selecione sua carteira Sepolia
4. Preencha o formulário:
   - Nota Mínima: 80
   - Score Privado: 85
   - Sal: 12345 (deixe como está)
5. Clique **Gerar Prova ZK**
6. Clique **Emitir Certificação**
7. MetaMask aprova transação
8. Espere confirmação (~12 segundos)
9. ✓ Certificado emitido!

### Via CLI (Linha de Comando)

```bash
# Emitir certificação com prova ZK
npm run zk:emit -- --score 85 --salt 12345

# Resultado: arquivo em artifacts/certificate_*.json
```

## 📋 Checklist de Funcionamento

- [ ] MetaMask conecta sem erro
- [ ] Rede detectada como "Sepolia Testnet"
- [ ] Saldo mostra: "0.5+ ETH"
- [ ] Clique em "Gerar Prova ZK" → sucesso
- [ ] Clique em "Emitir Certificação" → TX enviada
- [ ] TX confirmada em Sepolia Scan
- [ ] NFT ID exibido (ex: #42)
- [ ] AGRO tokens recebidos (1000)

## 🔍 Onde Ver os Resultados

### No Navegador
```
certificador.html → Aba "Emissão"
├─ TX Hash: clique para ver em Sepolia Scan
├─ NFT ID: seu certificado
└─ AGRO: tokens recebidos
```

### No Sepolia Scan
1. Copie TX Hash: `0x...`
2. Acesse: https://sepolia.etherscan.io/tx/0x...
3. Veja:
   - Método: emitirCertificacao
   - Input Data: pedido estruturado
   - Events: CertificacaoEmitida com todos os detalhes

### No Seu Sistema
```bash
# Ver arquivo de resultado
cat blockchain/artifacts/certificate_*.json | jq

# Output esperado:
{
  "txHash": "0x...",
  "blockNumber": 5123456,
  "nftId": 42,
  "gasUsed": "125430"
}
```

## ⚙️ Configurações Importantes

### Onde Salvar Endereço do Contrato

Após primeiro deploy:
1. Abra `certificador.html` → "Configuração"
2. Cole endereço do contrato em "Endereço do Contrato"
3. Clique "Salvar"
4. Salvo em localStorage (persiste entre recargas)

### Múltiplas Certificações

```bash
# Emitir 3 certificações diferentes
npm run zk:emit -- --score 75 --tipo "Café Comum"
npm run zk:emit -- --score 90 --tipo "Cacau Premium"
npm run zk:emit -- --score 82 --tipo "Cana Biológica"
```

## 🆘 Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| "Conectar" não funciona | Instale/atualize MetaMask |
| Rede incorreta | Botão "Mudar para Sepolia" |
| Sem ETH de teste | Faucet: sepoliafaucet.com |
| TX falha "inválida" | Gere prova ZK antes de emitir |
| Não vê TX no Scan | Pode estar ainda pendente (wait 30s) |

## 📚 Documentação Completa

- **CERTIFICADOR-WEB3.md**: Guia técnico detalhado
- **ARQUITETURA-WEB3.md**: Visão arquitetural completa
- **design.md**: Design system do AgroChain
- **.env.example**: Configurações de ambiente

## 🎯 Próximo: Produção

Para evoluir além de teste:

```bash
# 1. Montar RPC endpoint próprio (Alchemy, Infura, QuickNode)
# 2. Criar private key segura (hardware wallet recomendado)
# 3. Fazer deploy em Ethereum Mainnet (requer ETH real)
# 4. Integrar com sistema backend de certificadoras
# 5. Configurar IPFS para metadados permanentes
```

## 💡 Dicas Pro

1. **Reutilize saída de teste**: TX hash, NFT ID, tudo fica registrado
2. **Monitore eventos**: Web3.monitorarCertificacoes() para automação
3. **Auditoria pública**: Qualquer um pode verificar no Scan
4. **Sem perda de dados**: Tudo é imutável no blockchain
5. **Revogue quando necessário**: revogarCertificacao() mantém histórico

---

**Pronto!** Você acabou de emitir uma certificação verificável na blockchain! 🎉

Próximas questões?
- Técnicas: veja ARQUITETURA-WEB3.md
- Operação: veja CERTIFICADOR-WEB3.md
- Design: veja design.md
