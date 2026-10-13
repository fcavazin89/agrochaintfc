
import hre from "hardhat";
import fs from "fs";

async function main() {
  console.log("Deploying CertificacaoTest to Sepolia...");
  const { ethers } = await hre.network.create();
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");

  const Contract = await ethers.getContractFactory("CertificacaoTest");
  const contract = await Contract.deploy();
  await contract.waitForDeployment();
  const addr = await contract.getAddress();

  console.log("Contract deployed at:", addr);
  console.log("Etherscan: https://sepolia.etherscan.io/address/" + addr);

  fs.writeFileSync("blockchain/deployment-sepolia.json", JSON.stringify({
    address: addr,
    deployer: deployer.address,
    network: "sepolia",
    chainId: 11155111,
    time: new Date().toISOString()
  }, null, 2));
  console.log("Saved to blockchain/deployment-sepolia.json");
}

main().catch(e => { console.error(e); process.exit(1); });
