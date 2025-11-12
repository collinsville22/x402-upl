import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { X402Module } from '@x402-upl/core/nestjs';
import configuration from './config/configuration';
import { ExampleModule } from './example/example.module';
import { HealthModule } from './health/health.module';
import { RegistryClient } from './x402/registry-client';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        pinoHttp: {
          level: config.get('logLevel'),
          transport: config.get('nodeEnv') === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        },
      }),
    }),
    X402Module.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        network: config.get('network'),
        treasuryWallet: config.get('treasuryWallet'),
        redisUrl: config.get('redisUrl'),
        enableTAP: config.get('enableTAP'),
        registryUrl: config.get('registryUrl'),
        onPaymentVerified: async (payment) => {
          console.log('Payment verified:', payment.signature);
        },
        onPaymentFailed: async (reason) => {
          console.error('Payment failed:', reason);
        },
      }),
    }),
    ExampleModule,
    HealthModule,
  ],
})
export class AppModule implements OnModuleInit {
  private registryClient: RegistryClient | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const autoRegister = this.config.get('autoRegisterService');
    const serviceUrl = this.config.get('serviceUrl');
    const serviceName = this.config.get('serviceName');

    if (autoRegister && serviceUrl && serviceName) {
      this.registryClient = new RegistryClient(this.config.get('registryUrl'));

      await this.registryClient.registerService({
        name: serviceName,
        description: this.config.get('serviceDescription') || '',
        url: serviceUrl,
        category: this.config.get('serviceCategory') || 'API',
        pricing: {
          amount: this.config.get('servicePrice'),
          currency: 'CASH',
        },
        walletAddress: this.config.get('treasuryWallet'),
        network: this.config.get('network'),
        acceptedTokens: this.config.get('acceptedTokens'),
        capabilities: this.config.get('serviceCapabilities'),
        tags: this.config.get('serviceTags'),
      });

      console.log('Service registered with x402 registry:', this.registryClient.getServiceId());

      this.heartbeatInterval = setInterval(async () => {
        if (this.registryClient) {
          try {
            await this.registryClient.heartbeat();
          } catch (error) {
            console.warn('Failed to send heartbeat to registry:', error);
          }
        }
      }, 60000);
    }
  }

  async onModuleDestroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.registryClient) {
      try {
        await this.registryClient.setServiceStatus('PAUSED');
        console.log('Service status updated to PAUSED');
      } catch (error) {
        console.warn('Failed to update service status:', error);
      }
    }
  }
}
