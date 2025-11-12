import { NextRequest, NextResponse } from 'next/server';
import type { X402Config, PaymentPayload, PaymentRequirements } from '../types.js';
export interface NextJsX402Config extends Omit<X402Config, 'rpcUrl'> {
    rpcUrl?: string;
    onPaymentVerified?: (payment: PaymentPayload & {
        resource: string;
    }) => void | Promise<void>;
    onPaymentFailed?: (reason: string, request: NextRequest) => void | Promise<void>;
}
export interface RouteX402Config {
    price: number;
    asset?: string;
    description?: string;
}
export declare function createX402Middleware(config: NextJsX402Config): (request: NextRequest) => Promise<NextResponse>;
export declare function withX402<T = any>(handler: (request: NextRequest) => Promise<NextResponse<T>>, routeConfig: RouteX402Config, globalConfig: NextJsX402Config): (request: NextRequest) => Promise<NextResponse<T | PaymentRequirements>>;
//# sourceMappingURL=nextjs.d.ts.map