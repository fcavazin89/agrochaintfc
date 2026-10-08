import { randomBytes } from "node:crypto";
import { chmod, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const witnessPath = path.join(root, "blockchain/witness.private.json");

if (!process.stdin.isTTY || !process.stdin.setRawMode) {
  throw new Error("Execute este comando em um terminal interativo para ocultar a nota digitada.");
}

function lerNotaOculta() {
  process.stdout.write("Nota privada do laudo (0–100; não será exibida): ");
  process.stdin.setRawMode(true);
  process.stdin.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    const onData = (buffer) => {
      for (const char of buffer.toString("utf8")) {
        if (char === "\u0003") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          reject(new Error("Operação cancelada."));
          return;
        }
        if (char === "\r" || char === "\n") {
          process.stdin.off("data", onData);
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        if (/^[0-9]$/.test(char)) value += char;
      }
    };
    process.stdin.on("data", onData);
  });
}

const input = await lerNotaOculta();
const qualityScore = Number(input);
if (!/^\d{1,3}$/.test(input) || qualityScore > 100) {
  throw new Error("A nota deve ser um inteiro entre 0 e 100.");
}

const witness = {
  qualityScore: String(qualityScore),
  salt: BigInt(`0x${randomBytes(31).toString("hex")}`).toString()
};

try {
  await writeFile(witnessPath, `${JSON.stringify(witness, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600
  });
} catch (error) {
  if (error.code === "EEXIST") {
    throw new Error(`Já existe ${witnessPath}. Proteja, mova ou remova esse arquivo antes de criar outro.`);
  }
  throw error;
}
await chmod(witnessPath, 0o600);
console.log("Nota guardada em arquivo local ignorado pelo Git; ela não foi enviada nem exibida.");
