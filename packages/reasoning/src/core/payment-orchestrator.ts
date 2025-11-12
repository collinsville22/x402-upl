import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import { ExecutionStep } from '../types/workflow.js';
import { EscrowWalletManager } from './escrow-wallet.js';

export interface PaymentConfig {
  network: 'mainnet-beta' | 'devnet' | 'testnet';
  rpcUrl: string;
  escrowManager: EscrowWalletManager;
  userId: string;
}

export interface PaymentRequirement {
  scheme: string;
  network: string;
  asset: string;
  payTo: string;
  amount: string;
  timeout: number;
  nonce: string;
}

export interface PaymentResult {
  success: boolean;
  signature?: string;
  cost: number;
  error?: string;
}

export class PaymentOrchestrator {
  private connection: Connection;
  private escrowManager: EscrowWalletManager;
  private userId: string;
  private network: string;

  constructor(config: PaymentConfig) {
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.escrowManager = config.escrowManager;
    this.userId = config.userId;
    this.network = config.network;
  }

  async executeServiceCall(
    serviceUrl: string,
    params: Record<string, unknown>,
    step: ExecutionStep
  ): Promise<{ output: unknown; payment: PaymentResult }> {
    try {
      const response = await axios.post(serviceUrl, params, {
        headers: {
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status === 200 || status === 402,
      });

      if (response.status === 402) {
        const paymentRequirements: PaymentRequirement = response.data;
        const paymentResult = await this.handlePayment(
          paymentRequirements,
          serviceUrl,
          params
        );

        if (!paymentResult.success) {
          throw new Error(`Payment failed: ${paymentResult.error}`);
        }

        return {
          output: paymentResult,
          payment: paymentResult,
        };
      }

      return {
        output: response.data,
        payment: {
          success: true,
          cost: 0,
        },
      };
    } catch (error) {
      throw new Error(
        `Service call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async handlePayment(
    requirements: PaymentRequirement,
    serviceUrl: string,
    params: Record<string, unknown>
  ): Promise<PaymentResult> {
    try {
      const amount = parseFloat(requirements.amount);
      const recipientPubkey = new PublicKey(requirements.payTo);

      const balance = await this.escrowManager.getBalance(this.userId);

      if (balance < amount) {
        throw new Error(
          `Insufficient escrow balance. Available: ${balance}, Required: ${amount}. Please top up your account.`
        );
      }

      const mint = requirements.asset === 'SOL' ? undefined : new PublicKey(requirements.asset);

      const signature = await this.escrowManager.executePayment(
        this.userId,
        recipientPubkey,
        amount,
        mint
      );

      const paymentPayload = {
        network: this.network,
        asset: requirements.asset,
        from: this.escrowManager.getEscrowPublicKey().toBase58(),
        to: requirements.payTo,
        amount: requirements.amount,
        signature,
        timestamp: Date.now(),
        nonce: requirements.nonce,
      };

      const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

      const retryResponse = await axios.post(serviceUrl, params, {
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': paymentHeader,
        },
      });

      return {
        success: true,
        signature,
        cost: amount,
      };
    } catch (error) {
      return {
        success: false,
        cost: 0,
        error: error instanceof Error ? error.message : 'Unknown payment error',
      };
    }
  }

  async getBalance(): Promise<number> {
    return await this.escrowManager.getBalance(this.userId);
  }

  async estimateCost(steps: ExecutionStep[]): Promise<number> {
    return steps.reduce((total, step) => total + step.estimatedCost, 0);
  }
}
