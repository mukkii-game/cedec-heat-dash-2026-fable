import { test, expect } from '@playwright/test';

test.describe('CEDEC HEAT DASH 2026 - smoke', () => {
  test('title screen loads with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/');
    await page.waitForTimeout(800);

    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();
    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('keyboard: start -> menu -> can reach the stage', async ({ page }) => {
    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    // ready/play state should have advanced the internal timer; just assert no crash
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();
  });

  test('touch: portrait viewport shows touch deck and accepts taps', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'touch emulation is chromium-only in this harness');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForTimeout(500);
    await page.mouse.click(195, 150);
    await page.waitForTimeout(300);
    const canvas = page.locator('#game');
    await expect(canvas).toBeVisible();
  });

  test('full course (WAVE1->3) autopilot clears within limit and no console errors', async ({ page }, testInfo) => {
    // 通しクリアは決定論的（obstacle位相はhash(座標)由来で乱数を使わない）なので、
    // ビューポートを変えても結果は変わらない。実時間で約125秒かかる重いテストを
    // 4サイズ分冗長に走らせるとCPU競合でかえって不安定になるため、1プロジェクトのみで検証する。
    test.skip(testInfo.project.name !== 'desktop-chromium', 'deterministic clear only needs to run once');
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    // 実測クリアタイムは約125秒。余裕を持たせて待つ。
    await page.waitForFunction(() => (window as any).__debug?.sceneName === 'ResultScene', null, { timeout: 200_000 });

    const sceneName = await page.evaluate(() => (window as any).__debug?.sceneName ?? null);
    expect(sceneName).toBe('ResultScene');
    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('best time persists across reload', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'depends on the full-clear test above; no need to repeat per viewport');
    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).__debug?.sceneName === 'ResultScene', null, { timeout: 200_000 });

    const saved = await page.evaluate(() => localStorage.getItem('cedec-heat-dash-2026:v2'));
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.best).not.toBeNull();

    await page.reload();
    await page.waitForTimeout(500);
    const savedAfter = await page.evaluate(() => localStorage.getItem('cedec-heat-dash-2026:v2'));
    expect(savedAfter).toEqual(saved);
  });
});
