import { DynamicModule } from '@nestjs/common';
import { X402ModuleOptions } from './x402.types.js';
export declare class X402Module {
    static forRoot(options: X402ModuleOptions): DynamicModule;
    static forRootAsync(options: {
        useFactory: (...args: any[]) => Promise<X402ModuleOptions> | X402ModuleOptions;
        inject?: any[];
    }): DynamicModule;
}
//# sourceMappingURL=x402.module.d.ts.map