import { chromium } from '@playwright/test';
const run = async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext()).newPage();
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  await page.goto('http://localhost:5199/', { waitUntil: 'load' });
  await page.locator('.menu-start').first().waitFor({ timeout: 30000 });
  await page.locator('.menu-start').first().click();
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.mouse.click(700, 450); // 첫 입력 → BGM 시작 트리거
  await page.waitForTimeout(5000);
  // AudioContext 살아있는지 (BGM 엔진 작동 방증)
  const audioState = await page.evaluate(() => {
    // @ts-ignore
    return (window as any).__bgmDebug ?? 'n/a';
  });
  console.log('오디오 에러', errs.length, errs.slice(0,5), 'ctx', audioState);
  await b.close();
};
run();
