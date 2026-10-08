import hardhatEthers from "@nomicfoundation/hardhat-ethers";
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

export default defineConfig({
  plugins: [hardhatEthers],
  defaultNetwork: "hardhatMainnet",
  paths: {
    sources: "./blockchain/contracts",
    tests: "./blockchain/tests",
    cache: "./blockchain/cache",
    artifacts: "./blockchain/artifacts"
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
