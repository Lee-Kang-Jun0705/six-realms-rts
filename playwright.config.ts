import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5199',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'ultrawide', use: { viewport: { width: 2550, height: 1080 } } },
  ],
  webServer: {
    command: './node_modules/.bin/vite --port 5199 --strictPort',
    port: 5199,
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
