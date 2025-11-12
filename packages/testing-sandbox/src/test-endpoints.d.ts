import { FastifyInstance } from 'fastify';
import { z } from 'zod';
export interface TestEndpoint {
    path: string;
    method: 'GET' | 'POST';
    price: number;
    asset: string;
    description: string;
    responseSchema: z.ZodSchema;
    handler: (params: any) => Promise<any>;
}
export declare const testEndpoints: TestEndpoint[];
export declare function registerTestEndpoints(fastify: FastifyInstance): void;
//# sourceMappingURL=test-endpoints.d.ts.map