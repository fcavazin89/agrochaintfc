const fs=require("fs"),zlib=require("zlib");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const buf=zlib.gunzipSync(fs.readFileSync(BASE+"/circom2.tgz"));
let pos=0,names=[];
while(pos+512<=buf.length){
  const h=buf.slice(pos,pos+512);
  const name=h.slice(0,100).toString().replace(/\0/g,"");
  if(!name)break;
  const size=parseInt(h.slice(124,136).toString().trim(),8)||0;
  pos+=512;
  if(size>100000)names.push(name+" ("+(size/1024/1024).toFixed(1)+"MB)");
  pos+=Math.ceil(size/512)*512;
}
console.log(names.join("\n"));