#!/usr/bin/env node
/**
 * Deploy Sepolia
 * 
 * Faz deploy dos contratos AgroChain na rede Sepolia testnet.
 * 
 * Requer variáveis de ambiente:
 * - SEPOLIA_RPC_URL: URL do RPC (ex: Alchemy, Infura, QuickNode)
 * - DEPLOYER_PRIVATE_KEY: Private key da conta que faz deploy
 * - INITIAL_CERTIFICADORA_ADDRESS: Endereço autorizado para emitir (opcional)
 * 
 * Uso: npm run deploy:sepolia
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOCKCHAIN_DIR = path.join(__dirname, "..");
const CONTRACTS_DIR = path.join(BLOCKCHAIN_DIR, "contracts");
const ARTIFACTS_DIR = path.join(BLOCKCHAIN_DIR, "artifacts");

async function log(msg, level = "info") {
  const timestamp = new Date().toISOString();
  const prefix = level.toUpperCase().padEnd(5);
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

async function deployContracts() {
  try {
    log("=== AgroChain Deploy em Sepolia ===\n");
    
    // Validar variáveis de ambiente
    const rpcUrl = process.env.SEPOLIA_RPC_URL;
    const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;
    
    if (!rpcUrl) {
      log("Erro: SEPOLIA_RPC_URL não configurada", "error");
      log("Exemplo: export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY");
      process.exit(1);
    }
    
    if (!deployerKey) {
      log("Erro: DEPLOYER_PRIVATE_KEY não configurada", "error");
      log("Exemplo: export DEPLOYER_PRIVATE_KEY=0x...");
      process.exit(1);
    }
    
    // Conectar à Sepolia
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const signer = new ethers.Wallet(deployerKey, provider);
    
    log(`Conectado a Sepolia com signer: ${signer.address}`);
    
    // Verificar saldo
    const balance = await provider.getBalance(signer.address);
    log(`Saldo: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
      log("Saldo insuficiente. Obtenha ETH de teste em:", "warn");
      log("  https://www.sepoliafaucet.com");
      log("  https://faucets.chain.link/sepolia");
      process.exit(1);
    }
    
    // Carregar ABIs compiladas
    log("\nCarregando contratos compilados...");
    
    const getAbi = (contractName) => {
      const artifactPath = path.join(ARTIFACTS_DIR, contractName);
      
      // Procurar em blockchain/artifacts
      const searchPatterns = [
        `${contractName}.json`,
        `blockchain/contracts/${contractName}.sol/${contractName}.json`,
      ];
      
      for (const pattern of searchPatterns) {
        const fullPath = path.join(ARTIFACTS_DIR, pattern);
        if (fs.existsSync(fullPath)) {
          const artifact = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
          return artifact.abi;
        }
      }
      
      log(`ABI não encontrado para ${contractName}`, "warn");
      return null;
    };
    
    // 1. Deploy do Verifier Groth16
    log("\n1. Deploy de AgroChainGroth16Verifier...");
    
    const verifierAbi = [
      "function verifyProof(uint256[2] a, uint256[2][2] b, uint256[2] c, uint256[5] input) public view returns (bool)"
    ];
    
    // Nota: O bytecode seria lido de artifacts após compilação hardhat
    // Por agora, apenas simulamos a estrutura
    log("  ⚠ Deploy do Verifier requer bytecode compilado");
    log("    Execute: npm run blockchain:compile");
    
    let verifierAddress = process.env.VERIFIER_ADDRESS;
    if (!verifierAddress) {
      log("  VERIFIER_ADDRESS não encontrado em env. Informe após compilação e deploy.", "warn");
      verifierAddress = "0x0000000000000000000000000000000000000000"; // placeholder
    }
    
    log(`  Endereço (ou placeholder): ${verifierAddress}`);
    
    // 2. Deploy de AgroChainRegistro
    log("\n2. Deploy de AgroChainRegistro...");
    
    let registroAddress = process.env.REGISTRO_ADDRESS;
    if (!registroAddress) {
      log("  Implantando novo contrato...");
      
      // Simplificado: usar deploy hardhat ou viaethers
      // npm run hardhat run blockchain/scripts/deploy.hardhat.js --network sepolia
      
      log("  ⚠ Use 'npm run deploy:amoy' para deploy via Hardhat", "warn");
      registroAddress = "0x0000000000000000000000000000000000000000";
    }
    
    log(`  Endereço (ou placeholder): ${registroAddress}`);
    
    // 3. Deploy de AgroChainUtilityToken
    log("\n3. Deploy de AgroChainUtilityToken (via AgroChainCertificacoes)...");
    log("  Token é criado automaticamente no construtor do certificador");
    
    // 4. Deploy de AgroChainCertificacoes
    log("\n4. Deploy de AgroChainCertificacoes...");
    
    const initialCertificadora = 
      process.env.INITIAL_CERTIFICADORA_ADDRESS || signer.address;
    
    log(`  Certificadora inicial: ${initialCertificadora}`);
    
    log("  ⚠ Use 'npm run deploy:amoy' para deploy via Hardhat", "warn");
    
    // 5. Salvar endereços para futuro uso
    log("\n5. Salvando endereços de deploy...");
    
    const deploymentInfo = {
      network: "sepolia",
      chainId: 11155111,
      deployer: signer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        verifier: verifierAddress,
        registro: registroAddress,
        certificacoes: "0x0000000000000000000000000000000000000000", // placeholder
        utilityToken: "0x0000000000000000000000000000000000000000", // criado automaticamente
      },
      instructions: {
        step1: "npm run blockchain:compile",
        step2: "npm run deploy:amoy",
        step3: "npm run zk:prove",
        step4: "npm run test:certification",
      }
    };
    
    const infoPath = path.join(ARTIFACTS_DIR, "deployment-sepolia.json");
    fs.writeFileSync(infoPath, JSON.stringify(deploymentInfo, null, 2));
    
    log(`Informações de deploy salvas em: ${infoPath}`);
    
    log("\n=== Próximos passos ===");
    log("1. Execute 'npm run blockchain:compile' para compilar todos os contratos");
    log("2. Configure Hardhat network para Sepolia no hardhat.config.js");
    log("3. Execute 'npm run deploy:amoy' (ou crie deploy:sepolia no package.json)");
    log("4. Após deploy bem-sucedido, use 'npm run zk:prove' para emitir certificações");
    
  } catch (error) {
    log(`Erro de deploy: ${error.message}`, "error");
    console.error(error);
    process.exit(1);
  }
}

deployContracts();
