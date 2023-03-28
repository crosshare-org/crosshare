import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');

  // Expect a title "to contain" a substring.
  await expect(page).toHaveTitle(/Crosshare/);
});

test('reveal puzzle', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Just like Jeff!' }).click();
  await page.getByRole('button', { name: 'Begin Puzzle' }).click();
  await page.getByRole('button', { name: 'Reveal' }).click();
  await page.getByRole('button', { name: 'Reveal Puzzle' }).click();
  await expect(page.getByText('Hey cool puzzle - I especially liked 17A')).toHaveCount(1);
});
