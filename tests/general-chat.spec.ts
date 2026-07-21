import { expect, test } from '@playwright/test';

test('account question renders an account-specific live snapshot', async ({ page }) => {
  test.setTimeout(180_000);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/chat')) {
      requests.push(request.postData() ?? '');
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'What does Figma want?' }).click();

  await expect(page.getByRole('heading', { name: 'Account signal snapshot' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText('Figma', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Usage-based billing enhancements', { exact: true })).toBeVisible();
  await expect(page.getByText('TICK-00048', { exact: true }).first()).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toContain('What does Figma want?');
});
