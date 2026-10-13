const fs=require("fs"), path=require("path");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";

// Adicionar node_modules do circom2_pkg ao path de busca
const nmPath = BASE+"/circom2_pkg/node_modules";
process.env.NODE_PATH = nmPath;
require("module").Module._initPaths();

const circuitFile = BASE+"/blockchain/circuits/agrochain-score-threshold.circom";
const outDir      = BASE+"/blockchain/circuits";

// circomlibjs inclui os templates do circomlib (poseidon.circom, comparators.circom)
// O circuito faz include "circomlib/circuits/poseidon.circom"
// Precisamos da pasta circomlib com esses arquivos

// Baixar circomlib
console.log("Verificando circom2 index...");
const idx = BASE+"/circom2_pkg/index.js";
console.log("existe:", fs.existsSync(idx));
console.log("conteúdo início:", fs.readFileSync(idx,"utf8").slice(0,300));