// フルコース(WAVE1-3)を?auto=1で自走させ、window.__debugを定期ポーリングして
// クリア可否・詰まり・死亡地点を検証する開発用スクリプト。
// usage: node tools/autoplay.mjs [startWave] [maxSeconds] [screenshotPath]
import { chromium } from '@playwright/test';

const startWave = process.argv[2] ?? '1';
const maxSeconds = parseInt(process.argv[3] ?? '150', 10);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(`http://localhost:5173/?wave=${startWave}&auto=1`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);

let lastPx = -1;
let stuckCount = 0;
let deaths = 0;
for (let i = 0; i < maxSeconds * 2; i++) {
  await page.waitForTimeout(500);
  const d = await page.evaluate(() => {
    const w = window.__debug;
    return w ? { scene: w.sceneName, state: w.state, px: w.px, heat: w.heat, wave: w.waveIdx, timer: w.timer } : null;
  });
  if (!d) continue;
  if (i % 4 === 0) {
    console.log(
      `t=${(i * 0.5).toFixed(1)}s scene=${d.scene} state=${d.state} wave=${d.wave} px=${d.px?.toFixed(1)} heat=${d.heat?.toFixed(1)} timer=${d.timer?.toFixed(1)}`,
    );
  }
  if (d.state === 'dead') deaths++;
  if (d.scene === 'ResultScene') {
    console.log(`CLEARED at t=${(i * 0.5).toFixed(1)}s timer=${d.timer}`);
    break;
  }
  if (d.px !== null) {
    if (Math.abs(d.px - lastPx) < 0.5) stuckCount++;
    else stuckCount = 0;
    lastPx = d.px;
    if (stuckCount > 30) {
      console.log(`STUCK around px=${d.px} at t=${(i * 0.5).toFixed(1)}s`);
      break;
    }
  }
}
console.log(`deaths observed: ${deaths}`);
if (errors.length) {
  console.log('CONSOLE ERRORS:');
  for (const e of errors) console.log('  ' + e);
} else {
  console.log('no console errors');
}
await page.screenshot({ path: process.argv[4] ?? 'autoplay-final.png' });
await browser.close();
