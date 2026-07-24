// 疑似奥行きレンダラ。
// 床: トップダウンのテクスチャを走査線ごとに横スケールサンプリング（レトロ疑似3D）
// 背景: 空 → 遠景(海+ランドマーク) → 中景(ビル群) → 近景壁 の4層パララックス

import { VW, HORIZON_Y, FLOOR_TOP, FLOOR_BOTTOM } from '../core/video';

// ---- 投影 ----
export const PSX = 96; // プレイヤーの画面X
export const PPM = 14; // 手前(z=1)でのpx/m（スピード感重視）

const FH = FLOOR_BOTTOM - FLOOR_TOP;

export function zToY(z: number): number {
  return FLOOR_TOP + FH * (0.55 * z + 0.45 * z * z);
}
export function scaleAt(z: number): number {
  return 0.66 + 0.34 * z;
}
export function ppmAt(z: number): number {
  return PPM * (0.72 + 0.28 * z);
}
export function sxOf(x: number, camX: number, z: number): number {
  return PSX + (x - camX) * ppmAt(z);
}

/** 走査線ごとのz値テーブル */
const rowZ: number[] = [];
for (let y = FLOOR_TOP; y <= FLOOR_BOTTOM; y++) {
  const c = (y - FLOOR_TOP) / FH;
  const z = (-0.55 + Math.sqrt(0.3025 + 1.8 * c)) / 0.9;
  rowZ.push(Math.min(1, Math.max(0, z)));
}

// ---- テーマ ----
export interface DayTheme {
  sky: string[]; // 上→下 5帯
  sea: string;
  farSil: string; // 遠景シルエット
  farSil2: string;
  bldg: string[]; // ビル面 [明, 中, 暗]
  win: string;
  winLit: string;
  paveA: string;
  paveB: string;
  grout: string;
  curb: string; // 床最奥の縁石
  wallBase: string; // 近景壁ベース
  wallDark: string;
  hedge: string;
  hedgeDark: string;
  shadeFill: string; // rgba
  shadeEdge: string;
  sandA: string;
  sandB: string;
  glare: string;
  desert: boolean;
  giantSun: boolean;
}

export const THEMES: Record<number, DayTheme> = {
  1: {
    sky: ['#4fa8e8', '#6fc0f2', '#8fd6ff', '#b8e8ff', '#e0f6ff'],
    sea: '#3a88c8',
    farSil: '#7a9cc8',
    farSil2: '#93b2d8',
    bldg: ['#c8d2e2', '#a8b6cc', '#8494b0'],
    win: '#9fb8cc',
    winLit: '#d8f0f8',
    paveA: '#e8d9b8',
    paveB: '#dfcfab',
    grout: '#c8b494',
    curb: '#b8a888',
    wallBase: '#d8ccb8',
    wallDark: '#b8ac96',
    hedge: '#5aa84e',
    hedgeDark: '#3a7a38',
    shadeFill: 'rgba(58,74,160,0.44)',
    shadeEdge: '#4a5aa8',
    sandA: '#edc57e',
    sandB: '#d9a45c',
    glare: 'rgba(255,248,214,0.55)',
    desert: false,
    giantSun: false,
  },
  2: {
    sky: ['#e8a83c', '#f2bc58', '#ffd98a', '#ffe8b0', '#fff3d0'],
    sea: '#c88a4a',
    farSil: '#c09468',
    farSil2: '#d0a878',
    bldg: ['#e0c8a8', '#c8ac88', '#a88c6c'],
    win: '#c8a888',
    winLit: '#fff0c8',
    paveA: '#eed3a0',
    paveB: '#e4c890',
    grout: '#c8a878',
    curb: '#b89868',
    wallBase: '#e0cca8',
    wallDark: '#c0a888',
    hedge: '#8aa04a',
    hedgeDark: '#5c7a34',
    shadeFill: 'rgba(88,64,140,0.46)',
    shadeEdge: '#6a4aa0',
    sandA: '#edc57e',
    sandB: '#d9a45c',
    glare: 'rgba(255,244,200,0.6)',
    desert: false,
    giantSun: false,
  },
  3: {
    sky: ['#e86a3c', '#f2884a', '#ff9e4f', '#ffbc5e', '#ffd166'],
    sea: '#d9a45c',
    farSil: '#b06a52',
    farSil2: '#c07e5e',
    bldg: ['#d8a878', '#c08c60', '#a07048'],
    win: '#b08058',
    winLit: '#ffe8a8',
    paveA: '#edc57e',
    paveB: '#e2b86e',
    grout: '#c89858',
    curb: '#b08850',
    wallBase: '#d8b888',
    wallDark: '#b89468',
    hedge: '#a8a05c',
    hedgeDark: '#787840',
    shadeFill: 'rgba(120,56,110,0.46)',
    shadeEdge: '#985090',
    sandA: '#f2cd86',
    sandB: '#dcae64',
    glare: 'rgba(255,240,190,0.65)',
    desert: true,
    giantSun: true,
  },
};

// 決定論的ハッシュ（0..1）
export function hash(n: number): number {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

const TEX_PPM = 8; // 床テクスチャのpx/m
const TEX_W = 512; // 64m周期
const TEX_H = 48;

export class Background {
  theme: DayTheme;
  private floorTex: HTMLCanvasElement;
  private farStrip: HTMLCanvasElement;
  private midStrip: HTMLCanvasElement;
  private wallStrip: HTMLCanvasElement;

  constructor(theme: DayTheme) {
    this.theme = theme;
    this.floorTex = this.makeFloorTex();
    this.farStrip = this.makeFarStrip();
    this.midStrip = this.makeMidStrip();
    this.wallStrip = this.makeWallStrip();
  }

  private makeFloorTex(): HTMLCanvasElement {
    const t = this.theme;
    const c = document.createElement('canvas');
    c.width = TEX_W;
    c.height = TEX_H;
    const g = c.getContext('2d')!;
    if (t.desert) {
      // 砂に半ば埋もれた歩道
      g.fillStyle = t.sandA;
      g.fillRect(0, 0, TEX_W, TEX_H);
      for (let i = 0; i < 500; i++) {
        const n = hash(i * 3.1);
        g.fillStyle = n > 0.5 ? t.sandB : t.paveB;
        g.fillRect(Math.floor(hash(i * 1.7) * TEX_W), Math.floor(hash(i * 7.9) * TEX_H), n > 0.85 ? 2 : 1, 1);
      }
      // 露出したタイルの島
      for (let i = 0; i < 14; i++) {
        const x = Math.floor(hash(i * 11.3) * TEX_W);
        const y = Math.floor(hash(i * 5.7) * (TEX_H - 10));
        const w = 18 + Math.floor(hash(i * 2.3) * 30);
        g.fillStyle = t.paveA;
        g.fillRect(x, y, w, 8);
        g.fillStyle = t.grout;
        g.fillRect(x, y, w, 1);
        for (let jx = x; jx < x + w; jx += 12) g.fillRect(jx, y, 1, 8);
      }
      // 風紋
      g.fillStyle = t.sandB;
      for (let i = 0; i < 26; i++) {
        const y = Math.floor(hash(i * 4.3) * TEX_H);
        const x = Math.floor(hash(i * 9.7) * TEX_W);
        for (let k = 0; k < 14; k++) {
          g.fillRect((x + k * 3) % TEX_W, y + Math.floor(Math.sin(k * 0.9) * 1.5), 2, 1);
        }
      }
      g.fillStyle = t.curb;
      g.fillRect(0, 0, TEX_W, 2);
      return c;
    }
    g.fillStyle = t.paveA;
    g.fillRect(0, 0, TEX_W, TEX_H);
    // タイル 12×12px(1.5m角) の市松（目地が細かいほど速度が伝わる）
    for (let ty = 0; ty < TEX_H / 12; ty++) {
      for (let tx = 0; tx < TEX_W / 12; tx++) {
        const n = hash(tx * 7 + ty * 13);
        if ((tx + ty) % 2 === 0) {
          g.fillStyle = t.paveB;
          g.fillRect(tx * 12, ty * 12, 12, 12);
        }
        // タイルのランダムな汚れ/欠け
        if (n > 0.82) {
          g.fillStyle = t.grout;
          g.fillRect(tx * 12 + Math.floor(n * 9), ty * 12 + Math.floor(n * 8), 2, 1);
        }
      }
    }
    // 目地
    g.fillStyle = t.grout;
    for (let x = 0; x < TEX_W; x += 12) g.fillRect(x, 0, 1, TEX_H);
    for (let y = 0; y < TEX_H; y += 12) g.fillRect(0, y, TEX_W, 1);
    // 奥端の縁石帯
    g.fillStyle = t.curb;
    g.fillRect(0, 0, TEX_W, 2);
    return c;
  }

  private makeFarStrip(): HTMLCanvasElement {
    const t = this.theme;
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 46; // y54..100相当
    const g = c.getContext('2d')!;
    if (t.desert) {
      // 遠景の砂丘と、砂に半ば埋もれた観覧車
      g.fillStyle = t.sea; // 砂の海
      g.fillRect(0, 24, 480, 22);
      for (let i = 0; i < 6; i++) {
        const cx = Math.floor(hash(i * 7.7) * 480);
        const r = 30 + Math.floor(hash(i * 3.1) * 50);
        g.fillStyle = i % 2 === 0 ? t.farSil2 : t.farSil;
        for (let y = 0; y < 14; y++) {
          const half = Math.floor(Math.sqrt(Math.max(0, r * r - (y + r - 14) * (y + r - 14))));
          g.fillRect(cx - half, 24 + y, half * 2, 1);
        }
      }
      // 埋もれた観覧車（上半分だけ砂から出ている）
      const cx = 350;
      const cy = 30;
      const r = 18;
      g.strokeStyle = t.farSil;
      g.fillStyle = t.farSil;
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, r, Math.PI, Math.PI * 2);
      g.stroke();
      for (let k = 0; k < 5; k++) {
        const a = Math.PI + (k / 4) * Math.PI;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.stroke();
        g.fillRect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 3, 3);
      }
      // 遠くのヤシ
      for (const px of [60, 150, 260, 430]) {
        g.fillStyle = t.farSil;
        g.fillRect(px, 18, 2, 10);
        for (const [dx, dy] of [[-4, -3], [4, -3], [-2, -5], [2, -5]]) {
          g.fillRect(px + dx, 18 + dy, 3, 1);
        }
      }
      return c;
    }
    // 海
    g.fillStyle = t.sea;
    g.fillRect(0, 26, 480, 20);
    g.fillStyle = t.sky[4];
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(hash(i * 3.7) * 480);
      const y = 27 + Math.floor(hash(i * 9.1) * 16);
      g.fillRect(x, y, 3, 1); // 波光
    }
    // 遠景ビルシルエット
    let x = 0;
    let i = 0;
    while (x < 480) {
      const w = 18 + Math.floor(hash(i * 1.3) * 30);
      const h = 8 + Math.floor(hash(i * 2.7) * 20);
      g.fillStyle = i % 2 === 0 ? t.farSil : t.farSil2;
      g.fillRect(x, 26 - h, w, h + 2);
      x += w + 2 + Math.floor(hash(i * 5.1) * 10);
      i++;
    }
    // 観覧車（ランドマーク・シルエット）
    const cx = 350;
    const cy = 16;
    const r = 14;
    g.strokeStyle = t.farSil;
    g.fillStyle = t.farSil;
    g.lineWidth = 1;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, r - 4, 0, Math.PI * 2);
    g.stroke();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      g.beginPath();
      g.moveTo(cx, cy);
      g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      g.stroke();
      g.fillRect(Math.round(cx + Math.cos(a) * r) - 1, Math.round(cy + Math.sin(a) * r) - 1, 3, 3);
    }
    g.fillRect(cx - 6, cy + r - 2, 3, 14);
    g.fillRect(cx + 4, cy + r - 2, 3, 14);
    return c;
  }

  private makeMidStrip(): HTMLCanvasElement {
    const t = this.theme;
    const c = document.createElement('canvas');
    c.width = 960;
    c.height = 76; // y24..100相当
    const g = c.getContext('2d')!;
    let x = 0;
    let i = 0;
    while (x < 960) {
      const w = 42 + Math.floor(hash(i * 1.7) * 50);
      const h = 26 + Math.floor(hash(i * 3.1) * 46);
      const shade = i % 3;
      g.fillStyle = t.bldg[shade];
      const top = 76 - h;
      g.fillRect(x, top, w, h);
      // 側面の影
      g.fillStyle = t.bldg[Math.min(2, shade + 1)];
      g.fillRect(x + w - 4, top, 4, h);
      // 屋上
      if (hash(i * 7.7) > 0.5) {
        g.fillStyle = t.bldg[2];
        g.fillRect(x + 4, top - 3, 8, 3);
      }
      if (hash(i * 9.3) > 0.7) {
        g.fillStyle = t.farSil;
        g.fillRect(x + w - 12, top - 6, 2, 6);
      }
      // 窓格子
      for (let wy = top + 4; wy < 72; wy += 6) {
        for (let wx = x + 3; wx < x + w - 6; wx += 5) {
          const lit = hash(wx * 3.3 + wy * 7.7) > 0.85;
          g.fillStyle = lit ? t.winLit : t.win;
          g.fillRect(wx, wy, 2, 3);
        }
      }
      x += w + 3 + Math.floor(hash(i * 4.9) * 8);
      i++;
    }
    return c;
  }

  private makeWallStrip(): HTMLCanvasElement {
    const t = this.theme;
    const c = document.createElement('canvas');
    c.width = 480;
    c.height = 48; // y56..104相当
    const g = c.getContext('2d')!;
    if (t.desert) {
      // 砂丘の壁＋ロープ柵＋枯れ植木
      g.fillStyle = t.wallBase;
      g.fillRect(0, 26, 480, 22);
      for (let x = 0; x < 480; x += 3) {
        const n = hash(x * 2.3);
        g.fillStyle = n > 0.6 ? t.sandA : t.wallBase;
        g.fillRect(x, 26 + Math.floor(Math.sin(x * 0.05) * 3 + n * 2), 3, 20);
      }
      g.fillStyle = t.wallDark;
      g.fillRect(0, 46, 480, 2);
      // ロープ柵
      for (let x = 12; x < 480; x += 56) {
        g.fillStyle = '#8a6a42';
        g.fillRect(x, 32, 3, 15);
        g.fillStyle = '#6a4e30';
        g.fillRect(x + 2, 32, 1, 15);
      }
      g.fillStyle = '#a08058';
      for (let x = 12; x < 480 - 56; x += 56) {
        for (let k = 0; k < 56; k += 2) {
          g.fillRect(x + k, 36 + Math.floor(Math.sin((k / 56) * Math.PI) * 3), 2, 1);
        }
      }
      // 枯れ草
      for (let x = 30; x < 480; x += 90) {
        const n = Math.floor(hash(x) * 20);
        g.fillStyle = t.hedgeDark;
        g.fillRect(x + n, 42, 1, 4);
        g.fillRect(x + n - 2, 43, 1, 3);
        g.fillRect(x + n + 2, 43, 1, 3);
      }
      return c;
    }
    // 街路レベルのベース壁（プロムナードの植栽＋柵）
    g.fillStyle = t.wallBase;
    g.fillRect(0, 20, 480, 28);
    g.fillStyle = t.wallDark;
    g.fillRect(0, 20, 480, 2);
    g.fillRect(0, 44, 480, 4);
    // 生け垣
    for (let x = 0; x < 480; x += 4) {
      const n = hash(x * 1.1);
      g.fillStyle = n > 0.5 ? t.hedge : t.hedgeDark;
      g.fillRect(x, 30 + Math.floor(n * 3), 4, 14);
    }
    g.fillStyle = t.hedgeDark;
    g.fillRect(0, 44, 480, 2);
    // 柵の柱
    g.fillStyle = t.wallDark;
    for (let x = 8; x < 480; x += 40) {
      g.fillRect(x, 26, 2, 20);
    }
    return c;
  }

  /** 空〜近景壁まで（床より奥のすべて） */
  drawBack(
    g: CanvasRenderingContext2D,
    camX: number,
    time: number,
    sunTarget?: { x: number; y: number; blend: number },
  ): void {
    const t = this.theme;
    // 空
    const bands = t.sky.length;
    const bandH = Math.ceil(HORIZON_Y / bands) + 1;
    for (let i = 0; i < bands; i++) {
      g.fillStyle = t.sky[i];
      g.fillRect(0, i * (HORIZON_Y / bands), VW, bandH);
    }
    // 太陽（日射レーザー前は着弾地点の真上へ移動する）
    this.drawSun(g, time, sunTarget);
    // 遠景（視差0.05）
    const farOff = Math.floor(camX * PPM * 0.05) % 480;
    g.drawImage(this.farStrip, -farOff, 54);
    g.drawImage(this.farStrip, 480 - farOff, 54);
    // 中景（視差0.2）
    const midOff = Math.floor(camX * PPM * 0.2) % 960;
    g.drawImage(this.midStrip, -midOff, 26);
    g.drawImage(this.midStrip, 960 - midOff, 26);
    // 近景壁（視差 = z0のppm）
    const wallOff = Math.floor(camX * ppmAt(0)) % 480;
    g.drawImage(this.wallStrip, -wallOff, 56);
    g.drawImage(this.wallStrip, 480 - wallOff, 56);
  }

  private drawSun(
    g: CanvasRenderingContext2D,
    time: number,
    target?: { x: number; y: number; blend: number },
  ): void {
    const t = this.theme;
    const homeX = t.giantSun ? 240 : 360;
    const homeY = t.giantSun ? 34 : 22;
    const b = target ? Math.min(1, Math.max(0, target.blend)) : 0;
    const sx = target ? homeX + (target.x - homeX) * b : homeX;
    const sy = target ? homeY + (target.y - homeY) * b : homeY;
    const r = t.giantSun ? 30 : 10;
    const pulse = 1 + Math.sin(time * 2) * 0.04;
    // 攻撃(警告〜照射)が近づくほど凶悪な赤へ変わる
    const angry = b;
    g.fillStyle = angry > 0.4 ? '#ff5a3a' : '#fff6c8';
    g.beginPath();
    g.arc(sx, sy, r * pulse + 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = angry > 0.4 ? '#ff2a1e' : '#ffd94d';
    g.beginPath();
    g.arc(sx, sy, r * pulse, 0, Math.PI * 2);
    g.fill();
    // 光条
    g.fillStyle = angry > 0.4 ? '#ffb28a' : '#ffe98a';
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + time * 0.2;
      const rr = r * pulse + 5 + Math.sin(time * 3 + k) * 2;
      g.fillRect(Math.round(sx + Math.cos(a) * rr) - 1, Math.round(sy + Math.sin(a) * rr) - 1, 2, 2);
    }
    this.drawSunFace(g, sx, sy, r * pulse, angry);
  }

  /** 太陽の凶悪な顔。攻撃が近づくほど眉がつり上がり、口が怒りの牙になる */
  private drawSunFace(g: CanvasRenderingContext2D, sx: number, sy: number, r: number, angry: number): void {
    const eyeDX = r * 0.42;
    const eyeDY = -r * 0.06;
    const eyeR = Math.max(1, r * (0.15 + angry * 0.05));
    const dark = '#221833';
    // 眉（つり上がり具合がangryで増す）
    g.fillStyle = dark;
    const browLen = r * 0.55;
    const browTilt = r * (0.12 + angry * 0.22);
    for (const side of [-1, 1]) {
      g.beginPath();
      g.moveTo(sx + side * (eyeDX - browLen * 0.5), sy + eyeDY - eyeR * 1.6 + browTilt * (side === -1 ? 0.5 : -0.1));
      g.lineTo(sx + side * (eyeDX + browLen * 0.5), sy + eyeDY - eyeR * 1.6 - browTilt * (side === -1 ? 0.1 : 0.5));
      g.lineTo(sx + side * (eyeDX + browLen * 0.5), sy + eyeDY - eyeR * 1.6 - browTilt * (side === -1 ? 0.1 : 0.5) + r * 0.16);
      g.lineTo(sx + side * (eyeDX - browLen * 0.5), sy + eyeDY - eyeR * 1.6 + browTilt * (side === -1 ? 0.5 : -0.1) + r * 0.16);
      g.closePath();
      g.fill();
    }
    // 目（攻撃時は赤く光る吊り目に）
    g.fillStyle = angry > 0.35 ? '#ff2a2a' : dark;
    for (const side of [-1, 1]) {
      g.beginPath();
      g.ellipse(sx + side * eyeDX, sy + eyeDY, eyeR, eyeR * (1 - angry * 0.3), 0, 0, Math.PI * 2);
      g.fill();
    }
    // 口（普段はへの字、攻撃時はギザギザに開けた牙）
    g.strokeStyle = dark;
    g.fillStyle = dark;
    g.lineWidth = Math.max(1, r * 0.1);
    g.lineCap = 'round';
    const mouthY = sy + r * 0.44;
    const mouthW = r * (0.42 + angry * 0.18);
    if (angry > 0.45) {
      g.beginPath();
      const teeth = 4;
      g.moveTo(sx - mouthW, mouthY - r * 0.08);
      for (let i = 0; i <= teeth; i++) {
        const xx = sx - mouthW + (mouthW * 2 * i) / teeth;
        const yy = mouthY + (i % 2 === 0 ? r * 0.2 : -r * 0.04);
        g.lineTo(xx, yy);
      }
      g.closePath();
      g.fill();
    } else {
      g.beginPath();
      g.moveTo(sx - mouthW, mouthY - r * 0.05);
      g.quadraticCurveTo(sx, mouthY + r * 0.12, sx + mouthW, mouthY - r * 0.05);
      g.stroke();
    }
  }

  /** 床の走査線描画 */
  drawFloor(g: CanvasRenderingContext2D, camX: number): void {
    g.imageSmoothingEnabled = false;
    for (let i = 0; i < rowZ.length; i++) {
      const y = FLOOR_TOP + i;
      const z = rowZ[i];
      const ppm = ppmAt(z);
      // この走査線の左端のワールドX
      const wx0 = camX + (0 - PSX) / ppm;
      const metersVisible = VW / ppm;
      const srcW = metersVisible * TEX_PPM;
      let srcX = ((wx0 * TEX_PPM) % TEX_W) + (wx0 < 0 ? TEX_W : 0);
      srcX = srcX % TEX_W;
      const texRow = Math.min(TEX_H - 1, Math.floor(z * (TEX_H - 1)));
      if (srcX + srcW <= TEX_W) {
        g.drawImage(this.floorTex, srcX, texRow, srcW, 1, 0, y, VW, 1);
      } else {
        const w1 = TEX_W - srcX;
        const frac = w1 / srcW;
        const dw1 = Math.round(VW * frac);
        g.drawImage(this.floorTex, srcX, texRow, w1, 1, 0, y, dw1, 1);
        g.drawImage(this.floorTex, 0, texRow, srcW - w1, 1, dw1, y, VW - dw1, 1);
      }
    }
  }

  /**
   * 床ゾーン（影・砂・照り返し・ミスト）を走査線で塗る。
   * kind別の描画スタイル。edgeShear: 建物影の斜め度(px)
   */
  drawZone(
    g: CanvasRenderingContext2D,
    camX: number,
    time: number,
    kind: 'shade' | 'sand' | 'glare' | 'mist' | 'mirage',
    x0: number,
    x1: number,
    z0: number,
    z1: number,
    shear = 0,
  ): void {
    const t = this.theme;
    for (let i = 0; i < rowZ.length; i++) {
      const z = rowZ[i];
      if (z < z0 || z > z1) continue;
      const y = FLOOR_TOP + i;
      const zn = (z - z0) / Math.max(0.001, z1 - z0);
      let ox = shear * zn;
      if (kind === 'mirage') {
        ox += Math.sin(time * 5 + y * 0.6) * 1.5;
      }
      let sx0 = sxOf(x0, camX, z) + ox;
      let sx1 = sxOf(x1, camX, z) + ox;
      if (sx1 < 0 || sx0 > VW) continue;
      sx0 = Math.max(-2, sx0);
      sx1 = Math.min(VW + 2, sx1);
      switch (kind) {
        case 'shade':
        case 'mirage': {
          // ビルの輪郭を思わせる不規則な縁: 数行ごとにブロック段差＋
          // まれに大きめの欠け(角)を入れる。左右で別シードにして
          // 平行移動コピーに見えないようにする。
          const chunk = Math.floor(i / 3);
          const jL = Math.round((hash(x0 * 1.7 + chunk * 3.1) - 0.5) * 6);
          const notchL = hash(x0 * 5.3 + chunk * 7.7) > 0.86 ? Math.round((hash(x0 * 9.1 + chunk) - 0.5) * 10) : 0;
          const jR = Math.round((hash(x1 * 2.3 + chunk * 4.3 + 50) - 0.5) * 5);
          const edgeL = Math.round(sx0) + jL + notchL;
          const edgeR = Math.round(sx1) + jR;
          const w = Math.max(0, edgeR - edgeL);
          g.fillStyle = t.shadeFill;
          g.fillRect(edgeL, y, w, 1);
          // 縁の内側1pxだけ暗いリムを重ねて厚み(奥行き)を出す
          if (w > 3) {
            g.fillStyle = t.shadeEdge;
            g.globalAlpha = 0.35;
            g.fillRect(edgeL, y, 2, 1);
            g.globalAlpha = 1;
          }
          break;
        }
        case 'sand': {
          // 深い砂: 暗めの砂＋風紋。砂漠面でも「沈む場所」が判別できる
          g.fillStyle = t.sandB;
          g.fillRect(Math.round(sx0), y, Math.round(sx1 - sx0), 1);
          const n1 = hash(Math.floor(camX) * 0.37 + y * 7.3);
          g.fillStyle = t.sandA;
          const spx = sx0 + n1 * (sx1 - sx0);
          g.fillRect(Math.round(spx), y, 3, 1);
          if (y % 3 === 0) {
            const n2 = hash(y * 13.7);
            const spx2 = sx0 + n2 * (sx1 - sx0);
            g.fillRect(Math.round(spx2), y, 2, 1);
          }
          break;
        }
        case 'glare': {
          const flick = Math.sin(time * 6 + y * 0.8) > 0.3 ? 0.65 : 0.45;
          g.fillStyle = `rgba(255,248,214,${flick})`;
          g.fillRect(Math.round(sx0), y, Math.round(sx1 - sx0), 1);
          break;
        }
        case 'mist':
          g.fillStyle = 'rgba(214,240,255,0.4)';
          g.fillRect(Math.round(sx0), y, Math.round(sx1 - sx0), 1);
          break;
      }
    }
    // 影の上端に明るいエッジ
    if (kind === 'shade') {
      const yTop = Math.round(zToY(z0));
      const s0 = sxOf(x0, camX, z0) + shear * 0;
      const s1 = sxOf(x1, camX, z0);
      if (s1 > 0 && s0 < VW) {
        g.fillStyle = t.shadeEdge;
        g.fillRect(Math.round(Math.max(0, s0)), yTop, Math.round(Math.min(VW, s1) - Math.max(0, s0)), 1);
      }
    }
  }
}
