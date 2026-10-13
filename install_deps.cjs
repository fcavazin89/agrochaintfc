const fs=require("fs"), zlib=require("zlib"), path=require("path");
const BASE="c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const NM=BASE+"/circom2_pkg/node_modules";

function extractTgz(tgzPath, destBase) {
  const buf = zlib.gunzipSync(fs.readFileSync(tgzPath));
  let pos=0;
  while(pos+512 <= buf.length) {
    const h    = buf.slice(pos, pos+512);
    const name = h.slice(0,100).toString().replace(/\0/g,"");
    if(!name) break;
    const size = parseInt(h.slice(124,136).toString().trim(),8)||0;
    pos += 512;
    if(size>0 && !name.endsWith("/")) {
      const rel  = name.replace(/^package\//,"");
      const dest = path.join(destBase, rel);
      fs.mkdirSync(path.dirname(dest),{recursive:true});
      fs.writeFileSync(dest, buf.slice(pos,pos+size));
    }
    pos += Math.ceil(size/512)*512;
  }
}

const pkgDir = BASE+"/pkgs";
const pkgs = fs.readdirSync(pkgDir).filter(f=>f.endsWith(".tgz"));

for(const tgz of pkgs) {
  // derivar nome do pacote a partir do nome do arquivo
  const base = tgz.replace(".tgz","");
  // detectar se é scoped (@wasmer_wasi -> @wasmer/wasi)
  let pkgName;
  if(base.startsWith("wasmer_wasi")) pkgName = "@wasmer/wasi";
  else if(base.startsWith("wasmer_wasm")) pkgName = "@wasmer/wasm-transformer";
  else pkgName = base.replace(/-\d+\.\d+\.\d+.*$/,"");

  const destDir = path.join(NM, pkgName);
  fs.mkdirSync(destDir, {recursive:true});
  extractTgz(path.join(pkgDir,tgz), destDir);
  process.stdout.write("  installed: "+pkgName+"\n");
}
console.log("\nnode_modules populado em:", NM);
console.log("Pacotes:", fs.readdirSync(NM).join(", "));