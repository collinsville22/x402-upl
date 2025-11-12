import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { X402Service } from './x402.service.js';
import { X402_PAYMENT_METADATA, X402_MODULE_OPTIONS } from './x402.constants.js';
import { X402PaymentConfig, X402ModuleOptions } from './x402.types.js';
import type { PaymentPayload, PaymentRequirements } from '../../types.js';

@Injectable()
export class X402Interceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private x402Service: X402Service,
    @Inject(X402_MODULE_OPTIONS) private options: X402ModuleOptions
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const paymentConfig = this.reflector.get<X402PaymentConfig>(
      X402_PAYMENT_METADATA,
      context.getHandler()
    );

    if (!paymentConfig) {
      return next.handle();
    }

    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (request.method === 'OPTIONS') {
      return next.handle();
    }

    const paymentHeader = request.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      const requirements: PaymentRequirements = {
        scheme: 'exact',
        network: this.getNetworkString(this.x402Service.getConfig().network),
        asset: paymentConfig.asset || 'SOL',
        payTo: this.x402Service.getTreasuryWallet().toBase58(),
        amount: paymentConfig.price.toString(),
        timeout: this.x402Service.getConfig().timeout,
        nonce: this.generateNonce(),
      };

      throw new HttpException(
        {
          statusCode: 402,
          message: 'Payment Required',
          requirements,
        },
        HttpStatus.PAYMENT_REQUIRED
      );
    }

    try {
      const paymentPayload: PaymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );

      const result = await this.x402Service.verifyPayment(
        paymentPayload,
        paymentConfig.price,
        new PublicKey(this.x402Service.getTreasuryWallet())
      );

      if (!result.valid) {
        if (this.options.onPaymentFailed) {
          await this.options.onPaymentFailed(result.reason || 'Payment verification failed');
        }

        throw new HttpException(
          {
            statusCode: 402,
            message: 'Payment Required',
            error: result.reason || 'Payment verification failed',
          },
          HttpStatus.PAYMENT_REQUIRED
        );
      }

      if (this.options.onPaymentVerified) {
        await this.options.onPaymentVerified(paymentPayload);
      }

      response.setHeader('X-Payment-Verified', 'true');
      response.setHeader('X-Payment-Signature', paymentPayload.signature);

      (request as any).x402 = {
        verified: true,
        signature: paymentPayload.signature,
        from: paymentPayload.from,
        to: paymentPayload.to,
        amount: paymentPayload.amount,
        asset: paymentPayload.asset,
      };

      return next.handle();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : 'Payment processing error';

      if (this.options.onPaymentFailed) {
        await this.options.onPaymentFailed(errorMessage);
      }

      throw new HttpException(
        {
          statusCode: 500,
          message: 'Internal Server Error',
          error: errorMessage,
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  private getNetworkString(network: string): 'solana-mainnet' | 'solana-devnet' | 'solana-testnet' {
    if (network === 'mainnet-beta') return 'solana-mainnet';
    if (network === 'testnet') return 'solana-testnet';
    return 'solana-devnet';
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }
}
