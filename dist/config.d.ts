export declare const CHAINS: {
    readonly 'base-sepolia': {
        readonly name: "Base Sepolia";
        readonly chainId: 84532;
        readonly rpcUrl: "https://sepolia.base.org";
        readonly explorer: "https://sepolia.basescan.org";
        readonly identityRegistry: "0x8004AA63c570c570eBF15376c0dB199918BFe9Fb";
        readonly reputationRegistry: "0x8004bd8daB57f14Ed299135749a5CB5c42d341BF";
        readonly validationRegistry: "0x8004C269D0A5647E51E121FeB226200ECE932d55";
    };
    readonly 'eth-sepolia': {
        readonly name: "Ethereum Sepolia";
        readonly chainId: 11155111;
        readonly rpcUrl: "https://rpc.sepolia.org";
        readonly explorer: "https://sepolia.etherscan.io";
        readonly identityRegistry: "0x8004a6090Cd10A7288092483047B097295Fb8847";
        readonly reputationRegistry: "0x8004B8FD1A363aa02fDC07635C0c5F94f6Af5B7E";
        readonly validationRegistry: "0x8004CB39f29c09145F24Ad9dDe2A108C1A2cdfC5";
    };
    readonly 'linea-sepolia': {
        readonly name: "Linea Sepolia";
        readonly chainId: 59141;
        readonly rpcUrl: "https://rpc.sepolia.linea.build";
        readonly explorer: "https://sepolia.lineascan.build";
        readonly identityRegistry: "0x8004aa7C931bCE1233973a0C6A667f73F66282e7";
        readonly reputationRegistry: "0x8004bd8483b99310df121c46ED8858616b2Bba02";
        readonly validationRegistry: "0x8004c44d1EFdd699B2A26e781eF7F77c56A9a4EB";
    };
    readonly 'polygon-amoy': {
        readonly name: "Polygon Amoy";
        readonly chainId: 80002;
        readonly rpcUrl: "https://rpc-amoy.polygon.technology";
        readonly explorer: "https://amoy.polygonscan.com";
        readonly identityRegistry: "0x8004ad19E14B9e0654f73353e8a0B600D46C2898";
        readonly reputationRegistry: "0x8004B12F4C2B42d00c46479e859C92e39044C930";
        readonly validationRegistry: "0x8004C11C213ff7BaD36489bcBDF947ba5eee289B";
    };
};
export type ChainKey = keyof typeof CHAINS;
export declare const TRUST_MODELS: readonly ["reputation", "crypto-economic", "tee-attestation"];
export type TrustModel = (typeof TRUST_MODELS)[number];
