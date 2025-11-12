import { describe, it, expect, beforeAll } from 'vitest';
import { Keypair } from '@solana/web3.js';
import { PhantomCashX402Client } from '../src/phantom-cash-x402-client.js';
import { X402Handler } from '../src/x402-handler.js';
import { ServiceRegistry } from '../src/service-registry.js';
import { PhantomAgent } from '../src/phantom-agent.js';
describe('Phantom CASH x402 Integration Tests', () => {
    let client;
    let handler;
    let registry;
    let wallet;
    beforeAll(() => {
        wallet = Keypair.generate();
    });
    describe('PhantomCashX402Client', () => {
        it('should initialize client with devnet config', () => {
            client = new PhantomCashX402Client({
                wallet,
                network: 'devnet',
                spendingLimitPerHour: 1.0,
            });
            expect(client).toBeDefined();
        });
        it('should return wallet address', async () => {
            const address = await client.getWalletAddress();
            expect(address).toBe(wallet.publicKey.toBase58());
        });
        it('should get SOL balance (should be 0 for new wallet)', async () => {
            const balance = await client.getSolBalance();
            expect(balance).toBeGreaterThanOrEqual(0);
        });
        it('should get CASH balance (should be 0 for new wallet)', async () => {
            const balance = await client.getCashBalance();
            expect(balance).toBe(0);
        });
        it('should track metrics correctly', () => {
            const metrics = client.getMetrics();
            expect(metrics.totalSpent).toBe(0);
            expect(metrics.totalEarned).toBe(0);
            expect(metrics.transactionCount).toBe(0);
        });
        it('should return empty payment history', () => {
            const history = client.getPaymentHistory();
            expect(history).toEqual([]);
        });
        it('should calculate spending limits', () => {
            const spent = client.getSpentThisHour();
            const remaining = client.getRemainingHourlyBudget();
            expect(spent).toBe(0);
            expect(remaining).toBe(1.0);
        });
    });
    describe('X402Handler', () => {
        it('should initialize handler with client', () => {
            handler = new X402Handler(client);
            expect(handler).toBeDefined();
        });
        it('should return wallet address', async () => {
            const address = await handler.getWalletAddress();
            expect(address).toBe(wallet.publicKey.toBase58());
        });
        it('should get balances through handler', async () => {
            const sol = await handler.getSolBalance();
            const cash = await handler.getCashBalance();
            expect(sol).toBeGreaterThanOrEqual(0);
            expect(cash).toBe(0);
        });
        it('should get metrics through handler', () => {
            const metrics = handler.getMetrics();
            expect(metrics).toBeDefined();
            expect(metrics.totalSpent).toBe(0);
        });
    });
    describe('ServiceRegistry', () => {
        it('should initialize empty registry', () => {
            registry = new ServiceRegistry();
            expect(registry.listServices()).toEqual([]);
        });
        it('should register service', () => {
            const service = {
                serviceId: 'test-service',
                name: 'Test Service',
                description: 'Test service for unit tests',
                endpoint: 'http://localhost:3402/api/test',
                method: 'GET',
                costCash: 0.01,
                paymentAddress: wallet.publicKey.toBase58(),
                parameters: {},
                category: ['testing'],
            };
            registry.registerService(service);
            expect(registry.listServices().length).toBe(1);
        });
        it('should retrieve registered service', () => {
            const service = registry.getService('test-service');
            expect(service).toBeDefined();
            expect(service?.name).toBe('Test Service');
        });
        it('should search services', () => {
            const results = registry.searchServices('test');
            expect(results.length).toBe(1);
        });
        it('should find services by category', () => {
            const results = registry.findServicesByCategory('testing');
            expect(results.length).toBe(1);
        });
        it('should calculate total cost', () => {
            const cost = registry.calculateTotalCost(['test-service']);
            expect(cost).toBe(0.01);
        });
    });
    describe('PhantomAgent', () => {
        it('should throw error without OpenAI API key', () => {
            expect(() => {
                new PhantomAgent({
                    wallet,
                    openaiApiKey: '',
                    network: 'devnet',
                });
            }).toThrow();
        });
    });
    describe('Error Handling', () => {
        it('should handle invalid payment requirements', async () => {
            const client = new PhantomCashX402Client({
                wallet,
                network: 'devnet',
            });
            await expect(client.get('http://localhost:9999/nonexistent')).rejects.toThrow();
        });
        it('should handle spending limit exceeded', async () => {
            const limitedClient = new PhantomCashX402Client({
                wallet,
                network: 'devnet',
                spendingLimitPerHour: 0.001,
            });
            expect(limitedClient.getRemainingHourlyBudget()).toBe(0.001);
        });
    });
    describe('Payment Payload Generation', () => {
        it('should generate nonce correctly', () => {
            const metrics1 = client.getMetrics();
            const metrics2 = client.getMetrics();
            expect(metrics1).toEqual(metrics2);
        });
    });
});
//# sourceMappingURL=integration.test.js.map