import { expect, test } from '@playwright/test';

test('processing is immediate and a stream failure is retryable', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/chat', async (route) => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 600));
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: `${JSON.stringify({
        type: 'error',
        code: 'agent',
        retryable: true,
        message: 'Simulated agent outage.',
      })}\n`,
    });
  });

  await page.goto('/');
  await page.getByPlaceholder('Ask about themes, accounts, competitors…').fill('Test failure');
  await page.getByRole('button', { name: 'Send' }).click();

  const processing = page.getByRole('status', { name: 'Meridian is processing your question' });
  await expect(processing).toBeVisible();
  await expect(processing).toContainText('Contacting Trigger.dev');
  await expect(page.getByRole('alert').filter({ hasText: 'Simulated agent outage.' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry question' }).click();
  await expect.poll(() => requests).toBe(2);
});
