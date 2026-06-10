// e2e 스모크 — 부팅 → 메뉴 → 게임 시작 → HUD/자원 → 관전 모드 (플랜 §5-7)
import { expect, test } from '@playwright/test';

test.describe('부팅/메뉴', () => {
  test('메뉴 로드 + 콘솔 에러 0', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    await page.goto('/');
    // 첫 로드는 vite 콜드스타트 + Phaser 번들 변환으로 오래 걸릴 수 있음
    await expect(page.locator('.menu-start').first()).toBeVisible({ timeout: 40000 });
    await expect(page.locator('.menu-f')).toHaveCount(2);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});

test.describe('게임 플레이', () => {
  test('스커미시 시작 → HUD 표시 + 일꾼 채집으로 골드 증가', async ({ page }) => {
    await page.goto('/');
    await page.locator('.menu-start').first().click();
    const res = page.locator('.hud-res');
    await expect(res).toBeVisible({ timeout: 15000 });
    await expect(res).toContainText('⛏');
    const goldOf = async (): Promise<number> => {
      const t = await res.locator('.g').textContent();
      return parseInt((t ?? '0').replace(/[^0-9]/g, ''), 10);
    };
    const g0 = await goldOf();
    await expect.poll(goldOf, { timeout: 30000, intervals: [1000] }).toBeGreaterThan(g0);
  });

  test('박스 셀렉션 → 선택 패널 갱신 + 우클릭 이동 명령', async ({ page }) => {
    await page.goto('/');
    await page.locator('.menu-start').first().click();
    await expect(page.locator('.hud-res')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);
    const { width, height } = page.viewportSize()!;
    // 본진 주변 전체 드래그 (시작 카메라 = 본진 중심)
    await page.mouse.move(width * 0.2, height * 0.2);
    await page.mouse.down();
    await page.mouse.move(width * 0.8, height * 0.75, { steps: 8 });
    await page.mouse.up();
    await expect(page.locator('.hud-info')).toContainText('선택', { timeout: 5000 });
    // 우클릭 이동 (크래시 없는지)
    await page.mouse.click(width * 0.6, height * 0.5, { button: 'right' });
    await page.waitForTimeout(800);
    await expect(page.locator('.hud-res')).toBeVisible();
  });

  test('HUD 스크린샷 (다해상도 겹침 검증용)', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.locator('.menu-start').first().click();
    await expect(page.locator('.hud-res')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: testInfo.outputPath('hud.png'), fullPage: false });
  });
});

test.describe('관전 모드', () => {
  test('관전 시작 → HUD 로드 + 에러 0', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/');
    await page.locator('.menu-start.spec').click();
    await expect(page.locator('.hud-res')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(3000);
    expect(errors, errors.join('\n')).toHaveLength(0);
  });
});
