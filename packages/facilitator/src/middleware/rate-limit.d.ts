import { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
export interface RateLimitConfig {
    max: number;
    windowMs: number;
    keyGenerator?: (request: FastifyRequest) => string;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
}
export declare class RateLimiter {
    private store;
    private config;
    constructor(config: RateLimitConfig);
    private cleanup;
    check(request: FastifyRequest, reply: FastifyReply): Promise<void>;
}
export declare const createRateLimitMiddleware: (config: RateLimitConfig) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const defaultRateLimiter: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const strictRateLimiter: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare const authRateLimiter: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
export declare function setupRateLimiting(fastify: FastifyInstance): Promise<void>;
//# sourceMappingURL=rate-limit.d.ts.map