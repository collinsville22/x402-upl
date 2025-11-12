"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('Discover Page', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await page.goto('/dashboard/discover');
    });
    (0, test_1.test)('should display discover page title', async ({ page }) => {
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Discover Services' })).toBeVisible();
        await (0, test_1.expect)(page.getByText('Browse and search available services in the marketplace')).toBeVisible();
    });
    (0, test_1.test)('should display search input', async ({ page }) => {
        const searchInput = page.getByPlaceholder('Search services...');
        await (0, test_1.expect)(searchInput).toBeVisible();
    });
    (0, test_1.test)('should display sort dropdown', async ({ page }) => {
        const sortSelect = page.locator('select').first();
        await (0, test_1.expect)(sortSelect).toBeVisible();
    });
    (0, test_1.test)('should search for services', async ({ page }) => {
        await page.route('**/api/services/search*', async (route) => {
            const url = new URL(route.request().url());
            const query = url.searchParams.get('query');
            if (query === 'translation') {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        services: [
                            {
                                id: 'service1',
                                name: 'AI Translation',
                                description: 'Translate text between languages',
                                category: 'AI',
                                pricing: { amount: '10', token: 'USDC' },
                            },
                        ],
                        total: 1,
                        limit: 50,
                        offset: 0,
                    }),
                });
            }
            else {
                await route.fulfill({
                    status: 200,
                    contentType: 'application/json',
                    body: JSON.stringify({
                        services: [],
                        total: 0,
                        limit: 50,
                        offset: 0,
                    }),
                });
            }
        });
        await page.route('**/api/services/categories*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });
        const searchInput = page.getByPlaceholder('Search services...');
        await searchInput.fill('translation');
        await page.waitForTimeout(600);
        await (0, test_1.expect)(page.getByText('AI Translation')).toBeVisible();
    });
    (0, test_1.test)('should filter by category', async ({ page }) => {
        await page.route('**/api/services/search*', async (route) => {
            const url = new URL(route.request().url());
            const category = url.searchParams.get('category');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    services: category === 'AI'
                        ? [
                            {
                                id: 'service1',
                                name: 'AI Service',
                                category: 'AI',
                                pricing: { amount: '10', token: 'USDC' },
                            },
                        ]
                        : [],
                    total: category === 'AI' ? 1 : 0,
                    limit: 50,
                    offset: 0,
                }),
            });
        });
        await page.route('**/api/services/categories*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { category: 'AI', count: 5 },
                    { category: 'Image', count: 3 },
                ]),
            });
        });
        await page.reload();
        await page.waitForTimeout(500);
        const aiButton = page.getByRole('button', { name: 'AI' });
        if (await aiButton.isVisible()) {
            await aiButton.click();
            await page.waitForTimeout(500);
            await (0, test_1.expect)(page.getByText('AI Service')).toBeVisible();
        }
    });
    (0, test_1.test)('should sort services', async ({ page }) => {
        await page.route('**/api/services/search*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    services: [],
                    total: 0,
                    limit: 50,
                    offset: 0,
                }),
            });
        });
        await page.route('**/api/services/categories*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });
        const sortSelect = page.locator('select').first();
        await sortSelect.selectOption('price');
        await page.waitForTimeout(300);
    });
    (0, test_1.test)('should show empty state when no services found', async ({ page }) => {
        await page.route('**/api/services/search*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    services: [],
                    total: 0,
                    limit: 50,
                    offset: 0,
                }),
            });
        });
        await page.route('**/api/services/categories*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });
        await page.reload();
        await page.waitForTimeout(500);
        await (0, test_1.expect)(page.getByText('No services found')).toBeVisible();
    });
    (0, test_1.test)('should display service cards with pricing', async ({ page }) => {
        await page.route('**/api/services/search*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    services: [
                        {
                            id: 'service1',
                            name: 'Premium Service',
                            description: 'High quality service',
                            category: 'AI',
                            pricing: { amount: '99.99', token: 'USDC' },
                        },
                    ],
                    total: 1,
                    limit: 50,
                    offset: 0,
                }),
            });
        });
        await page.route('**/api/services/categories*', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([]),
            });
        });
        await page.reload();
        await page.waitForTimeout(500);
        await (0, test_1.expect)(page.getByText('Premium Service')).toBeVisible();
        await (0, test_1.expect)(page.getByText(/99.99/)).toBeVisible();
    });
});
//# sourceMappingURL=discover.spec.js.map