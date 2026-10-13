import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import fs from "fs";

const artifactPath = String.raw`c:/Users/Usuário/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/artifacts/blockchain/contracts/CertificacaoTest.sol/CertificacaoTest.json`;
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
console.log("Bytecode length:", artifact.bytecode.length, "chars =", artifact.bytecode.length/2, "bytes");

const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
const wallet = new Wallet("4c8a708f33caf401da00ec5f31b7c36c200ee1f032b49e11a4bed3a6507f4f90", provider);

// Estimate gas first
const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const deployTx = await factory.getDeployTransaction();
const estimated = await provider.estimateGas(deployTx);
console.log("Estimated gas:", estimated.toString());

const gasLimit = estimated * 120n / 100n; // 20% buffer
console.log("Using gasLimit:", gasLimit.toString());

const contract = await factory.deploy({ gasLimit });
console.log("TX:", contract.deploymentTransaction().hash);
console.log("Waiting...");
await contract.waitForDeployment();
const addr = await contract.getAddress();
console.log("CONTRACT:", addr);
console.log("Etherscan: https://sepolia.etherscan.io/address/" + addr);
fs.writeFileSync("c:/Users/Usuário/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/deployment-sepolia.json", JSON.stringify({address:addr,chainId:11155111,time:new Date().toISOString()},null,2));
console.log("Done!");
