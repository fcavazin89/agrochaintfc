// Implementar Poseidon BN128 usando ffjavascript
// Referência: https://github.com/iden3/circomlibjs/blob/main/src/poseidon_opt.js
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const { F1Field, Scalar } = require('./snarkjs_pkg/node_modules/ffjavascript');
const snarkjs = require('./snarkjs_pkg/main.js');

// BN128 scalar field prime
const p = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const F = new F1Field(p);

// Poseidon t=6 (5 inputs + 1 output), nRoundsF=8, nRoundsP=57
// Constantes C e M para BN128 t=6 geradas pela cerimônia oficial
// Fonte: https://github.com/iden3/circomlib/blob/master/circuits/poseidon_constants_opt.circom
// Usando as constantes hardcoded do circomlibjs
const C = [
  "0x09c46e9ec68e9bd4fe1faaba294cba38a71aa177534cdd1b6c7dc0dbd0abd7a7",
  "0x0c0356530896eec42a97ed937f3135cfc5142b3ae405b8343c1d83ffa604cb81",
  "0x1e28a1d935698ad1142e51182bb54cf4a00ea5aabd6268bd317ea977cc154a30",
  "0x27af2d831a9d2748080965db30e298e40e5757c3e008db964cf9e2b12b91251f",
  "0x1e6f11ce60fc8f513a6a3cfe16ae175a41291462f214cd0879aaf43545b74e03",
  "0x2a67384d3bbd5e438541819cb681f0be04462ed14c3613d8f719206268d142d3",
  "0x0b66fdf356093a611609f8e12fbfecf0b985e381f025188936408f5d5c9f45d0",
  "0x012ee3ec1e78d470830c61093c2ade370b26c83cc5cebeeddaa6852dbdb09e21",
  "0x0252ba5f6760bfbdfd88f67f8175e3fd6cd1c431b099b6bb2d108e7ea445f9e0",
  "0x179474ffffb8bfd8de53a29e42c5f2e4d73a2d2ab5853bef1c6f9332ef91714"
].map(x => BigInt(x));

// Como as constantes completas são extensas (60+), vou usar outra abordagem:
// Rodar o generate_witness.js diretamente via child_process numa pasta temporária com package.json sem "type":"module"

const os = require('os');
const fs = require('fs');
const cp = require('child_process');

const tmpDir = path.join(os.tmpdir(), 'zk_test_' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });

// Criar package.json CJS no tmpDir
fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"tmp","type":"commonjs"}');

// Copiar witness_calculator.js
const wcSrc = readFileSync(path.join(__dirname, 'blockchain/circuits/agrochain-score-threshold_js/witness_calculator.js'), 'utf8');
fs.writeFileSync(path.join(tmpDir, 'witness_calculator.js'), wcSrc);

// Script de cálculo
const script = `
const wc = require('./witness_calculator.js');
const fs = require('fs');

const wasm = fs.readFileSync(${JSON.stringify(path.join(__dirname, 'blockchain/circuits/agrochain-score-threshold_js/agrochain-score-threshold.wasm'))});

wc(wasm).then(async calculator => {
  const input = {
    qualityScore: 85n,
    salt: 12345n,
    minimumScore: 70n,
    lotContext: 1n,
    standardContext: 2n,
    reportContext: 3n,
    commitment: 0n
  };
  
  try {
    const w = await calculator.calculateWitness(input, false);
    // Imprimir os primeiros sinais do witness
    for(let i=0;i<8;i++) console.log('w[' + i + ']=' + w[i].toString());
  } catch(e) {
    // Mesmo com erro, o witness parcial pode ter sido calculado
    // Tentar pegar o Poseidon output do witness antes do assert
    console.log('ERROR:', e.message.split('\n')[0]);
    // Tentar sem constraints
    const w2 = await calculator.calculateWTNSBin(input, 0);
    console.log('wtns bin length:', w2.length);
  }
}).catch(e => console.log('FATAL:', e.message));
`;

fs.writeFileSync(path.join(tmpDir, 'run.js'), script);

const result = cp.execSync(`node ${path.join(tmpDir, 'run.js')}`, { timeout: 30000, encoding: 'utf8' });
console.log('Resultado:', result);

// Limpar
fs.rmSync(tmpDir, { recursive: true });
