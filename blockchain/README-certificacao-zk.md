# Emissão on-chain de certificações AgroChain com prova ZK

Esta camada acrescenta emissão real em uma rede EVM ao contrato
`AgroChainRastreio.sol` existente:

- Uma prova Groth16 comprova que um score privado está entre 0 e 100 e atende à
  nota mínima publicada.
- A prova também fica vinculada ao lote, ao padrão de certificação e ao hash do
  laudo; trocar qualquer um desses dados invalida a prova.
- O score e o sal não são publicados. O laudo e seus dados pessoais continuam
  fora da blockchain; apenas o hash registrado do laudo vai à cadeia.
- A certificadora autorizada emite um ERC-721 intransferível (`AGCERT`) ao
  titular indicado.
- A emissão entrega uma quantidade fixa de ERC-20 (`AGRO`), definida no deploy.
  O limite de emissão também é definido no deploy e não pode ser aumentado.
- A certificação ZK é gravada no cadastro de lotes existente. A transação inteira
  reverte caso a prova, o papel, o lote, o laudo, o NFT ou o mint do token falhe.

## Requisitos

Use Node.js 22 ou posterior. As dependências deste conjunto de contratos ficam
registradas no `package.json` da raiz; o workflow **AgroChain** continua servindo
o protótipo original sem instalar ou conectar uma blockchain.

```sh
npm run zk:setup:dev
npm run blockchain:compile
npm run test:certification
```

`zk:setup:dev` compila `blockchain/circuits/agrochain-score-threshold.circom`,
gera chaves locais de prova/verificação e cria o Solidity verifier gerado em
`blockchain/contracts/AgroChainGroth16Verifier.sol`. Os artefatos de prova,
chaves e witness são ignorados pelo Git.

**Não use a configuração de desenvolvimento em produção.** O script cria uma
cerimônia Groth16 de uma só máquina e de uma só contribuidora, própria para
testes. O deploy de produção exige cerimônia multiparte confiável/auditada,
chave de prova derivada dessa mesma cerimônia, revisão independente do circuito
e dos contratos, auditoria de segurança e aprovação da regra de recompensa.

## Gerar uma prova

1. Registre no contrato base o lote e um evento `LAUDO` ou `CLASSIFICACAO` com o
   hash do laudo.
2. Copie
   `blockchain/certificate-public-inputs.example.json` para
   `blockchain/certificate-public-inputs.json`, preenchendo o lote, o hash do
   padrão e **o mesmo hash** do laudo registrado na cadeia.
3. No terminal local, digite a nota sem exibi-la:

   ```sh
   node blockchain/scripts/create-private-witness.mjs
   ```

   O script cria `blockchain/witness.private.json` com permissões restritas e
   sem adicionar o score à tela. Não compartilhe esse arquivo.
4. Gere a prova:

   ```sh
   npm run zk:prove
   ```

   `blockchain/proof.json` contém o compromisso, a nota mínima, os hashes
   públicos e os pontos Groth16 — não inclui a nota nem o sal privados.
5. Passe a prova e os mesmos dados públicos a `emitirCertificacao` no contrato
   `AgroChainCertificacoes`; use `tokenURI` com metadados públicos que não
   revelem o score, o sal ou dados pessoais.

## Implantação em testnet Polygon Amoy

O script de deploy **não roda automaticamente** e não publica nada apenas por
configurar o aplicativo. Ele pressupõe que `AgroChainRastreio` já está
implantado na mesma rede. Para acioná-lo, conecte as credenciais pelos **Secrets
do Replit** (não cole chaves no chat, em arquivos ou no terminal):

- `POLYGON_AMOY_RPC_URL`
- `DEPLOYER_PRIVATE_KEY` — precisa controlar o `admin` do contrato
  `AgroChainRastreio`
- `AGROCHAIN_RASTREIO_ADDRESS`
- `AGROCHAIN_ISSUER_ADDRESS` (opcional; por padrão usa a carteira do deployer,
  que precisa ter o papel `CERTIFICADORA`)
- `AGRO_TOKEN_REWARD_WEI`
- `AGRO_TOKEN_MAX_SUPPLY_WEI`

Depois de montar o verifier gerado:

```sh
npm run deploy:amoy
```

O script verifica administrador e papel antes de implantar o verifier e o
módulo. Só adiciona o novo módulo à rede e o configura se o endereço não tiver
um papel conflitante ou outro módulo ZK configurado; endereços são exibidos no
fim para registro. Revise a recompensa e o limite antes da transação, pois ambos
são imutáveis no módulo implantado. Comece por uma carteira de teste e uma rede
de teste — nunca use a chave de produção para validar o primeiro deploy.

## Limites e decisões de segurança

- A prova demonstra que um número comprometido satisfaz o limite; não demonstra
  que a medição original é verdadeira. A certificadora autorizada deve validar
  e comprometer o laudo verdadeiro antes da emissão.
- O caminho antigo `emitirCertificacao` do contrato base continua disponível
  para compatibilidade com integrações já existentes. Ele não cunha NFT/token
  ZK e não marca `certificacoesComProvaZK`; consumidores que exigem prova devem
  conferir essa marca ou verificar o `CertificacaoZKRegistrada`.
- O NFT permanece no histórico após revogação ou expiração; `certificacaoValida`
  indica o estado de validade. AGRO já emitido não é recolhido quando um selo é
  revogado; o saldo não é uma garantia financeira, crédito de carbono ou
  certificado por si só.
- Endereços, hashes de lote/laudo/padrão, validade, nota mínima e compromisso
  ficam públicos em uma EVM pública. Campos públicos ainda podem permitir
  correlação; não inclua nomes, geolocalização precisa ou dados sensíveis.
- Recompensa, limite total, papel da certificadora e identidade do admin são
  políticas do consórcio, não parâmetros de segurança escolhidos pelo circuito.
- Ainda não há interface de carteira no protótipo web. A emissão fica disponível
  por contrato e pelos scripts de prova/deploy desta camada.
