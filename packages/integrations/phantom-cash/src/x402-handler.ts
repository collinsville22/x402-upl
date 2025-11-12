import { PhantomCashX402Client, PhantomCashX402Error } from './phantom-cash-x402-client.js';

export interface X402ServiceCall {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

export interface X402ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
}

export interface X402PaymentProof {
  signature: string;
  amount: number;
  currency: string;
  timestamp: number;
}

export class X402Handler {
  private client: PhantomCashX402Client;

  constructor(client: PhantomCashX402Client) {
    this.client = client;
  }

  async callService<T = any>(call: X402ServiceCall): Promise<X402ServiceResponse<T>> {
    try {
      let result: T;

      switch (call.method) {
        case 'GET':
          result = await this.client.get<T>(call.url, call.params);
          break;
        case 'POST':
          result = await this.client.post<T>(call.url, call.body, call.params);
          break;
        default:
          return {
            success: false,
            error: `Unsupported HTTP method: ${call.method}`,
            errorCode: 'UNSUPPORTED_METHOD',
          };
      }

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof PhantomCashX402Error) {
        return {
          success: false,
          error: error.message,
          errorCode: error.code,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'UNKNOWN_ERROR',
      };
    }
  }

  getPaymentHistory(): X402PaymentProof[] {
    return this.client.getPaymentHistory().map((record) => ({
      signature: record.signature,
      amount: record.amount,
      currency: record.asset,
      timestamp: record.timestamp,
    }));
  }

  getTotalSpent(): number {
    return this.client.getMetrics().totalSpent;
  }

  getMetrics() {
    return this.client.getMetrics();
  }

  async getWalletAddress(): Promise<string> {
    return this.client.getWalletAddress();
  }

  async getCashBalance(): Promise<number> {
    return this.client.getCashBalance();
  }

  async getSolBalance(): Promise<number> {
    return this.client.getSolBalance();
  }

  getSpentThisHour(): number {
    return this.client.getSpentThisHour();
  }

  getRemainingHourlyBudget(): number {
    return this.client.getRemainingHourlyBudget();
  }
}
