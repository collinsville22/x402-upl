import { Keypair } from '@solana/web3.js';
import { SolanaX402Client, SolanaX402Config } from '@x402-upl/sdk';
import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';

export interface WooCommerceX402Config {
  woocommerceUrl: string;
  woocommerceKey: string;
  woocommerceSecret: string;
  solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
  solanaRpcUrl?: string;
  merchantWallet: Keypair;
}

export class WooCommerceX402Plugin {
  private x402Client: SolanaX402Client;
  private wooClient: WooCommerceRestApi;
  private config: WooCommerceX402Config;

  constructor(config: WooCommerceX402Config) {
    this.config = config;

    const x402Config: SolanaX402Config = {
      network: config.solanaNetwork,
      rpcUrl: config.solanaRpcUrl,
      wallet: config.merchantWallet,
    };

    this.x402Client = new SolanaX402Client(x402Config);

    this.wooClient = new WooCommerceRestApi({
      url: config.woocommerceUrl,
      consumerKey: config.woocommerceKey,
      consumerSecret: config.woocommerceSecret,
      version: 'wc/v3',
    });
  }

  async createPaymentSession(orderId: number, amount: number, currency: string): Promise<{
    sessionId: string;
    paymentUrl: string;
    payTo: string;
    amount: string;
    asset: string;
  }> {
    const sessionId = `wc_${orderId}_${Date.now()}`;
    const merchantAddress = this.x402Client.getWalletAddress();

    return {
      sessionId,
      paymentUrl: `/pay/${sessionId}`,
      payTo: merchantAddress,
      amount: amount.toString(),
      asset: this.mapCurrencyToAsset(currency),
    };
  }

  async getOrder(orderId: number): Promise<any> {
    const response = await this.wooClient.get(`orders/${orderId}`);
    return response.data;
  }

  async updateOrderStatus(orderId: number, status: string, note?: string): Promise<void> {
    const updateData: any = { status };

    if (note) {
      updateData.customer_note = note;
    }

    await this.wooClient.put(`orders/${orderId}`, updateData);
  }

  async addOrderNote(orderId: number, note: string): Promise<void> {
    await this.wooClient.post(`orders/${orderId}/notes`, {
      note,
      customer_note: true,
    });
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

  async completeOrder(orderId: number, signature: string): Promise<void> {
    await this.updateOrderStatus(orderId, 'completed');
    await this.addOrderNote(
      orderId,
      `Payment completed on Solana. Transaction: ${signature}`
    );
  }

  async refundOrder(orderId: number, amount: number, reason: string): Promise<any> {
    const response = await this.wooClient.post(`orders/${orderId}/refunds`, {
      amount: amount.toString(),
      reason,
    });

    return response.data;
  }

  async createProduct(product: {
    name: string;
    price: string;
    description: string;
    acceptsCrypto: boolean;
  }): Promise<any> {
    const productData: any = {
      name: product.name,
      regular_price: product.price,
      description: product.description,
      status: 'publish',
    };

    if (product.acceptsCrypto) {
      productData.meta_data = [
        {
          key: '_x402_enabled',
          value: 'yes',
        },
      ];
    }

    const response = await this.wooClient.post('products', productData);
    return response.data;
  }

  async listOrders(status?: string, page: number = 1, perPage: number = 10): Promise<any[]> {
    const params: any = {
      page,
      per_page: perPage,
    };

    if (status) {
      params.status = status;
    }

    const response = await this.wooClient.get('orders', params);
    return response.data;
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

  getWooClient(): WooCommerceRestApi {
    return this.wooClient;
  }
}

export * from './server';
export * from './webhooks';
