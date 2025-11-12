import { Keypair } from '@solana/web3.js';
import { SolanaX402Client, SolanaX402Config } from '@x402-upl/sdk';
import { shopify } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';

export interface ShopifyX402Config {
  shopifyApiKey: string;
  shopifyApiSecret: string;
  shopifyScopes: string[];
  shopifyHostName: string;
  solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
  solanaRpcUrl?: string;
  merchantWallet: Keypair;
}

export class ShopifyX402Plugin {
  private x402Client: SolanaX402Client;
  private config: ShopifyX402Config;
  private shopifyClient: typeof shopify;

  constructor(config: ShopifyX402Config) {
    this.config = config;

    const x402Config: SolanaX402Config = {
      network: config.solanaNetwork,
      rpcUrl: config.solanaRpcUrl,
      wallet: config.merchantWallet,
    };

    this.x402Client = new SolanaX402Client(x402Config);

    this.shopifyClient = shopify.config({
      apiKey: config.shopifyApiKey,
      apiSecretKey: config.shopifyApiSecret,
      scopes: config.shopifyScopes,
      hostName: config.shopifyHostName,
      apiVersion: '2024-01',
      isEmbeddedApp: false,
    });
  }

  async createPaymentSession(orderId: string, amount: number, currency: string): Promise<{
    sessionId: string;
    paymentUrl: string;
    payTo: string;
    amount: string;
    asset: string;
  }> {
    const sessionId = `shopify_${orderId}_${Date.now()}`;
    const merchantAddress = this.x402Client.getWalletAddress();

    return {
      sessionId,
      paymentUrl: `/pay/${sessionId}`,
      payTo: merchantAddress,
      amount: amount.toString(),
      asset: this.mapCurrencyToAsset(currency),
    };
  }

  async verifyPayment(signature: string, expectedAmount: number): Promise<boolean> {
    try {
      const tx = await this.x402Client['rpcClient'].getTransaction(signature, {
        commitment: 'confirmed',
      });

      if (!tx || !tx.meta) {
        return false;
      }

      const lamports = tx.meta.postBalances[1] - tx.meta.preBalances[1];
      const receivedAmount = lamports / 1_000_000_000;

      return Math.abs(receivedAmount - expectedAmount) < 0.000001;
    } catch (error) {
      console.error('Payment verification failed:', error);
      return false;
    }
  }

  async fulfillOrder(orderId: string, signature: string): Promise<void> {
    const session = await this.shopifyClient.session.getCurrent();

    if (!session) {
      throw new Error('No active Shopify session');
    }

    const client = new this.shopifyClient.clients.Rest({ session });

    await client.post({
      path: `orders/${orderId}/fulfillments`,
      data: {
        fulfillment: {
          tracking_number: signature,
          notify_customer: true,
        },
      },
    });
  }

  async refundOrder(orderId: string, amount: number, reason: string): Promise<string> {
    const session = await this.shopifyClient.session.getCurrent();

    if (!session) {
      throw new Error('No active Shopify session');
    }

    const client = new this.shopifyClient.clients.Rest({ session });

    const response = await client.post({
      path: `orders/${orderId}/refunds`,
      data: {
        refund: {
          currency: 'USD',
          amount: amount,
          note: reason,
        },
      },
    });

    return response.body.refund.id;
  }

  private mapCurrencyToAsset(currency: string): string {
    const mapping: Record<string, string> = {
      'USD': 'USDC',
      'SOL': 'SOL',
      'CASH': 'CASH',
    };
    return mapping[currency] || 'SOL';
  }

  getClient(): SolanaX402Client {
    return this.x402Client;
  }

  getMerchantAddress(): string {
    return this.x402Client.getWalletAddress();
  }
}

export * from './server';
export * from './webhooks';
