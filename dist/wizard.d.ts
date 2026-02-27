import { type ChainKey, type TrustModel, type X402Provider } from "./config.js";
import { type SolanaChainKey } from "./config-solana.js";
export interface WizardAnswers {
    projectDir: string;
    agentName: string;
    agentDescription: string;
    agentImage: string;
    features: ("a2a" | "mcp" | "x402")[];
    a2aStreaming: boolean;
    chain: ChainKey | SolanaChainKey;
    trustModels: TrustModel[];
    agentWallet: string;
    generatedPrivateKey?: string;
    x402Provider?: X402Provider;
    skills?: string[];
    domains?: string[];
}
export { isSolanaChain } from "./config-solana.js";
export declare const hasFeature: (answers: WizardAnswers, feature: "a2a" | "mcp" | "x402") => boolean;
export declare function runWizard(): Promise<WizardAnswers>;
