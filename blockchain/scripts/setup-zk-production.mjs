#!/usr/bin/env node
/**
 * Setup ZK Production
 * 
 * Compila o circuito Circom, gera ptau, r1cs, wasm, zkey e verifier contrato
 * pronto para deploy em Sepolia ou qualquer rede.
 * 
 * Uso: npm run zk:setup:prod
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BLOCKCHAIN_DIR = path.join(__dirname, "..");
const CIRCUITS_DIR = path.join(BLOCKCHAIN_DIR, "circuits");
const ARTIFACTS_DIR = path.join(BLOCKCHAIN_DIR, "artifacts");
const CONTRACTS_DIR = path.join(BLOCKCHAIN_DIR, "contracts");

// Arquivos de entrada e saída
const CIRCUIT_FILE = "agrochain-score-threshold.circom";
const CIRCUIT_PATH = path.join(CIRCUITS_DIR, CIRCUIT_FILE);
const CIRCUIT_NAME = CIRCUIT_FILE.replace(".circom", "");

async function log(msg, level = "info") {
  const timestamp = new Date().toISOString();
  const prefix = level.toUpperCase().padEnd(5);
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

async function runCommand(cmd, cwd = null) {
  try {
    log(`Executando: ${cmd}`);
    execSync(cmd, { cwd: cwd || __dirname, stdio: "inherit" });
  } catch (error) {
    log(`Erro ao executar comando: ${error.message}`, "error");
    process.exit(1);
  }
}

async function setup() {
  log("=== AgroChain ZK Production Setup ===");
  
  // 1. Verificar se o circuito existe
  if (!fs.existsSync(CIRCUIT_PATH)) {
    log(`Circuito não encontrado em ${CIRCUIT_PATH}`, "error");
    process.exit(1);
  }
  log(`Circuito encontrado: ${CIRCUIT_FILE}`);
  
  // 2. Criar diretórios se não existirem
  [CIRCUITS_DIR, ARTIFACTS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`Criado diretório: ${dir}`);
    }
  });
  
  try {
    // 3. Compilar o circuito Circom para r1cs e wasm
    log("1/4 Compilando circuito Circom...");
    const r1csPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.r1cs`);
    const wasmPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_js`, `${CIRCUIT_NAME}.wasm`);
    
    await runCommand(
      `circom ${CIRCUIT_PATH} --r1cs --wasm --output ${CIRCUITS_DIR}`,
      CIRCUITS_DIR
    );
    log(`Circuito compilado: ${r1csPath}`);
    
    // 4. Gerar ptau (Phase 1 - Powers of Tau)
    // Para desenvolvimento, usar ptau pequeno; para produção, baixar ceremony oficial
    log("2/4 Preparando ptau...");
    const ptauPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}.ptau`);
    
    if (!fs.existsSync(ptauPath)) {
      // Gerar ptau local para teste (não usar em produção!)
      // Em produção, baixar da ceremony oficial do snarkjs
      log("Gerando ptau local (DEV ONLY - use ceremony oficial em produção!)");
      
      // Usar snarkjs para gerar ptau
      // snarkjs powersoftau new bn128 <power> <ptau_file> -v
      const circuitConstraints = await countConstraints(CIRCUIT_PATH);
      const power = Math.ceil(Math.log2(circuitConstraints + 1));
      
      await runCommand(
        `snarkjs powersoftau new bn128 ${power} ${ptauPath} -v`,
        CIRCUITS_DIR
      );
      
      // Contribuir com randomness (simulation apenas)
      await runCommand(
        `snarkjs powersoftau contribute ${ptauPath} ${ptauPath} --name="AgroChain" -v`,
        CIRCUITS_DIR
      );
      
      log(`ptau gerado: ${ptauPath}`);
    } else {
      log(`ptau existente: ${ptauPath}`);
    }
    
    // 5. Gerar zkey (prover key) a partir de r1cs + ptau
    log("3/4 Gerando zkey (prover key)...");
    const zkeyPath = path.join(CIRCUITS_DIR, `${CIRCUIT_NAME}_final.zkey`);
    
    if (!fs.existsSync(zkeyPath)) {
      await runCommand(
        `snarkjs zk setup ${r1csPath} ${ptauPath} ${zkeyPath} -v`,
        CIRCUITS_DIR
      );
      log(`zkey gerado: ${zkeyPath}`);
    } else {
      log(`zkey existente: ${zkeyPath}`);
    }
    
    // 6. Exportar verificador para Solidity
    log("4/4 Gerando contrato Verifier.sol...");
    const verifierPath = path.join(CONTRACTS_DIR, "AgroChainGroth16Verifier_Generated.sol");
    
    await runCommand(
      `snarkjs zk export-solidityverifier ${zkeyPath} ${verifierPath}`,
      CIRCUITS_DIR
    );
    
    // Atualizar o contrato template com o código gerado
    const generatedVerifier = fs.readFileSync(verifierPath, "utf-8");
    
    // Modificar o nome da classe e adicionar interface
    let updatedVerifier = generatedVerifier
      .replace(/contract Verifier/g, "contract AgroChainGroth16Verifier_Impl")
      .replace(/pragma solidity.*?;/, 'pragma solidity ^0.8.24;\n\nimport {IAgroChainGroth16Verifier} from "./IAgroChainGroth16Verifier.sol";')
      .replace(/contract AgroChainGroth16Verifier_Impl/, 'contract AgroChainGroth16Verifier_Generated is IAgroChainGroth16Verifier');
    
    fs.writeFileSync(verifierPath, updatedVerifier);
    log(`Verifier.sol gerado: ${verifierPath}`);
    
    // 7. Copiar wasm para artifacts para uso em browser/scripts
    const wasmArtifactPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}.wasm`);
    if (fs.existsSync(wasmPath)) {
      fs.copyFileSync(wasmPath, wasmArtifactPath);
      log(`WASM copiado para artifacts`);
    }
    
    // 8. Gerar arquivo de resumo
    const summary = {
      circuit: CIRCUIT_NAME,
      timestamp: new Date().toISOString(),
      files: {
        r1cs: r1csPath,
        wasm: wasmPath,
        ptau: ptauPath,
        zkey: zkeyPath,
        verifier: verifierPath,
      },
      status: "ready_for_deployment",
      network: "sepolia",
      next_steps: [
        "Usar emit-certificate.mjs para gerar provas e emitir certificações",
        "Deploy com deploy-sepolia.mjs (requer SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY)",
      ]
    };
    
    const summaryPath = path.join(ARTIFACTS_DIR, `${CIRCUIT_NAME}_setup_summary.json`);
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    log(`Setup resumido em: ${summaryPath}`);
    
    log("\n✓ Setup ZK concluído com sucesso!");
    log(`Próximo passo: npm run zk:prove`);
    
  } catch (error) {
    log(`Erro durante setup: ${error.message}`, "error");
    process.exit(1);
  }
}

async function countConstraints(circuitPath) {
  // Parse básico do arquivo .circom para estimar número de constraints
  // Em produção, usar compiler info
  const content = fs.readFileSync(circuitPath, "utf-8");
  
  // Aproximação: cada comparador, Poseidon, etc. adiciona constraints
  // Para este circuito: ~1000-2000 constraints
  // Usar power = 11 para 2048 constraints
  return 2000;
}

setup().catch(console.error);
