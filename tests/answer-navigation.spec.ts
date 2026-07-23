import { expect, test } from '@playwright/test';

test('deep dives request fresh data and Back restores the parent', async ({ page }) => {
  test.setTimeout(180_000);
  let chatRequests = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/chat')) chatRequests += 1;
  });

  await page.goto('/chat');
  await page.getByRole('button', { name: 'What should we prioritize next quarter?' }).click();
  await expect(page.getByRole('button', { name: 'Query competitive positioning for the leading opportunities' })).toBeEnabled({
    timeout: 120_000,
  });
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Traceable impact' })).toBeVisible();
  expect(chatRequests).toBe(1);

  await page.getByRole('button', { name: 'Query competitive positioning for the leading opportunities' }).click();
  await expect(page.getByRole('button', { name: 'Back to previous answer' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByRole('heading', { name: /competitive/i })).toBeVisible();
  expect(chatRequests).toBe(2);

  await page.getByRole('button', { name: 'Back to previous answer' }).click();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Traceable impact' })).toBeVisible();
  expect(chatRequests).toBe(2);

  await page.getByRole('button', { name: 'Query why dunning should not be prioritized' }).click();
  await expect(page.getByRole('button', { name: 'Back to previous answer' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByRole('heading', { name: /dunning/i })).toBeVisible();
  expect(chatRequests).toBe(3);

  await page.getByRole('button', { name: 'Back to previous answer' }).click();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toBeVisible();
  expect(chatRequests).toBe(3);
});
