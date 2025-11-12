import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { X402Service } from './x402.service.js';
import { X402ModuleOptions } from './x402.types.js';
export declare class X402Interceptor implements NestInterceptor {
    private reflector;
    private x402Service;
    private options;
    constructor(reflector: Reflector, x402Service: X402Service, options: X402ModuleOptions);
    intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>>;
    private getNetworkString;
    private generateNonce;
}
//# sourceMappingURL=x402.interceptor.d.ts.map