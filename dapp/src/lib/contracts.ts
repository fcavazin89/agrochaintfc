import { hardhat, polygonAmoy } from 'wagmi/chains';

// ABI placeholders — replace with actual compiled ABIs from
// ../../blockchain/artifacts/blockchain/contracts/
export const AGROCHAIN_RASTREIO_ABI = [
  {
    inputs: [{name: 'batchId', type: 'bytes32'}],
    name: 'getBatch',
    outputs: [{name: '', type: 'tuple', components: [
      {name: 'batchId', type: 'bytes32'},
      {name: 'batchType', type: 'uint8'},
      {name: 'producer', type: 'address'},
      {name: 'weightKg', type: 'uint256'},
      {name: 'timestamp', type: 'uint256'},
    ]}],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const AGROCHAIN_CERT_ABI = [
  {
    inputs: [
      {name: 'batchId', type: 'bytes32'},
      {name: 'proof', type: 'bytes'},
    ],
    name: 'certifyBatch',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export const CONTRACT_ADDRESSES: Record<number, {rastreio: `0x${string}`; cert: `0x${string}`}> = {
  [hardhat.id]: {
    rastreio: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    cert: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  },
  [polygonAmoy.id]: {
    rastreio: '0x0000000000000000000000000000000000000000',
    cert: '0x0000000000000000000000000000000000000000',
  },
};
