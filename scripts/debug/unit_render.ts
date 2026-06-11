import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/units', { recursive: true });
const run = async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  const errs: string[] = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5199/', { waitUntil: 'load' });
  await page.locator('.menu-start').first().waitFor({ timeout: 30000 }); // psion 기본 선택
  await page.locator('.menu-start').first().click(); // 스커미시 (psion vs ?)
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'test-results/units/psion-units.png' });
  // 일꾼 생산 유도 위해 30초 더
  await page.waitForTimeout(30000);
  await page.screenshot({ path: 'test-results/units/psion-units-30s.png' });
  console.log('스크린샷 완료, 에러', errs.length, errs.slice(0,3));
  await browser.close();
};
run();
