import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
  getAccount,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';

export const CASH_MINT = new PublicKey('CASHx9KJUStyftLFWGvEVf59SGeG9sh5FfcnZMVPCASH');
export const CASH_DECIMALS = 6;

export interface CashAccount {
  address: string;
  balance: number;
}

export interface TransferResult {
  signature: string;
  amount: number;
  recipient: string;
}

export class PhantomCashClient {
  private connection: Connection;
  private wallet: Keypair;
  private network: 'devnet' | 'mainnet-beta';

  constructor(
    wallet: Keypair,
    network: 'devnet' | 'mainnet-beta' = 'mainnet-beta'
  ) {
    this.wallet = wallet;
    this.network = network;

    const rpcUrl = network === 'mainnet-beta'
      ? 'https://api.mainnet-beta.solana.com'
      : 'https://api.devnet.solana.com';

    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async getWalletAddress(): Promise<string> {
    return this.wallet.publicKey.toBase58();
  }

  async getSolBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }

  async getCashBalance(): Promise<number> {
    try {
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        this.wallet,
        CASH_MINT,
        this.wallet.publicKey,
        false,
        'confirmed',
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      const accountInfo = await getAccount(
        this.connection,
        tokenAccount.address,
        'confirmed',
        TOKEN_2022_PROGRAM_ID
      );

      return Number(accountInfo.amount) / Math.pow(10, CASH_DECIMALS);
    } catch (error) {
      return 0;
    }
  }

  async sendCash(
    recipientAddress: string,
    amount: number,
    memo?: string
  ): Promise<TransferResult> {
    const recipient = new PublicKey(recipientAddress);

    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.wallet,
      CASH_MINT,
      this.wallet.publicKey,
      false,
      'confirmed',
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      this.wallet,
      CASH_MINT,
      recipient,
      false,
      'confirmed',
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    const transferAmount = Math.floor(amount * Math.pow(10, CASH_DECIMALS));

    const transaction = new Transaction().add(
      createTransferInstruction(
        sourceTokenAccount.address,
        destinationTokenAccount.address,
        this.wallet.publicKey,
        transferAmount,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.wallet],
      { commitment: 'confirmed' }
    );

    return {
      signature,
      amount,
      recipient: recipientAddress,
    };
  }

  async verifyTransaction(signature: string): Promise<boolean> {
    try {
      const tx = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      });

      return tx !== null && !tx.meta?.err;
    } catch (error) {
      return false;
    }
  }

  async getTransactionDetails(signature: string) {
    return await this.connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
  }

  async requestAirdrop(lamports: number = LAMPORTS_PER_SOL): Promise<string> {
    if (this.network !== 'devnet') {
      throw new Error('Airdrop only available on devnet');
    }

    const signature = await this.connection.requestAirdrop(
      this.wallet.publicKey,
      lamports
    );

    await this.connection.confirmTransaction(signature);
    return signature;
  }
}
