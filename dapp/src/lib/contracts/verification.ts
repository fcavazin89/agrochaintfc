import {
  OriginVerification,
  EUDRCompliance,
  ESGScore,
  VerificationStatus,
} from '@/types/agrochain';

// =====================================================================
// CONTRACT ABIs (Extracted from artifacts/)
// =====================================================================

export const ORIGIN_VERIFIER_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'verificacaoId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'aprovador',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'OriginVerificationApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'verificacaoId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'rejeitador',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'OriginVerificationRejected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'verificacaoId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'submitter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'pais',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'regiao',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'latitude',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'longitude',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'provaDeOrigem',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'OriginVerificationSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_verificacaoId',
        type: 'bytes32',
      },
    ],
    name: 'approveVerification',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_verificacaoId',
        type: 'bytes32',
      },
    ],
    name: 'getVerification',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'verificacaoId',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'loteId',
            type: 'bytes32',
          },
          {
            internalType: 'string',
            name: 'pais',
            type: 'string',
          },
          {
            internalType: 'string',
            name: 'regiao',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'latitude',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'longitude',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'provaDeOrigem',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'dataVerificacao',
            type: 'uint256',
          },
          {
            internalType: 'enum OriginVerifier.VerificationStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'address',
            name: 'verificadorAddress',
            type: 'address',
          },
        ],
        internalType: 'struct OriginVerifier.OriginVerification',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getVerificationByLote',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_verificacaoId',
        type: 'bytes32',
      },
    ],
    name: 'getVerificationStatus',
    outputs: [
      {
        internalType: 'enum OriginVerifier.VerificationStatus',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_verificacaoId',
        type: 'bytes32',
      },
    ],
    name: 'isApproved',
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
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_verificacaoId',
        type: 'bytes32',
      },
    ],
    name: 'rejectVerification',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_verificador',
        type: 'address',
      },
    ],
    name: 'setVerificador',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: '_pais',
        type: 'string',
      },
      {
        internalType: 'string',
        name: '_regiao',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_latitude',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_longitude',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: '_provaDeOrigem',
        type: 'string',
      },
    ],
    name: 'submitOriginVerification',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'verificacaoByLote',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'verificacaoCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'verificador',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'verificationsById',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'verificacaoId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        internalType: 'string',
        name: 'pais',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'regiao',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'latitude',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'longitude',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'provaDeOrigem',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'dataVerificacao',
        type: 'uint256',
      },
      {
        internalType: 'enum OriginVerifier.VerificationStatus',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'address',
        name: 'verificadorAddress',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const EUDR_VERIFIER_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'eudrId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'aprovador',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'EUDRAnalysisApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'eudrId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'rejeitador',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'EUDRAnalysisRejected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'eudrId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'submitter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bool',
        name: 'desmatamentoDetectado',
        type: 'bool',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'sateliteProva',
        type: 'string',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'confianca',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'EUDRAnalysisSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_eudrId',
        type: 'bytes32',
      },
    ],
    name: 'approveAnalysis',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_eudrId',
        type: 'bytes32',
      },
    ],
    name: 'getAnalysis',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'eudrcId',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'loteId',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'dataVerificacao',
            type: 'uint256',
          },
          {
            internalType: 'bool',
            name: 'desmatamentoDetectado',
            type: 'bool',
          },
          {
            internalType: 'uint256',
            name: 'percentualDesmatamento',
            type: 'uint256',
          },
          {
            internalType: 'string',
            name: 'sateliteProva',
            type: 'string',
          },
          {
            internalType: 'uint256',
            name: 'confianca',
            type: 'uint256',
          },
          {
            internalType: 'enum EUDRVerifier.ComplianceStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'uint256',
            name: 'dataAnalise',
            type: 'uint256',
          },
        ],
        internalType: 'struct EUDRVerifier.EUDRCompliance',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getAnalysisByLote',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_eudrId',
        type: 'bytes32',
      },
    ],
    name: 'getAnalysisStatus',
    outputs: [
      {
        internalType: 'enum EUDRVerifier.ComplianceStatus',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_eudrId',
        type: 'bytes32',
      },
    ],
    name: 'isCompliant',
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
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_eudrId',
        type: 'bytes32',
      },
    ],
    name: 'rejectAnalysis',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_analisador',
        type: 'address',
      },
    ],
    name: 'setAnalisador',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'bool',
        name: '_desmatamentoDetectado',
        type: 'bool',
      },
      {
        internalType: 'string',
        name: '_sateliteProva',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_confianca',
        type: 'uint256',
      },
    ],
    name: 'submitEUDRAnalysis',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'analysisByLote',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'analysisCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'analisador',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'analysisById',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'eudrcId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'dataVerificacao',
        type: 'uint256',
      },
      {
        internalType: 'bool',
        name: 'desmatamentoDetectado',
        type: 'bool',
      },
      {
        internalType: 'uint256',
        name: 'percentualDesmatamento',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: 'sateliteProva',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: 'confianca',
        type: 'uint256',
      },
      {
        internalType: 'enum EUDRVerifier.ComplianceStatus',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'uint256',
        name: 'dataAnalise',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const ESG_SCORER_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    inputs: [],
    name: 'ReentrancyGuardReentrantCall',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'esgId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'aprovador',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'scoreFinal',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ESGScoreApproved',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'esgId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'rejeitador',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ESGScoreRejected',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'esgId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'submitter',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'scoreAmbiental',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'scoreSocial',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'scoreGovernanca',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'scoreFinal',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'timestamp',
        type: 'uint256',
      },
    ],
    name: 'ESGScoreSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_esgId',
        type: 'bytes32',
      },
    ],
    name: 'approveScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_esgId',
        type: 'bytes32',
      },
    ],
    name: 'getScore',
    outputs: [
      {
        components: [
          {
            internalType: 'bytes32',
            name: 'esgId',
            type: 'bytes32',
          },
          {
            internalType: 'bytes32',
            name: 'loteId',
            type: 'bytes32',
          },
          {
            internalType: 'uint256',
            name: 'scoreAmbiental',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'scoreSocial',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'scoreGovernanca',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'scoreFinal',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'dataCalculada',
            type: 'uint256',
          },
          {
            internalType: 'enum ESGScorer.ScoringStatus',
            name: 'status',
            type: 'uint8',
          },
          {
            internalType: 'string',
            name: 'detalhes',
            type: 'string',
          },
        ],
        internalType: 'struct ESGScorer.ESGScore',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
    ],
    name: 'getScoreByLote',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_esgId',
        type: 'bytes32',
      },
    ],
    name: 'getScoreStatus',
    outputs: [
      {
        internalType: 'enum ESGScorer.ScoringStatus',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_esgId',
        type: 'bytes32',
      },
    ],
    name: 'isApproved',
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
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_esgId',
        type: 'bytes32',
      },
    ],
    name: 'rejectScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_avaliador',
        type: 'address',
      },
    ],
    name: 'setAvaliador',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '_loteId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: '_scoreAmbiental',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_scoreSocial',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '_scoreGovernanca',
        type: 'uint256',
      },
      {
        internalType: 'string',
        name: '_detalhes',
        type: 'string',
      },
    ],
    name: 'submitESGScore',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'avaliador',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'scoreCounter',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'scoreByLote',
    outputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: '',
        type: 'bytes32',
      },
    ],
    name: 'scoresById',
    outputs: [
      {
        internalType: 'bytes32',
        name: 'esgId',
        type: 'bytes32',
      },
      {
        internalType: 'bytes32',
        name: 'loteId',
        type: 'bytes32',
      },
      {
        internalType: 'uint256',
        name: 'scoreAmbiental',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'scoreSocial',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'scoreGovernanca',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'scoreFinal',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: 'dataCalculada',
        type: 'uint256',
      },
      {
        internalType: 'enum ESGScorer.ScoringStatus',
        name: 'status',
        type: 'uint8',
      },
      {
        internalType: 'string',
        name: 'detalhes',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// =====================================================================
// MOCK DATA
// =====================================================================

// Helper function to generate mock verification ID
const generateMockId = (prefix: string, index: number): string => {
  return `0x${prefix}${String(index).padStart(62, '0')}`;
};

const generateLoteId = (index: number): string => {
  return `0x${String(index).padStart(64, '0')}`;
};

const now = Math.floor(Date.now() / 1000);

/**
 * 10+ Mock Origin Verifications covering different statuses and countries
 */
export const MOCK_ORIGIN_VERIFICATIONS: OriginVerification[] = [
  // 3 Approved (different countries)
  {
    verificacaoId: generateMockId('001', 1),
    loteId: generateLoteId(101),
    pais: 'Brasil',
    regiao: 'Minas Gerais',
    latitude: -20.33,
    longitude: -45.93,
    provaDeOrigem: 'ipfs://QmExampleBrazil1',
    dataVerificacao: now - 86400 * 30,
    status: 'Aprovado',
    verificadorAddress: '0x1234567890123456789012345678901234567890',
  },
  {
    verificacaoId: generateMockId('001', 2),
    loteId: generateLoteId(102),
    pais: 'Colômbia',
    regiao: 'Eje Cafetero',
    latitude: 4.8,
    longitude: -75.5,
    provaDeOrigem: 'ipfs://QmExampleColombia1',
    dataVerificacao: now - 86400 * 25,
    status: 'Aprovado',
    verificadorAddress: '0x1234567890123456789012345678901234567890',
  },
  {
    verificacaoId: generateMockId('001', 3),
    loteId: generateLoteId(103),
    pais: 'Peru',
    regiao: 'Junín',
    latitude: -12.07,
    longitude: -75.21,
    provaDeOrigem: 'ipfs://QmExamplePeru1',
    dataVerificacao: now - 86400 * 20,
    status: 'Aprovado',
    verificadorAddress: '0x1234567890123456789012345678901234567890',
  },
  // 2 Rejected (different reasons)
  {
    verificacaoId: generateMockId('001', 4),
    loteId: generateLoteId(104),
    pais: 'Brasil',
    regiao: 'São Paulo',
    latitude: -23.55,
    longitude: -46.63,
    provaDeOrigem: 'ipfs://QmExampleBrazil2',
    dataVerificacao: now - 86400 * 15,
    status: 'Rejeitado',
    verificadorAddress: '0x0987654321098765432109876543210987654321',
  },
  {
    verificacaoId: generateMockId('001', 5),
    loteId: generateLoteId(105),
    pais: 'Indonésia',
    regiao: 'Sumatra',
    latitude: 0.52,
    longitude: 101.44,
    provaDeOrigem: 'ipfs://QmExampleIndonesia1',
    dataVerificacao: now - 86400 * 10,
    status: 'Rejeitado',
    verificadorAddress: '0x0987654321098765432109876543210987654321',
  },
  // 2 In Verification
  {
    verificacaoId: generateMockId('001', 6),
    loteId: generateLoteId(106),
    pais: 'Brasil',
    regiao: 'Espírito Santo',
    latitude: -19.15,
    longitude: -40.26,
    provaDeOrigem: 'ipfs://QmExampleBrazil3',
    dataVerificacao: now - 86400 * 5,
    status: 'Em Verificação',
    verificadorAddress: undefined,
  },
  {
    verificacaoId: generateMockId('001', 7),
    loteId: generateLoteId(107),
    pais: 'Vietnã',
    regiao: 'Central Highlands',
    latitude: 11.94,
    longitude: 107.98,
    provaDeOrigem: 'ipfs://QmExampleVietnam1',
    dataVerificacao: now - 86400 * 3,
    status: 'Em Verificação',
    verificadorAddress: undefined,
  },
  // 3 Not Started
  {
    verificacaoId: generateMockId('001', 8),
    loteId: generateLoteId(108),
    pais: 'Etiópia',
    regiao: 'Oromia',
    latitude: 9.33,
    longitude: 40.0,
    provaDeOrigem: 'ipfs://QmExampleEthiopia1',
    dataVerificacao: now,
    status: 'Não Iniciado',
  },
  {
    verificacaoId: generateMockId('001', 9),
    loteId: generateLoteId(109),
    pais: 'Honduras',
    regiao: 'Copán',
    latitude: 14.76,
    longitude: -89.14,
    provaDeOrigem: 'ipfs://QmExampleHonduras1',
    dataVerificacao: now,
    status: 'Não Iniciado',
  },
  {
    verificacaoId: generateMockId('001', 10),
    loteId: generateLoteId(110),
    pais: 'Costa Rica',
    regiao: 'Tarrazú',
    latitude: 9.73,
    longitude: -84.88,
    provaDeOrigem: 'ipfs://QmExampleCostaRica1',
    dataVerificacao: now,
    status: 'Não Iniciado',
  },
  // Extra: 11th for variety
  {
    verificacaoId: generateMockId('001', 11),
    loteId: generateLoteId(111),
    pais: 'Uganda',
    regiao: 'Rwenzori Mountains',
    latitude: 0.5,
    longitude: 30.0,
    provaDeOrigem: 'ipfs://QmExampleUganda1',
    dataVerificacao: now - 86400 * 35,
    status: 'Aprovado',
    verificadorAddress: '0x1234567890123456789012345678901234567890',
  },
];

/**
 * 10+ Mock EUDR Compliances covering deforestation detection scenarios
 */
export const MOCK_EUDR_COMPLIANCES: EUDRCompliance[] = [
  // 4 Approved (no deforestation)
  {
    eudrcId: generateMockId('002', 1),
    loteId: generateLoteId(201),
    dataVerificacao: now - 86400 * 40,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteNoDeforestation1',
    confianca: 95,
    status: 'Aprovado',
    dataAnalise: now - 86400 * 35,
  },
  {
    eudrcId: generateMockId('002', 2),
    loteId: generateLoteId(202),
    dataVerificacao: now - 86400 * 35,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteNoDeforestation2',
    confianca: 92,
    status: 'Aprovado',
    dataAnalise: now - 86400 * 30,
  },
  {
    eudrcId: generateMockId('002', 3),
    loteId: generateLoteId(203),
    dataVerificacao: now - 86400 * 30,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteNoDeforestation3',
    confianca: 88,
    status: 'Aprovado',
    dataAnalise: now - 86400 * 25,
  },
  {
    eudrcId: generateMockId('002', 4),
    loteId: generateLoteId(204),
    dataVerificacao: now - 86400 * 25,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteNoDeforestation4',
    confianca: 91,
    status: 'Aprovado',
    dataAnalise: now - 86400 * 20,
  },
  // 3 Rejected (deforestation detected)
  {
    eudrcId: generateMockId('002', 5),
    loteId: generateLoteId(205),
    dataVerificacao: now - 86400 * 20,
    desmatamentoDetectado: true,
    percentualDesmatamento: 15,
    sateliteProva: 'ipfs://QmSatelliteDeforestation1',
    confianca: 87,
    status: 'Rejeitado',
    dataAnalise: now - 86400 * 15,
  },
  {
    eudrcId: generateMockId('002', 6),
    loteId: generateLoteId(206),
    dataVerificacao: now - 86400 * 15,
    desmatamentoDetectado: true,
    percentualDesmatamento: 22,
    sateliteProva: 'ipfs://QmSatelliteDeforestation2',
    confianca: 85,
    status: 'Rejeitado',
    dataAnalise: now - 86400 * 12,
  },
  {
    eudrcId: generateMockId('002', 7),
    loteId: generateLoteId(207),
    dataVerificacao: now - 86400 * 12,
    desmatamentoDetectado: true,
    percentualDesmatamento: 8,
    sateliteProva: 'ipfs://QmSatelliteDeforestation3',
    confianca: 89,
    status: 'Rejeitado',
    dataAnalise: now - 86400 * 10,
  },
  // 2 In Verification
  {
    eudrcId: generateMockId('002', 8),
    loteId: generateLoteId(208),
    dataVerificacao: now - 86400 * 8,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteAnalyzing1',
    confianca: 0,
    status: 'Em Verificação',
  },
  {
    eudrcId: generateMockId('002', 9),
    loteId: generateLoteId(209),
    dataVerificacao: now - 86400 * 5,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteAnalyzing2',
    confianca: 0,
    status: 'Em Verificação',
  },
  // 1 Not Started
  {
    eudrcId: generateMockId('002', 10),
    loteId: generateLoteId(210),
    dataVerificacao: now,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: '',
    confianca: 0,
    status: 'Não Iniciado',
  },
  // Extra: 11th for completeness
  {
    eudrcId: generateMockId('002', 11),
    loteId: generateLoteId(211),
    dataVerificacao: now - 86400 * 45,
    desmatamentoDetectado: false,
    percentualDesmatamento: 0,
    sateliteProva: 'ipfs://QmSatelliteNoDeforestation5',
    confianca: 90,
    status: 'Aprovado',
    dataAnalise: now - 86400 * 40,
  },
];

/**
 * 10+ Mock ESG Scores with environmental, social, and governance ratings
 * Formula: (env*40 + soc*30 + gov*30) / 100
 */
export const MOCK_ESG_SCORES: ESGScore[] = [
  // 5 Approved (score >= 70)
  {
    esgId: generateMockId('003', 1),
    loteId: generateLoteId(301),
    scoreAmbiental: 85,
    scoreSocial: 78,
    scoreGovernanca: 80,
    scoreFinal: Math.round((85 * 40 + 78 * 30 + 80 * 30) / 100),
    dataCalculada: now - 86400 * 30,
    metodologia: 'GRI Standards + SASB',
    status: 'Aprovado',
    detalhes: 'Excelente gestão ambiental e social',
  },
  {
    esgId: generateMockId('003', 2),
    loteId: generateLoteId(302),
    scoreAmbiental: 72,
    scoreSocial: 75,
    scoreGovernanca: 70,
    scoreFinal: Math.round((72 * 40 + 75 * 30 + 70 * 30) / 100),
    dataCalculada: now - 86400 * 28,
    metodologia: 'GRI Standards + SASB',
    status: 'Aprovado',
    detalhes: 'Conformidade regulatória em dia',
  },
  {
    esgId: generateMockId('003', 3),
    loteId: generateLoteId(303),
    scoreAmbiental: 90,
    scoreSocial: 82,
    scoreGovernanca: 88,
    scoreFinal: Math.round((90 * 40 + 82 * 30 + 88 * 30) / 100),
    dataCalculada: now - 86400 * 25,
    metodologia: 'GRI Standards + SASB',
    status: 'Aprovado',
    detalhes: 'Líder em sustentabilidade do setor',
  },
  {
    esgId: generateMockId('003', 4),
    loteId: generateLoteId(304),
    scoreAmbiental: 68,
    scoreSocial: 72,
    scoreGovernanca: 75,
    scoreFinal: Math.round((68 * 40 + 72 * 30 + 75 * 30) / 100),
    dataCalculada: now - 86400 * 22,
    metodologia: 'GRI Standards + SASB',
    status: 'Aprovado',
    detalhes: 'Atende critérios mínimos',
  },
  {
    esgId: generateMockId('003', 5),
    loteId: generateLoteId(305),
    scoreAmbiental: 80,
    scoreSocial: 76,
    scoreGovernanca: 82,
    scoreFinal: Math.round((80 * 40 + 76 * 30 + 82 * 30) / 100),
    dataCalculada: now - 86400 * 20,
    metodologia: 'GRI Standards + SASB',
    status: 'Aprovado',
    detalhes: 'Prática sustentável estabelecida',
  },
  // 3 Rejected (score < 70)
  {
    esgId: generateMockId('003', 6),
    loteId: generateLoteId(306),
    scoreAmbiental: 45,
    scoreSocial: 50,
    scoreGovernanca: 55,
    scoreFinal: Math.round((45 * 40 + 50 * 30 + 55 * 30) / 100),
    dataCalculada: now - 86400 * 18,
    metodologia: 'GRI Standards + SASB',
    status: 'Rejeitado',
    detalhes: 'Práticas ambientais insuficientes',
  },
  {
    esgId: generateMockId('003', 7),
    loteId: generateLoteId(307),
    scoreAmbiental: 55,
    scoreSocial: 60,
    scoreGovernanca: 58,
    scoreFinal: Math.round((55 * 40 + 60 * 30 + 58 * 30) / 100),
    dataCalculada: now - 86400 * 15,
    metodologia: 'GRI Standards + SASB',
    status: 'Rejeitado',
    detalhes: 'Governança corporativa deficiente',
  },
  {
    esgId: generateMockId('003', 8),
    loteId: generateLoteId(308),
    scoreAmbiental: 40,
    scoreSocial: 55,
    scoreGovernanca: 45,
    scoreFinal: Math.round((40 * 40 + 55 * 30 + 45 * 30) / 100),
    dataCalculada: now - 86400 * 12,
    metodologia: 'GRI Standards + SASB',
    status: 'Rejeitado',
    detalhes: 'Conformidade social inadequada',
  },
  // 2 In Verification
  {
    esgId: generateMockId('003', 9),
    loteId: generateLoteId(309),
    scoreAmbiental: 0,
    scoreSocial: 0,
    scoreGovernanca: 0,
    scoreFinal: 0,
    dataCalculada: now - 86400 * 5,
    metodologia: 'GRI Standards + SASB',
    status: 'Em Verificação',
    detalhes: 'Análise em andamento',
  },
  {
    esgId: generateMockId('003', 10),
    loteId: generateLoteId(310),
    scoreAmbiental: 0,
    scoreSocial: 0,
    scoreGovernanca: 0,
    scoreFinal: 0,
    dataCalculada: now - 86400 * 2,
    metodologia: 'GRI Standards + SASB',
    status: 'Em Verificação',
    detalhes: 'Documentação em coleta',
  },
  // Extra: 11th for variety
  {
    esgId: generateMockId('003', 11),
    loteId: generateLoteId(311),
    scoreAmbiental: 75,
    scoreSocial: 70,
    scoreGovernanca: 73,
    scoreFinal: Math.round((75 * 40 + 70 * 30 + 73 * 30) / 100),
    dataCalculada: now - 86400 * 32,
    metodologia: 'GRI Standards + SASB',
    status: 'Aprovado',
    detalhes: 'Bom desempenho sustentável',
  },
];

// =====================================================================
// HELPER FUNCTIONS
// =====================================================================

/**
 * Submit a new Origin Verification (mock)
 * Creates a verification in "Em Verificação" status
 */
export function submitOriginVerification(
  lotId: string,
  country: string,
  region: string,
  lat: number,
  lng: number,
  proofUri: string
): OriginVerification {
  const id = generateMockId('001', Math.floor(Math.random() * 10000));
  return {
    verificacaoId: id,
    loteId,
    pais: country,
    regiao: region,
    latitude: lat,
    longitude: lng,
    provaDeOrigem: proofUri,
    dataVerificacao: Math.floor(Date.now() / 1000),
    status: 'Em Verificação',
  };
}

/**
 * Submit a new EUDR Compliance (mock)
 * Returns "Aprovado" if no deforestation, "Rejeitado" if detected
 */
export function verifyEUDRCompliance(
  lotId: string,
  deforestationDetected: boolean,
  satelliteUri: string,
  confidence: number = 90
): EUDRCompliance {
  const id = generateMockId('002', Math.floor(Math.random() * 10000));
  return {
    eudrcId: id,
    loteId,
    dataVerificacao: Math.floor(Date.now() / 1000),
    desmatamentoDetectado: deforestationDetected,
    percentualDesmatamento: deforestationDetected ? Math.floor(Math.random() * 25) : 0,
    sateliteProva: satelliteUri,
    confianca: confidence,
    status: deforestationDetected ? 'Rejeitado' : 'Aprovado',
    dataAnalise: Math.floor(Date.now() / 1000),
  };
}

/**
 * Calculate ESG Score (mock)
 * Formula: (env*40 + soc*30 + gov*30) / 100
 * Status: "Aprovado" if finalScore >= 70, else "Rejeitado"
 */
export function calculateESGScore(
  lotId: string,
  envScore: number,
  socScore: number,
  govScore: number,
  details: string = 'Avaliação concluída'
): ESGScore {
  const id = generateMockId('003', Math.floor(Math.random() * 10000));
  const finalScore = Math.round((envScore * 40 + socScore * 30 + govScore * 30) / 100);
  return {
    esgId: id,
    loteId,
    scoreAmbiental: envScore,
    scoreSocial: socScore,
    scoreGovernanca: govScore,
    scoreFinal: finalScore,
    dataCalculada: Math.floor(Date.now() / 1000),
    metodologia: 'GRI Standards + SASB',
    status: finalScore >= 70 ? 'Aprovado' : 'Rejeitado',
    detalhes: details,
  };
}

/**
 * Filter Origin Verifications by status and/or country
 */
export function filterVerifications(
  data: OriginVerification[],
  filter: { status?: VerificationStatus; pais?: string }
): OriginVerification[] {
  return data.filter((v) => {
    if (filter.status && v.status !== filter.status) return false;
    if (filter.pais && v.pais !== filter.pais) return false;
    return true;
  });
}

/**
 * Filter EUDR Compliances by status and/or deforestation
 */
export function filterCompliances(
  data: EUDRCompliance[],
  filter: { status?: VerificationStatus; desmatamentoDetectado?: boolean }
): EUDRCompliance[] {
  return data.filter((c) => {
    if (filter.status && c.status !== filter.status) return false;
    if (filter.desmatamentoDetectado !== undefined && c.desmatamentoDetectado !== filter.desmatamentoDetectado)
      return false;
    return true;
  });
}

/**
 * Filter ESG Scores by status and/or minimum score
 */
export function filterScores(
  data: ESGScore[],
  filter: { status?: VerificationStatus; minFinalScore?: number }
): ESGScore[] {
  return data.filter((s) => {
    if (filter.status && s.status !== filter.status) return false;
    if (filter.minFinalScore && s.scoreFinal < filter.minFinalScore) return false;
    return true;
  });
}
