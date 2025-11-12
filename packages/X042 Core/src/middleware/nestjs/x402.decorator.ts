import { SetMetadata } from '@nestjs/common';
import { X402_PAYMENT_METADATA } from './x402.constants.js';
import { X402PaymentConfig } from './x402.types.js';

export const X402Payment = (config: X402PaymentConfig) => SetMetadata(X402_PAYMENT_METADATA, config);
