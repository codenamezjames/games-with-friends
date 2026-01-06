import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/');

    // Should see the games index page with game cards
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('can navigate to Word Trace lobby', async ({ page }) => {
    await page.goto('/games/wordtrace');

    // Should see the main menu
    await expect(page.getByText('Word Trace')).toBeVisible();
    await expect(page.getByPlaceholder(/your name|enter your name/i)).toBeVisible();
  });

  test('can navigate to solo mode', async ({ page }) => {
    await page.goto('/games/wordtrace/solo');

    // Should see solo practice header
    await expect(page.getByText('Solo Practice')).toBeVisible();
  });
});
