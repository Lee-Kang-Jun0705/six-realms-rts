// SW 하이재킹 재현: ① 디아2(루트) 방문 → SW 설치 ② /six-realms-rts/ 이동 → 무엇이 뜨나
import { chromium } from '@playwright/test';

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  // ① 루트(디아2) 방문 — SW 설치 대기
  await page.goto('https://lee-kang-jun0705.github.io/', { waitUntil: 'load' });
  await page.waitForTimeout(4000); // SW install/activate 대기
  const swCount = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);
  const rootTitle = await page.title();
  console.log(`루트 타이틀: "${rootTitle}" / SW 등록 수: ${swCount}`);

  // ② 같은 컨텍스트로 육계대전 이동
  await page.goto('https://lee-kang-jun0705.github.io/six-realms-rts/', { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const title = await page.title();
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  console.log(`/six-realms-rts/ 타이틀: "${title}" / SW가 페이지 제어 중: ${controlled}`);
  console.log(title.includes('육계대전') ? '✅ 정상' : '🔴 하이재킹 재현됨 (디아2 SW가 가로챔)');
  await browser.close();
};
run();
