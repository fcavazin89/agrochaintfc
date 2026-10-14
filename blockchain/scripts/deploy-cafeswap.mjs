import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { network } from "hardhat";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const { ethers } = await network.connect();
const [deployer] = await ethers.getSigners();

console.log("Deploying CaféSwap Protocol");
console.log("═══════════════════════════════════════");
console.log(`Deployer: ${deployer.address}`);
console.log(`Network: ${network.name}`);
console.log("");

// Get AgroChainCertificacoes address (must be deployed already)
const agroChainCertificacoesAddress = process.env.AGROCHAIN_CERT_ADDRESS;
if (!agroChainCertificacoesAddress) {
  throw new Error("AGROCHAIN_CERT_ADDRESS environment variable required");
}

const deployments = {};

// 1. Deploy CafeToken
console.log("1. Deploying CafeToken...");
const CafeToken = await ethers.getContractFactory("CafeToken");
const cafe = await CafeToken.deploy();
await cafe.waitForDeployment();
deployments.cafeToken = await cafe.getAddress();
console.log(`✓ CafeToken: ${deployments.cafeToken}\n`);

// 2. Deploy Factory
console.log("2. Deploying CafeSwapFactory...");
const Factory = await ethers.getContractFactory("CafeSwapFactory");
const factory = await Factory.deploy(agroChainCertificacoesAddress);
await factory.waitForDeployment();
deployments.factory = await factory.getAddress();
console.log(`✓ Factory: ${deployments.factory}\n`);

// 3. Deploy Router
console.log("3. Deploying CafeSwapRouter...");
const Router = await ethers.getContractFactory("CafeSwapRouter");
const router = await Router.deploy(deployments.factory);
await router.waitForDeployment();
deployments.router = await router.getAddress();
console.log(`✓ Router: ${deployments.router}\n`);

// 4. Deploy Farm (1 CAFE per second)
console.log("4. Deploying CafeFarm...");
const Farm = await ethers.getContractFactory("CafeFarm");
const farm = await Farm.deploy(deployments.cafeToken, ethers.parseEther("1"));
await farm.waitForDeployment();
deployments.farm = await farm.getAddress();
console.log(`✓ Farm: ${deployments.farm}\n`);

// 5. Deploy Governance
console.log("5. Deploying CafeGovernance...");
const Governance = await ethers.getContractFactory("CafeGovernance");
const governance = await Governance.deploy(deployments.cafeToken);
await governance.waitForDeployment();
deployments.governance = await governance.getAddress();
console.log(`✓ Governance: ${deployments.governance}\n`);

// 6. Setup permissions
console.log("6. Setting up permissions...");
const MINTER_ROLE = await cafe.MINTER_ROLE();
await (await cafe.grantRole(MINTER_ROLE, deployments.farm)).wait();
console.log("  ✓ Farm granted MINTER_ROLE");

const GOVERNANCE_ROLE = await farm.GOVERNANCE_ROLE();
await (await farm.grantRole(GOVERNANCE_ROLE, deployments.governance)).wait();
console.log("  ✓ Governance granted GOVERNANCE_ROLE on Farm");

await (await router.setGovernance(deployments.governance)).wait();
console.log("  ✓ Router governance set\n");

// 7. Save deployment addresses
console.log("7. Saving deployment addresses...");
const deploymentPath = path.join(root, "blockchain", "cafeswap-deployments.json");
await writeFile(
  deploymentPath,
  JSON.stringify(
    {
      network: network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: deployments,
    },
    null,
    2
  ) + "\n"
);
console.log(`✓ Saved to ${deploymentPath}\n`);

console.log("═══════════════════════════════════════");
console.log("✓ CaféSwap deployment complete!");
console.log("═══════════════════════════════════════");
console.log("\nDeployed Contracts:");
console.log(`  CafeToken:    ${deployments.cafeToken}`);
console.log(`  Factory:      ${deployments.factory}`);
console.log(`  Router:       ${deployments.router}`);
console.log(`  Farm:         ${deployments.farm}`);
console.log(`  Governance:   ${deployments.governance}`);
console.log("\nNext Steps:");
console.log("  1. Verify contracts on block explorer");
console.log("  2. Add certified tokens via Factory.addCertifiedToken()");
console.log("  3. Create initial pools");
console.log("  4. Add farm pools via Farm.addPool()");
console.log("  5. Transfer admin roles to multisig/DAO");
