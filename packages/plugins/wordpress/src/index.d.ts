import { Keypair } from '@solana/web3.js';
import { SolanaX402Client } from '@x402-upl/sdk';
export interface WordPressX402Config {
    wordpressUrl: string;
    wordpressUser: string;
    wordpressPassword: string;
    solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
    solanaRpcUrl?: string;
    merchantWallet: Keypair;
}
export declare class WordPressX402Plugin {
    private x402Client;
    private config;
    private apiBase;
    constructor(config: WordPressX402Config);
    createPaymentPost(orderId: string, amount: number, currency: string): Promise<{
        postId: number;
        sessionId: string;
        paymentUrl: string;
        payTo: string;
        amount: string;
        asset: string;
    }>;
    createPost(postData: {
        title: string;
        content: string;
        status: string;
        meta?: Record<string, any>;
    }): Promise<any>;
    getPost(postId: number): Promise<any>;
    updatePost(postId: number, updates: {
        title?: string;
        content?: string;
        status?: string;
        meta?: Record<string, any>;
    }): Promise<any>;
    verifyPayment(signature: string, expectedAmount: number): Promise<boolean>;
    completePayment(postId: number, signature: string): Promise<void>;
    createUser(userData: {
        username: string;
        email: string;
        password: string;
        roles?: string[];
    }): Promise<any>;
    listPosts(filters?: {
        status?: string;
        page?: number;
        perPage?: number;
    }): Promise<any[]>;
    private mapCurrencyToAsset;
    getClient(): SolanaX402Client;
    getMerchantAddress(): string;
}
export * from './server';
//# sourceMappingURL=index.d.ts.map