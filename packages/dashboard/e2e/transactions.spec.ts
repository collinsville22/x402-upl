import { test, expect } from '@playwright/test';

test.describe('Transactions Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/transactions');
  });

  test('should display transactions page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Transactions' })).toBeVisible();
    await expect(
      page.getByText('View and filter your transaction history')
    ).toBeVisible();
  });

  test('should display filter buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Success' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pending' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Failed' })).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    const searchInput = page.getByPlaceholder('Search by signature or service...');
    await expect(searchInput).toBeVisible();
  });

  test('should filter transactions by status', async ({ page }) => {
    await page.route('**/api/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'tx1',
            serviceId: 'Service A',
            amount: '100',
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            signature: 'sig1',
          },
          {
            id: 'tx2',
            serviceId: 'Service B',
            amount: '200',
            status: 'failed',
            timestamp: new Date().toISOString(),
            signature: 'sig2',
          },
        ]),
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    const successButton = page.getByRole('button', { name: 'Success' });
    await successButton.click();

    await expect(page.getByText('Service A')).toBeVisible();
  });

  test('should search transactions', async ({ page }) => {
    await page.route('**/api/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'tx1',
            serviceId: 'Unique Service',
            amount: '100',
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            signature: 'unique-sig-123',
          },
        ]),
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    const searchInput = page.getByPlaceholder('Search by signature or service...');
    await searchInput.fill('unique');
    await page.waitForTimeout(300);

    await expect(page.getByText('Unique Service')).toBeVisible();
  });

  test('should show export buttons when transactions exist', async ({ page }) => {
    await page.route('**/api/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'tx1',
            serviceId: 'Service A',
            amount: '100',
            status: 'confirmed',
            timestamp: new Date().toISOString(),
            signature: 'sig1',
          },
        ]),
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
  });

  test('should navigate through pages', async ({ page }) => {
    const mockTransactions = Array.from({ length: 25 }, (_, i) => ({
      id: `tx${i}`,
      serviceId: `Service ${i}`,
      amount: '100',
      status: 'confirmed',
      timestamp: new Date().toISOString(),
      signature: `sig${i}`,
    }));

    await page.route('**/api/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTransactions),
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    const nextButton = page.getByRole('button', { name: 'Next' });
    await nextButton.click();

    await expect(page.getByText('Page 2 of 2')).toBeVisible();
  });

  test('should show empty state when no transactions', async ({ page }) => {
    await page.route('**/api/transactions*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.reload();
    await page.waitForTimeout(500);

    await expect(page.getByText('No transactions yet')).toBeVisible();
    await expect(
      page.getByText('Transactions will appear here as they occur')
    ).toBeVisible();
  });
});
