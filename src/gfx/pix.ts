// 文字列グリッド → Canvas スプライト工場。
// 全ドット絵はここを通して生成する（ART_DIRECTION.md の規律を集中管理）。

export interface Sprite {
  c: HTMLCanvasElement;
  w: number;
  h: number;
  /** アンカー（0..1、描画時に w*ox, h*oy が基準点） */
  ox: number;
  oy: number;
}

/** 共通パレット記号。各スプライトはこれを拡張して使う */
export const BASE_MAP: Record<string, string> = {
  k: '#221833', // 共通アウトライン（夜紫）
  w: '#f5f1e8', // オフホワイト
  s: '#f2c193', // 肌
  S: '#cf8e62', // 肌影
};

export function mk(
  art: string | string[],
  pal: Record<string, string>,
  ox = 0.5,
  oy = 1,
): Sprite {
  const rows = typeof art === 'string' ? art.split('|') : art;
  const h = rows.length;
  let w = 0;
  for (const r of rows) w = Math.max(w, r.length);
  const c = document.createElement('canvas');
  c.width = Math.max(1, w);
  c.height = Math.max(1, h);
  const ctx = c.getContext('2d')!;
  const map = { ...BASE_MAP, ...pal };
  for (let y = 0; y < h; y++) {
    const row = rows[y];
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = map[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  return { c, w: c.width, h: c.height, ox, oy };
}

export function flipX(s: Sprite): Sprite {
  const c = document.createElement('canvas');
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.translate(s.w, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(s.c, 0, 0);
  return { c, w: s.w, h: s.h, ox: 1 - s.ox, oy: s.oy };
}

/** 複数レイヤーを重ねて1枚に合成（同サイズ前提、offsetは省略可） */
export function compose(
  layers: { s: Sprite; dx?: number; dy?: number }[],
  w: number,
  h: number,
  ox = 0.5,
  oy = 1,
): Sprite {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (const l of layers) {
    ctx.drawImage(l.s.c, l.dx ?? 0, l.dy ?? 0);
  }
  return { c, w, h, ox, oy };
}

/** スプライト描画（アンカー基準、整数スナップ、任意スケール） */
export function blit(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  scale = 1,
  alpha = 1,
): void {
  const w = Math.max(1, Math.round(s.w * scale));
  const h = Math.max(1, Math.round(s.h * scale));
  const dx = Math.round(x - w * s.ox);
  const dy = Math.round(y - h * s.oy);
  if (alpha < 1) {
    ctx.globalAlpha = alpha;
    ctx.drawImage(s.c, dx, dy, w, h);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(s.c, dx, dy, w, h);
  }
}

// heatTint用のスクラッチキャンバス（毎フレーム生成しないよう使い回す）
let tintScratch: HTMLCanvasElement | null = null;
let tintScratchCtx: CanvasRenderingContext2D | null = null;

/**
 * ヒートゲージ演出: スプライトのシルエットに沿って、足元から頭へ
 * 赤み（frac=0..1）がせり上がるように重ね塗りして描画する。
 * source-atopでスプライトの不透明部分だけに着色するため、パレット改変不要。
 */
export function blitHeatTint(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  scale: number,
  frac: number,
  tintColor = '#e8342a',
  pulse = 0,
): void {
  if (frac <= 0.02) {
    blit(ctx, s, x, y, scale);
    return;
  }
  if (!tintScratch) {
    tintScratch = document.createElement('canvas');
    tintScratchCtx = tintScratch.getContext('2d')!;
    tintScratchCtx.imageSmoothingEnabled = false;
  }
  const sc = tintScratch;
  const cx = tintScratchCtx!;
  if (sc.width !== s.w || sc.height !== s.h) {
    sc.width = s.w;
    sc.height = s.h;
  } else {
    cx.clearRect(0, 0, s.w, s.h);
  }
  cx.drawImage(s.c, 0, 0);
  const f = Math.min(1, Math.max(0, frac));
  // ゲージ廃止で体色だけが指標になるため、最大値まで濃くはっきり赤くする。
  // 危険域(pulse>0)ではさらに明滅を重ねて「死にそう」を体で伝える。
  const tintH = Math.ceil(s.h * f);
  cx.globalCompositeOperation = 'source-atop';
  cx.globalAlpha = Math.min(0.95, 0.3 + f * 0.68 + pulse);
  cx.fillStyle = tintColor;
  cx.fillRect(0, s.h - tintH, s.w, tintH);
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';

  const w = Math.max(1, Math.round(s.w * scale));
  const h = Math.max(1, Math.round(s.h * scale));
  const dx = Math.round(x - w * s.ox);
  const dy = Math.round(y - h * s.oy);
  ctx.drawImage(sc, 0, 0, s.w, s.h, dx, dy, w, h);
}

/**
 * スプライト全体に薄い色を一様に重ねる（日陰の青いミストなど、frac無しの
 * 全身オーバーレイ用。blitHeatTintと同じsource-atop手法だが濃さは固定alpha）。
 */
export function blitOverlayTint(
  ctx: CanvasRenderingContext2D,
  s: Sprite,
  x: number,
  y: number,
  scale: number,
  tintColor: string,
  alpha: number,
): void {
  if (!tintScratch) {
    tintScratch = document.createElement('canvas');
    tintScratchCtx = tintScratch.getContext('2d')!;
    tintScratchCtx.imageSmoothingEnabled = false;
  }
  const sc = tintScratch;
  const cx = tintScratchCtx!;
  if (sc.width !== s.w || sc.height !== s.h) {
    sc.width = s.w;
    sc.height = s.h;
  } else {
    cx.clearRect(0, 0, s.w, s.h);
  }
  cx.drawImage(s.c, 0, 0);
  cx.globalCompositeOperation = 'source-atop';
  cx.globalAlpha = alpha;
  cx.fillStyle = tintColor;
  cx.fillRect(0, 0, s.w, s.h);
  cx.globalAlpha = 1;
  cx.globalCompositeOperation = 'source-over';

  const w = Math.max(1, Math.round(s.w * scale));
  const h = Math.max(1, Math.round(s.h * scale));
  const dx = Math.round(x - w * s.ox);
  const dy = Math.round(y - h * s.oy);
  ctx.drawImage(sc, 0, 0, s.w, s.h, dx, dy, w, h);
}

/** 単純な色置換コピー（モブ量産・日別パレット差し替え用） */
export function recolor(s: Sprite, from: string[], to: string[]): Sprite {
  const c = document.createElement('canvas');
  c.width = s.w;
  c.height = s.h;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(s.c, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const parse = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const fromRgb = from.map(parse);
  const toRgb = to.map(parse);
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (let j = 0; j < fromRgb.length; j++) {
      const [r, g, b] = fromRgb[j];
      if (d[i] === r && d[i + 1] === g && d[i + 2] === b) {
        const [r2, g2, b2] = toRgb[j];
        d[i] = r2;
        d[i + 1] = g2;
        d[i + 2] = b2;
        break;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return { c, w: s.w, h: s.h, ox: s.ox, oy: s.oy };
}
