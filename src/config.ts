export const CHAINS = {
  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    identityRegistry: '0x8004AA63c570c570eBF15376c0dB199918BFe9Fb',
    reputationRegistry: '0x8004bd8daB57f14Ed299135749a5CB5c42d341BF',
    validationRegistry: '0x8004C269D0A5647E51E121FeB226200ECE932d55',
  },
  'eth-sepolia': {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    identityRegistry: '0x8004a6090Cd10A7288092483047B097295Fb8847',
    reputationRegistry: '0x8004B8FD1A363aa02fDC07635C0c5F94f6Af5B7E',
    validationRegistry: '0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5',
  },
  'linea-sepolia': {
    name: 'Linea Sepolia',
    chainId: 59141,
    rpcUrl: 'https://rpc.sepolia.linea.build',
    explorer: 'https://sepolia.lineascan.build',
    identityRegistry: '0x8004aa7C931bCE1233973a0C6A667f73F66282e7',
    reputationRegistry: '0x8004bd8483b99310df121c46ED8858616b2Bba02',
    validationRegistry: '0x8004c44d1EFdd699B2A26e781eF7F77c56A9a4EB',
  },
  'polygon-amoy': {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    identityRegistry: '0x8004ad19E14B9e0654f73353e8a0B600D46C2898',
    reputationRegistry: '0x8004B12F4C2B42d00c46479e859C92e39044C930',
    validationRegistry: '0x8004C11C213ff7BaD36489bcBDF947ba5eee289B',
  },
} as const;

export type ChainKey = keyof typeof CHAINS;

export const TRUST_MODELS = ['reputation', 'crypto-economic', 'tee-attestation'] as const;
export type TrustModel = (typeof TRUST_MODELS)[number];

