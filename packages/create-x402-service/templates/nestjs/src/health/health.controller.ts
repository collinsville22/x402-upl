import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private config: ConfigService) {}

  @Get()
  check() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: this.config.get('serviceName') || 'x402-nestjs-service',
    };
  }
}
