import type { Request, Response, NextFunction } from 'express';
import type { X402Config, ServicePricing } from '../types.js';
export interface X402MiddlewareOptions {
    config: X402Config;
    pricing: ServicePricing | Record<string, ServicePricing>;
    onPaymentVerified?: (receipt: any) => Promise<void>;
    onPaymentFailed?: (reason: string) => Promise<void>;
}
export declare function createX402Middleware(options: X402MiddlewareOptions): (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=express.d.ts.map