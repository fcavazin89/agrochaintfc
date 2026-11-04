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

export const AGRO_CERT_NFT_ABI = [
  {
    inputs: [
      { internalType: 'string', name: 'batchId', type: 'string' },
      { internalType: 'string', name: 'tipo', type: 'string' },
      { internalType: 'string', name: 'variedade', type: 'string' },
      { internalType: 'uint256', name: 'pesoKg', type: 'uint256' },
      { internalType: 'string', name: 'origem', type: 'string' },
    ],
    name: 'mintCertificado',
    outputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'getCertificado',
    outputs: [
      {
        internalType: 'struct AgroChainCertNFT.Certificado',
        name: '',
        type: 'tuple',
        components: [
          { internalType: 'string', name: 'batchId', type: 'string' },
          { internalType: 'string', name: 'tipo', type: 'string' },
          { internalType: 'string', name: 'variedade', type: 'string' },
          { internalType: 'uint256', name: 'pesoKg', type: 'uint256' },
          { internalType: 'string', name: 'origem', type: 'string' },
          { internalType: 'address', name: 'fazendeiro', type: 'address' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'fazendeiro', type: 'address' },
      { indexed: false, internalType: 'string', name: 'batchId', type: 'string' },
    ],
    name: 'CertificadoMintado',
    type: 'event',
  },
] as const;

// keccak256("CertificadoMintado(uint256,address,string)")
export const CERTIFICADO_MINTADO_TOPIC =
  '0x425172b26c617fba6dd5b862e8adaabfde830edd3875c593ae7342a2815f1d26';

export const NFT_CONTRACT_STORAGE_KEY = 'agrochain_nft_contract_address';

// Endereço oficial da plataforma (AgroChainCertNFT na Sepolia)
export const NFT_CONTRACT_OFICIAL =
  process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x444853d891F884EbD1b69Dc6F044a2Ff4f9C9269';

export function getNFTContractAddress(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(NFT_CONTRACT_STORAGE_KEY);
    if (stored && stored.startsWith('0x') && stored.length === 42) return stored;
  }
  return NFT_CONTRACT_OFICIAL;
}

export function setNFTContractAddress(address: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NFT_CONTRACT_STORAGE_KEY, address);
  }
}
