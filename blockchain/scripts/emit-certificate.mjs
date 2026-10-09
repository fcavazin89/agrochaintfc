#!/usr/bin/env node
/**
 * Emit Certificate
 * 
 * Emite uma certificação AgroChain:
 * 1. Gera prova ZK localmente (fornecendo score privado e sal)
 * 2. Cria pedido de certificação assinado
 * 3. Envia transação para emitir certificação on-chain
 * 
 * Uso: node emit-certificate.mjs --lote 0x... --titular 0x... --score 85 --salt 12345
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import snarkjs from "snarkjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOCKCHAIN_DIR = path.join(__dirname, "..");
const CIRCUITS_DIR = path.join(BLOCKCHAIN_DIR, "circuits");
const CONTRACTS_DIR = path.join(BLOCKCHAIN_DIR, "contracts");
const ARTIFACTS_DIR = path.join(BLOCKCHAIN_DIR, "artifacts");

const CIRCUIT_NAME = "agrochain-score-threshold";

// Configurações de exemplo
const EXAMPLE_CONFIG = {
  // Valores privados do provador
  qualityScore: 85,        // Score de qualidade (0-100)
  salt: 12345n,            // Sal para commitmentização
  
  // Valores públicos (padrão + laudo + lote)
  loteId: ethers.id("lote-001"),
  padraoHash: ethers.id("standard-cafe-arabica"),
  hashLaudo: ethers.id("laudo-laboratorio-12345"),
  
  // Dados de certificação
  notaMinima: 80,          // Nota mínima para certificação
  validoAte: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // Válido por 1 ano
  tipo: "Café Arabica Premium",
  
  // Endereços (exemplo)
  certificadora: "0x0000000000000000000000000000000000000000",  // Será preenchido
  titular: "0x0000000000000000000000000000000000000000",        // Será preenchido
  
  // Metadados (IPFS-ready)
  tokenURI: "ipfs://QmExample123",
};

async function log(msg, level = "info") {
  const timestamp = new Date().toISOString();
  const prefix = level.toUpperCase().padEnd(5);
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

async function generateProof(config) {
  log("Gerando prova ZK...");
  
  const wasmPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_js`, `${CIRCUIT_NAME}.wasm`);
  const zkeyPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_final.zkey`);
  
  if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
    log("Arquivos ZK não encontrados. Execute 'npm run zk:setup:prod' primeiro.", "error");
    process.exit(1);
  }
  
  // Construir inputs privados e públicos
  const commitment = computeCommitment(
    config.qualityScore,
    config.salt,
    config.loteId,
    config.padraoHash,
    config.hashLaudo
  );
  
  const inputs = {
    commitment: commitment.toString(),
    minimumScore: config.notaMinima.toString(),
    lotContext: (BigInt(config.loteId) % BigInt(
      "21888242871839275222246405745257275088548364400416034343698204186575808495617"
    )).toString(),
    standardContext: (BigInt(config.padraoHash) % BigInt(
      "21888242871839275222246405745257275088548364400416034343698204186575808495617"
    )).toString(),
    reportContext: (BigInt(config.hashLaudo) % BigInt(
      "21888242871839275222246405745257275088548364400416034343698204186575808495617"
    )).toString(),
    qualityScore: config.qualityScore.toString(),
    salt: config.salt.toString(),
  };
  
  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      wasmPath,
      zkeyPath
    );
    
    log("Prova ZK gerada com sucesso");
    return { proof, publicSignals, commitment };
  } catch (error) {
    log(`Erro ao gerar prova: ${error.message}`, "error");
    throw error;
  }
}

function computeCommitment(score, salt, loteId, padraoHash, hashLaudo) {
  // Usar Poseidon hash localmente (simulado)
  // Em produção real, importar circomlibjs para Poseidon
  const data = ethers.AbiCoder.defaultAbiCoder().encode(
    ["uint256", "uint256", "bytes32", "bytes32", "bytes32"],
    [score, salt, loteId, padraoHash, hashLaudo]
  );
  
  return BigInt(ethers.keccak256(data));
}

function formatProof(proof) {
  // Converter prova do snarkjs para formato Solidity
  const proofData = {
    a: [proof.pi_a[0], proof.pi_a[1]].map(x => x.toString()),
    b: [
      [proof.pi_b[0][1], proof.pi_b[0][0]].map(x => x.toString()),
      [proof.pi_b[1][1], proof.pi_b[1][0]].map(x => x.toString()),
    ],
    c: [proof.pi_c[0], proof.pi_c[1]].map(x => x.toString()),
  };
  
  return proofData;
}

async function emitCertificate(config, proof, commitment) {
  log("Preparando transação de certificação...");
  
  // Conectar à rede (usar provider local ou Sepolia)
  const rpcUrl = process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  // Signer (usar private key ou wallet local)
  let signer;
  if (process.env.DEPLOYER_PRIVATE_KEY) {
    signer = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
    log(`Usando wallet: ${signer.address}`);
  } else {
    log("DEPLOYER_PRIVATE_KEY não configurada. Use --dry-run para simular.", "warn");
    return { simulation: true, commitment, proof };
  }
  
  // Ler contrato ABI (será gerado após compilação)
  const abiPath = path.join(ARTIFACTS_DIR, "AgroChainCertificacoes.json");
  if (!fs.existsSync(abiPath)) {
    log("ABI do contrato não encontrado. Compile com 'npm run blockchain:compile'", "error");
    process.exit(1);
  }
  
  const contractAbi = JSON.parse(fs.readFileSync(abiPath, "utf-8")).abi;
  
  // Endereço do contrato (obter de variável de ambiente ou deploy prévio)
  const contractAddress = process.env.AGRO_CHAIN_CERTIFICACOES_ADDRESS;
  if (!contractAddress) {
    log("AGRO_CHAIN_CERTIFICACOES_ADDRESS não configurada", "error");
    process.exit(1);
  }
  
  const contract = new ethers.Contract(contractAddress, contractAbi, signer);
  
  // Construir pedido de certificação
  const pedido = {
    id: ethers.id(`cert-${Date.now()}`),
    loteId: config.loteId,
    padraoHash: config.padraoHash,
    hashLaudo: config.hashLaudo,
    compromissoScore: commitment,
    tipo: config.tipo,
    validoAte: config.validoAte,
    notaMinima: config.notaMinima,
    titular: config.titular,
    tokenURI: config.tokenURI,
  };
  
  const provaFormatada = formatProof(proof.proof);
  
  try {
    log("Enviando transação...");
    const tx = await contract.emitirCertificacao(pedido, provaFormatada);
    
    log(`Transação enviada: ${tx.hash}`);
    log("Aguardando confirmação...");
    
    const receipt = await tx.wait();
    
    if (receipt.status === 1) {
      log("✓ Certificação emitida com sucesso!");
      log(`Bloco: ${receipt.blockNumber}`);
      log(`Gas usado: ${receipt.gasUsed.toString()}`);
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        pedido,
        proof: provaFormatada,
      };
    } else {
      log("Transação falhou", "error");
      process.exit(1);
    }
  } catch (error) {
    log(`Erro ao emitir certificação: ${error.message}`, "error");
    throw error;
  }
}

async function main() {
  try {
    log("=== AgroChain Certificate Emission ===");
    
    // Parsear argumentos de linha de comando
    const config = { ...EXAMPLE_CONFIG };
    const args = process.argv.slice(2);
    
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i].replace(/^--/, "");
      const value = args[i + 1];
      
      if (key === "score") config.qualityScore = parseInt(value);
      else if (key === "salt") config.salt = BigInt(value);
      else if (key === "nota-minima") config.notaMinima = parseInt(value);
      else if (key === "tipo") config.tipo = value;
      else if (key === "titular") config.titular = value;
      else if (key === "dry-run") {
        log("Modo dry-run: simulando emissão");
      }
    }
    
    // Validar inputs
    if (config.qualityScore > 100 || config.qualityScore < 0) {
      log("Score deve estar entre 0 e 100", "error");
      process.exit(1);
    }
    
    if (config.notaMinima > 100 || config.notaMinima < 0) {
      log("Nota mínima deve estar entre 0 e 100", "error");
      process.exit(1);
    }
    
    log(`Certificação: ${config.tipo}`);
    log(`Score privado: ${config.qualityScore}, Nota mínima: ${config.notaMinima}`);
    
    // Gerar prova ZK
    const { proof, publicSignals, commitment } = await generateProof(config);
    
    // Emitir certificação
    const result = await emitCertificate(config, { proof, publicSignals }, commitment);
    
    log("\n✓ Certificação concluída!");
    
    // Salvar resultado
    const resultPath = path.join(ARTIFACTS_DIR, `certificate_${Date.now()}.json`);
    fs.writeFileSync(resultPath, JSON.stringify(result, (k, v) => 
      typeof v === 'bigint' ? v.toString() : v, 2));
    
    log(`Resultado salvo em: ${resultPath}`);
    
  } catch (error) {
    log(`Erro fatal: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

main();
