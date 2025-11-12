"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const export_1 = require("../export");
describe('Export Utilities', () => {
    beforeEach(() => {
        global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
        global.URL.revokeObjectURL = jest.fn();
        document.body.appendChild = jest.fn();
        document.body.removeChild = jest.fn();
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('exportToCSV', () => {
        it('should generate CSV string with headers and data', () => {
            const data = [
                { id: '1', name: 'Test', amount: 100 },
                { id: '2', name: 'Test 2', amount: 200 },
            ];
            const createElementSpy = jest.spyOn(document, 'createElement');
            (0, export_1.exportToCSV)(data, 'test.csv');
            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });
        it('should escape quotes in CSV values', () => {
            const data = [{ name: 'Test "quoted" value' }];
            const createElementSpy = jest.spyOn(document, 'createElement');
            (0, export_1.exportToCSV)(data, 'test.csv');
            expect(createElementSpy).toHaveBeenCalled();
        });
        it('should throw error for empty data', () => {
            expect(() => (0, export_1.exportToCSV)([], 'test.csv')).toThrow('No data to export');
        });
    });
    describe('exportToJSON', () => {
        it('should generate JSON string with proper formatting', () => {
            const data = [
                { id: '1', name: 'Test' },
                { id: '2', name: 'Test 2' },
            ];
            const createElementSpy = jest.spyOn(document, 'createElement');
            (0, export_1.exportToJSON)(data, 'test.json');
            expect(createElementSpy).toHaveBeenCalledWith('a');
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });
        it('should handle nested objects', () => {
            const data = [{ id: '1', nested: { key: 'value' } }];
            const createElementSpy = jest.spyOn(document, 'createElement');
            (0, export_1.exportToJSON)(data, 'test.json');
            expect(createElementSpy).toHaveBeenCalled();
        });
    });
    describe('formatTransactionsForExport', () => {
        it('should format transactions correctly', () => {
            const transactions = [
                {
                    id: 'tx1',
                    signature: 'sig123',
                    amount: '100.5',
                    token: 'USDC',
                    senderAddress: 'sender1',
                    recipientAddress: 'recipient1',
                    serviceId: 'service1',
                    status: 'confirmed',
                    timestamp: '2025-11-12T10:00:00Z',
                    settledAt: null,
                },
            ];
            const formatted = (0, export_1.formatTransactionsForExport)(transactions);
            expect(formatted).toHaveLength(1);
            expect(formatted[0]).toEqual({
                'Transaction ID': 'tx1',
                'Signature': 'sig123',
                'Amount (USDC)': '100.500000',
                'Token': 'USDC',
                'Sender': 'sender1',
                'Recipient': 'recipient1',
                'Service ID': 'service1',
                'Status': 'confirmed',
                'Timestamp': '2025-11-12T10:00:00.000Z',
                'Settled At': 'Not settled',
            });
        });
        it('should handle settled transactions', () => {
            const transactions = [
                {
                    id: 'tx1',
                    signature: 'sig123',
                    amount: '100',
                    token: 'USDC',
                    senderAddress: 'sender1',
                    recipientAddress: 'recipient1',
                    serviceId: 'service1',
                    status: 'confirmed',
                    timestamp: '2025-11-12T10:00:00Z',
                    settledAt: '2025-11-12T11:00:00Z',
                },
            ];
            const formatted = (0, export_1.formatTransactionsForExport)(transactions);
            expect(formatted[0]['Settled At']).toBe('2025-11-12T11:00:00.000Z');
        });
        it('should handle missing service ID', () => {
            const transactions = [
                {
                    id: 'tx1',
                    signature: 'sig123',
                    amount: '100',
                    token: 'USDC',
                    senderAddress: 'sender1',
                    recipientAddress: 'recipient1',
                    serviceId: null,
                    status: 'confirmed',
                    timestamp: '2025-11-12T10:00:00Z',
                    settledAt: null,
                },
            ];
            const formatted = (0, export_1.formatTransactionsForExport)(transactions);
            expect(formatted[0]['Service ID']).toBe('N/A');
        });
    });
    describe('formatSettlementsForExport', () => {
        it('should format settlements correctly', () => {
            const settlements = [
                {
                    id: 'settle1',
                    merchantWallet: 'wallet1',
                    totalAmount: '1000.50',
                    platformFee: '20.01',
                    merchantAmount: '980.49',
                    transactionCount: 10,
                    status: 'completed',
                    transactionSignature: 'sig456',
                    requestedAt: '2025-11-12T10:00:00Z',
                    completedAt: '2025-11-12T11:00:00Z',
                    transactions: [],
                },
            ];
            const formatted = (0, export_1.formatSettlementsForExport)(settlements);
            expect(formatted).toHaveLength(1);
            expect(formatted[0]).toEqual({
                'Settlement ID': 'settle1',
                'Merchant Wallet': 'wallet1',
                'Total Amount (USDC)': '1000.500000',
                'Platform Fee (USDC)': '20.010000',
                'Merchant Amount (USDC)': '980.490000',
                'Transaction Count': 10,
                'Status': 'completed',
                'Transaction Signature': 'sig456',
                'Requested At': '2025-11-12T10:00:00.000Z',
                'Completed At': '2025-11-12T11:00:00.000Z',
            });
        });
        it('should handle pending settlements', () => {
            const settlements = [
                {
                    id: 'settle1',
                    merchantWallet: 'wallet1',
                    totalAmount: '1000',
                    platformFee: '20',
                    merchantAmount: '980',
                    transactionCount: 10,
                    status: 'pending',
                    transactionSignature: null,
                    requestedAt: '2025-11-12T10:00:00Z',
                    completedAt: null,
                    transactions: [],
                },
            ];
            const formatted = (0, export_1.formatSettlementsForExport)(settlements);
            expect(formatted[0]['Transaction Signature']).toBe('N/A');
            expect(formatted[0]['Completed At']).toBe('Not completed');
        });
    });
    describe('generateFilename', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(new Date('2025-11-12T14:30:45Z'));
        });
        afterEach(() => {
            jest.useRealTimers();
        });
        it('should generate CSV filename with timestamp', () => {
            const filename = (0, export_1.generateFilename)('transactions', 'csv');
            expect(filename).toMatch(/^transactions_2025-11-12_\d{2}-\d{2}-\d{2}\.csv$/);
        });
        it('should generate JSON filename with timestamp', () => {
            const filename = (0, export_1.generateFilename)('settlements', 'json');
            expect(filename).toMatch(/^settlements_2025-11-12_\d{2}-\d{2}-\d{2}\.json$/);
        });
        it('should use provided prefix', () => {
            const filename = (0, export_1.generateFilename)('custom-prefix', 'csv');
            expect(filename).toMatch(/^custom-prefix_/);
        });
    });
});
//# sourceMappingURL=export.test.js.map