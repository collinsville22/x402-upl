import { FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';
import type { X402MiddlewareConfig } from '../types.js';
export declare function createFastifyX402Middleware(config: X402MiddlewareConfig): (request: FastifyRequest, reply: FastifyReply, done: HookHandlerDoneFunction) => Promise<undefined>;
//# sourceMappingURL=fastify.d.ts.map