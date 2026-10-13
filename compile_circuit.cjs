const fs=require("fs"),path=require("path"),{execSync}=require("child_process");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const CIRCUITS=BASE+"/blockchain/circuits";

const circomIndex=BASE+"/circom2_pkg/index.js";
const circuitFile=CIRCUITS+"/agrochain-score-threshold.circom";

// O circom2/index.js recebe argv como circom CLI
// Precisamos chamar como: node index.js <circuit> --r1cs --wasm --output <dir>
// Mas o index.js usa process.argv, precisamos setar
const oldArgv = process.argv;
process.argv = [
  "node", circomIndex,
  circuitFile,
  "--r1cs", "--wasm",
  "--output", CIRCUITS
];

try {
  require(circomIndex);
  // aguardar callback
  setTimeout(() => {
    const wasmDir=CIRCUITS+"/agrochain-score-threshold_js";
    if(fs.existsSync(wasmDir)){
      console.log("SUCCESS: wasm gerado em", wasmDir);
      console.log(fs.readdirSync(wasmDir).join(", "));
    } else {
      console.log("wasm_dir nao criado ainda...");
    }
  },5000);
} catch(e){
  console.error("Erro:", e.message.slice(0,500));
}