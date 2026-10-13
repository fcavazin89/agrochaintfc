const fs=require("fs"), zlib=require("zlib"), path=require("path");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const DEST=BASE+"/circom2_pkg";

const buf=zlib.gunzipSync(fs.readFileSync(BASE+"/circom2_full.tgz"));
let pos=0, count=0;
while(pos+512<=buf.length){
  const h=buf.slice(pos,pos+512);
  const name=h.slice(0,100).toString().replace(/\0/g,"");
  if(!name)break;
  const size=parseInt(h.slice(124,136).toString().trim(),8)||0;
  const type=h.slice(156,157).toString();
  pos+=512;
  if(size>0 && type!=="5"){
    const rel=name.replace(/^package\//,"");
    const dest=path.join(DEST,rel);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.writeFileSync(dest,buf.slice(pos,pos+size));
    count++;
  }
  pos+=Math.ceil(size/512)*512;
}
console.log("Extraídos:", count, "arquivos");
// Listar pasta vendor se existe
const vendor=DEST+"/vendor";
if(fs.existsSync(vendor)) console.log("vendor/:", fs.readdirSync(vendor).join(", "));
else console.log("vendor/ não encontrado");
console.log("raiz:", fs.readdirSync(DEST).filter(f=>!f.startsWith("node_")).join(", "));