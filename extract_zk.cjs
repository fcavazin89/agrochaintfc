const fs = require("fs"), zlib = require("zlib"), path = require("path");

function extractTar(tarPath, destDir, filter) {
  const buf = fs.readFileSync(tarPath);
  let pos = 0, extracted = [];
  while (pos + 512 <= buf.length) {
    const header = buf.slice(pos, pos + 512);
    const name   = header.slice(0, 100).toString("utf8").replace(/\0/g, "");
    if (!name) break;
    const sizeOct = header.slice(124, 136).toString("utf8").trim().replace(/\0/g, "");
    const size    = parseInt(sizeOct, 8) || 0;
    pos += 512;
    if (name && filter(name) && size > 0) {
      const data  = buf.slice(pos, pos + size);
      const fname = path.basename(name);
      const dest  = path.join(destDir, fname);
      fs.writeFileSync(dest, data);
      extracted.push(fname + " (" + (size/1024).toFixed(0) + "KB)");
    }
    pos += Math.ceil(size / 512) * 512;
  }
  return extracted;
}

const BASE  = "c:/Users/Usu\u00e1rio/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip";
const PROT  = BASE + "/prototipo-agrochain";

// 1. circomlibjs: descompactar + extrair build/
const cTgz = BASE + "/circomlibjs.tgz";
const cTar = BASE + "/circomlibjs.tar";
const cRaw = fs.readFileSync(cTgz);
const cBuf = zlib.gunzipSync(cRaw);
fs.writeFileSync(cTar, cBuf);

const ext = extractTar(cTar, PROT, n => n.includes("/build/") && n.endsWith(".js") && !n.includes("test"));
console.log("circomlibjs extraído:", ext.join(", "));

// Limpar tars e tgz
[BASE+"/snarkjs.tgz", BASE+"/snarkjs.tar", BASE+"/circomlibjs.tgz", BASE+"/circomlibjs.tar"].forEach(f => {
  try { fs.unlinkSync(f); } catch(e) {}
});
console.log("Limpeza OK");

// Verificar snarkjs.min.js
const snarkSize = fs.statSync(PROT+"/snarkjs.min.js").size;
console.log("snarkjs.min.js:", (snarkSize/1024).toFixed(0)+"KB - OK");