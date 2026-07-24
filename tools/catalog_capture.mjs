// 敵・ギミックカタログ（?catalog=1&idx=N）を1体ずつ画像として書き出す開発用スクリプト。
// usage: node tools/catalog_capture.mjs <outDir>
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const ids = [
  'cone', 'planter', 'coolbox', 'drink', 'energy', 'ped', 'suitcase', 'cardman',
  'gull', 'cart', 'tumbleweed', 'dune', 'brick', 'kickboard',
  'sun_calm', 'sun_angry',
  'zone_shade', 'zone_sand', 'zone_glare', 'zone_mist', 'zone_mirage', 'store',
];

const outDir = process.argv[2] ?? '.';
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });

for (let i = 0; i < ids.length; i++) {
  await page.goto(`http://localhost:5173/?catalog=1&idx=${i}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(350);
  const num = String(i + 1).padStart(2, '0');
  await page.screenshot({ path: `${outDir}/${num}-${ids[i]}.png` });
  console.log(`captured ${num}-${ids[i]}`);
}

await browser.close();
console.log('done');
