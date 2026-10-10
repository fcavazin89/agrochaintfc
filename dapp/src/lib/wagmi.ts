import { createConfig, http } from 'wagmi';
import { hardhat, polygonAmoy } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const wagmiConfig = createConfig({
  chains: [hardhat, polygonAmoy],
  connectors: [injected()],
  transports: {
    [hardhat.id]: http('http://127.0.0.1:8545'),
    [polygonAmoy.id]: http(),
  },
});
