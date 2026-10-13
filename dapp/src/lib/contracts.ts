export const AGROCHAIN_VERIFIER_ABI = [
  {
    inputs: [
      {
        internalType: 'uint256[2]',
        name: 'a',
        type: 'uint256[2]',
      },
      {
        internalType: 'uint256[2][2]',
        name: 'b',
        type: 'uint256[2][2]',
      },
      {
        internalType: 'uint256[2]',
        name: 'c',
        type: 'uint256[2]',
      },
      {
        internalType: 'uint256[5]',
        name: 'input',
        type: 'uint256[5]',
      },
    ],
    name: 'verifyProof',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'batchId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256[2]',
        name: 'zkProofA',
        type: 'uint256[2]',
      },
      {
        internalType: 'uint256[2][2]',
        name: 'zkProofB',
        type: 'uint256[2][2]',
      },
      {
        internalType: 'uint256[2]',
        name: 'zkProofC',
        type: 'uint256[2]',
      },
      {
        internalType: 'uint256[]',
        name: 'publicSignals',
        type: 'uint256[]',
      },
      {
        internalType: 'address',
        name: 'recipientAddress',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'ipfsUri',
        type: 'string',
      },
    ],
    name: 'emitCertificate',
    outputs: [
      {
        internalType: 'uint256',
        name: 'certId',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// Get contract address from environment variable or localStorage
export function getVerifierContractAddress(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('agrochain_verifier_address');
    if (stored) return stored;
  }
  return process.env.NEXT_PUBLIC_VERIFIER_CONTRACT_ADDRESS || '0x';
}

export function setVerifierContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('agrochain_verifier_address', address);
  }
}
