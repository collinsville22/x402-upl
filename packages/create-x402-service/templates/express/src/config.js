import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();
const ConfigSchema = z.object({
    PORT: z.string().default('3000'),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('devnet'),
    TREASURY_WALLET: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    CORS_ORIGIN: z.string().default('*'),
    ENABLE_TAP: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    REGISTRY_URL: z.string().default('https://registry.x402.network'),
    AUTO_REGISTER_SERVICE: z.enum(['true', 'false']).default('false').transform((v) => v === 'true'),
    SERVICE_URL: z.string().optional(),
    SERVICE_NAME: z.string().optional(),
    SERVICE_DESCRIPTION: z.string().optional(),
    SERVICE_CATEGORY: z.string().optional(),
    SERVICE_PRICE: z.string().optional().transform((v) => v ? parseFloat(v) : undefined),
    ACCEPTED_TOKENS: z.string().optional(),
    SERVICE_CAPABILITIES: z.string().optional(),
    SERVICE_TAGS: z.string().optional(),
});
const parsed = ConfigSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Configuration validation failed:');
    console.error(parsed.error.format());
    throw new Error('Invalid configuration');
}
export const config = parsed.data;
//# sourceMappingURL=config.js.map