import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CDPSolanaClient } from '../cdp-client.js';

describe('CDPSolanaClient', () => {
  let client: CDPSolanaClient;
  let testAccount: { accountId: string; address: string; created: Date };

  beforeAll(async () => {
    client = new CDPSolanaClient('devnet');
  });

  afterAll(async () => {
    await client.close();
  });

  it('should create a Solana account', async () => {
    testAccount = await client.createAccount();

    expect(testAccount).toBeDefined();
    expect(testAccount.address).toBeTruthy();
    expect(testAccount.accountId).toBeTruthy();
    expect(testAccount.created).toBeInstanceOf(Date);
  }, 30000);

  it('should request faucet funds', async () => {
    await client.requestFaucet(testAccount.address);

    const balance = await client.waitForBalance(testAccount.address);
    expect(balance).toBeGreaterThan(0);
  }, 60000);

  it('should get account balance', async () => {
    const balance = await client.getBalance(testAccount.address);
    expect(balance).toBeGreaterThan(0);
  }, 10000);

  it('should send transaction', async () => {
    const recipientAddress = 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo';
    const lamports = 1000;

    const result = await client.sendTransaction(
      testAccount.address,
      recipientAddress,
      lamports
    );

    expect(result.signature).toBeTruthy();
    expect(result.confirmed).toBe(true);
  }, 30000);

  it('should verify transaction', async () => {
    const recipientAddress = 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo';
    const lamports = 500;

    const result = await client.sendTransaction(
      testAccount.address,
      recipientAddress,
      lamports
    );

    const verified = await client.verifyTransaction(result.signature);
    expect(verified).toBe(true);
  }, 30000);

  it('should get transaction details', async () => {
    const recipientAddress = 'EeVPcnRE1mhcY85wAh3uPJG1uFiTNya9dCJjNUPABXzo';
    const lamports = 300;

    const result = await client.sendTransaction(
      testAccount.address,
      recipientAddress,
      lamports
    );

    const details = await client.getTransactionDetails(result.signature);
    expect(details).toBeDefined();
    expect(details?.meta?.err).toBeNull();
  }, 30000);
});
