// Chain configs - SDK handles contract addresses internally
// x402 facilitator: PayAI (https://facilitator.payai.network)
// Supported: Base, Polygon
// Not supported: Ethereum, Monad (no facilitator with x402 v2 support)
export const CHAINS = {
    // ============ MAINNETS ============
    "eth-mainnet": {
        name: "Ethereum Mainnet",
        chainId: 1,
        rpcUrl: "https://ethereum-rpc.publicnode.com",
        scanPath: "mainnet",
        x402Network: "eip155:1",
        x402Supported: false, // No facilitator supports Ethereum mainnet
        facilitatorUrl: null,
        usdcAddress: null,
    },
    "arbitrum-mainnet": {
        name: "Arbitrum One",
        chainId: 42161,
        rpcUrl: "https://arb1.arbitrum.io/rpc",
        scanPath: "arbitrum",
        x402Network: "eip155:42161",
        x402Supported: false, // No facilitator supports Arbitrum with x402 v2 (yet)
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
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: null, // SDK has default
    },
    "polygon-mainnet": {
        name: "Polygon Mainnet",
        chainId: 137,
        rpcUrl: "https://polygon-rpc.com",
        scanPath: "polygon",
        x402Network: "eip155:137",
        x402Supported: true,
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
        facilitatorUrl: null,
        usdcAddress: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603", // Circle USDC
        usdcName: "USD Coin",
        usdcVersion: "2",
    },
    // ============ TESTNETS ============
    "eth-sepolia": {
        name: "Ethereum Sepolia (Testnet)",
        chainId: 11155111,
        rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
        scanPath: "sepolia",
        x402Network: "eip155:11155111",
        x402Supported: false, // No facilitator supports Ethereum Sepolia
        facilitatorUrl: null,
        usdcAddress: null,
    },
    "arbitrum-sepolia": {
        name: "Arbitrum Sepolia (Testnet)",
        chainId: 421614,
        rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        scanPath: "arbitrum-sepolia",
        x402Network: "eip155:421614",
        x402Supported: false, // No facilitator supports Arbitrum Sepolia with x402 v2 (yet)
        facilitatorUrl: null,
        usdcAddress: null,
    },
    "base-sepolia": {
        name: "Base Sepolia (Testnet)",
        chainId: 84532,
        rpcUrl: "https://sepolia.base.org",
        scanPath: "base-sepolia",
        x402Network: "eip155:84532",
        x402Supported: true,
        facilitatorUrl: "https://facilitator.payai.network",
        usdcAddress: null, // SDK has default
    },
    "polygon-amoy": {
        name: "Polygon Amoy (Testnet)",
        chainId: 80002,
        rpcUrl: "https://rpc-amoy.polygon.technology",
        scanPath: "polygon-amoy",
        x402Network: "eip155:80002",
        x402Supported: true,
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
        facilitatorUrl: null,
        usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3", // Circle testnet USDC
        usdcName: "USD Coin",
        usdcVersion: "2",
    },
} as const;

export type ChainKey = keyof typeof CHAINS;

export const TRUST_MODELS = ["reputation", "crypto-economic", "tee-attestation"] as const;
export type TrustModel = (typeof TRUST_MODELS)[number];
