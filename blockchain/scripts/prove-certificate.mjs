import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import snarkjs from "snarkjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const build = path.join(root, "blockchain/build/zk");
const privateInputPath = path.join(root, "blockchain/witness.private.json");
const publicInputPath = path.join(root, "blockchain/certificate-public-inputs.json");
const outputPath = path.join(root, "blockchain/proof.json");
const SCALAR_FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function requireBytes32(value, field) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(value || "")) {
    throw new Error(`${field} deve ser um bytes32 hexadecimal.`);
  }
  return value.toLowerCase();
}

const [witness, request] = await Promise.all([
  readFile(privateInputPath, "utf8").then(JSON.parse),
  readFile(publicInputPath, "utf8").then(JSON.parse)
]);
const qualityScore = Number(witness.qualityScore);
const minimumScore = Number(request.minimumScore);
if (!Number.isInteger(qualityScore) || qualityScore < 0 || qualityScore > 100) {
  throw new Error("A nota privada precisa ser um inteiro entre 0 e 100.");
}
if (!Number.isInteger(minimumScore) || minimumScore < 0 || minimumScore > 100) {
  throw new Error("minimumScore precisa ser um inteiro entre 0 e 100.");
}

const publicFields = {
  loteId: requireBytes32(request.loteId, "loteId"),
  padraoHash: requireBytes32(request.padraoHash, "padraoHash"),
  hashLaudo: requireBytes32(request.hashLaudo, "hashLaudo")
};
const context = [
  BigInt(publicFields.loteId) % SCALAR_FIELD,
  BigInt(publicFields.padraoHash) % SCALAR_FIELD,
  BigInt(publicFields.hashLaudo) % SCALAR_FIELD
];

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  {
    qualityScore: String(qualityScore),
    salt: String(witness.salt),
    minimumScore: String(minimumScore),
    lotContext: context[0].toString(),
    standardContext: context[1].toString(),
    reportContext: context[2].toString()
  },
  path.join(build, "agrochain-score-threshold_js/agrochain-score-threshold.wasm"),
  path.join(build, "agrochain-score-threshold_final.zkey")
);

const expectedPublicSignals = [
  publicSignals[0],
  String(minimumScore),
  ...context.map(String)
];
if (publicSignals.some((signal, index) => BigInt(signal) !== BigInt(expectedPublicSignals[index]))) {
  throw new Error("A prova retornou dados públicos diferentes do pedido de certificação.");
}

const solidityCallData = JSON.parse(
  `[${await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)}]`
);
const [a, b, c] = solidityCallData.slice(0, 3);
const commitment = `0x${BigInt(publicSignals[0]).toString(16).padStart(64, "0")}`;
const output = {
  compromissoScore: commitment,
  notaMinima: minimumScore,
  loteId: publicFields.loteId,
  padraoHash: publicFields.padraoHash,
  hashLaudo: publicFields.hashLaudo,
  prova: { a, b, c }
};
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
console.log(`Prova ZK gerada em blockchain/proof.json para o lote ${publicFields.loteId}.`);
console.log("A nota e o sal privados não são incluídos no arquivo de prova.");
