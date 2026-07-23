// 近景壁の装飾スプライト群（コード描画によるドット絵）。
// AA禁止: すべて1pxのfillRect/手動プロットで描く。

import type { Sprite } from './pix';
import { text, textWidth } from '../core/font';

function cv(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  return [c, g];
}

/** ドット円（塗り）。AAなし */
export function pixCircle(
  g: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  color: string,
): void {
  g.fillStyle = color;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y));
    g.fillRect(cx - half, cy + y, half * 2 + 1, 1);
  }
}

function sp(c: HTMLCanvasElement, ox = 0.5, oy = 1): Sprite {
  return { c, w: c.width, h: c.height, ox, oy };
}

const OUTLINE = '#221833';

/** 街路樹（日陰の源） */
export function makeTree(): Sprite {
  const [c, g] = cv(30, 42);
  // 幹
  g.fillStyle = OUTLINE;
  g.fillRect(13, 24, 5, 18);
  g.fillStyle = '#8a5a3a';
  g.fillRect(14, 24, 3, 18);
  g.fillStyle = '#6a4228';
  g.fillRect(16, 26, 1, 16);
  // 葉（円の重なり）
  pixCircle(g, 15, 13, 10, OUTLINE);
  pixCircle(g, 8, 17, 7, OUTLINE);
  pixCircle(g, 22, 16, 7, OUTLINE);
  pixCircle(g, 15, 13, 9, '#4a9a44');
  pixCircle(g, 8, 17, 6, '#3a7a38');
  pixCircle(g, 22, 16, 6, '#4a9a44');
  pixCircle(g, 12, 10, 5, '#63b858');
  // ハイライトの葉粒
  g.fillStyle = '#8ad878';
  g.fillRect(10, 7, 2, 1);
  g.fillRect(14, 5, 2, 1);
  g.fillRect(18, 9, 2, 1);
  g.fillRect(7, 12, 1, 1);
  return sp(c);
}

/** ヤシの木（Day3） */
export function makePalm(): Sprite {
  const [c, g] = cv(36, 46);
  // 曲がった幹
  g.fillStyle = '#8a6a42';
  for (let i = 0; i < 30; i++) {
    const t = i / 30;
    const x = 18 + Math.round(Math.sin(t * 1.2) * 6 * t);
    g.fillStyle = i % 4 === 0 ? '#6a4e30' : '#8a6a42';
    g.fillRect(x - 1, 45 - i, 3, 1);
  }
  // 葉
  const fronds = [
    [-14, -4],
    [-10, -9],
    [-3, -12],
    [5, -11],
    [11, -7],
    [14, -2],
  ];
  for (const [dx, dy] of fronds) {
    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const x = 22 + Math.round(dx * t);
      const y = 16 + Math.round(dy * t + 4 * t * t);
      g.fillStyle = i < 3 ? '#2f5e38' : '#4f8a4a';
      g.fillRect(x, y, 2, 2);
    }
  }
  g.fillStyle = '#c47a24';
  g.fillRect(20, 15, 2, 2);
  g.fillRect(23, 16, 2, 2);
  return sp(c);
}

/** 自動販売機 */
export function makeVending(): Sprite {
  const [c, g] = cv(16, 24);
  g.fillStyle = OUTLINE;
  g.fillRect(0, 0, 16, 24);
  g.fillStyle = '#3a8ae8';
  g.fillRect(1, 1, 14, 22);
  g.fillStyle = '#2a5ea8';
  g.fillRect(1, 20, 14, 3);
  g.fillRect(12, 1, 3, 22);
  // 商品窓
  g.fillStyle = '#e8f4ff';
  g.fillRect(2, 2, 9, 8);
  const cols = ['#e8504b', '#f2a33c', '#3ec6c0', '#68b868', '#e8788a', '#7a68c8'];
  for (let i = 0; i < 6; i++) {
    g.fillStyle = cols[i];
    g.fillRect(3 + (i % 3) * 3, 3 + Math.floor(i / 3) * 4, 2, 3);
  }
  // 取り出し口
  g.fillStyle = '#14101f';
  g.fillRect(2, 14, 9, 3);
  g.fillStyle = '#f5f1e8';
  g.fillRect(2, 11, 5, 1);
  return sp(c);
}

/** 駅入口（スタート地点の演出） */
export function makeStation(): Sprite {
  const w = 108;
  const [c, g] = cv(w, 50);
  // ガラスの箱
  g.fillStyle = OUTLINE;
  g.fillRect(0, 12, w, 38);
  g.fillStyle = '#bfe8f2';
  g.fillRect(2, 14, w - 4, 34);
  g.fillStyle = '#8fc8dc';
  for (let x = 8; x < w - 2; x += 12) g.fillRect(x, 14, 2, 34);
  // 屋根
  g.fillStyle = OUTLINE;
  g.fillRect(-1, 8, w + 2, 6);
  g.fillStyle = '#8494b0';
  g.fillRect(0, 9, w, 4);
  // 駅名サイン「みなとみらい駅」
  const signW = w - 6;
  g.fillStyle = OUTLINE;
  g.fillRect(3, 0, signW, 12);
  g.fillStyle = '#2e4a7a';
  g.fillRect(4, 1, signW - 2, 10);
  text(g, 'みなとみらい駅', 3 + signW / 2, 1, { size: 8, color: '#f5f1e8', align: 'center', bold: true });
  // 階段（下り）
  g.fillStyle = '#14101f';
  g.fillRect(w / 2 - 10, 34, 20, 14);
  g.fillStyle = '#4a4a6a';
  for (let i = 0; i < 5; i++) g.fillRect(w / 2 - 10, 34 + i * 3, 20, 1);
  return sp(c);
}

/** コンビニ「スズシヤ」店構え */
export function makeStore(): Sprite {
  const [c, g] = cv(64, 48);
  // 建物
  g.fillStyle = OUTLINE;
  g.fillRect(0, 0, 64, 48);
  g.fillStyle = '#f0ece0';
  g.fillRect(1, 1, 62, 46);
  // 看板帯
  g.fillStyle = '#3ec6c0';
  g.fillRect(1, 3, 62, 10);
  g.fillStyle = '#2b8f92';
  g.fillRect(1, 11, 62, 2);
  text(g, 'スズシヤ', 32, 3, { size: 8, color: '#14101f', align: 'center', bold: true });
  // 雪の結晶マーク
  g.fillStyle = '#f5f1e8';
  g.fillRect(6, 5, 1, 5);
  g.fillRect(4, 7, 5, 1);
  g.fillRect(5, 6, 1, 1);
  g.fillRect(7, 8, 1, 1);
  g.fillRect(5, 8, 1, 1);
  g.fillRect(7, 6, 1, 1);
  // ウィンドウ（冷えた青光）
  g.fillStyle = '#bfe8ff';
  g.fillRect(4, 17, 22, 24);
  g.fillStyle = '#8fd0f0';
  g.fillRect(4, 33, 22, 8);
  // 棚
  g.fillStyle = '#68a8c8';
  g.fillRect(6, 22, 18, 2);
  g.fillRect(6, 28, 18, 2);
  // ドア（中央）
  g.fillStyle = OUTLINE;
  g.fillRect(30, 15, 24, 33);
  g.fillStyle = '#d8f4ff';
  g.fillRect(31, 16, 11, 31);
  g.fillRect(43, 16, 10, 31);
  g.fillStyle = '#8fd0f0';
  g.fillRect(41, 16, 2, 31);
  // ｢COLD｣ポスター
  g.fillStyle = '#e8504b';
  g.fillRect(56, 18, 6, 10);
  g.fillStyle = '#f5f1e8';
  g.fillRect(57, 20, 4, 2);
  g.fillRect(57, 24, 4, 1);
  return sp(c);
}

/** ゴールアーチの柱（1本。奥と手前に描く） */
/** ゴール地点にそびえるドーム建物「パシフィコ横浜」風の会場入口 */
export function makeDome(): Sprite {
  const w = 220;
  const h = 130;
  const [c, g] = cv(w, h);
  const cx = w / 2;
  // 本体
  g.fillStyle = OUTLINE;
  g.fillRect(10, 60, w - 20, h - 60);
  g.fillStyle = '#d8dce8';
  g.fillRect(12, 62, w - 24, h - 64);
  for (let x = 16; x < w - 16; x += 10) {
    g.fillStyle = '#b8c0d8';
    g.fillRect(x, 62, 1, h - 64);
  }
  // ドーム屋根
  const domeR = 96;
  const domeCy = 60;
  g.fillStyle = OUTLINE;
  for (let y = -domeR; y <= 0; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, domeR * domeR - y * y)));
    if (half > w / 2 - 6) continue;
    g.fillRect(Math.round(cx - half), domeCy + y, half * 2, 1);
  }
  g.fillStyle = '#c8cfe0';
  const domeR2 = domeR - 3;
  for (let y = -domeR2; y <= -2; y++) {
    const half = Math.floor(Math.sqrt(Math.max(0, domeR2 * domeR2 - y * y)));
    if (half > w / 2 - 9) continue;
    g.fillRect(Math.round(cx - half), domeCy + y, half * 2, 1);
  }
  // 骨組みライン（放射状）
  g.strokeStyle = '#9aa4c0';
  g.lineWidth = 1;
  for (let k = -3; k <= 3; k++) {
    const a = (k / 8) * Math.PI;
    g.beginPath();
    g.moveTo(cx, domeCy);
    g.lineTo(cx + Math.sin(a) * domeR2, domeCy - Math.cos(a) * domeR2);
    g.stroke();
  }
  // 入口（ガラスの大きなエントランス、中は明るく光る）
  const doorW = 64;
  g.fillStyle = OUTLINE;
  g.fillRect(cx - doorW / 2 - 2, h - 46, doorW + 4, 46);
  g.fillStyle = '#fff6d8';
  g.fillRect(cx - doorW / 2, h - 44, doorW, 44);
  g.fillStyle = '#ffe9a0';
  for (let x = -doorW / 2; x < doorW / 2; x += 8) g.fillRect(cx + x, h - 44, 1, 44);
  // 看板「パシフィコ横浜」
  const signW = 150;
  g.fillStyle = OUTLINE;
  g.fillRect(cx - signW / 2 - 2, 96, signW + 4, 16);
  g.fillStyle = '#e8504b';
  g.fillRect(cx - signW / 2, 98, signW, 12);
  text(g, 'パシフィコ横浜', cx, 99, { size: 9, color: '#f5f1e8', align: 'center', bold: true });
  return sp(c, 0.5, 1);
}

export function makePillar(): Sprite {
  const [c, g] = cv(12, 58);
  g.fillStyle = OUTLINE;
  g.fillRect(2, 0, 8, 58);
  for (let y = 0; y < 58; y += 6) {
    g.fillStyle = Math.floor(y / 6) % 2 === 0 ? '#3ec6c0' : '#f5f1e8';
    g.fillRect(3, y, 6, 6);
  }
  g.fillStyle = '#2b8f92';
  g.fillRect(8, 0, 1, 58);
  // 台座
  g.fillStyle = OUTLINE;
  g.fillRect(0, 54, 12, 4);
  g.fillStyle = '#8494b0';
  g.fillRect(1, 55, 10, 3);
  return sp(c);
}

/** 汎用看板（テキスト焼き込み、キャッシュ） */
const signCache = new Map<string, Sprite>();
export function makeSign(label: string, icon: 'updown' | 'jump' | 'goal' | 'warn' | 'none'): Sprite {
  const key = `${label}|${icon}`;
  const hit = signCache.get(key);
  if (hit) return hit;
  // 文言が長い場合はフォントを縮めず、看板の幅を広げて収める
  // （縮小すると漢字が潰れて読めなくなるため、クリップ・縮小のどちらもしない）
  const textSize = icon === 'warn' ? 9 : 8;
  const w = icon === 'updown' ? 30 : Math.max(30, textWidth(label, textSize, 1) + 10);
  const [c, g] = cv(Math.ceil(w), 30);
  g.fillStyle = OUTLINE;
  g.fillRect(0, 0, w, 18);
  g.fillStyle = icon === 'goal' ? '#e8504b' : icon === 'warn' ? '#ffd94d' : '#2e4a7a';
  g.fillRect(1, 1, w - 2, 16);
  if (icon === 'warn') {
    text(g, label, w / 2, (18 - textSize) / 2 - 1, { size: textSize, color: '#221833', align: 'center', bold: true });
    // 縞の縁
    g.fillStyle = '#221833';
    for (let i = 0; i < w; i += 6) {
      g.fillRect(i, 1, 3, 2);
      g.fillRect(((i + 3) % w) - 0, 15, 3, 2);
    }
  }
  g.fillStyle = '#f5f1e8';
  if (icon === 'updown') {
    // ↑↓アイコン
    g.fillRect(8, 4, 2, 8);
    g.fillRect(6, 6, 6, 2);
    g.fillRect(7, 5, 4, 1);
    g.fillRect(20, 6, 2, 8);
    g.fillRect(18, 10, 6, 2);
    g.fillRect(19, 12, 4, 1);
  } else if (icon !== 'warn') {
    text(g, label, w / 2, 4, { size: textSize, color: '#f5f1e8', align: 'center' });
  }
  // 脚（看板中央）
  const legX = Math.round(w / 2) - 2;
  g.fillStyle = OUTLINE;
  g.fillRect(legX, 18, 4, 12);
  g.fillStyle = '#8a8fa8';
  g.fillRect(legX + 1, 18, 2, 12);
  const s = sp(c);
  signCache.set(key, s);
  return s;
}

/** 横断幕（のぼり風テキスト） */
const bannerCache = new Map<string, Sprite>();
export function makeBanner(label: string): Sprite {
  const hit = bannerCache.get(label);
  if (hit) return hit;
  const wText = Math.max(40, label.length * 9 + 12);
  const [c, g] = cv(wText + 8, 26);
  // ポール
  g.fillStyle = '#8a8fa8';
  g.fillRect(0, 0, 2, 26);
  g.fillRect(wText + 6, 0, 2, 26);
  // 幕
  g.fillStyle = OUTLINE;
  g.fillRect(1, 2, wText + 6, 14);
  g.fillStyle = '#f2a33c';
  g.fillRect(2, 3, wText + 4, 12);
  g.fillStyle = '#fff1c8';
  g.fillRect(2, 3, wText + 4, 2);
  text(g, label, 4 + wText / 2, 5, { size: 9, color: '#14101f', align: 'center', bold: true });
  const s = sp(c);
  bannerCache.set(label, s);
  return s;
}
