import { JsonRpcProvider, Wallet, ContractFactory } from "ethers";
import fs from "fs";

const artifactPath = String.raw`c:/Users/Usuário/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/artifacts/blockchain/contracts/AgroChainCertNFT.sol/AgroChainCertNFT.json`;
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf-8"));
console.log("Bytecode:", artifact.bytecode.length, "chars");

const provider = new JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
const wallet = new Wallet("4c8a708f33caf401da00ec5f31b7c36c200ee1f032b49e11a4bed3a6507f4f90", provider);
console.log("Wallet:", wallet.address);
const bal = await provider.getBalance(wallet.address);
console.log("Balance:", (Number(bal)/1e18).toFixed(4), "ETH");

const factory = new ContractFactory(artifact.abi, artifact.bytecode, wallet);
const gasLimit = 3000000n; // fixed limit for ERC721 + Base64 metadata
console.log("Using gasLimit:", gasLimit.toString());
const contract = await factory.deploy({ gasLimit });
console.log("TX:", contract.deploymentTransaction().hash);
console.log("Waiting for confirmation...");
await contract.waitForDeployment();
const addr = await contract.getAddress();

console.log("\n=== NFT CONTRACT DEPLOYED ===");
console.log("Address:", addr);
console.log("Etherscan:", "https://sepolia.etherscan.io/address/" + addr);
console.log("OpenSea:", "https://testnets.opensea.io/collection/" + addr.toLowerCase());

fs.writeFileSync("c:/Users/Usuário/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip/blockchain/deployment-nft-sepolia.json", JSON.stringify({
  address: addr,
  chainId: 11155111,
  deployer: wallet.address,
  txHash: contract.deploymentTransaction().hash,
  time: new Date().toISOString()
}, null, 2));
console.log("Saved to deployment-nft-sepolia.json");
