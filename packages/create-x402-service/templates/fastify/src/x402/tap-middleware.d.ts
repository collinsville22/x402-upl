import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
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
export declare function createTAPMiddleware(config: TAPConfig): (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => Promise<any>;
export declare function clearPublicKeyCache(): void;
//# sourceMappingURL=tap-middleware.d.ts.map