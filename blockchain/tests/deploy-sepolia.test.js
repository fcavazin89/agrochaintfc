import hre from "hardhat";
import fs from "fs";

describe("Deploy to Sepolia", function () {
  this.timeout(120000);

  it("deploys CertificacaoTest contract", async function () {
    const { ethers } = await hre.network.create();
    const [deployer] = await ethers.getSigners();

    console.log("\nDeployer:", deployer.address);
    const bal = await ethers.provider.getBalance(deployer.address);
    console.log("Balance:", ethers.formatEther(bal), "ETH");

    const Contract = await ethers.getContractFactory("CertificacaoTest");
    const contract = await Contract.deploy();
    await contract.waitForDeployment();
    const addr = await contract.getAddress();

    console.log("\n✅ Contract deployed at:", addr);
    console.log("🔗 Etherscan: https://sepolia.etherscan.io/address/" + addr);

    fs.writeFileSync("blockchain/deployment-sepolia.json", JSON.stringify({
      address: addr,
      deployer: deployer.address,
      network: "sepolia",
      chainId: 11155111,
      time: new Date().toISOString()
    }, null, 2));

    console.log("💾 Saved to blockchain/deployment-sepolia.json");
  });
});
