import { expect, test } from '@playwright/test';

test('enterprise comparison renders semantic bars and inspectable activity', async ({ page }) => {
  test.setTimeout(150_000);
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/chat')) {
      requests.push(request.postData() ?? '');
    }
  });

  await page.goto('/chat');
  await page.getByRole('button', {
    name: 'Compare usage-based billing with dunning for enterprise accounts',
  }).click();

  await expect(page.getByRole('heading', { name: 'Signal comparison' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByText('99 signals')).toBeVisible();
  await expect(page.getByText('12 signals')).toBeVisible();
  const activity = page.getByLabel('Live analysis activity');
  await activity.getByText(/completed steps/).click();
  await expect(activity.getByText('ClickHouse').first()).toBeVisible();
  await expect(activity).toContainText('mentions + accounts (CDC) + themes (CDC)');
  expect(requests).toHaveLength(1);
});

test('out-of-domain question renders an explicit boundary', async ({ page }) => {
  test.setTimeout(150_000);
  await page.goto('/chat');
  await page.getByPlaceholder('Ask about themes, accounts, competitors…').fill('What is the weather?');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByRole('heading', { name: 'Outside Meridian’s data' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(
    page.getByRole('status').getByText(/tickets, interviews, deals, accounts, themes, and competitors/),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toHaveCount(0);
});
