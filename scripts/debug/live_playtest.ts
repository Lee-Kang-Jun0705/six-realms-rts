// 라이브 직접 플레이 테스트 — 메뉴→스커미시(선택/이동/건설)→디펜스→관전, 콘솔에러/스크린샷 수집
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = 'https://lee-kang-jun0705.github.io/six-realms-rts/';
const OUT = 'test-results/live';
mkdirSync(OUT, { recursive: true });

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });

  // 0) 슬래시 없는 URL (SW 설치된 상태 가정 X — 신규 프로필)
  const r = await page.goto('https://lee-kang-jun0705.github.io/six-realms-rts', { waitUntil: 'load' });
  console.log(`[0] 슬래시 없는 URL → ${r?.status()} 최종: ${page.url()}`);

  // 1) 메뉴
  await page.goto(BASE, { waitUntil: 'load' });
  await page.locator('.menu-start').first().waitFor({ timeout: 30000 });
  await page.screenshot({ path: `${OUT}/1-menu.png` });
  console.log(`[1] 메뉴 OK — 타이틀: ${await page.title()}`);

  // 2) 스커미시: 무림 선택 + 보통
  await page.locator('.menu-f', { hasText: '무림' }).first().click();
  await page.locator('.menu-start').first().click();
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/2-skirmish-start.png` });
  console.log('[2] 스커미시 진입 OK');

  // 3) 박스 셀렉션 + 우클릭 이동
  await page.mouse.move(300, 250); await page.mouse.down();
  await page.mouse.move(1100, 700, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  const info1 = await page.locator('.hud-info').textContent();
  console.log(`[3] 셀렉션: "${info1?.slice(0, 40)}"`);
  await page.mouse.click(900, 400, { button: 'right' });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/3-select-move.png` });

  // 4) 건설 버튼 (일꾼 포함 선택 상태)
  const buildBtn = page.locator('.hud-btn', { hasText: '농장' });
  if (await buildBtn.count() > 0) {
    await buildBtn.first().click();
    await page.mouse.move(800, 500);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/4-build-ghost.png` });
    await page.mouse.click(800, 500); // 배치 시도
    await page.waitForTimeout(800);
    console.log('[4] 건설 고스트/배치 시도 OK');
  } else {
    console.log('[4] ⚠️ 농장 버튼 없음 (일꾼 미선택?)');
  }
  // 5) 90초 자동 진행 후 전황 확인 (AI가 공격 와야 정상)
  await page.waitForTimeout(45000);
  await page.screenshot({ path: `${OUT}/5-midgame.png` });
  const res1 = await page.locator('.hud-res').textContent();
  console.log(`[5] 90초 시점 자원바: "${res1}"`);

  // 6) 디펜스 모드 (새 페이지)
  await page.goto(BASE, { waitUntil: 'load' });
  await page.locator('.menu-start.defense').click();
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.waitForTimeout(65000); // 웨이브 1 도착쯤
  await page.screenshot({ path: `${OUT}/6-defense-wave.png` });
  const res2 = await page.locator('.hud-res').textContent();
  console.log(`[6] 디펜스 65초: "${res2}"`);

  // 7) 관전 모드
  await page.goto(BASE, { waitUntil: 'load' });
  await page.locator('.menu-start.spec').click();
  await page.locator('.hud-res').waitFor({ timeout: 20000 });
  await page.waitForTimeout(30000);
  await page.screenshot({ path: `${OUT}/7-spectate.png` });
  console.log(`[7] 관전 30초: "${await page.locator('.hud-res').textContent()}"`);

  console.log(`\n콘솔/페이지 에러 ${errors.length}건`);
  for (const e of errors.slice(0, 10)) console.log('  -', e);
  await browser.close();
};
run();
