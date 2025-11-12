import { Module, DynamicModule, Global } from '@nestjs/common';
import { X402Interceptor } from './x402.interceptor.js';
import { X402Service } from './x402.service.js';
import { X402ModuleOptions } from './x402.types.js';
import { X402_MODULE_OPTIONS } from './x402.constants.js';

@Global()
@Module({})
export class X402Module {
  static forRoot(options: X402ModuleOptions): DynamicModule {
    return {
      module: X402Module,
      providers: [
        {
          provide: X402_MODULE_OPTIONS,
          useValue: options,
        },
        X402Service,
        X402Interceptor,
      ],
      exports: [X402Service, X402Interceptor],
    };
  }

  static forRootAsync(options: {
    useFactory: (...args: any[]) => Promise<X402ModuleOptions> | X402ModuleOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: X402Module,
      providers: [
        {
          provide: X402_MODULE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        X402Service,
        X402Interceptor,
      ],
      exports: [X402Service, X402Interceptor],
    };
  }
}
