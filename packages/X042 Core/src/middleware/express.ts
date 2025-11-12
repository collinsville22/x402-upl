import type { Request, Response, NextFunction } from 'express';
import { PublicKey } from '@solana/web3.js';
import { PaymentVerifier } from '../payment/verifier.js';
import type { X402Config, PaymentPayload, PaymentRequirements, ServicePricing } from '../types.js';

export interface X402MiddlewareOptions {
  config: X402Config;
  pricing: ServicePricing | Record<string, ServicePricing>;
  onPaymentVerified?: (receipt: any) => Promise<void>;
  onPaymentFailed?: (reason: string) => Promise<void>;
}

export function createX402Middleware(options: X402MiddlewareOptions) {
  const verifier = new PaymentVerifier(options.config);

  return async (req: Request, res: Response, next: NextFunction) => {
    const paymentHeader = req.headers['x-payment'] as string | undefined;

    if (!paymentHeader) {
      const pricing = getPricingForRoute(req.path, options.pricing);

      if (!pricing) {
        return res.status(500).json({
          error: 'Pricing not configured for this endpoint',
        });
      }

      const requirements = generatePaymentRequirements(
        pricing,
        options.config
      );

      return res.status(402).json(requirements);
    }

    try {
      const payload = decodePaymentPayload(paymentHeader);

      const pricing = getPricingForRoute(req.path, options.pricing);

      if (!pricing) {
        return res.status(500).json({
          error: 'Pricing not configured for this endpoint',
        });
      }

      const amountInSmallestUnit = Math.floor(
        pricing.pricePerCall * Math.pow(10, 6)
      );

      const verificationResult = await verifier.verifyPayment(
        payload,
        amountInSmallestUnit,
        options.config.treasuryWallet
      );

      if (!verificationResult.valid) {
        if (options.onPaymentFailed) {
          await options.onPaymentFailed(verificationResult.reason || 'Unknown error');
        }

        return res.status(400).json({
          error: 'Payment verification failed',
          reason: verificationResult.reason,
        });
      }

      if (options.onPaymentVerified && verificationResult.receipt) {
        await options.onPaymentVerified(verificationResult.receipt);
      }

      res.setHeader(
        'X-Payment-Response',
        encodePaymentResponse(verificationResult.receipt!)
      );

      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid payment payload',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

function getPricingForRoute(
  route: string,
  pricing: ServicePricing | Record<string, ServicePricing>
): ServicePricing | null {
  if ('pricePerCall' in pricing) {
    return pricing;
  }

  return pricing[route] || null;
}

function generatePaymentRequirements(
  pricing: ServicePricing,
  config: X402Config
): PaymentRequirements {
  const tokenMint = getTokenMintForCurrency(pricing.currency, config);

  return {
    scheme: 'exact',
    network: getNetworkString(config.network),
    asset: tokenMint.toBase58(),
    payTo: config.treasuryWallet.toBase58(),
    amount: pricing.pricePerCall.toString(),
    timeout: config.timeout,
    nonce: generateNonce(),
  };
}

function getTokenMintForCurrency(
  currency: 'USDC' | 'CASH' | 'SOL',
  config: X402Config
): PublicKey {
  const usdcDevnet = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
  const usdcMainnet = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

  if (currency === 'USDC') {
    return config.network === 'mainnet-beta' ? usdcMainnet : usdcDevnet;
  }

  if (config.acceptedTokens.length > 0) {
    return config.acceptedTokens[0];
  }

  return config.network === 'mainnet-beta' ? usdcMainnet : usdcDevnet;
}

function getNetworkString(network: string): 'solana-mainnet' | 'solana-devnet' | 'solana-testnet' {
  if (network === 'mainnet-beta') return 'solana-mainnet';
  if (network === 'testnet') return 'solana-testnet';
  return 'solana-devnet';
}

function generateNonce(): string {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
}

function decodePaymentPayload(encoded: string): PaymentPayload {
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  return JSON.parse(decoded);
}

function encodePaymentResponse(receipt: any): string {
  return Buffer.from(JSON.stringify(receipt)).toString('base64');
}
