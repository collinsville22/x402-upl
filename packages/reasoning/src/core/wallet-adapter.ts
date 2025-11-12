import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { SystemProgram } from '@solana/web3.js';

export interface WalletAdapter {
  publicKey: PublicKey;
  signTransaction(transaction: Transaction): Promise<Transaction>;
  signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

export interface PaymentApproval {
  maxTotalAmount: number;
  maxPerTransaction: number;
  allowedRecipients?: string[];
  expiresAt: number;
}

export class SessionWallet {
  private connection: Connection;
  private adapter: WalletAdapter;
  private approval: PaymentApproval;
  private spent: number = 0;
  private pendingTransactions: Map<string, Transaction> = new Map();

  constructor(
    connection: Connection,
    adapter: WalletAdapter,
    approval: PaymentApproval
  ) {
    this.connection = connection;
    this.adapter = adapter;
    this.approval = approval;
  }

  async createPaymentTransaction(
    recipient: PublicKey,
    amount: number,
    mint?: PublicKey
  ): Promise<{ transaction: Transaction; requiresApproval: boolean }> {
    if (Date.now() > this.approval.expiresAt) {
      throw new Error('Payment approval expired');
    }

    if (this.spent + amount > this.approval.maxTotalAmount) {
      throw new Error(
        `Total spending limit exceeded. Spent: ${this.spent}, Requested: ${amount}, Limit: ${this.approval.maxTotalAmount}`
      );
    }

    if (amount > this.approval.maxPerTransaction) {
      throw new Error(
        `Per-transaction limit exceeded. Requested: ${amount}, Limit: ${this.approval.maxPerTransaction}`
      );
    }

    if (this.approval.allowedRecipients) {
      const recipientStr = recipient.toBase58();
      if (!this.approval.allowedRecipients.includes(recipientStr)) {
        throw new Error(`Recipient ${recipientStr} not in allowed list`);
      }
    }

    const transaction = new Transaction();
    const { blockhash } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.adapter.publicKey;

    if (!mint) {
      const lamports = Math.floor(amount * 1_000_000_000);
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: this.adapter.publicKey,
          toPubkey: recipient,
          lamports,
        })
      );
    } else {
      const fromTokenAccount = await getAssociatedTokenAddress(
        mint,
        this.adapter.publicKey,
        false,
        TOKEN_PROGRAM_ID
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        mint,
        recipient,
        false,
        TOKEN_PROGRAM_ID
      );

      const mintInfo = await this.connection.getParsedAccountInfo(mint);
      const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 6;
      const adjustedAmount = Math.floor(amount * Math.pow(10, decimals));

      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          this.adapter.publicKey,
          adjustedAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
    }

    return {
      transaction,
      requiresApproval: false,
    };
  }

  async executePayment(
    recipient: PublicKey,
    amount: number,
    mint?: PublicKey
  ): Promise<string> {
    const { transaction } = await this.createPaymentTransaction(recipient, amount, mint);

    const signed = await this.adapter.signTransaction(transaction);

    const signature = await this.connection.sendRawTransaction(signed.serialize());

    await this.connection.confirmTransaction(signature, 'confirmed');

    this.spent += amount;

    return signature;
  }

  async batchPayments(
    payments: Array<{ recipient: PublicKey; amount: number; mint?: PublicKey }>
  ): Promise<string[]> {
    const transactions: Transaction[] = [];

    for (const payment of payments) {
      const { transaction } = await this.createPaymentTransaction(
        payment.recipient,
        payment.amount,
        payment.mint
      );
      transactions.push(transaction);
    }

    const signed = await this.adapter.signAllTransactions(transactions);

    const signatures: string[] = [];
    for (const tx of signed) {
      const sig = await this.connection.sendRawTransaction(tx.serialize());
      signatures.push(sig);
    }

    await Promise.all(
      signatures.map((sig) => this.connection.confirmTransaction(sig, 'confirmed'))
    );

    const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
    this.spent += totalSpent;

    return signatures;
  }

  getRemainingBudget(): number {
    return this.approval.maxTotalAmount - this.spent;
  }

  getSpent(): number {
    return this.spent;
  }

  isExpired(): boolean {
    return Date.now() > this.approval.expiresAt;
  }

  getApproval(): PaymentApproval {
    return { ...this.approval };
  }

  getPublicKey(): PublicKey {
    return this.adapter.publicKey;
  }
}

export interface BrowserWalletAdapter extends WalletAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  connected: boolean;
}

export function createPhantomAdapter(): BrowserWalletAdapter | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const provider = (window as any).phantom?.solana;

  if (!provider) {
    return null;
  }

  return {
    get publicKey() {
      return provider.publicKey;
    },
    get connected() {
      return provider.isConnected;
    },
    async connect() {
      await provider.connect();
    },
    async disconnect() {
      await provider.disconnect();
    },
    async signTransaction(transaction: Transaction) {
      return await provider.signTransaction(transaction);
    },
    async signAllTransactions(transactions: Transaction[]) {
      return await provider.signAllTransactions(transactions);
    },
    async signMessage(message: Uint8Array) {
      return await provider.signMessage(message);
    },
  };
}

export function createSolflareAdapter(): BrowserWalletAdapter | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const provider = (window as any).solflare;

  if (!provider) {
    return null;
  }

  return {
    get publicKey() {
      return provider.publicKey;
    },
    get connected() {
      return provider.isConnected;
    },
    async connect() {
      await provider.connect();
    },
    async disconnect() {
      await provider.disconnect();
    },
    async signTransaction(transaction: Transaction) {
      return await provider.signTransaction(transaction);
    },
    async signAllTransactions(transactions: Transaction[]) {
      return await provider.signAllTransactions(transactions);
    },
    async signMessage(message: Uint8Array) {
      return await provider.signMessage(message);
    },
  };
}
