import { chromium } from '@playwright/test';
const run = async () => {
  const browser = await chromium.launch();
  const page = await (await browser.newContext()).newPage();
  await page.goto('https://lee-kang-jun0705.github.io/', { waitUntil: 'load' });
  const info = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, script: reg.active?.scriptURL, state: reg.active?.state };
  });
  console.log('SW:', JSON.stringify(info));
  await page.waitForTimeout(2000);

  // 결정적: 존재하지 않는 경로 → SW 폴백이면 디아2 index가 옴 (네트워크면 404 페이지)
  const r1 = await page.goto('https://lee-kang-jun0705.github.io/zzz-nonexistent-path-test/', { waitUntil: 'load' });
  console.log(`없는 경로: HTTP(메인리소스) ${r1?.status()} / 타이틀: "${await page.title()}"`);

  const r2 = await page.goto('https://lee-kang-jun0705.github.io/six-realms-rts/', { waitUntil: 'load' });
  console.log(`육계대전: HTTP ${r2?.status()} / 타이틀: "${await page.title()}"`);
  await browser.close();
};
run();
