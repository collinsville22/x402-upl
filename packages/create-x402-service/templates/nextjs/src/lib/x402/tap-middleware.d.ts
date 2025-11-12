import { NextRequest } from 'next/server';
export interface TAPConfig {
    registryUrl: string;
    requireTAP: boolean;
    cachePublicKeys: boolean;
    cacheTTL: number;
}
export interface TAPSignatureParams {
    keyId: string;
    algorithm: string;
    created: number;
    expires: number;
    nonce: string;
}
export interface TAPVerificationResult {
    verified: boolean;
    keyId?: string;
    did?: string;
    cert?: string;
    wallet?: string;
    reason?: string;
}
export declare function verifyTAPSignature(request: NextRequest, config: TAPConfig): Promise<TAPVerificationResult>;
export declare function clearPublicKeyCache(): void;
//# sourceMappingURL=tap-middleware.d.ts.map