import { Keypair } from '@solana/web3.js';
import { SolanaX402Client, SolanaX402Config } from '@x402-upl/sdk';

export interface WordPressX402Config {
  wordpressUrl: string;
  wordpressUser: string;
  wordpressPassword: string;
  solanaNetwork: 'mainnet-beta' | 'devnet' | 'testnet';
  solanaRpcUrl?: string;
  merchantWallet: Keypair;
}

export class WordPressX402Plugin {
  private x402Client: SolanaX402Client;
  private config: WordPressX402Config;
  private apiBase: string;

  constructor(config: WordPressX402Config) {
    this.config = config;
    this.apiBase = `${config.wordpressUrl}/wp-json/wp/v2`;

    const x402Config: SolanaX402Config = {
      network: config.solanaNetwork,
      rpcUrl: config.solanaRpcUrl,
      wallet: config.merchantWallet,
    };

    this.x402Client = new SolanaX402Client(x402Config);
  }

  async createPaymentPost(orderId: string, amount: number, currency: string): Promise<{
    postId: number;
    sessionId: string;
    paymentUrl: string;
    payTo: string;
    amount: string;
    asset: string;
  }> {
    const sessionId = `wp_${orderId}_${Date.now()}`;
    const merchantAddress = this.x402Client.getWalletAddress();

    const post = await this.createPost({
      title: `Payment for Order ${orderId}`,
      content: `Payment session: ${sessionId}`,
      status: 'private',
      meta: {
        x402_session_id: sessionId,
        x402_order_id: orderId,
        x402_amount: amount.toString(),
        x402_currency: currency,
        x402_merchant: merchantAddress,
        x402_status: 'pending',
      },
    });

    return {
      postId: post.id,
      sessionId,
      paymentUrl: `/pay/${sessionId}`,
      payTo: merchantAddress,
      amount: amount.toString(),
      asset: this.mapCurrencyToAsset(currency),
    };
  }

  async createPost(postData: {
    title: string;
    content: string;
    status: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    const auth = Buffer.from(
      `${this.config.wordpressUser}:${this.config.wordpressPassword}`
    ).toString('base64');

    const response = await fetch(`${this.apiBase}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create post: ${response.statusText}`);
    }

    return response.json();
  }

  async getPost(postId: number): Promise<any> {
    const auth = Buffer.from(
      `${this.config.wordpressUser}:${this.config.wordpressPassword}`
    ).toString('base64');

    const response = await fetch(`${this.apiBase}/posts/${postId}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get post: ${response.statusText}`);
    }

    return response.json();
  }

  async updatePost(postId: number, updates: {
    title?: string;
    content?: string;
    status?: string;
    meta?: Record<string, any>;
  }): Promise<any> {
    const auth = Buffer.from(
      `${this.config.wordpressUser}:${this.config.wordpressPassword}`
    ).toString('base64');

    const response = await fetch(`${this.apiBase}/posts/${postId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error(`Failed to update post: ${response.statusText}`);
    }

    return response.json();
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

  async completePayment(postId: number, signature: string): Promise<void> {
    await this.updatePost(postId, {
      meta: {
        x402_status: 'completed',
        x402_signature: signature,
        x402_completed_at: new Date().toISOString(),
      },
    });
  }

  async createUser(userData: {
    username: string;
    email: string;
    password: string;
    roles?: string[];
  }): Promise<any> {
    const auth = Buffer.from(
      `${this.config.wordpressUser}:${this.config.wordpressPassword}`
    ).toString('base64');

    const response = await fetch(`${this.apiBase}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`,
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    return response.json();
  }

  async listPosts(filters?: {
    status?: string;
    page?: number;
    perPage?: number;
  }): Promise<any[]> {
    const auth = Buffer.from(
      `${this.config.wordpressUser}:${this.config.wordpressPassword}`
    ).toString('base64');

    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.perPage) params.append('per_page', filters.perPage.toString());

    const response = await fetch(`${this.apiBase}/posts?${params}`, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to list posts: ${response.statusText}`);
    }

    return response.json();
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
