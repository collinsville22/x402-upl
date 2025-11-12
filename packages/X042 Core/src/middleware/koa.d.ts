import { Context, Next } from 'koa';
import type { X402Config, PaymentPayload } from '../types.js';
export interface KoaX402Config extends Omit<X402Config, 'rpcUrl'> {
    rpcUrl?: string;
    onPaymentVerified?: (payment: PaymentPayload & {
        resource: string;
    }, ctx: Context) => void | Promise<void>;
    onPaymentFailed?: (reason: string, ctx: Context) => void | Promise<void>;
}
export interface RouteX402Config {
    price: number;
    asset?: string;
    description?: string;
}
export declare function createX402KoaMiddleware(config: KoaX402Config): (ctx: Context, next: Next) => Promise<void>;
export declare function withX402(routeConfig: RouteX402Config, globalConfig: KoaX402Config): (ctx: Context, next: Next) => Promise<void>;
//# sourceMappingURL=koa.d.ts.map