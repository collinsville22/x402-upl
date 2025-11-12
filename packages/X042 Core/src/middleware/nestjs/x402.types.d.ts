export interface X402ModuleOptions {
    network: 'mainnet-beta' | 'devnet' | 'testnet';
    rpcUrl?: string;
    treasuryWallet: string;
    redisUrl?: string;
    timeout?: number;
    enableTAP?: boolean;
    registryUrl?: string;
    onPaymentVerified?: (payment: any) => Promise<void> | void;
    onPaymentFailed?: (reason: string) => Promise<void> | void;
}
export interface X402PaymentConfig {
    price: number;
    asset?: string;
    description?: string;
    required?: boolean;
}
export interface X402PaymentContext {
    verified: boolean;
    signature?: string;
    from?: string;
    to?: string;
    amount?: string;
    asset?: string;
}
//# sourceMappingURL=x402.types.d.ts.map