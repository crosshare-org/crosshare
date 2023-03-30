import { test, expect } from '@playwright/test';

test('disable comments', async ({ page }) => {
  test.slow();
  await page.goto('/');
  await page.getByRole('link', { name: 'Just like Jeff!' }).click();
  await page.getByRole('button', { name: 'Begin Puzzle' }).click();
  await page.getByRole('button', { name: 'Reveal' }).click();
  await page.getByRole('button', { name: 'Reveal Puzzle' }).click();
  await expect(
    page.getByText('Hey cool puzzle - I especially liked 17A')
  ).toBeVisible();
  const puzzleURL = page.url();

  await page.goto('/account');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const page1 = await page1Promise;
  await page1.getByText('Mike D').click();
  await page.getByRole('link', { name: 'Constructor Dashboard' }).click();
  await page.getByRole('link', { name: 'Just like Jeff!' }).click();
  await page.getByRole('button', { name: 'close' }).click();
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('link', { name: 'Edit' }).click();
  await page.getByText('Disable comments for this puzzle').click();
  await expect(page.getByText('comment setting updated')).toHaveCount(1);
  const editURL = page.url();

  await page.goto('/account');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto(puzzleURL);
  await expect(page.getByText('disabled comments')).toBeVisible();

  await page.goto(editURL);
  const page2Promise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  const page2 = await page2Promise;
  await page2.getByText('Mike D').click();
  await page.getByText('Disable comments for this puzzle').click();

  await page.goto('/account');
  await page.getByRole('button', { name: 'Log out' }).click();
  await page.goto(puzzleURL);
  await expect(
    page.getByText('Hey cool puzzle - I especially liked 17A')
  ).toBeVisible();
});
