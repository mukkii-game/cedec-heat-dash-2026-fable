import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

test.describe('CEDEC HEAT DASH 2026 - gameplay', () => {
  test('WAVE1 start reaches the WAVE2 checkpoint, no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => (window as any).__debug?.waveIdx === 2, null, { timeout: 60_000 });

    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  test('WAVE3 direct-start (debug jump) runs and makes progress, no console errors', async ({ page }) => {
    // ?wave=3はデバッグ専用の直行入口で、実際のプレイヤーが通る経路ではない
    // （通しプレイならWAVE3到達時には速度もヒートも前区間からの持ち越し状態になるが、
    // デバッグ直行はreset()相当の初期状態から始まるため、障害物の正弦位相との巡り合わせ次第で
    // 通しプレイより不利になり得る）。ここではクラッシュしないこと・前進することだけを検証する。
    const errors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text());
    });
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto('/?wave=3&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => ((window as any).__debug?.px ?? 0) > 780, null, { timeout: 30_000 });

    expect(errors, `console errors: ${errors.join('\n')}`).toEqual([]);
  });

  // 通しクリアの検証（決定論的なので1プロジェクトのみで十分）は
  // smoke.spec.ts の「full course (WAVE1->3) autopilot clears」に集約している。

  test('pause freezes the in-game timer; resume continues it', async ({ page }) => {
    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3200); // ready->play
    await page.waitForTimeout(1500);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const pausedFlag = await page.evaluate(() => (window as any).__debug.paused);
    expect(pausedFlag).toBe(true);

    const t1 = await page.evaluate(() => (window as any).__debug.timer);
    await page.waitForTimeout(800); // while paused, the play-clock must not advance
    const t2 = await page.evaluate(() => (window as any).__debug.timer);
    expect(t2).toBe(t1);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const resumedFlag = await page.evaluate(() => (window as any).__debug.paused);
    expect(resumedFlag).toBe(false);

    await page.waitForTimeout(500);
    const t3 = await page.evaluate(() => (window as any).__debug.timer);
    expect(t3).toBeGreaterThan(t2);
  });

  test('mute toggles and persists to localStorage', async ({ page }) => {
    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(300);
    const saved = await page.evaluate(() => {
      const raw = localStorage.getItem('cedec-heat-dash-2026:v2');
      return raw ? JSON.parse(raw).mute : null;
    });
    expect(saved).toBe(true);
  });

  test('retry (R) restarts the stage from zero', async ({ page }) => {
    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3200);
    await page.waitForTimeout(3000);
    const before = await page.evaluate(() => (window as any).__debug.timer);
    expect(before).toBeGreaterThan(1);

    await page.keyboard.press('KeyR');
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => (window as any).__debug.timer);
    expect(after).toBeLessThan(before);
    expect(after).toBeLessThanOrEqual(0.2);
  });

  test('page and body never scroll (no accidental overflow)', async ({ page }) => {
    await page.goto('/?wave=1&auto=1');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3200);
    // try to provoke scroll via wheel + arrow keys
    await page.mouse.wheel(0, 400);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);
    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    expect(scroll.x).toBe(0);
    expect(scroll.y).toBe(0);
  });

  test('production build uses relative asset paths (GitHub Pages subpath compatible)', () => {
    const distIndex = join(process.cwd(), 'dist', 'index.html');
    test.skip(!existsSync(distIndex), 'run `npm run build` first to produce dist/');
    const html = readFileSync(distIndex, 'utf8');
    const srcAttrs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    for (const attr of srcAttrs) {
      if (attr.startsWith('http') || attr.startsWith('data:')) continue;
      expect(attr.startsWith('/')).toBe(false);
    }
  });
});
