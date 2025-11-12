import { Keypair } from '@solana/web3.js';
export interface X402Config {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl?: string;
    registryApiUrl?: string;
    walletPrivateKey?: string;
    agentId?: string;
    did?: string;
    visaTapCert?: string;
}
export declare function getConfig(): X402Config;
export declare function setConfig(key: keyof X402Config, value: string): void;
export declare function getNetwork(): 'mainnet-beta' | 'devnet' | 'testnet';
export declare function setNetwork(network: 'mainnet-beta' | 'devnet' | 'testnet'): void;
export declare function getWallet(): Keypair | null;
export declare function setWallet(keypair: Keypair): void;
export declare function getRegistryApiUrl(): string;
export declare function clearConfig(): void;
export declare function isConfigured(): boolean;
//# sourceMappingURL=config.d.ts.map