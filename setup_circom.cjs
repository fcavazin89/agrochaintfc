const fs=require("fs"), zlib=require("zlib"), path=require("path"), {execSync}=require("child_process");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const CIRCUITS=BASE+"/blockchain/circuits";

// 1. Extrair circom.wasm e wrapper do pacote
const buf=zlib.gunzipSync(fs.readFileSync(BASE+"/circom2.tgz"));
let pos=0;
const extracted={};
while(pos+512<=buf.length){
  const h=buf.slice(pos,pos+512);
  const name=h.slice(0,100).toString().replace(/\0/g,"");
  if(!name)break;
  const size=parseInt(h.slice(124,136).toString().trim(),8)||0;
  pos+=512;
  if(size>0 && (name.endsWith("circom.wasm")||name.endsWith("index.js")||name.endsWith("package.json"))){
    const fname=name.replace("package/","");
    const dest=BASE+"/circom2_pkg/"+fname;
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,buf.slice(pos,pos+size));
    extracted[fname]=(size/1024).toFixed(0)+"KB";
  }
  pos+=Math.ceil(size/512)*512;
}
console.log("Extraídos:",JSON.stringify(extracted));

// 2. Compilar o circuito usando o wrapper node
const circuitFile=CIRCUITS+"/agrochain-score-threshold.circom";
const outDir=CIRCUITS;

// Instalar circomlibjs manualmente (apenas poseidon.js) para o circuito
// O circom2 wrapper usa wasm internamente
try {
  const circomIndex=BASE+"/circom2_pkg/index.js";
  if(fs.existsSync(circomIndex)){
    // Modificar o index.js para apontar ao wasm extraído
    let idx=fs.readFileSync(circomIndex,"utf8");
    idx=idx.replace(/require\.resolve\(.*circom\.wasm.*\)/g, 
      '"'+BASE.replace(/\//g,"/")+'\\\\circom2_pkg\\\\circom.wasm"');
    fs.writeFileSync(circomIndex,idx);
    
    // Rodar compilação
    process.chdir(CIRCUITS);
    const result=execSync(
      "node "+circomIndex+" "+circuitFile+" --r1cs --wasm --output "+outDir+" --include "+
      BASE+"/node_modules/circomlib/circuits 2>&1"
    ,{encoding:"utf8",timeout:120000});
    console.log("Compilação:\n",result);
  } else {
    console.log("index.js não encontrado em circom2_pkg");
    console.log("Arquivos:",fs.readdirSync(BASE+"/circom2_pkg").join(", "));
  }
} catch(e){
  console.error("Erro compilação:",e.message.slice(0,500));
}