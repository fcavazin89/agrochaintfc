const https=require("https"), zlib=require("zlib"), fs=require("fs"), path=require("path");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const NM=BASE+"/circom2_pkg/node_modules";
const PKGS=BASE+"/pkgs";
fs.mkdirSync(PKGS,{recursive:true});

function get(url){
  return new Promise((res,rej)=>{
    https.get(url,{headers:{"Accept":"application/json"}},r=>{
      if(r.statusCode>=300&&r.statusCode<400)return res(get(r.headers.location));
      let d=""; r.on("data",c=>d+=c); r.on("end",()=>res(d)); r.on("error",rej);
    }).on("error",rej);
  });
}
function getDl(url){
  return new Promise((res,rej)=>{
    https.get(url,r=>{
      if(r.statusCode>=300&&r.statusCode<400)return res(getDl(r.headers.location));
      const chunks=[]; r.on("data",c=>chunks.push(c)); r.on("end",()=>res(Buffer.concat(chunks))); r.on("error",rej);
    }).on("error",rej);
  });
}
function extractTgz(buf, dest){
  const tar=zlib.gunzipSync(buf); let pos=0,n=0;
  while(pos+512<=tar.length){
    const h=tar.slice(pos,pos+512);
    const name=h.slice(0,100).toString().replace(/\0/g,"");
    if(!name)break;
    const size=parseInt(h.slice(124,136).toString().trim(),8)||0;
    const type=h.slice(156,157).toString();
    pos+=512;
    if(size>0&&type!=="5"){ const f=path.join(dest,name.replace(/^package\//,"")); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,tar.slice(pos,pos+size)); n++; }
    pos+=Math.ceil(size/512)*512;
  }
  return n;
}

async function installPkg(name, ver){
  const safe=name.replace(/^@/,"").replace("/","_");
  const destDir=path.join(NM,name);
  if(fs.existsSync(destDir+"/package.json")){return;}
  const meta=JSON.parse(await get("https://registry.npmjs.org/"+name+"/"+ver));
  const tgz=await getDl(meta.dist.tarball);
  fs.mkdirSync(destDir,{recursive:true});
  const n=extractTgz(tgz,destDir);
  process.stdout.write("  install "+name+"@"+meta.version+" ("+n+" files)\n");
  // instalar deps transitivas
  const deps=meta.dependencies||{};
  for(const [d,v] of Object.entries(deps)){
    await installPkg(d, v.replace(/[\^~>=<]/g,"").split(" ")[0]);
  }
}

(async()=>{
  const toInstall=[
    ["is-typed-array","1.1.13"],["which-typed-array","1.1.15"],
    ["available-typed-arrays","1.0.7"],["possible-typed-array-names","1.0.0"],
    ["call-bind","1.0.7"],["get-intrinsic","1.2.4"],["function-bind","1.1.2"],
    ["has-proto","1.0.3"],["has-symbols","1.0.3"],["hasown","2.0.2"],
    ["path-browserify","1.0.1"],
    ["for-each","0.3.3"],["gopd","1.0.1"],
    ["define-properties","1.2.1"],["define-data-property","1.1.4"],
    ["has-property-descriptors","1.0.2"],["object-keys","1.1.1"],
    ["es-errors","1.3.0"],
  ];
  for(const [n,v] of toInstall) await installPkg(n,v).catch(e=>console.error("ERRO",n,e.message));
  console.log("\nDone. node_modules:", fs.readdirSync(NM).join(", "));
})();