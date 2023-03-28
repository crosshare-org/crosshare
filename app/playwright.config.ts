import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', {'open': 'never'}]],
  use: {
    baseURL: 'http://crosshare-dev:3000',
    trace: 'on-first-retry'
  },
});
