import { type ChainKey, type TrustModel } from './config.js';
export interface WizardAnswers {
    projectDir: string;
    agentName: string;
    agentDescription: string;
    agentImage: string;
    features: ('a2a' | 'mcp' | 'x402')[];
    storageType: 'ipfs' | 'base64';
    chain: ChainKey;
    trustModels: TrustModel[];
    agentWallet: string;
    generatedPrivateKey?: string;
}
export declare const hasFeature: (answers: WizardAnswers, feature: "a2a" | "mcp" | "x402") => boolean;
export declare function runWizard(): Promise<WizardAnswers>;
