// 開発中のビジュアル確認用スクリーンショットスクリプト
// usage: node shot.mjs <name> [w] [h] [actionsJsonFile]
// actions: [{type:'wait',ms},{type:'key',key},{type:'tap',x,y},{type:'hold',key,ms},{type:'shot',tag}]
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const name = process.argv[2] ?? 'shot';
const w = parseInt(process.argv[3] ?? '960', 10);
const h = parseInt(process.argv[4] ?? '540', 10);
const actions = process.argv[5] ? JSON.parse(readFileSync(process.argv[5], 'utf8')) : [];
const query = process.argv[6] ?? '';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://localhost:5173/' + query, { waitUntil: 'networkidle' });
await page.waitForTimeout(600);

for (const a of actions) {
  if (a.type === 'wait') await page.waitForTimeout(a.ms);
  else if (a.type === 'key') await page.keyboard.press(a.key);
  else if (a.type === 'tap') await page.mouse.click(a.x, a.y);
  else if (a.type === 'hold') {
    await page.keyboard.down(a.key);
    await page.waitForTimeout(a.ms);
    await page.keyboard.up(a.key);
  } else if (a.type === 'shot') {
    await page.screenshot({ path: `${process.env.SHOTDIR ?? '.'}/${name}-${a.tag}.png` });
  }
}
await page.screenshot({ path: `${process.env.SHOTDIR ?? '.'}/${name}.png` });
if (errors.length) {
  console.log('CONSOLE ERRORS:');
  for (const e of errors) console.log('  ' + e);
} else {
  console.log('no console errors');
}
await browser.close();
