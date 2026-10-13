const fs=require("fs"),path=require("path");
const NM="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/circom2_pkg/node_modules";
const PKG="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/circom2_pkg";
const CIRCUIT="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/circuits/agrochain-score-threshold.circom";
const OUTDIR="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/circuits";
const LIBDIR="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/circuits";
process.env.NODE_PATH=NM; require("module").Module._initPaths();
const {CircomRunner,bindings}=require(PKG);
const wasmBuf=fs.readFileSync(PKG+"/circom.wasm");
const po={"c:":"c:","c:/":"c:/","c:\\":"c:\\","c:\\/":"c:\\/"};
po[OUTDIR]=OUTDIR; po[LIBDIR]=LIBDIR;
const runner=new CircomRunner({args:[CIRCUIT,"--r1cs","--wasm","--output",OUTDIR,"-l",LIBDIR],env:{},preopens:po,bindings:{...bindings,fs,path}});
console.log("Compilando...");
runner.execute(wasmBuf).then(()=>{
  const wd=OUTDIR+"/agrochain-score-threshold_js";
  const r1=OUTDIR+"/agrochain-score-threshold.r1cs";
  console.log("r1cs:",fs.existsSync(r1)?"OK ("+fs.statSync(r1).size+" bytes)":"NAO GERADO");
  if(fs.existsSync(wd)){console.log("wasm OK:",fs.readdirSync(wd).join(", "));}else{console.log("wasm: NAO GERADO");}
}).catch(e=>console.error("Erro:",e.message||e));
