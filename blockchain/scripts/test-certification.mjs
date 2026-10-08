import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import snarkjs from "snarkjs";
import { network } from "hardhat";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
try {
  await access(path.join(root, "blockchain/contracts/AgroChainGroth16Verifier.sol"));
  await access(path.join(root, "blockchain/build/zk/agrochain-score-threshold_final.zkey"));
  await access(path.join(root, "blockchain/build/zk/agrochain-score-threshold_js/agrochain-score-threshold.wasm"));
} catch {
  throw new Error("Execute `npm run zk:setup:dev` antes dos testes integrados.");
}

const { ethers } = await network.connect();
const [admin, produtor, titular, intruso] = await ethers.getSigners();
const FIELD = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const tokenReward = 10n * 10n ** 18n;
const tokenCap = 1000n * 10n ** 18n;

function fieldHex(value) {
  return `0x${BigInt(value).toString(16).padStart(64, "0")}`;
}

async function gerarProva({ score, minimum, lotId, standardHash, reportHash, salt }) {
  const contexts = [
    BigInt(lotId) % FIELD,
    BigInt(standardHash) % FIELD,
    BigInt(reportHash) % FIELD
  ];
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
      qualityScore: String(score),
      salt: String(salt),
      minimumScore: String(minimum),
      lotContext: contexts[0].toString(),
      standardContext: contexts[1].toString(),
      reportContext: contexts[2].toString()
    },
    path.join(root, "blockchain/build/zk/agrochain-score-threshold_js/agrochain-score-threshold.wasm"),
    path.join(root, "blockchain/build/zk/agrochain-score-threshold_final.zkey")
  );
  const raw = JSON.parse(`[${await snarkjs.groth16.exportSolidityCallData(proof, publicSignals)}]`);
  return {
    commitment: fieldHex(publicSignals[0]),
    calldata: { a: raw[0], b: raw[1], c: raw[2] }
  };
}

const registryFactory = await ethers.getContractFactory("AgroChainRastreio");
const registry = await registryFactory.deploy();
await registry.waitForDeployment();

const loteId = ethers.id("AgroChain certified lot 001");
const standardHash = ethers.id("Indicação de Procedência Rondônia");
const hashLaudo = ethers.id("Laboratory report 001");
await (await registry.adicionarMembro(produtor.address, 1)).wait(); // Papel.PRODUTOR
await (
  await registry.connect(produtor).registrarLote(
    loteId,
    "cafe_conilon",
    120000n,
    1250,
    ethers.id("First harvest event"),
    false
  )
).wait();
await (
  await registry.emitirEvento(loteId, "LAUDO", hashLaudo, 0, 0)
).wait();

const verifier = await (await ethers.getContractFactory("Groth16Verifier")).deploy();
await verifier.waitForDeployment();
const certifierFactory = await ethers.getContractFactory("AgroChainCertificacoes");
const certifier = await certifierFactory.deploy(
  await verifier.getAddress(),
  await registry.getAddress(),
  admin.address,
  tokenReward,
  tokenCap
);
await certifier.waitForDeployment();
await (await registry.adicionarMembro(await certifier.getAddress(), 4)).wait(); // Papel.CERTIFICADORA
await (await registry.configurarModuloCertificacaoZK(await certifier.getAddress())).wait();

const witnessSalt = BigInt(`0x${randomBytes(31).toString("hex")}`);
const now = (await ethers.provider.getBlock("latest")).timestamp;
const request = {
  id: ethers.id("valid certification 001"),
  loteId,
  padraoHash: standardHash,
  hashLaudo,
  compromissoScore: ethers.ZeroHash,
  tipo: "Indicação de Procedência Rondônia — prova de qualidade",
  validoAte: now + 365 * 86400,
  notaMinima: 70,
  titular: titular.address,
  tokenURI: "ipfs://agrochain-test-certificate/001"
};

// A proof valid for another threshold must not satisfy the requested threshold.
const wrongThresholdProof = await gerarProva({
  score: 84, minimum: 69, lotId, standardHash, reportHash: hashLaudo, salt: witnessSalt
});
request.compromissoScore = wrongThresholdProof.commitment;
await assert.rejects(
  certifier.emitirCertificacao(request, wrongThresholdProof.calldata),
  /ProvaZKNaoConfere/
);

// Even a valid score proof cannot certify a report hash absent from this lot's chain.
const fakeReportHash = ethers.id("unregistered laboratory report");
const unregisteredReportProof = await gerarProva({
  score: 84,
  minimum: 70,
  lotId,
  standardHash,
  reportHash: fakeReportHash,
  salt: witnessSalt + 1n
});
await assert.rejects(
  certifier.emitirCertificacao(
    {
      ...request,
      id: ethers.id("unregistered report certificate"),
      hashLaudo: fakeReportHash,
      compromissoScore: unregisteredReportProof.commitment
    },
    unregisteredReportProof.calldata
  )
);
assert.equal(await certifier.proximoNftId(), 1n, "a rejected report must roll back before NFT mint");
assert.equal(await (await certifier.tokenAgro()).totalSupply(), 0n, "a rejected report must not mint tokens");

const validProof = await gerarProva({
  score: 84, minimum: 70, lotId, standardHash, reportHash: hashLaudo, salt: witnessSalt
});
request.compromissoScore = validProof.commitment;
await assert.rejects(
  certifier.connect(intruso).emitirCertificacao(request, validProof.calldata),
  /ApenasCertificadora/
);

const tx = await certifier.emitirCertificacao(request, validProof.calldata);
await tx.wait();
const nftId = 1n;
assert.equal(await certifier.ownerOf(nftId), titular.address);
assert.equal(await certifier.tokenURI(nftId), request.tokenURI);
assert.equal(await registry.certificacoesComProvaZK(request.id), true);
const certifiedLot = await registry.verificarLote(loteId);
assert.equal(certifiedLot.certificado, true);
assert.equal(await certifier.certificacaoValida(request.id), true);

const agroTokenAddress = await certifier.tokenAgro();
const agroToken = await ethers.getContractAt("AgroChainUtilityToken", agroTokenAddress);
assert.equal(await agroToken.balanceOf(titular.address), tokenReward);
assert.equal(await agroToken.totalSupply(), tokenReward);

await assert.rejects(
  certifier.connect(titular).transferFrom(titular.address, intruso.address, nftId),
  /NFTIntransferivel/
);
await (await agroToken.connect(titular).transfer(intruso.address, 1n * 10n ** 18n)).wait();
assert.equal(await agroToken.balanceOf(intruso.address), 1n * 10n ** 18n);

await assert.rejects(
  certifier.emitirCertificacao(request, validProof.calldata),
  /CertificadoExistente/
);
await (await certifier.revogarCertificacao(request.id, ethers.id("policy violation"))).wait();
assert.equal(await certifier.certificacaoValida(request.id), false);
assert.equal(await certifier.ownerOf(nftId), titular.address, "revocation preserves the audit NFT");
assert.equal((await registry.certificacoesAtivas(loteId)).length, 0);
assert.equal((await registry.verificarLote(loteId)).certificado, false);

console.log("PASS: verifier rejects a mismatched threshold.");
console.log("PASS: certificate, existing lot record, and report hash are linked atomically.");
console.log("PASS: unauthorized issuers are rejected.");
console.log("PASS: issuance mints a soulbound NFT and capped AGRO reward.");
console.log("PASS: AGRO is transferable, NFT is not, and revoked issuance stays auditable.");
console.log("PASS: replayed certificate issuance is rejected.");
