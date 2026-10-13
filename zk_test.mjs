import { readFileSync } from 'fs';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const snarkjs = require('./snarkjs_pkg/main.js');

const DIR = path.join(__dirname, 'blockchain/circuits');
const WASM = path.join(DIR, 'agrochain-score-threshold_js/agrochain-score-threshold.wasm');
const ZKEY = path.join(DIR, 'agrochain-score-threshold_final.zkey');

// Carregar o witness calculator (é CJS, renomear para .cjs)
const wcCode = readFileSync(path.join(DIR, 'agrochain-score-threshold_js/witness_calculator.js'), 'utf8');
const wcModule = { exports: {} };
const fn = new Function('module', 'exports', 'require', wcCode);
fn(wcModule, wcModule.exports, require);
const buildWC = wcModule.exports;

const wasmBuffer = readFileSync(WASM);

async function run() {
  console.log('=== Calculando commitment Poseidon ===');
  const wc = await buildWC(wasmBuffer);
  
  const privateInputs = {
    qualityScore: 85n,
    salt: 12345n,
    minimumScore: 70n,
    lotContext: 1n,
    standardContext: 2n,
    reportContext: 3n
  };
  
  // Para descobrir o commitment: gerar witness com commitment=0, extrair valor calculado
  // O circuito valida: commitment == Poseidon(score, salt, lot, std, rep)
  // Então calculamos Poseidon primeiro, depois usamos o valor correto
  
  // Abordagem: usar snarkjs.groth16.fullProve direto com WASM path
  // O snarkjs calcula o witness internamente se passarmos o arquivo .wasm
  // A constraintlha commitment===Poseidon vai falhar com 0, precisamos do valor real
  
  // Calcular via witness_calculator sem a constraint do commitment
  // Vamos injetar o commitment correto via acesso direto ao campo
  
  // Solução: usar wtns para pegar o commitment gerado
  const tmpInput = { ...privateInputs, commitment: 0n };
  
  try {
    const w = await wc.calculateWitness(tmpInput, false); // false = sem assert
    // witness[1] = commitment (primeiro sinal público)
    const realCommitment = w[1];
    console.log('Commitment Poseidon calculado:', realCommitment.toString());
    
    const correctInput = { ...privateInputs, commitment: realCommitment };
    
    console.log('\n=== Gerando Prova Groth16 ===');
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(correctInput, WASM, ZKEY);
    
    console.log('Prova gerada!');
    
    const VK = JSON.parse(readFileSync(path.join(DIR, 'verification_key.json'), 'utf8'));
    const valid = await snarkjs.groth16.verify(VK, publicSignals, proof);
    
    console.log('Verificação:', valid ? '✅ VÁLIDA' : '❌ INVÁLIDA');
    console.log('Sinais públicos:', publicSignals);
    console.log('\nProva (a):', proof.pi_a.slice(0,2).map(x => x.substring(0,20)+'...'));
  } catch(e) {
    console.error('Erro:', e.message);
  }
}

run();
