import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test('continuous chat, follow-ups, start over, and PNG share', async ({ page }) => {
  test.setTimeout(300_000);
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'meridian-share-'));

  await page.goto('/chat');
  await page.getByRole('button', { name: 'What should we prioritize next quarter?' }).click();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toBeVisible({
    timeout: 120_000,
  });
  await expect(page.getByRole('heading', { name: 'Traceable impact' })).toBeVisible();

  const shareButtons = page.getByRole('button', { name: 'Share chart as PNG' });
  await expect(shareButtons.first()).toBeVisible();
  expect(await shareButtons.count()).toBeGreaterThanOrEqual(2);

  const exports: string[] = [];
  for (let i = 0; i < 2; i += 1) {
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 30_000 }),
      shareButtons.nth(i).click(),
    ]);
    const target = path.join(downloadDir, await download.suggestedFilename());
    await download.saveAs(target);
    exports.push(target);
    expect(fs.statSync(target).size).toBeGreaterThan(2_000);
    expect(path.basename(target)).toMatch(/^meridian-(opportunity_ranking|impact_waterfall)-/);
  }

  await expect(page.getByText('Ask next').first()).toBeVisible();
  await page.getByRole('button', { name: 'What does Figma want?' }).first().click();
  await expect(page.getByRole('heading', { name: /Account signal snapshot|Figma/i })).toBeVisible({
    timeout: 120_000,
  });

  // Prioritize answer remains reachable via rail chip.
  await page.getByRole('button', { name: /You should prioritize usage-based billing/i }).click();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('button', { name: 'What should we prioritize next quarter?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toHaveCount(0);

  await page.getByRole('button', { name: 'What should we prioritize next quarter?' }).click();
  await expect(
    page.getByRole('button', { name: 'Query why dunning should not be prioritized' }),
  ).toBeEnabled({ timeout: 120_000 });
  await page.getByRole('button', { name: 'Query why dunning should not be prioritized' }).click();
  await expect(page.getByRole('heading', { name: /dunning/i })).toBeVisible({ timeout: 120_000 });
  const dunningShare = page.getByRole('button', { name: 'Share chart as PNG' }).first();
  const [dunningDownload] = await Promise.all([
    page.waitForEvent('download', { timeout: 30_000 }),
    dunningShare.click(),
  ]);
  const dunningPath = path.join(downloadDir, await dunningDownload.suggestedFilename());
  await dunningDownload.saveAs(dunningPath);
  exports.push(dunningPath);
  expect(fs.statSync(dunningPath).size).toBeGreaterThan(2_000);
  expect(path.basename(dunningPath)).toMatch(/^meridian-volume_trap-/);
  expect(exports.length).toBe(3);

  await expect(page.getByRole('button', { name: 'Back to previous answer' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to previous answer' }).click();
  await expect(page.getByRole('heading', { name: 'Q4 opportunity landscape' })).toBeVisible();
});
