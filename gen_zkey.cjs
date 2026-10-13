const path=require("path"),fs=require("fs");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const CIRCUITS=BASE+"/blockchain/circuits";
const SNK=BASE+"/snarkjs_pkg";
process.env.NODE_PATH=BASE+"/snarkjs_pkg/node_modules";
require("module").Module._initPaths();
const snarkjs=require(SNK+"/build/main.cjs");
async function main(){
  const r1cs=CIRCUITS+"/agrochain-score-threshold.r1cs";
  const ptau=CIRCUITS+"/pot12_final.ptau";
  const zkey0=CIRCUITS+"/cert_0000.zkey";
  const zkey=CIRCUITS+"/agrochain-score-threshold_final.zkey";
  console.log("1/4 Novo ptau...");
  await snarkjs.powersOfTau.newAccumulator("bn128", 12, ptau, {verbose:false});
  console.log("2/4 Contribuindo ptau...");
  await snarkjs.powersOfTau.contribute(ptau, ptau, "AgroChain", "entropy123", {verbose:false});
  console.log("3/4 Preparando phase2...");
  await snarkjs.powersOfTau.preparePhase2(ptau, ptau, {verbose:false});
  console.log("ptau OK:", Math.round(fs.statSync(ptau).size/1024),"KB");
  console.log("4/4 Setup zkey...");
  await snarkjs.zKey.newZKey(r1cs, ptau, zkey0, {verbose:false});
  await snarkjs.zKey.contribute(zkey0, zkey, "AgroChain", "entropy456", {verbose:false});
  console.log("zkey OK:", Math.round(fs.statSync(zkey).size/1024),"KB");
  const vkey=await snarkjs.zKey.exportVerificationKey(zkey);
  fs.writeFileSync(CIRCUITS+"/verification_key.json",JSON.stringify(vkey,null,2));
  console.log("=== ZK SETUP COMPLETO ===");
}
main().catch(e=>console.error("ERRO:",e.message));
