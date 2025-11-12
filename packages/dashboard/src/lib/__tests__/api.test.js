"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../api");
describe('FacilitatorAPI', () => {
    let api;
    let fetchMock;
    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock;
        api = new api_1.FacilitatorAPI('http://localhost:4001');
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('getTransactions', () => {
        it('should fetch transactions with query parameters', async () => {
            const mockTransactions = [
                {
                    id: 'tx1',
                    signature: 'sig1',
                    amount: '100',
                    token: 'USDC',
                    status: 'confirmed',
                    timestamp: '2025-11-12T10:00:00Z',
                },
            ];
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockTransactions,
            });
            const result = await api.getTransactions({
                agentId: 'agent1',
                limit: 10,
            });
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/transactions?agentId=agent1&limit=10');
            expect(result).toEqual(mockTransactions);
        });
        it('should handle empty query parameters', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            await api.getTransactions({});
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/transactions?');
        });
    });
    describe('getPendingSettlement', () => {
        it('should fetch pending settlement for wallet', async () => {
            const mockSettlement = {
                totalAmount: 1000,
                platformFee: 20,
                merchantAmount: 980,
                transactionCount: 10,
                transactions: [],
            };
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockSettlement,
            });
            const result = await api.getPendingSettlement('wallet1');
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/settlement/pending?merchantWallet=wallet1');
            expect(result).toEqual(mockSettlement);
        });
    });
    describe('requestSettlement', () => {
        it('should request settlement with correct payload', async () => {
            const mockResponse = {
                id: 'settle1',
                status: 'pending',
            };
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });
            const result = await api.requestSettlement({
                merchantWallet: 'wallet1',
                serviceId: 'service1',
                settlementType: 'manual',
            });
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/settlement/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    merchantWallet: 'wallet1',
                    serviceId: 'service1',
                    settlementType: 'manual',
                }),
            });
            expect(result).toEqual(mockResponse);
        });
    });
    describe('getSettlementHistory', () => {
        it('should fetch settlement history with limit', async () => {
            const mockHistory = [
                {
                    id: 'settle1',
                    merchantWallet: 'wallet1',
                    totalAmount: '1000',
                    status: 'completed',
                    requestedAt: '2025-11-12T10:00:00Z',
                },
            ];
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHistory,
            });
            const result = await api.getSettlementHistory('wallet1', 50);
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/settlement/history?merchantWallet=wallet1&limit=50');
            expect(result).toEqual(mockHistory);
        });
    });
    describe('searchServices', () => {
        it('should search services with all query parameters', async () => {
            const mockResponse = {
                services: [{ id: 'service1', name: 'Test Service' }],
                total: 1,
                limit: 50,
                offset: 0,
            };
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });
            const result = await api.searchServices({
                query: 'test',
                category: 'AI',
                minPrice: '10',
                maxPrice: '100',
                tokens: ['USDC', 'SOL'],
                sortBy: 'popularity',
                limit: 20,
                offset: 10,
            });
            const expectedUrl = new URL('http://localhost:4001/api/services/search');
            expectedUrl.searchParams.append('query', 'test');
            expectedUrl.searchParams.append('category', 'AI');
            expectedUrl.searchParams.append('minPrice', '10');
            expectedUrl.searchParams.append('maxPrice', '100');
            expectedUrl.searchParams.append('tokens', 'USDC,SOL');
            expectedUrl.searchParams.append('sortBy', 'popularity');
            expectedUrl.searchParams.append('limit', '20');
            expectedUrl.searchParams.append('offset', '10');
            expect(fetchMock).toHaveBeenCalledWith(expectedUrl.toString());
            expect(result).toEqual(mockResponse);
        });
        it('should handle empty search query', async () => {
            const mockResponse = {
                services: [],
                total: 0,
                limit: 50,
                offset: 0,
            };
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });
            await api.searchServices({});
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/services/search?');
        });
    });
    describe('getServiceRecommendations', () => {
        it('should fetch service recommendations', async () => {
            const mockRecommendations = [
                { id: 'service2', name: 'Similar Service' },
            ];
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockRecommendations,
            });
            const result = await api.getServiceRecommendations('service1', 5);
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/services/service1/recommendations?limit=5');
            expect(result).toEqual(mockRecommendations);
        });
    });
    describe('getServiceReputation', () => {
        it('should fetch service reputation', async () => {
            const mockReputation = {
                reputationScore: 7500,
                successRate: 95.5,
                failureRate: 4.5,
                totalTransactions: 100,
            };
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockReputation,
            });
            const result = await api.getServiceReputation('service1');
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/services/service1/reputation');
            expect(result).toEqual(mockReputation);
        });
    });
    describe('getTrendingServices', () => {
        it('should fetch trending services', async () => {
            const mockTrending = [
                {
                    id: 'service1',
                    name: 'Trending Service',
                    callsLast7Days: 500,
                    revenueLast7Days: 10000,
                },
            ];
            fetchMock.mockResolvedValueOnce({
                ok: true,
                json: async () => mockTrending,
            });
            const result = await api.getTrendingServices(10);
            expect(fetchMock).toHaveBeenCalledWith('http://localhost:4001/api/services/trending?limit=10');
            expect(result).toEqual(mockTrending);
        });
    });
    describe('getMerchantStats', () => {
        it('should calculate merchant stats from API data', async () => {
            const mockTransactions = [
                {
                    id: 'tx1',
                    amount: '100',
                    status: 'confirmed',
                    timestamp: '2025-11-12T10:00:00Z',
                },
                {
                    id: 'tx2',
                    amount: '200',
                    status: 'confirmed',
                    timestamp: '2025-11-12T11:00:00Z',
                },
            ];
            const mockPendingSettlement = {
                totalAmount: 300,
                platformFee: 6,
                merchantAmount: 294,
                transactionCount: 2,
                transactions: [],
            };
            const mockServices = [
                { id: 'service1', name: 'Service 1' },
                { id: 'service2', name: 'Service 2' },
            ];
            fetchMock
                .mockResolvedValueOnce({
                ok: true,
                json: async () => mockTransactions,
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => mockPendingSettlement,
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => mockServices,
            });
            const result = await api.getMerchantStats('wallet1');
            expect(result.totalRevenue).toBe(300);
            expect(result.totalTransactions).toBe(2);
            expect(result.activeServices).toBe(2);
            expect(result.averageTransaction).toBe(150);
            expect(result.pendingSettlement).toBe(300);
        });
        it('should handle zero transactions', async () => {
            fetchMock
                .mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    totalAmount: 0,
                    platformFee: 0,
                    merchantAmount: 0,
                    transactionCount: 0,
                    transactions: [],
                }),
            })
                .mockResolvedValueOnce({
                ok: true,
                json: async () => [],
            });
            const result = await api.getMerchantStats('wallet1');
            expect(result.totalRevenue).toBe(0);
            expect(result.totalTransactions).toBe(0);
            expect(result.activeServices).toBe(0);
            expect(result.averageTransaction).toBe(0);
        });
    });
    describe('error handling', () => {
        it('should throw error when fetch fails', async () => {
            fetchMock.mockRejectedValueOnce(new Error('Network error'));
            await expect(api.getTransactions({})).rejects.toThrow('Network error');
        });
        it('should handle non-OK response', async () => {
            fetchMock.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });
            await expect(api.getTransactions({})).rejects.toThrow();
        });
    });
});
//# sourceMappingURL=api.test.js.map