import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createX402NextMiddleware } from '@x402-upl/core/nextjs';
import { config as appConfig } from './lib/config';
import { verifyTAPSignature } from './lib/x402/tap-middleware';

const x402Middleware = createX402NextMiddleware({
  network: appConfig.NETWORK,
  treasuryWallet: appConfig.TREASURY_WALLET,
  redisUrl: appConfig.REDIS_URL,
  onPaymentVerified: async (payment) => {
    console.log('Payment verified:', payment.signature);
  },
  onPaymentFailed: async (reason, request) => {
    console.error('Payment failed:', reason, request.nextUrl.pathname);
  },
});

export async function middleware(request: NextRequest) {
  if (appConfig.ENABLE_TAP) {
    const tapResult = await verifyTAPSignature(request, {
      registryUrl: appConfig.REGISTRY_URL,
      requireTAP: false,
      cachePublicKeys: true,
      cacheTTL: 3600000,
    });

    if (tapResult.verified && tapResult.keyId) {
      const response = NextResponse.next();
      if (tapResult.did) response.headers.set('x-agent-did', tapResult.did);
      if (tapResult.cert) response.headers.set('x-agent-cert', tapResult.cert);
      if (tapResult.wallet) response.headers.set('x-agent-wallet', tapResult.wallet);
      response.headers.set('x-tap-verified', 'true');
      request.headers.set('x-tap-verified', 'true');
    }
  }

  return x402Middleware(request);
}

export const config = {
  matcher: '/api/:path*',
};
