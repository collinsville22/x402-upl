import { PrismaClient, MultiSigTxStatus } from '@prisma/client';
import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';

const prisma = new PrismaClient();

export interface CreateMultiSigWalletInput {
  signers: string[];
  threshold: number;
  agentIds: string[];
}

export interface CreateTransactionInput {
  walletId: string;
  initiatorId: string;
  recipient: string;
  amount: number;
  memo?: string;
}

export interface SignTransactionInput {
  transactionId: string;
  signerId: string;
  signature: string;
  publicKey: string;
}

export class MultiSigWalletService {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  async createWallet(input: CreateMultiSigWalletInput): Promise<string> {
    if (input.threshold < 1 || input.threshold > input.signers.length) {
      throw new Error('Invalid threshold');
    }

    if (input.signers.length < 2) {
      throw new Error('Multi-sig requires at least 2 signers');
    }

    if (new Set(input.signers).size !== input.signers.length) {
      throw new Error('Duplicate signers not allowed');
    }

    for (const agentId of input.agentIds) {
      const agent = await prisma.agent.findUnique({
        where: { id: agentId },
      });

      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
    }

    const walletKeypair = Keypair.generate();
    const address = walletKeypair.publicKey.toBase58();

    const wallet = await prisma.multiSigWallet.create({
      data: {
        address,
        threshold: input.threshold,
        signers: input.signers,
        agentIds: input.agentIds,
      },
    });

    return wallet.id;
  }

  async createTransaction(input: CreateTransactionInput): Promise<string> {
    const wallet = await prisma.multiSigWallet.findUnique({
      where: { id: input.walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.agentIds.includes(input.initiatorId)) {
      throw new Error('Initiator not authorized');
    }

    const fromPubkey = new PublicKey(wallet.address);
    const toPubkey = new PublicKey(input.recipient);
    const lamports = Math.floor(input.amount * 1_000_000_000);

    const { blockhash } = await this.connection.getLatestBlockhash();

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports,
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = fromPubkey;

    const serializedTx = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    }).toString('base64');

    const txRecord = await prisma.multiSigTransaction.create({
      data: {
        walletId: input.walletId,
        transactionData: serializedTx,
        signaturesRequired: wallet.threshold,
        status: MultiSigTxStatus.PENDING,
      },
    });

    await prisma.multiSigWallet.update({
      where: { id: input.walletId },
      data: {
        pendingTransactions: { increment: 1 },
      },
    });

    return txRecord.id;
  }

  async signTransaction(input: SignTransactionInput): Promise<{ status: MultiSigTxStatus; signaturesCount: number }> {
    const transaction = await prisma.multiSigTransaction.findUnique({
      where: { id: input.transactionId },
      include: { wallet: true },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.status !== MultiSigTxStatus.PENDING && transaction.status !== MultiSigTxStatus.PARTIALLY_SIGNED) {
      throw new Error('Transaction not available for signing');
    }

    const wallet = transaction.wallet;

    if (!wallet.agentIds.includes(input.signerId)) {
      throw new Error('Signer not authorized');
    }

    const signerWalletAddress = await this.getAgentWalletAddress(input.signerId);

    if (!wallet.signers.includes(signerWalletAddress)) {
      throw new Error('Signer wallet not in authorized signers list');
    }

    if (transaction.signatures.includes(input.signature)) {
      throw new Error('Signature already provided');
    }

    const txData = Buffer.from(transaction.transactionData, 'base64');
    const txHash = sha256(txData);

    const isValid = await this.verifySignature(
      Buffer.from(txHash).toString('hex'),
      input.signature,
      input.publicKey
    );

    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const updatedSignatures = [...transaction.signatures, input.signature];

    let newStatus = transaction.status;

    if (updatedSignatures.length >= transaction.signaturesRequired) {
      newStatus = MultiSigTxStatus.READY;
    } else {
      newStatus = MultiSigTxStatus.PARTIALLY_SIGNED;
    }

    await prisma.multiSigTransaction.update({
      where: { id: input.transactionId },
      data: {
        signatures: updatedSignatures,
        status: newStatus,
      },
    });

    if (newStatus === MultiSigTxStatus.READY) {
      await this.executeTransaction(input.transactionId);
    }

    return {
      status: newStatus,
      signaturesCount: updatedSignatures.length,
    };
  }

  private async verifySignature(message: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      const messageHash = sha256(Buffer.from(message, 'hex'));
      const signatureBytes = Buffer.from(signature, 'base64');
      const publicKeyBytes = Buffer.from(publicKey, 'hex');

      const sig = secp256k1.Signature.fromCompact(signatureBytes);
      return secp256k1.verify(sig, messageHash, publicKeyBytes);
    } catch (error) {
      return false;
    }
  }

  private async executeTransaction(transactionId: string) {
    const txRecord = await prisma.multiSigTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!txRecord || txRecord.status !== MultiSigTxStatus.READY) {
      return;
    }

    try {
      const txData = Buffer.from(txRecord.transactionData, 'base64');
      const transaction = Transaction.from(txData);

      const txSignature = await this.connection.sendRawTransaction(txData, {
        skipPreflight: false,
        maxRetries: 3,
      });

      const latestBlockhash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction({
        signature: txSignature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      await prisma.multiSigTransaction.update({
        where: { id: transactionId },
        data: {
          status: MultiSigTxStatus.EXECUTED,
          executedAt: new Date(),
          txSignature,
        },
      });

      await prisma.multiSigWallet.update({
        where: { id: txRecord.walletId },
        data: {
          pendingTransactions: { decrement: 1 },
          totalTransactions: { increment: 1 },
        },
      });
    } catch (error) {
      console.error('Failed to execute transaction:', error);

      await prisma.multiSigTransaction.update({
        where: { id: transactionId },
        data: {
          status: MultiSigTxStatus.CANCELLED,
        },
      });

      await prisma.multiSigWallet.update({
        where: { id: txRecord.walletId },
        data: {
          pendingTransactions: { decrement: 1 },
        },
      });
    }
  }

  async cancelTransaction(transactionId: string, cancelerId: string): Promise<void> {
    const txRecord = await prisma.multiSigTransaction.findUnique({
      where: { id: transactionId },
      include: { wallet: true },
    });

    if (!txRecord) {
      throw new Error('Transaction not found');
    }

    if (txRecord.status === MultiSigTxStatus.EXECUTED || txRecord.status === MultiSigTxStatus.CANCELLED) {
      throw new Error('Transaction already finalized');
    }

    if (!txRecord.wallet.agentIds.includes(cancelerId)) {
      throw new Error('Not authorized to cancel');
    }

    await prisma.multiSigTransaction.update({
      where: { id: transactionId },
      data: {
        status: MultiSigTxStatus.CANCELLED,
      },
    });

    await prisma.multiSigWallet.update({
      where: { id: txRecord.walletId },
      data: {
        pendingTransactions: { decrement: 1 },
      },
    });
  }

  async getWalletBalance(walletId: string): Promise<number> {
    const wallet = await prisma.multiSigWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    const balance = await this.connection.getBalance(new PublicKey(wallet.address));
    return balance / 1_000_000_000;
  }

  async getPendingTransactions(walletId: string) {
    return await prisma.multiSigTransaction.findMany({
      where: {
        walletId,
        status: {
          in: [MultiSigTxStatus.PENDING, MultiSigTxStatus.PARTIALLY_SIGNED, MultiSigTxStatus.READY],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTransactionDetails(transactionId: string) {
    const transaction = await prisma.multiSigTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: true,
      },
    });

    if (!transaction) {
      throw new Error('Transaction not found');
    }

    const txData = Buffer.from(transaction.transactionData, 'base64');
    const tx = Transaction.from(txData);

    let recipientAddress = '';
    let amount = 0;

    if (tx.instructions.length > 0) {
      const instruction = tx.instructions[0];

      if (instruction.programId.equals(SystemProgram.programId)) {
        const keys = instruction.keys;
        if (keys.length >= 2) {
          recipientAddress = keys[1].pubkey.toBase58();
        }

        if (instruction.data.length >= 12) {
          const dataView = new DataView(instruction.data.buffer, instruction.data.byteOffset);
          amount = Number(dataView.getBigUint64(4, true)) / 1_000_000_000;
        }
      }
    }

    return {
      ...transaction,
      decoded: {
        recipient: recipientAddress,
        amount,
        signaturesRequired: transaction.signaturesRequired,
        signaturesProvided: transaction.signatures.length,
        signers: transaction.wallet.signers,
      },
    };
  }

  private async getAgentWalletAddress(agentId: string): Promise<string> {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    return agent.walletAddress;
  }

  async addSigner(walletId: string, newSigner: string, agentId: string, requesterId: string): Promise<void> {
    const wallet = await prisma.multiSigWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.agentIds.includes(requesterId)) {
      throw new Error('Not authorized');
    }

    if (wallet.signers.includes(newSigner)) {
      throw new Error('Signer already exists');
    }

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    await prisma.multiSigWallet.update({
      where: { id: walletId },
      data: {
        signers: [...wallet.signers, newSigner],
        agentIds: [...wallet.agentIds, agentId],
      },
    });
  }

  async removeSigner(walletId: string, signerToRemove: string, requesterId: string): Promise<void> {
    const wallet = await prisma.multiSigWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.agentIds.includes(requesterId)) {
      throw new Error('Not authorized');
    }

    if (!wallet.signers.includes(signerToRemove)) {
      throw new Error('Signer not found');
    }

    const newSigners = wallet.signers.filter(s => s !== signerToRemove);

    if (newSigners.length < 2) {
      throw new Error('Cannot remove signer: minimum 2 signers required');
    }

    if (wallet.threshold > newSigners.length) {
      throw new Error('Cannot remove signer: threshold would exceed total signers');
    }

    await prisma.multiSigWallet.update({
      where: { id: walletId },
      data: {
        signers: newSigners,
      },
    });
  }

  async updateThreshold(walletId: string, newThreshold: number, requesterId: string): Promise<void> {
    const wallet = await prisma.multiSigWallet.findUnique({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }

    if (!wallet.agentIds.includes(requesterId)) {
      throw new Error('Not authorized');
    }

    if (newThreshold < 1 || newThreshold > wallet.signers.length) {
      throw new Error('Invalid threshold');
    }

    await prisma.multiSigWallet.update({
      where: { id: walletId },
      data: {
        threshold: newThreshold,
      },
    });
  }
}
