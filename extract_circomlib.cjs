const fs=require("fs"), zlib=require("zlib"), path=require("path");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
// Extrair para blockchain/circuits/circomlib/
const DEST=BASE+"/blockchain/circuits/circomlib";

const buf=zlib.gunzipSync(fs.readFileSync(BASE+"/circomlib.tgz"));
let pos=0, count=0;
while(pos+512<=buf.length){
  const h=buf.slice(pos,pos+512);
  const name=h.slice(0,100).toString().replace(/\0/g,"");
  if(!name)break;
  const size=parseInt(h.slice(124,136).toString().trim(),8)||0;
  const type=h.slice(156,157).toString();
  pos+=512;
  // extrair só a pasta circuits/
  if(size>0 && type!=="5" && name.includes("/circuits/")){
    const rel=name.replace(/^package\/circuits\//,"circuits/");
    const dest=path.join(DEST,"..",rel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,buf.slice(pos,pos+size));
    count++;
  }
  pos+=Math.ceil(size/512)*512;
}
console.log("Extraídos:",count,"arquivos .circom");

const cirDir=BASE+"/blockchain/circuits/circomlib/circuits";
if(fs.existsSync(cirDir)){
  const files=fs.readdirSync(cirDir);
  const hasPoseidon=files.some(f=>f.includes("poseidon"));
  const hasComp=files.some(f=>f.includes("comparators"));
  console.log("poseidon.circom:", hasPoseidon?"OK":"FALTANDO");
  console.log("comparators.circom:", hasComp?"OK":"FALTANDO");
  console.log("Total arquivos:", files.length);
}