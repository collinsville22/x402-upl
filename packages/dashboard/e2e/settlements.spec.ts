import { test, expect } from '@playwright/test';

test.describe('Settlements Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/settlements');
  });

  test('should display settlements page title', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settlements' })).toBeVisible();
    await expect(
      page.getByText('Manage your payment settlements and view history')
    ).toBeVisible();
  });

  test('should show wallet connection prompt when not connected', async ({ page }) => {
    await expect(page.getByText('No Wallet Connected')).toBeVisible();
    await expect(
      page.getByText('Connect your wallet to view settlements')
    ).toBeVisible();
  });

  test('should display pending settlement information', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'wallet',
        value: 'test-wallet-public-key',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/api/settlement/pending*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAmount: 1000,
          platformFee: 20,
          merchantAmount: 980,
          transactionCount: 5,
          transactions: [
            {
              id: 'tx1',
              amount: '200',
              signature: 'sig123',
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    });

    await page.reload();

    await expect(page.getByText('Pending Settlement')).toBeVisible();
    await expect(page.getByText('5')).toBeVisible();
    await expect(page.getByText('$1000.00')).toBeVisible();
    await expect(page.getByText('$20.00')).toBeVisible();
    await expect(page.getByText('$980.00')).toBeVisible();
  });

  test('should enable request settlement button when pending transactions exist', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: 'wallet',
        value: 'test-wallet-public-key',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/api/settlement/pending*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalAmount: 1000,
          platformFee: 20,
          merchantAmount: 980,
          transactionCount: 5,
          transactions: [],
        }),
      });
    });

    await page.reload();

    const requestButton = page.getByRole('button', { name: 'Request Settlement' });
    await expect(requestButton).toBeEnabled();
  });

  test('should display settlement history table', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'wallet',
        value: 'test-wallet-public-key',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/api/settlement/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'settle1',
            merchantWallet: 'wallet1',
            totalAmount: '500',
            platformFee: '10',
            merchantAmount: '490',
            transactionCount: 3,
            status: 'completed',
            transactionSignature: 'sig456',
            requestedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.reload();

    await expect(page.getByText('Settlement History')).toBeVisible();
    await expect(page.getByText('3')).toBeVisible();
    await expect(page.getByText('$500.00')).toBeVisible();
    await expect(page.getByText('$490.00')).toBeVisible();
    await expect(page.getByText('completed')).toBeVisible();
  });

  test('should show export buttons when history exists', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'wallet',
        value: 'test-wallet-public-key',
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.route('**/api/settlement/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'settle1',
            merchantWallet: 'wallet1',
            totalAmount: '500',
            platformFee: '10',
            merchantAmount: '490',
            transactionCount: 3,
            status: 'completed',
            transactionSignature: 'sig456',
            requestedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await page.reload();

    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export JSON' })).toBeVisible();
  });
});
