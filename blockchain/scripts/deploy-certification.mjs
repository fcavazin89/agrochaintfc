import { network } from "hardhat";
import { getAddress } from "ethers";

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Defina ${name} nos Secrets antes de tentar o deploy.`);
  return value;
}

const registroAddress = getAddress(required("AGROCHAIN_RASTREIO_ADDRESS"));
const recompensa = BigInt(required("AGRO_TOKEN_REWARD_WEI"));
const limite = BigInt(required("AGRO_TOKEN_MAX_SUPPLY_WEI"));
if (recompensa <= 0n || limite < recompensa) {
  throw new Error("Defina recompensa e limite positivo; o limite precisa ser pelo menos uma recompensa.");
}

const { ethers } = await network.connect();
const [adminSigner] = await ethers.getSigners();
if (!adminSigner) throw new Error("Nenhuma carteira de deployer conectada à rede.");
const deployer = await adminSigner.getAddress();
const issuerAddress = getAddress(process.env.AGROCHAIN_ISSUER_ADDRESS || deployer);

const registry = await ethers.getContractAt("AgroChainRastreio", registroAddress);
if (getAddress(await registry.admin()) !== getAddress(deployer)) {
  throw new Error("A carteira conectada não é o administrador do contrato AgroChainRastreio.");
}
if ((await registry.papeis(issuerAddress)) !== 4n) {
  throw new Error("O emissor precisa ter o papel CERTIFICADORA (Papel 4) no AgroChainRastreio.");
}

const verifier = await ethers.deployContract("Groth16Verifier");
await verifier.waitForDeployment();
const certifier = await ethers.deployContract("AgroChainCertificacoes", [
  await verifier.getAddress(),
  registroAddress,
  issuerAddress,
  recompensa,
  limite
]);
await certifier.waitForDeployment();
const certifierAddress = await certifier.getAddress();

const existingRole = await registry.papeis(certifierAddress);
if (existingRole === 0n) {
  await (await registry.adicionarMembro(certifierAddress, 4)).wait();
} else if (existingRole !== 4n) {
  throw new Error("O endereço do novo contrato já possui outro papel; não será sobrescrito automaticamente.");
}

const existingModule = await registry.moduloCertificacaoZK();
if (existingModule === ethers.ZeroAddress) {
  await (await registry.configurarModuloCertificacaoZK(certifierAddress)).wait();
} else if (getAddress(existingModule) !== getAddress(certifierAddress)) {
  throw new Error("Já existe outro módulo ZK configurado; revise antes de substituir o módulo.");
}

console.log(JSON.stringify({
  network: (await ethers.provider.getNetwork()).name,
  deployer,
  registry: registroAddress,
  verifier: await verifier.getAddress(),
  certificationModule: certifierAddress,
  utilityToken: await certifier.tokenAgro(),
  issuer: issuerAddress,
  rewardPerCertificate: recompensa.toString(),
  tokenCap: limite.toString()
}, null, 2));
