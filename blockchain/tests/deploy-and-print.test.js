import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Deploy CertificacaoTest", function () {
  it("should deploy contract and print address", async function () {
    const { ethers } = await hre.network.create();
    const [deployer] = await ethers.getSigners();

    console.log(`\n📍 Deploying from: ${deployer.address}`);

    const CertificacaoTest = await ethers.getContractFactory("CertificacaoTest");
    const contract = await CertificacaoTest.deploy();

    const contractAddress = await contract.getAddress();
    console.log(`✅ CertificacaoTest deployed to: ${contractAddress}\n`);

    // Save to file for DApp to read
    const deploymentInfo = {
      network: "hardhat",
      contractAddress,
      deployerAddress: deployer.address,
      deploymentTime: new Date().toISOString(),
      instructions: [
        "1. Open http://localhost:3000/certificacao",
        "2. Click 'Configurar Endereço do Contrato'",
        `3. Paste this address: ${contractAddress}`,
        "4. Fill form and submit → MetaMask dialog should appear"
      ]
    };

    const outputPath = path.join(process.cwd(), "blockchain", "deployment-local.json");
    fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
    console.log(`💾 Deployment info saved to: deployment-local.json`);
    console.log(`📋 Contract address: ${contractAddress}\n`);
  });
});
