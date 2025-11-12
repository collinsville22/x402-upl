import { Coinbase, Wallet as CDPWallet } from '@coinbase/coinbase-sdk';
import { PublicKey } from '@solana/web3.js';

export interface WalletPolicy {
  maxTransactionAmount: number;
  maxDailySpend: number;
  maxHourlySpend: number;
  allowedContracts?: string[];
  allowedTokens?: string[];
  requireUserApproval?: (amount: number) => boolean;
}

export interface AgentWallet {
  id: string;
  address: string;
  network: 'solana-mainnet' | 'solana-devnet';
  policies: WalletPolicy;
  created: Date;
}

export class CDPWalletManager {
  private coinbase: Coinbase;
  private wallets: Map<string, CDPWallet>;
  private spendingTracker: Map<string, SpendingRecord>;

  constructor(apiKeyName: string, privateKey: string) {
    Coinbase.configure({
      apiKeyName,
      privateKey,
    });

    this.coinbase = Coinbase;
    this.wallets = new Map();
    this.spendingTracker = new Map();
  }

  async createWallet(
    network: 'solana-mainnet' | 'solana-devnet',
    policies: WalletPolicy
  ): Promise<AgentWallet> {
    const networkId = network === 'solana-mainnet' ? 'solana-mainnet' : 'solana-devnet';

    const wallet = await CDPWallet.create({
      networkId,
    });

    const defaultAddress = await wallet.getDefaultAddress();

    if (!defaultAddress) {
      throw new Error('Failed to get wallet address');
    }

    const address = defaultAddress.getId();

    const agentWallet: AgentWallet = {
      id: wallet.getId() || '',
      address,
      network,
      policies,
      created: new Date(),
    };

    this.wallets.set(agentWallet.id, wallet);

    this.spendingTracker.set(agentWallet.id, {
      hourlySpend: 0,
      dailySpend: 0,
      lastHourReset: Date.now(),
      lastDayReset: Date.now(),
    });

    return agentWallet;
  }

  async getWallet(walletId: string): Promise<AgentWallet | null> {
    const wallet = this.wallets.get(walletId);

    if (!wallet) {
      return null;
    }

    const defaultAddress = await wallet.getDefaultAddress();

    if (!defaultAddress) {
      return null;
    }

    return {
      id: wallet.getId() || '',
      address: defaultAddress.getId(),
      network: 'solana-devnet',
      policies: {
        maxTransactionAmount: 100,
        maxDailySpend: 500,
        maxHourlySpend: 100,
      },
      created: new Date(),
    };
  }

  async checkSpendingLimit(
    walletId: string,
    amount: number,
    policies: WalletPolicy
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (amount > policies.maxTransactionAmount) {
      return {
        allowed: false,
        reason: `Amount exceeds max transaction limit of ${policies.maxTransactionAmount}`,
      };
    }

    const spending = this.spendingTracker.get(walletId);

    if (!spending) {
      return { allowed: true };
    }

    const now = Date.now();
    const hourElapsed = now - spending.lastHourReset;
    const dayElapsed = now - spending.lastDayReset;

    if (hourElapsed >= 3600000) {
      spending.hourlySpend = 0;
      spending.lastHourReset = now;
    }

    if (dayElapsed >= 86400000) {
      spending.dailySpend = 0;
      spending.lastDayReset = now;
    }

    if (spending.hourlySpend + amount > policies.maxHourlySpend) {
      return {
        allowed: false,
        reason: `Hourly spending limit of ${policies.maxHourlySpend} would be exceeded`,
      };
    }

    if (spending.dailySpend + amount > policies.maxDailySpend) {
      return {
        allowed: false,
        reason: `Daily spending limit of ${policies.maxDailySpend} would be exceeded`,
      };
    }

    return { allowed: true };
  }

  async executeTransfer(
    walletId: string,
    to: string,
    amount: number,
    token: string,
    policies: WalletPolicy
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const limitCheck = await this.checkSpendingLimit(walletId, amount, policies);

      if (!limitCheck.allowed) {
        return {
          success: false,
          error: limitCheck.reason,
        };
      }

      if (policies.requireUserApproval && policies.requireUserApproval(amount)) {
        return {
          success: false,
          error: 'Transaction requires user approval',
        };
      }

      const wallet = this.wallets.get(walletId);

      if (!wallet) {
        return {
          success: false,
          error: 'Wallet not found',
        };
      }

      const transfer = await wallet.createTransfer({
        amount: amount.toString(),
        assetId: token,
        destination: to,
      });

      await transfer.wait();

      const spending = this.spendingTracker.get(walletId);
      if (spending) {
        spending.hourlySpend += amount;
        spending.dailySpend += amount;
      }

      return {
        success: true,
        transactionId: transfer.getTransactionHash() || undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getBalance(walletId: string, token?: string): Promise<number> {
    const wallet = this.wallets.get(walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const balances = await wallet.listBalances();

    if (!token) {
      return 0;
    }

    const balance = balances.get(token);

    if (!balance) {
      return 0;
    }

    return parseFloat(balance.toString());
  }

  async pauseWallet(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }
  }

  async resumeWallet(walletId: string): Promise<void> {
    const wallet = this.wallets.get(walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }
  }

  async sweepToUser(walletId: string, userAddress: string): Promise<void> {
    const wallet = this.wallets.get(walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const balances = await wallet.listBalances();

    for (const [assetId, balance] of balances.entries()) {
      if (parseFloat(balance.toString()) > 0) {
        await wallet.createTransfer({
          amount: balance.toString(),
          assetId,
          destination: userAddress,
        });
      }
    }
  }

  async getTransactionHistory(walletId: string, limit: number = 100): Promise<any[]> {
    const wallet = this.wallets.get(walletId);

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    return [];
  }
}

interface SpendingRecord {
  hourlySpend: number;
  dailySpend: number;
  lastHourReset: number;
  lastDayReset: number;
}
