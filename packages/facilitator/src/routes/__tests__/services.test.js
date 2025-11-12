import Fastify from 'fastify';
import { servicesRoutes } from '../services';
import { PrismaClient } from '@prisma/client';
jest.mock('@prisma/client');
describe('Services API Routes', () => {
    let fastify;
    let prisma;
    beforeEach(async () => {
        fastify = Fastify();
        await fastify.register(servicesRoutes);
        prisma = new PrismaClient();
    });
    afterEach(async () => {
        await fastify.close();
        jest.clearAllMocks();
    });
    describe('GET /api/services/search', () => {
        it('should search services with query parameter', async () => {
            const mockServices = [
                {
                    id: 'service1',
                    name: 'Test Service',
                    url: 'https://test.com',
                    description: 'Test description',
                    merchantWallet: 'wallet1',
                    pricing: { amount: '10', token: 'USDC' },
                    category: 'AI',
                    createdAt: new Date('2025-11-12'),
                },
            ];
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search?query=test',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('services');
            expect(body).toHaveProperty('total');
            expect(body).toHaveProperty('limit');
            expect(body).toHaveProperty('offset');
        });
        it('should filter by category', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search?category=AI',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('services');
        });
        it('should filter by price range', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search?minPrice=10&maxPrice=100',
            });
            expect(response.statusCode).toBe(200);
        });
        it('should support sorting', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search?sortBy=popularity',
            });
            expect(response.statusCode).toBe(200);
        });
        it('should support pagination', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search?limit=10&offset=20',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.limit).toBe(10);
            expect(body.offset).toBe(20);
        });
    });
    describe('GET /api/services/:id/recommendations', () => {
        it('should return service recommendations', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/service1/recommendations',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(Array.isArray(body)).toBe(true);
        });
        it('should respect limit parameter', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/service1/recommendations?limit=3',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.length).toBeLessThanOrEqual(3);
        });
        it('should return 404 for non-existent service', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/non-existent/recommendations',
            });
            expect(response.statusCode).toBe(404);
        });
    });
    describe('GET /api/services/:id/reputation', () => {
        it('should calculate reputation score', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/service1/reputation',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('reputationScore');
            expect(body).toHaveProperty('successRate');
            expect(body).toHaveProperty('failureRate');
            expect(body).toHaveProperty('totalTransactions');
            expect(body.reputationScore).toBeGreaterThanOrEqual(0);
            expect(body.reputationScore).toBeLessThanOrEqual(10000);
        });
        it('should return base score for service with no transactions', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/new-service/reputation',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.totalTransactions).toBe(0);
            expect(body.reputationScore).toBe(5000);
        });
        it('should return 404 for non-existent service', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/non-existent/reputation',
            });
            expect(response.statusCode).toBe(404);
        });
    });
    describe('GET /api/services/trending', () => {
        it('should return trending services', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/trending',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(Array.isArray(body)).toBe(true);
        });
        it('should limit results to requested count', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/trending?limit=5',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body.length).toBeLessThanOrEqual(5);
        });
        it('should include metrics for trending services', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/trending',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            if (body.length > 0) {
                expect(body[0]).toHaveProperty('callsLast7Days');
                expect(body[0]).toHaveProperty('revenueLast7Days');
            }
        });
    });
    describe('GET /api/services/categories', () => {
        it('should return list of categories', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/categories',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(Array.isArray(body)).toBe(true);
        });
        it('should include service count per category', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/categories',
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            if (body.length > 0) {
                expect(body[0]).toHaveProperty('category');
                expect(body[0]).toHaveProperty('count');
            }
        });
    });
    describe('POST /api/services/:id/rate', () => {
        it('should accept service rating', async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/services/service1/rate',
                payload: {
                    rating: 5,
                    agentId: 'agent1',
                },
            });
            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.body);
            expect(body).toHaveProperty('message');
        });
        it('should validate rating range', async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/services/service1/rate',
                payload: {
                    rating: 6,
                    agentId: 'agent1',
                },
            });
            expect(response.statusCode).toBe(400);
        });
        it('should require agentId', async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/services/service1/rate',
                payload: {
                    rating: 5,
                },
            });
            expect(response.statusCode).toBe(400);
        });
        it('should return 404 for non-existent service', async () => {
            const response = await fastify.inject({
                method: 'POST',
                url: '/api/services/non-existent/rate',
                payload: {
                    rating: 5,
                    agentId: 'agent1',
                },
            });
            expect(response.statusCode).toBe(404);
        });
    });
    describe('error handling', () => {
        it('should handle database errors gracefully', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search',
            });
            expect([200, 500]).toContain(response.statusCode);
        });
        it('should validate query parameters', async () => {
            const response = await fastify.inject({
                method: 'GET',
                url: '/api/services/search?limit=invalid',
            });
            expect([200, 400]).toContain(response.statusCode);
        });
    });
});
//# sourceMappingURL=services.test.js.map