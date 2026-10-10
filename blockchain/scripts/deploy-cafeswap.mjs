import { network } from "hardhat";
import { getAddress, ZeroAddress } from "ethers";
import fs from "fs";
import path from "path";

const main = async () => {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  console.log("Deploying Coffee/Cacao Swap Protocol...");
  console.log(`Deployer: ${deployerAddress}`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);

  // 1. Deploy CAFE Token
  console.log("\n[1/5] Deploying CafeToken...");
  const CafeToken = await ethers.getContractFactory("CafeToken");
  const cafeToken = await CafeToken.deploy();
  await cafeToken.waitForDeployment();
  const cafeTokenAddress = await cafeToken.getAddress();
  console.log(`✓ CafeToken deployed: ${cafeTokenAddress}`);

  // Grant MINTER_ROLE to deployer for initial setup
  const MINTER_ROLE = await cafeToken.MINTER_ROLE();
  await cafeToken.grantRole(MINTER_ROLE, deployerAddress);
  console.log(`✓ MINTER_ROLE granted to deployer`);

  // 2. Deploy CoffeeCacaoSwapFactory
  console.log("\n[2/5] Deploying CoffeeCacaoSwapFactory...");
  // For local deployment, use a placeholder address if AGROCHAIN_CERTIFICATIONS_ADDRESS not set
  let certificationsAddress = process.env.AGROCHAIN_CERTIFICATIONS_ADDRESS;
  if (!certificationsAddress) {
    console.log("⚠ AGROCHAIN_CERTIFICATIONS_ADDRESS not set, using placeholder address");
    certificationsAddress = "0x1234567890123456789012345678901234567890";
  }
  certificationsAddress = getAddress(certificationsAddress);

  const CoffeeCacaoSwapFactory = await ethers.getContractFactory("CoffeeCacaoSwapFactory");
  const factory = await CoffeeCacaoSwapFactory.deploy(certificationsAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log(`✓ CoffeeCacaoSwapFactory deployed: ${factoryAddress}`);

  // 3. Deploy CoffeeCacaoSwapRouter
  console.log("\n[3/5] Deploying CoffeeCacaoSwapRouter...");
  const CoffeeCacaoSwapRouter = await ethers.getContractFactory("CoffeeCacaoSwapRouter");
  const router = await CoffeeCacaoSwapRouter.deploy(factoryAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`✓ CoffeeCacaoSwapRouter deployed: ${routerAddress}`);

  // 4. Deploy CoffeeCacaoFarm
  console.log("\n[4/5] Deploying CoffeeCacaoFarm...");
  const cafePerSecond = ethers.parseEther("1");  // 1 CAFE per second
  const governance = deployerAddress;  // Initial governance is deployer

  const CoffeeCacaoFarm = await ethers.getContractFactory("CoffeeCacaoFarm");
  const farm = await CoffeeCacaoFarm.deploy(
    cafeTokenAddress,
    factoryAddress,
    cafePerSecond,
    governance
  );
  await farm.waitForDeployment();
  const farmAddress = await farm.getAddress();
  console.log(`✓ CoffeeCacaoFarm deployed: ${farmAddress}`);

  // Grant MINTER_ROLE to farm
  await cafeToken.grantRole(MINTER_ROLE, farmAddress);
  console.log(`✓ MINTER_ROLE granted to farm`);

  // 5. Deploy CafeGovernance
  console.log("\n[5/5] Deploying CafeGovernance...");
  const CafeGovernance = await ethers.getContractFactory("CafeGovernance");
  const cafeGovernance = await CafeGovernance.deploy(cafeTokenAddress);
  await cafeGovernance.waitForDeployment();
  const governanceAddress = await cafeGovernance.getAddress();
  console.log(`✓ CafeGovernance deployed: ${governanceAddress}`);

  // Set governance in farm if not already deployer
  if (governance !== governanceAddress) {
    await farm.setGovernance(governanceAddress);
    console.log(`✓ Farm governance set to: ${governanceAddress}`);
  }

  // Summary of deployments
  const deployments = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    deployer: deployerAddress,
    timestamp: new Date().toISOString(),
    contracts: {
      CafeToken: cafeTokenAddress,
      CoffeeCacaoSwapFactory: factoryAddress,
      CoffeeCacaoSwapRouter: routerAddress,
      CoffeeCacaoFarm: farmAddress,
      CafeGovernance: governanceAddress
    },
    roles: {
      cafeTokenMinter: farmAddress,
      farmGovernance: governance
    }
  };

  // Save deployments to JSON
  const deploymentsDir = "./blockchain/deployments";
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const fileName = path.join(deploymentsDir, "cafeswap-addresses.json");
  fs.writeFileSync(fileName, JSON.stringify(deployments, null, 2));
  console.log(`\n✓ Deployments saved to ${fileName}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(JSON.stringify(deployments, null, 2));
  console.log("=".repeat(60));

  return deployments;
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
