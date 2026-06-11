import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
mkdirSync('test-results/feat', { recursive: true });
const run = async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('http://localhost:5199/', { waitUntil: 'load' });
  await page.locator('.menu-start').first().waitFor({ timeout: 30000 });
  await page.locator('.menu-start.spec').click(); // 관전(양측 AI) = 전투 빨리 보임
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'test-results/feat/01-largemap-start.png' });
  // 전투 유도: 90초 진행하며 발사체 포착 위해 연속 스샷
  await page.waitForTimeout(60000);
  for (let i = 0; i < 6; i++) { await page.screenshot({ path: `test-results/feat/combat-${i}.png` }); await page.waitForTimeout(700); }
  console.log('스샷 완료 에러', errs.length, errs.slice(0,3));
  await b.close();
};
run();
