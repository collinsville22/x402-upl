import { FastifyRequest, FastifyReply } from 'fastify';
export interface AuthenticatedRequest extends FastifyRequest {
    wallet?: string;
    permissions?: string[];
}
export declare function verifyWalletSignature(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function verifyApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function optionalAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export declare function requirePermission(permission: string): (request: FastifyRequest, reply: FastifyReply) => Promise<undefined>;
export declare function hashApiKey(apiKey: string): string;
export declare function generateApiKey(): string;
export declare function requireWalletOwnership(request: FastifyRequest, reply: FastifyReply, resourceWallet: string): Promise<boolean>;
//# sourceMappingURL=auth.d.ts.map