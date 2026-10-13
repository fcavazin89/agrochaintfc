const fs = require("fs"), zlib = require("zlib"), path = require("path"), { execSync } = require("child_process");
const BASE = "c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";

// Descompactar circom2
const cRaw = fs.readFileSync(BASE + "/circom2.tgz");
const cBuf = zlib.gunzipSync(cRaw);
let pos = 0; let circomBin = null;
while (pos + 512 <= cBuf.length) {
  const hdr  = cBuf.slice(pos, pos + 512);
  const name = hdr.slice(0, 100).toString().replace(/\0/g,"");
  if (!name) break;
  const size = parseInt(hdr.slice(124,136).toString().trim(), 8) || 0;
  pos += 512;
  if ((name.endsWith("circom.exe") || name.endsWith("/circom2/circom")) && size > 0) {
    const dest = BASE + "/" + path.basename(name);
    fs.writeFileSync(dest, cBuf.slice(pos, pos + size));
    if (!name.endsWith(".exe")) fs.chmodSync(dest, "755");
    console.log("Extraído:", dest, (size/1024/1024).toFixed(1)+"MB");
    circomBin = dest;
  }
  pos += Math.ceil(size / 512) * 512;
}
fs.unlinkSync(BASE + "/circom2.tgz");

// Listar o que encontramos na pasta para debug
const files = fs.readdirSync(BASE).filter(f => f.startsWith("circom"));
console.log("Arquivos circom encontrados:", files);