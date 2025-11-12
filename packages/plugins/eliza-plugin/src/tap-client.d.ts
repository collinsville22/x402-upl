import { IAgentRuntime } from '@ai16z/eliza';
export interface TAPSignatureParams {
    created: number;
    expires: number;
    keyId: string;
    alg: string;
    nonce: string;
    tag: string;
}
export declare class TAPClient {
    private runtime;
    private httpClient;
    constructor(runtime: IAgentRuntime);
    private signRequest;
    private createSignatureBase;
    private generateNonce;
    request<T = any>(method: 'GET' | 'POST', url: string, data?: any, params?: Record<string, any>): Promise<T>;
}
//# sourceMappingURL=tap-client.d.ts.map