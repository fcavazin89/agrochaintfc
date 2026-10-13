const fs = require('fs');
const path = require('path');

// Carrega o witness calculator gerado pelo circom
const wcPath = path.join(__dirname, 'blockchain/circuits/agrochain-score-threshold_js/witness_calculator.js');
const wc = require(wcPath);
const wasmBuffer = fs.readFileSync(path.join(__dirname, 'blockchain/circuits/agrochain-score-threshold_js/agrochain-score-threshold.wasm'));

async function run() {
  const calculator = await wc(wasmBuffer);
  
  // Inputs SEM commitment (vamos deixar o circom calcular internamente)
  const input = {
    qualityScore: 85n,
    salt: 12345n,
    minimumScore: 70n,
    lotContext: 1n,
    standardContext: 2n,
    reportContext: 3n,
    commitment: 0n  // placeholder, vamos descobrir o valor correto
  };
  
  try {
    const witness = await calculator.calculateWitness(input, true);
    // witness[1] é o primeiro sinal público (commitment)
    console.log('Witness calculado com sucesso!');
    console.log('witness[0] (1):', witness[0].toString());
    console.log('witness[1] (commitment real):', witness[1].toString());
    console.log('witness[2] (minimumScore):', witness[2].toString());
  } catch(e) {
    console.log('Erro (esperado com commitment=0):', e.message.substring(0, 200));
    // O commitment correto vai estar no erro ou calcular separado
  }
}

run().catch(console.error);
