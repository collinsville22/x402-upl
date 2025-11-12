import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402-upl/core/nextjs';
import { config } from '@/lib/config';

export const POST = withX402(
  async (request: NextRequest) => {
    const body = await request.json();

    return NextResponse.json({
      success: true,
      message: 'Request processed successfully',
      data: {
        input: body,
        timestamp: new Date().toISOString(),
      },
    });
  },
  {
    price: config.SERVICE_PRICE || 0.01,
    asset: 'CASH',
    description: 'Example x402-protected API endpoint',
  },
  {
    network: config.NETWORK,
    treasuryWallet: config.TREASURY_WALLET,
    redisUrl: config.REDIS_URL,
  }
);

export const GET = withX402(
  async (request: NextRequest) => {
    return NextResponse.json({
      success: true,
      message: 'GET request processed',
      timestamp: new Date().toISOString(),
    });
  },
  {
    price: 0.005,
    asset: 'CASH',
    description: 'Example GET endpoint',
  },
  {
    network: config.NETWORK,
    treasuryWallet: config.TREASURY_WALLET,
    redisUrl: config.REDIS_URL,
  }
);
