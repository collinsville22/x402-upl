import { z } from 'zod';
const ConfigSchema = z.object({
    PORT: z.string().default('4000'),
    HOST: z.string().default('0.0.0.0'),
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    SOLANA_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
    NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('devnet'),
    REFUND_WALLET_KEYPAIR: z.string(),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    RATE_LIMIT_MAX: z.string().default('100'),
    RATE_LIMIT_WINDOW: z.string().default('60000'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    CORS_ORIGIN: z.string().default('*'),
    ENABLE_METRICS: z.string().default('true'),
    ENABLE_REFUNDS: z.string().default('true'),
});
export function loadConfig() {
    const parsed = ConfigSchema.safeParse(process.env);
    if (!parsed.success) {
        console.error('Configuration validation failed:');
        console.error(parsed.error.format());
        throw new Error('Invalid configuration');
    }
    return parsed.data;
}
export const config = loadConfig();
//# sourceMappingURL=config.js.map