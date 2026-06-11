import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('test-results/assets', { recursive: true });

const run = async (): Promise<void> => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1280, height: 820 } })).newPage();
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.goto('http://localhost:5199/', { waitUntil: 'load' });
  await page.locator('.menu-start').first().click();
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.waitForTimeout(24000); // 채집/운반/건설 사이클
  await page.screenshot({ path: 'test-results/assets/full.png' });
  console.log('에러', errs.length, errs.slice(0, 3).join(' | '));
  await b.close();
};

run();
