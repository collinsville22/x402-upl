import { Controller, Post, Get, Body, UseInterceptors, Req } from '@nestjs/common';
import { X402Payment, X402Interceptor } from '@x402-upl/core/nestjs';
import { Request } from 'express';

interface X402Request extends Request {
  x402?: {
    verified: boolean;
    signature?: string;
    from?: string;
    to?: string;
    amount?: string;
    asset?: string;
  };
}

@Controller('api/example')
@UseInterceptors(X402Interceptor)
export class ExampleController {
  @Post()
  @X402Payment({
    price: 0.01,
    asset: 'CASH',
    description: 'Example x402-protected endpoint',
    required: true,
  })
  async handlePost(@Body() body: any, @Req() request: X402Request) {
    return {
      success: true,
      message: 'Request processed successfully',
      data: {
        input: body,
        timestamp: new Date().toISOString(),
        payment: request.x402,
      },
    };
  }

  @Get()
  @X402Payment({
    price: 0.005,
    asset: 'CASH',
    description: 'Example GET endpoint',
    required: true,
  })
  async handleGet(@Req() request: X402Request) {
    return {
      success: true,
      message: 'GET request processed',
      timestamp: new Date().toISOString(),
      payment: request.x402,
    };
  }
}
