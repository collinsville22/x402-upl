import crypto from 'crypto';

interface PaymentReceipt {
  signature: string;
  amount: number;
  token: string;
  sender: string;
  timestamp: string;
}

interface SettlementConfig {
  facilitatorUrl: string;
  serviceId: string;
  merchantWallet: string;
  webhookUrl?: string;
  webhookSecret: string;
  minimumAmount: number;
  settlementSchedule: string;
}

interface SettlementResponse {
  settlementId: string;
  amount: number;
  transactionSignature: string;
  status: string;
  timestamp: string;
}

export class SettlementIntegration {
  private config: SettlementConfig;
  private pendingTransactions: Map<string, PaymentReceipt> = new Map();
  private lastSettlementAt: Date | null = null;

  constructor(config: SettlementConfig) {
    this.config = config;
    this.startDailySettlementCheck();
  }

  async handlePaymentVerified(receipt: PaymentReceipt): Promise<void> {
    this.pendingTransactions.set(receipt.signature, receipt);

    await this.recordTransaction(receipt);

    const pendingAmount = this.calculatePendingAmount();

    if (pendingAmount >= this.config.minimumAmount || this.shouldSettleDaily()) {
      await this.requestSettlement();
    }
  }

  private async recordTransaction(receipt: PaymentReceipt): Promise<void> {
    try {
      const response = await fetch(
        `${this.config.facilitatorUrl}/api/transactions/record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            signature: receipt.signature,
            amount: receipt.amount.toString(),
            token: receipt.token,
            senderAddress: receipt.sender,
            recipientAddress: this.config.merchantWallet,
            serviceId: this.config.serviceId,
            status: 'confirmed',
            timestamp: receipt.timestamp
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to record transaction: ${response.statusText}`);
      }
    } catch (error) {
      throw error;
    }
  }

  async requestSettlement(): Promise<SettlementResponse> {
    const transactions = Array.from(this.pendingTransactions.keys());

    if (transactions.length === 0) {
      throw new Error('No pending transactions to settle');
    }

    try {
      const response = await fetch(
        `${this.config.facilitatorUrl}/api/settlement/request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            merchantWallet: this.config.merchantWallet,
            serviceId: this.config.serviceId,
            settlementType: 'automatic'
          })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Settlement request failed');
      }

      const settlement: SettlementResponse = await response.json();

      this.pendingTransactions.clear();
      this.lastSettlementAt = new Date();

      return settlement;
    } catch (error) {
      throw error;
    }
  }

  async handleSettlementWebhook(payload: any, signature: string): Promise<boolean> {
    if (!this.verifyWebhookSignature(payload, signature)) {
      return false;
    }

    if (payload.event === 'settlement.completed') {
      return true;
    }

    return false;
  }

  private verifyWebhookSignature(payload: any, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch {
      return false;
    }
  }

  private calculatePendingAmount(): number {
    return Array.from(this.pendingTransactions.values()).reduce(
      (sum, tx) => sum + tx.amount,
      0
    );
  }

  private shouldSettleDaily(): boolean {
    if (!this.lastSettlementAt) {
      return true;
    }

    const hoursSinceLastSettlement =
      (Date.now() - this.lastSettlementAt.getTime()) / (1000 * 60 * 60);

    return hoursSinceLastSettlement >= 24;
  }

  private startDailySettlementCheck(): void {
    setInterval(
      () => {
        if (this.shouldSettleDaily() && this.pendingTransactions.size > 0) {
          this.requestSettlement().catch(() => {});
        }
      },
      60 * 60 * 1000
    );
  }

  async getPendingAmount(): Promise<number> {
    try {
      const response = await fetch(
        `${this.config.facilitatorUrl}/api/settlement/pending?merchantWallet=${this.config.merchantWallet}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pending amount');
      }

      const data = await response.json();
      return data.merchantAmount || 0;
    } catch (error) {
      return 0;
    }
  }

  async getSettlementHistory(limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.config.facilitatorUrl}/api/settlement/history?merchantWallet=${this.config.merchantWallet}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch settlement history');
      }

      const data = await response.json();
      return data.settlements || [];
    } catch (error) {
      return [];
    }
  }

  getPendingTransactionCount(): number {
    return this.pendingTransactions.size;
  }

  getLastSettlementTime(): Date | null {
    return this.lastSettlementAt;
  }
}
