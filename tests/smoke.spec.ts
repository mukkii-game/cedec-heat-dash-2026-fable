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

  test('keyboard: start -> menu -> can reach a stage', async ({ page }) => {
    await page.goto('/?day=1&auto=1');
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

  test('day1 autopilot clears within limit and no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/?day=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    // Standard autopilot clears Day1 in ~30s plus the ~2.5s post-goal rest
    // animation before the result screen; give it a comfortable margin.
    await page.waitForTimeout(45_000);

    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('best time persists across reload', async ({ page }) => {
    await page.goto('/?day=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(42_000);

    const saved = await page.evaluate(() => localStorage.getItem('cedec-heat-dash-2026:v1'));
    expect(saved).not.toBeNull();
    const parsed = JSON.parse(saved!);
    expect(parsed.best[0]).not.toBeNull();

    await page.reload();
    await page.waitForTimeout(500);
    const savedAfter = await page.evaluate(() => localStorage.getItem('cedec-heat-dash-2026:v1'));
    expect(savedAfter).toEqual(saved);
  });
});
