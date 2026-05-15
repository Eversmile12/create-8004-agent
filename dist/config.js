export const CHAINS = {
    // ============ MAINNETS ============
    "eth-mainnet": {
        name: "Ethereum Mainnet",
        chainId: 1,
        rpcUrl: "https://ethereum-rpc.publicnode.com",
        scanPath: "mainnet",
        x402Network: "eip155:1",
        x402Supported: false,
        x402Providers: [],
        x402DefaultProvider: null,
        facilitatorUrl: null,
        usdcAddress: null,
    },
    "base-mainnet": {
        name: "Base Mainnet",
        chainId: 8453,
        rpcUrl: "https://mainnet.base.org",
        scanPath: "base",
        x402Network: "eip155:8453",
        x402Supported: true,
        x402Providers: ["payai"],
        x402DefaultProvider: "payai",
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: null, // SDK has default
    },
    "avalanche-mainnet": {
        name: "Avalanche C-Chain",
        chainId: 43114,
        rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
        scanPath: "avalanche",
        x402Network: "eip155:43114",
        x402Supported: false,
        x402Providers: [],
        x402DefaultProvider: null,
        facilitatorUrl: null,
        usdcAddress: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", // Native USDC
        usdcName: "USD Coin",
        usdcVersion: "2",
    },
    "polygon-mainnet": {
        name: "Polygon Mainnet",
        chainId: 137,
        rpcUrl: "https://polygon-rpc.com",
        scanPath: "polygon",
        x402Network: "eip155:137",
        x402Supported: true,
        x402Providers: ["payai"],
        x402DefaultProvider: "payai",
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", // Native USDC
        usdcName: "USD Coin",
        usdcVersion: "2",
    },
    "monad-mainnet": {
        name: "Monad Mainnet",
        chainId: 143,
        rpcUrl: "https://rpc.monad.xyz",
        scanPath: "monad",
        x402Network: "eip155:143",
        x402Supported: false, // No facilitator supports Monad with x402 v2
        x402Providers: [],
        x402DefaultProvider: null,
        facilitatorUrl: null,
        usdcAddress: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", // Circle USDC
        usdcName: "USD Circle",
        usdcVersion: "2",
    },
    "skale-base-mainnet": {
        name: "SKALE Base (Mainnet)",
        chainId: 1187947933,
        rpcUrl: "https://skale-base.skalenodes.com/v1/base",
        scanPath: "skale-base",
        x402Network: "eip155:1187947933",
        x402Supported: true,
        x402Providers: ["payai"],
        x402DefaultProvider: "payai",
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: "0x85889c8c714505E0c94b30fcfcF64fE3Ac8FCb20", // Bridged USDC on SKALE Base
        usdcName: "Bridged USDC (SKALE Bridge)",
        usdcSymbol: "USDC.e",
        usdcVersion: "2",
    },
    // ============ TESTNETS ============
    "eth-sepolia": {
        name: "Ethereum Sepolia (Testnet)",
        chainId: 11155111,
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        scanPath: "sepolia",
        x402Network: "eip155:11155111",
        x402Supported: true,
        x402Providers: ["4mica"],
        x402DefaultProvider: "4mica",
        facilitatorUrl: null,
        usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC
    },
    "base-sepolia": {
        name: "Base Sepolia (Testnet)",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        scanPath: "base-sepolia",
        x402Network: "eip155:84532",
        x402Supported: true,
        x402Providers: ["payai"],
        x402DefaultProvider: "payai",
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: null, // SDK has default
    },
    "avalanche-fuji": {
        name: "Avalanche Fuji (Testnet)",
        chainId: 43113,
        rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
        scanPath: "avalanche-fuji",
        x402Network: "eip155:43113",
        x402Supported: false,
        x402Providers: [],
        x402DefaultProvider: null,
        facilitatorUrl: null,
        usdcAddress: "0x5425890298aed601595a70AB815c96711a31Bc65", // Circle testnet USDC
        usdcName: "USDC",
        usdcVersion: "2",
    },
    "polygon-amoy": {
        name: "Polygon Amoy (Testnet)",
        chainId: 80002,
        rpcUrl: "https://rpc-amoy.polygon.technology",
        scanPath: "polygon-amoy",
        x402Network: "eip155:80002",
        x402Supported: true,
        x402Providers: ["payai", "4mica"],
        x402DefaultProvider: "payai",
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582", // Circle testnet USDC
        usdcName: "USDC",
        usdcVersion: "2",
    },
    "monad-testnet": {
        name: "Monad Testnet",
        chainId: 10143,
        rpcUrl: "https://testnet-rpc.monad.xyz",
        scanPath: "monad-testnet",
        x402Network: "eip155:10143",
        x402Supported: false, // No facilitator supports Monad with x402 v2
        x402Providers: [],
        x402DefaultProvider: null,
        facilitatorUrl: null,
        usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // Circle testnet USDC
        usdcName: "USD Circle",
        usdcVersion: "2",
    },
    "skale-base-sepolia": {
        name: "SKALE Base Sepolia (Testnet)",
        chainId: 324705682,
        rpcUrl: "https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha",
        scanPath: "skale-base-sepolia",
        x402Network: "eip155:324705682",
        x402Supported: true,
        x402Providers: ["payai"],
        x402DefaultProvider: "payai",
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: "0x2e08028E3C4c2356572E096d8EF835cD5C6030bD", // Bridged USDC on SKALE Base Sepolia
        usdcName: "Bridged USDC (SKALE Bridge)",
        usdcSymbol: "USDC.e",
        usdcVersion: "2",
    },
};
export const TRUST_MODELS = ["reputation", "crypto-economic", "tee-attestation"];
// ============ TAP (Trustless Agents Plus) ============
// Universal Gateway addresses on source chains for Push Chain registration
export const TAP_GATEWAYS = {
    "eth-sepolia": "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A",
    "base-sepolia": "0xFD4fef1F43aFEc8b5bcdEEc47f35a1431479aC16",
};
export const TAP_CONSTANTS = {
    AGENT_REGISTRY: "0xa2B09263a7a41567D5F53b7d9F7CA1c6cc046CE2",
    REPUTATION_REGISTRY: "0x591A56D98A14e8A88722F794981F00CabB328a91",
    ERC8004_IDENTITY_TESTNET: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    ERC8004_IDENTITY_MAINNET: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    PUSH_CHAIN_RPC: "https://evm.donut.rpc.push.org/",
    PUSH_CHAIN_ID: 42101,
    UEA_FACTORY: "0x00000000000000000000000000000000000000eA",
    GAS_LIMIT: "100000000",
    MAX_FEE_PER_GAS: "10000000000",
    MAX_PRIORITY_FEE: "0",
    NONCE: "0",
    DEADLINE: "9999999999",
    BIND_DEADLINE: "9999999999",
    V_TYPE: 1,
    IPFS_GATEWAY: "https://gateway.pinata.cloud/ipfs/",
};
export function getTapGateway(chain) {
    return TAP_GATEWAYS[chain] ?? null;
}
export function isTapSupported(chain) {
    return chain in TAP_GATEWAYS;
}
const TESTNET_CHAIN_IDS = new Set([
    11155111, 84532, 43113, 80002, 10143, 324705682,
]);
export function getErc8004Registry(chainKey) {
    const chain = CHAINS[chainKey];
    if (chain && TESTNET_CHAIN_IDS.has(chain.chainId)) {
        return TAP_CONSTANTS.ERC8004_IDENTITY_TESTNET;
    }
    return TAP_CONSTANTS.ERC8004_IDENTITY_MAINNET;
}
