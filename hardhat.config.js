import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import { defineConfig } from "hardhat/config";

const networks = {
  hardhatMainnet: { type: "edr-simulated", chainType: "l1" }
};

if (process.env.POLYGON_AMOY_RPC_URL) {
  networks.polygonAmoy = {
    type: "http",
    chainType: "l1",
    url: process.env.POLYGON_AMOY_RPC_URL,
    accounts: process.env.DEPLOYER_PRIVATE_KEY
      ? [process.env.DEPLOYER_PRIVATE_KEY]
      : []
  };
}


if (process.env.SEPOLIA_RPC_URL) {
  networks.sepolia = {
    type: "http",
    chainType: "l1",
    url: process.env.SEPOLIA_RPC_URL,
    accounts: process.env.DEPLOYER_PRIVATE_KEY
      ? [process.env.DEPLOYER_PRIVATE_KEY]
      : []
  };
}

export default defineConfig({
  plugins: [hardhatEthers, hardhatMocha, hardhatEthersChaiMatchers],
  defaultNetwork: "hardhatMainnet",
  paths: {
    sources: "./blockchain/contracts",
    tests: "./blockchain/tests",
    cache: "./blockchain/cache",
    artifacts: "./blockchain/artifacts"
  },
  mocha: {
    timeout: 120000
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.37",
        settings: {
          optimizer: { enabled: true, runs: 200 },
          viaIR: true
        }
      }
    }
  },
  networks
});

// Deploy tasks
import { task } from "hardhat/config";

task("deploy:mockusdc", "Deploy MockUSDC contract")
  .setAction(async (taskArgs, hre) => {
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    const mockUSDCAddress = await mockUSDC.getAddress();
    console.log("MockUSDC deployed to:", mockUSDCAddress);
    return mockUSDCAddress;
  });

task("deploy:payments", "Deploy AgroChainPayments contract")
  .setAction(async (taskArgs, hre) => {
    const AgroChainPayments = await hre.ethers.getContractFactory("AgroChainPayments");
    const payments = await AgroChainPayments.deploy();
    await payments.waitForDeployment();
    const paymentsAddress = await payments.getAddress();
    console.log("AgroChainPayments deployed to:", paymentsAddress);
    return paymentsAddress;
  });
