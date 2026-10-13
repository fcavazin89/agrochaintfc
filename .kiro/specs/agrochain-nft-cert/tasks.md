# Implementation Plan: AgroChain NFT Certificate (ERC721)

## Overview

Implementação do sistema de certificação NFT ERC721 para a AgroChain. As tarefas seguem a ordem: contrato Solidity → testes → deploy script → atualização da DApp. Cada tarefa constrói sobre a anterior e termina com a integração de todos os componentes na página `/certificacao`.

## Tasks

- [ ] 1. Criar o contrato `AgroChainCertNFT.sol`
  - Criar o arquivo `blockchain/contracts/AgroChainCertNFT.sol`
  - Declarar `pragma solidity 0.8.37` (versão exata, igual ao `hardhat.config.js`)
  - Importar `ERC721`, `ERC721URIStorage`, `Ownable` de `@openzeppelin/contracts/` v5.6.1; importar `Base64` de `@openzeppelin/contracts/utils/Base64.sol` e `Strings` de `@openzeppelin/contracts/utils/Strings.sol`
  - Declarar `contract AgroChainCertNFT is ERC721, ERC721URIStorage, Ownable`
  - Definir `struct Certificado { string batchId; string tipo; string variedade; uint256 pesoKg; string origem; address fazendeiro; uint256 timestamp; }`
  - Declarar `uint256 private _tokenIdCounter;` inicializado com `0` (o primeiro token terá ID = 1 após incremento pré-mint)
  - Declarar `mapping(uint256 => Certificado) public certificados;`
  - Declarar evento `event CertificadoMintado(uint256 indexed tokenId, address indexed fazendeiro, string batchId);`
  - Implementar `constructor() ERC721("AgroChain Certificado NFT", "AGCNFT") Ownable(msg.sender) {}`
  - Implementar `mintCertificado(string calldata batchId, string calldata tipo, string calldata variedade, uint256 pesoKg, string calldata origem) external returns (uint256 tokenId)`:
    - `require(bytes(batchId).length > 0, "AgroChain: batchId required");`
    - `require(pesoKg > 0, "AgroChain: pesoKg must be > 0");`
    - `require(keccak256(bytes(tipo)) == keccak256(bytes("Coffee")) || keccak256(bytes(tipo)) == keccak256(bytes("Cacao")), "AgroChain: tipo must be Coffee or Cacao");`
    - `tokenId = ++_tokenIdCounter;`
    - Gravar `certificados[tokenId] = Certificado({ batchId: batchId, tipo: tipo, variedade: variedade, pesoKg: pesoKg, origem: origem, fazendeiro: msg.sender, timestamp: block.timestamp });`
    - Chamar `_safeMint(msg.sender, tokenId);`
    - Construir a URI via `_buildTokenURI(tokenId, certificados[tokenId])` e chamar `_setTokenURI(tokenId, uri);`
    - Emitir `emit CertificadoMintado(tokenId, msg.sender, batchId);`
  - Implementar `getCertificado(uint256 tokenId) external view returns (Certificado memory)`:
    - `require(_ownerOf(tokenId) != address(0), "AgroChain: token does not exist");`
    - `return certificados[tokenId];`
  - Implementar função interna `_buildTokenURI(uint256 tokenId, Certificado memory cert) internal pure returns (string memory)`:
    - Construir o JSON com `abi.encodePacked` em múltiplas partes para evitar stack too deep:
      ```
      string memory json = string(abi.encodePacked(
        '{"name":"AgroChain Cert #', Strings.toString(tokenId), ' \u2014 ', cert.batchId, '",',
        '"description":"Certificado AgroChain para o lote ', cert.batchId,
        ' (', cert.tipo, ' - ', cert.variedade, '), ',
        Strings.toString(cert.pesoKg), 'kg, origem: ', cert.origem, '",',
        '"attributes":[',
        '{"trait_type":"Batch ID","value":"', cert.batchId, '"},',
        '{"trait_type":"Tipo","value":"', cert.tipo, '"},',
        '{"trait_type":"Variedade","value":"', cert.variedade, '"},',
        '{"trait_type":"Peso (kg)","value":"', Strings.toString(cert.pesoKg), '"},',
        '{"trait_type":"Origem","value":"', cert.origem, '"},',
        '{"trait_type":"Fazendeiro","value":"', Strings.toHexString(uint160(cert.fazendeiro), 20), '"},',
        '{"trait_type":"Timestamp","value":"', Strings.toString(cert.timestamp), '"}',
        ']}'
      ));
      return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
      ```
    - Nota: `Strings.toHexString(uint160(addr), 20)` produz o endereço com checksum implícito; verificar se OpenZeppelin 5.6.1 expõe esta sobrecarga — caso contrário usar `Strings.toHexString(uint160(addr))`.
  - Sobrescrever `tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory)` delegando para `super.tokenURI(tokenId)` (ERC721URIStorage)
  - Sobrescrever `supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool)` delegando para `super.supportsInterface(interfaceId)`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.5, 4.6, 5.1, 5.2, 5.3, 6.1_

- [ ] 2. Instalar `fast-check` e escrever os testes do contrato
  - [ ] 2.1 Instalar fast-check como dependência de desenvolvimento
    - Rodar `npm install --save-dev fast-check` na raiz do workspace (`c:\Users\Usuário\agrochain\workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip`)
    - Verificar que `fast-check` aparece em `devDependencies` no `package.json` raiz
    - _Requirements: 10.1_

  - [ ] 2.2 Criar `blockchain/tests/AgroChainCertNFT.test.js`
    - Cabeçalho: `import { expect } from "chai"; import hre from "hardhat"; import fc from "fast-check";`
    - No `before`, obter `ethers` via `await hre.network.create()` (padrão Hardhat 3.18.1)
    - No `beforeEach`, deploy do `AgroChainCertNFT` via `ethers.getContractFactory("AgroChainCertNFT").then(f => f.deploy())`; capturar `[owner, alice, bob] = await ethers.getSigners()`
    - **Bloco `Initialization`** (exemplos):
      - Verificar `name() == "AgroChain Certificado NFT"` e `symbol() == "AGCNFT"`
      - Verificar `supportsInterface("0x80ac58cd")` retorna true (ERC721)
      - Verificar `supportsInterface("0x5b5e139f")` retorna true (ERC721Metadata)
    - **Bloco `mintCertificado — valid inputs`** (exemplos + PBT):
      - Exemplo: mint de um certificado Coffee com dados fixos → tokenId = 1; `ownerOf(1) == owner.address`
      - Exemplo: segundo mint → tokenId = 2
      - **PBT — Property 1 (Round-trip)**: `Feature: agrochain-nft-cert, Property 1: Round-trip de dados do certificado`
        ```js
        await fc.assert(fc.asyncProperty(
          fc.record({
            batchId:   fc.string({ minLength: 1, maxLength: 64 }),
            tipo:      fc.constantFrom("Coffee", "Cacao"),
            variedade: fc.string({ minLength: 1, maxLength: 32 }),
            pesoKg:    fc.bigInt({ min: 1n, max: 1_000_000n }),
            origem:    fc.string({ minLength: 1, maxLength: 64 }),
          }),
          async ({ batchId, tipo, variedade, pesoKg, origem }) => {
            const tx = await contract.mintCertificado(batchId, tipo, variedade, pesoKg, origem);
            const receipt = await tx.wait();
            // extrair tokenId do evento
            const event = receipt.logs.find(l => l.fragment?.name === "CertificadoMintado");
            const tokenId = event.args.tokenId;
            const cert = await contract.getCertificado(tokenId);
            expect(cert.batchId).to.equal(batchId);
            expect(cert.tipo).to.equal(tipo);
            expect(cert.variedade).to.equal(variedade);
            expect(cert.pesoKg).to.equal(pesoKg);
            expect(cert.origem).to.equal(origem);
            expect(cert.fazendeiro).to.equal(owner.address);
            expect(cert.timestamp).to.be.gt(0n);
          }
        ), { numRuns: 100 });
        ```
      - **PBT — Property 2 (Sequência de TokenIds)**: `Feature: agrochain-nft-cert, Property 2: Sequência monotônica de TokenIds`
        ```js
        await fc.assert(fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (n) => {
            const ids = [];
            for (let i = 0; i < n; i++) {
              const tx = await contract.mintCertificado("BATCH-" + i, "Coffee", "Arabica", 100n, "Brasil");
              const receipt = await tx.wait();
              const event = receipt.logs.find(l => l.fragment?.name === "CertificadoMintado");
              ids.push(event.args.tokenId);
            }
            for (let i = 0; i < ids.length; i++) {
              expect(ids[i]).to.equal(BigInt(i + 1));
            }
          }
        ), { numRuns: 20 });
        // Nota: 20 runs com n até 10 = até 200 mints por suite; balancear com performance
        ```
      - **PBT — Property 5 (Evento com args corretos)**: `Feature: agrochain-nft-cert, Property 5: Evento emitido com argumentos corretos`
        ```js
        await fc.assert(fc.asyncProperty(
          fc.record({
            batchId: fc.string({ minLength: 1, maxLength: 32 }),
            tipo:    fc.constantFrom("Coffee", "Cacao"),
          }),
          async ({ batchId, tipo }) => {
            const tx = await contract.mintCertificado(batchId, tipo, "Arabica", 100n, "Brasil");
            const receipt = await tx.wait();
            const event = receipt.logs.find(l => l.fragment?.name === "CertificadoMintado");
            expect(event).to.not.be.undefined;
            expect(event.args.fazendeiro).to.equal(owner.address);
            expect(event.args.batchId).to.equal(batchId);
          }
        ), { numRuns: 100 });
        ```
    - **Bloco `mintCertificado — validation errors`**:
      - Exemplo: `pesoKg = 0` → `revertedWith("AgroChain: pesoKg must be > 0")`
      - Exemplo: `batchId = ""` → `revertedWith("AgroChain: batchId required")`
      - Exemplo: `tipo = "Wheat"` → `revertedWith("AgroChain: tipo must be Coffee or Cacao")`
      - **PBT — Property 3 (Rejeição de tipo inválido)**: `Feature: agrochain-nft-cert, Property 3: Rejeição de tipo inválido`
        ```js
        await fc.assert(fc.asyncProperty(
          fc.string().filter(s => s !== "Coffee" && s !== "Cacao"),
          async (tipoInvalido) => {
            await expect(
              contract.mintCertificado("BATCH-1", tipoInvalido, "Arabica", 100n, "Brasil")
            ).to.be.revertedWith("AgroChain: tipo must be Coffee or Cacao");
          }
        ), { numRuns: 100 });
        ```
    - **Bloco `tokenURI`**:
      - Exemplo: após mint, `tokenURI(1)` começa com `"data:application/json;base64,"`
      - `tokenURI(999)` reverte (ERC721URIStorage padrão)
      - **PBT — Property 4 (tokenURI Base64)**: `Feature: agrochain-nft-cert, Property 4: tokenURI retorna URI Base64 válida`
        ```js
        await fc.assert(fc.asyncProperty(
          fc.record({
            batchId:   fc.string({ minLength: 1, maxLength: 32 }),
            tipo:      fc.constantFrom("Coffee", "Cacao"),
            variedade: fc.string({ minLength: 1, maxLength: 32 }),
            pesoKg:    fc.bigInt({ min: 1n, max: 100_000n }),
            origem:    fc.string({ minLength: 1, maxLength: 64 }),
          }),
          async ({ batchId, tipo, variedade, pesoKg, origem }) => {
            const tx = await contract.mintCertificado(batchId, tipo, variedade, pesoKg, origem);
            const receipt = await tx.wait();
            const event = receipt.logs.find(l => l.fragment?.name === "CertificadoMintado");
            const tokenId = event.args.tokenId;
            const uri = await contract.tokenURI(tokenId);
            expect(uri.startsWith("data:application/json;base64,")).to.be.true;
            const base64Part = uri.replace("data:application/json;base64,", "");
            const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
            const metadata = JSON.parse(decoded);
            expect(metadata.attributes.find(a => a.trait_type === "Batch ID")?.value).to.equal(batchId);
            expect(metadata.attributes.find(a => a.trait_type === "Tipo")?.value).to.equal(tipo);
          }
        ), { numRuns: 100 });
        ```
    - **Bloco `getCertificado`**:
      - `getCertificado(999)` reverte com `"AgroChain: token does not exist"`
      - Múltiplos usuários: Alice minta, `ownerOf` retorna `alice.address`; Bob minta, `ownerOf` retorna `bob.address`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [ ] 3. Checkpoint — Compilar e rodar os testes
  - Rodar `npx hardhat compile` na raiz para verificar que `AgroChainCertNFT.sol` compila sem erros
  - Rodar `npx hardhat test blockchain/tests/AgroChainCertNFT.test.js` na raiz
  - Todos os testes devem passar. Se algum falhar, corrigir o contrato ou o teste antes de continuar.

- [ ] 4. Criar o `deploy-nft-sepolia.mjs`
  - Criar o arquivo `blockchain/scripts/deploy-nft-sepolia.mjs`
  - Usar `import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";` e `import fs from "fs";`
  - Definir a constante `artifactPath` como caminho absoluto para `blockchain/artifacts/blockchain/contracts/AgroChainCertNFT.sol/AgroChainCertNFT.json` (usar `String.raw` ou barras normais, igual ao padrão de `deploy-direct.mjs`)
  - Ler e fazer `JSON.parse` do artifact; logar `artifact.bytecode.length`
  - Conectar ao provider: `new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com")`
  - Criar wallet: `new Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)` — se `DEPLOYER_PRIVATE_KEY` não estiver definido, lançar erro com `"DEPLOYER_PRIVATE_KEY env var is required"`
  - Instanciar `ContractFactory(artifact.abi, artifact.bytecode, wallet)`
  - Chamar `factory.getDeployTransaction()`, depois `provider.estimateGas(deployTx)`, calcular `gasLimit = estimated * 120n / 100n`
  - Chamar `factory.deploy({ gasLimit })`, logar o hash da TX
  - Aguardar `contract.waitForDeployment()`, capturar `addr = await contract.getAddress()`
  - Gravar `blockchain/deployment-nft-sepolia.json` com `{ address: addr, chainId: 11155111, deployer: wallet.address, txHash: contract.deploymentTransaction().hash, time: new Date().toISOString() }`
  - Logar o endereço e o link: `"https://sepolia.etherscan.io/address/" + addr`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ] 5. Atualizar `dapp/src/lib/contracts.ts` com ABI e helpers do NFT
  - Adicionar ao final do arquivo `dapp/src/lib/contracts.ts` (sem remover o conteúdo existente):
    ```typescript
    // ─── AgroChainCertNFT ───────────────────────────────────────────────────────

    export const AGRO_CERT_NFT_ABI = [
      {
        name: 'mintCertificado',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
          { name: 'batchId',    type: 'string' },
          { name: 'tipo',       type: 'string' },
          { name: 'variedade',  type: 'string' },
          { name: 'pesoKg',     type: 'uint256' },
          { name: 'origem',     type: 'string' },
        ],
        outputs: [{ name: 'tokenId', type: 'uint256' }],
      },
      {
        name: 'getCertificado',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'tokenId', type: 'uint256' }],
        outputs: [{
          name: '', type: 'tuple',
          components: [
            { name: 'batchId',    type: 'string' },
            { name: 'tipo',       type: 'string' },
            { name: 'variedade',  type: 'string' },
            { name: 'pesoKg',     type: 'uint256' },
            { name: 'origem',     type: 'string' },
            { name: 'fazendeiro', type: 'address' },
            { name: 'timestamp',  type: 'uint256' },
          ],
        }],
      },
      {
        name: 'CertificadoMintado',
        type: 'event',
        inputs: [
          { name: 'tokenId',    type: 'uint256', indexed: true },
          { name: 'fazendeiro', type: 'address', indexed: true },
          { name: 'batchId',    type: 'string',  indexed: false },
        ],
      },
    ] as const;

    // Signature keccak256 do evento — usada para parsear logs do receipt
    // keccak256("CertificadoMintado(uint256,address,string)") = valor calculado em runtime com viem
    export const CERTIFICADO_MINTADO_TOPIC =
      '0x' + /* calculado via viem no componente ou pré-computado */ 'placeholder';

    export const NFT_CONTRACT_STORAGE_KEY = 'agrochain_nft_contract_address';

    export function getNFTContractAddress(): string {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(NFT_CONTRACT_STORAGE_KEY) || '';
      }
      return '';
    }

    export function setNFTContractAddress(address: string): void {
      if (typeof window !== 'undefined') {
        localStorage.setItem(NFT_CONTRACT_STORAGE_KEY, address);
      }
    }
    ```
  - Nota: O `CERTIFICADO_MINTADO_TOPIC` placeholder será substituído na página com `viem`'s `keccak256(toHex('CertificadoMintado(uint256,address,string)'))`. Manter como constante ou calcular inline na página — ambas abordagens funcionam.
  - _Requirements: 8.1, 8.2_

- [ ] 6. Reescrever `dapp/src/app/certificacao/page.tsx` para mint NFT
  - Manter a estrutura geral do arquivo existente: `'use client'`, imports, `CertStep` type, estado com `useState`, `useEffect` para hydration, skeleton de loading
  - **Atualizar imports** no topo:
    ```typescript
    import { encodeFunctionData, getAddress, keccak256, toHex } from 'viem';
    import { AGRO_CERT_NFT_ABI, getNFTContractAddress, setNFTContractAddress, NFT_CONTRACT_STORAGE_KEY } from '@/lib/contracts';
    ```
  - **Atualizar os steps iniciais** `INITIAL_STEPS`:
    ```typescript
    const INITIAL_STEPS: CertStep[] = [
      { label: '1. Validar carteira',   status: 'PENDING' },
      { label: '2. Preparar mint NFT',  status: 'PENDING' },
      { label: '3. Submeter on-chain',  status: 'PENDING' },
      { label: '4. Confirmação',        status: 'PENDING' },
    ];
    ```
  - **Adicionar estado** para resultado do NFT:
    ```typescript
    const [mintedTokenId, setMintedTokenId] = useState<string>('');
    ```
  - **No `useEffect`**, usar `getNFTContractAddress()` para carregar o endereço (chave `agrochain_nft_contract_address`), não a chave antiga
  - **Substituir `handleSetContractAddress`** para usar `setNFTContractAddress` do helper
  - **Calcular o topic do evento** no corpo do componente (fora do handler, como constante):
    ```typescript
    const CERTIFICADO_MINTADO_TOPIC = keccak256(toHex('CertificadoMintado(uint256,address,string)'));
    ```
  - **Reescrever `handleSubmit`** mantendo os 4 steps:
    - **Step 1 (Validar carteira)**: validações frontend:
      - `!form.batchId` → erro "Batch ID é obrigatório"
      - `!form.weightKg || Number(form.weightKg) <= 0` → erro "Peso deve ser maior que zero"
      - `!form.origin` → erro "Origem é obrigatória"
      - Verificar `isConnected`, `chain?.id === 11155111`, contrato configurado, `window.ethereum` presente
      - Verificar bytecode do contrato (mesma lógica `eth_getCode` já existente)
    - **Step 2 (Preparar mint NFT)**: codificar chamada com viem:
      ```typescript
      const callData = encodeFunctionData({
        abi: AGRO_CERT_NFT_ABI,
        functionName: 'mintCertificado',
        args: [form.batchId, form.type, form.variety, BigInt(form.weightKg), form.origin],
      });
      ```
    - **Step 3 (Submeter on-chain)**: enviar TX via `window.ethereum.request({ method: 'eth_sendTransaction', ... })`; salvar hash
    - **Step 4 (Confirmação)**: aguardar recibo em polling:
      ```typescript
      // Polling com intervalo 2s, timeout 60s
      let receipt = null;
      const startTime = Date.now();
      while (!receipt) {
        if (Date.now() - startTime > 60_000) throw new Error('Timeout aguardando confirmação. Verifique no Etherscan.');
        await new Promise(r => setTimeout(r, 2000));
        receipt = await window.ethereum.request({
          method: 'eth_getTransactionReceipt',
          params: [hash],
        });
      }
      // Parsear o tokenId do log CertificadoMintado
      const mintLog = (receipt as any).logs?.find(
        (l: any) => l.topics?.[0]?.toLowerCase() === CERTIFICADO_MINTADO_TOPIC.toLowerCase()
      );
      const rawTokenId = mintLog ? BigInt(mintLog.topics[1]).toString() : '';
      setMintedTokenId(rawTokenId);
      ```
  - **Atualizar seção de resultado** (bloco `isDone`):
    ```tsx
    {isDone && (
      <div style={{ marginTop: '20px', padding: '16px', background: '#f0faf4', borderRadius: '8px', border: '1px solid #1f6440' }}>
        <div style={{ fontSize: '32px', textAlign: 'center' }}>🎉</div>
        <p style={{ margin: '8px 0 0', fontWeight: '700', color: '#1f6440', textAlign: 'center' }}>
          Certificado NFT Emitido!
        </p>
        {mintedTokenId && (
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: '#1e2a22', textAlign: 'center', fontWeight: '600' }}>
            NFT Token ID: #{mintedTokenId}
          </p>
        )}
        <p style={{ margin: '8px 0 0', fontSize: '11px', color: '#495649', textAlign: 'center', fontFamily: 'monospace', wordBreak: 'break-all' }}>
          {txHash}
        </p>
        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
            style={{ color: '#1f6440', textDecoration: 'underline', fontSize: '12px' }}>
            🔍 Ver TX no Etherscan →
          </a>
          {mintedTokenId && contractAddress && (
            <a href={`https://testnets.opensea.io/assets/sepolia/${contractAddress}/${mintedTokenId}`}
              target="_blank" rel="noopener noreferrer"
              style={{ color: '#1f6440', textDecoration: 'underline', fontSize: '12px' }}>
              🖼️ Ver NFT no OpenSea →
            </a>
          )}
        </div>
      </div>
    )}
    ```
  - Manter o botão de submit, labels de campos e lógica de disabled exatamente como existem — apenas atualizar o texto do botão para `'🏆 Emitir Certificado NFT'` quando disponível
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4_

- [ ] 7. Checkpoint final — Verificar compilação e testes
  - Rodar `npx hardhat compile` na raiz — deve compilar sem warnings críticos
  - Rodar `npx hardhat test blockchain/tests/AgroChainCertNFT.test.js` — todos os testes devem passar
  - Verificar que `dapp/src/app/certificacao/page.tsx` não tem erros de TypeScript: `cd dapp && npx tsc --noEmit`
  - Se algum erro for encontrado, corrigir antes de finalizar.

## Notes

- Tarefas marcadas com `*` são opcionais e podem ser puladas para MVP mais rápido
- Cada tarefa referencia os requisitos específicos para rastreabilidade
- O contrato deve compilar com `viaIR: true` (já configurado no `hardhat.config.js`) por causa do potencial "stack too deep" na função `_buildTokenURI`
- A variável de ambiente `DEPLOYER_PRIVATE_KEY` deve estar configurada no `.env` antes de rodar o deploy script
- Os testes PBT podem ser lentos com `numRuns: 100` e múltiplos mints por run — ajustar `numRuns` se o timeout do Hardhat (120s) for atingido
- A chave `agrochain_nft_contract_address` no localStorage é diferente da chave antiga `agrochain_contract_address` — ambas coexistem sem conflito

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2"] },
    { "id": 3, "tasks": ["4", "5"] },
    { "id": 4, "tasks": ["6"] }
  ]
}
```
