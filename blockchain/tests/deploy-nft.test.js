import hre from "hardhat";
import fs from "fs";

describe("Deploy AgroChainCertNFT to Sepolia", function () {
  this.timeout(180000);

  it("deploys NFT contract", async function () {
    const { ethers } = await hre.network.create();
    const [deployer] = await ethers.getSigners();
    console.log("\nDeployer:", deployer.address);

    const Contract = await ethers.getContractFactory("AgroChainCertNFT");
    const contract = await Contract.deploy();
    await contract.waitForDeployment();
    const addr = await contract.getAddress();

    console.log("\n=== DEPLOYED ===");
    console.log("Address:", addr);
    console.log("Etherscan: https://sepolia.etherscan.io/address/" + addr);
    console.log("OpenSea: https://testnets.opensea.io/assets/sepolia/" + addr.toLowerCase());

    fs.writeFileSync("blockchain/deployment-nft-sepolia.json", JSON.stringify({
      address: addr, deployer: deployer.address,
      network: "sepolia", chainId: 11155111,
      time: new Date().toISOString()
    }, null, 2));
    console.log("Saved to deployment-nft-sepolia.json");
  });
});
