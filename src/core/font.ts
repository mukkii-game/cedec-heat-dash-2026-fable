// テキスト描画。
// - bitmapText: 自作5×7アーケード体（英数字・HUD/メニュー用、オリジナル字形）
// - text: 日本語含む任意文字列。小サイズ描画→α2値化で全環境ドット絵調にする

const G: Record<string, string> = {
  A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
  B: '####.|#...#|#...#|####.|#...#|#...#|####.',
  C: '.####|#....|#....|#....|#....|#....|.####',
  D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
  E: '#####|#....|#....|####.|#....|#....|#####',
  F: '#####|#....|#....|####.|#....|#....|#....',
  G: '.####|#....|#....|#..##|#...#|#...#|.####',
  H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
  I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
  J: '....#|....#|....#|....#|#...#|#...#|.###.',
  K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
  L: '#....|#....|#....|#....|#....|#....|#####',
  M: '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#',
  N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
  O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
  P: '####.|#...#|#...#|####.|#....|#....|#....',
  Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
  R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
  S: '.####|#....|#....|.###.|....#|....#|####.',
  T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
  U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
  V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
  W: '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#',
  X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
  Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
  Z: '#####|....#|...#.|..#..|.#...|#....|#####',
  '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
  '1': '..#..|.##..|..#..|..#..|..#..|..#..|#####',
  '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
  '3': '#####|....#|...#.|..##.|....#|#...#|.###.',
  '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
  '5': '#####|#....|####.|....#|....#|#...#|.###.',
  '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
  '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
  '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
  '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
  '.': '.....|.....|.....|.....|.....|.##..|.##..',
  ',': '.....|.....|.....|.....|..##.|..#..|.#...',
  '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
  '?': '.###.|#...#|....#|...#.|..#..|.....|..#..',
  ':': '.....|.##..|.##..|.....|.##..|.##..|.....',
  '-': '.....|.....|.....|#####|.....|.....|.....',
  '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
  '/': '....#|....#|...#.|..#..|.#...|#....|#....',
  "'": '..#..|..#..|.#...|.....|.....|.....|.....',
  '"': '.#.#.|.#.#.|#.#..|.....|.....|.....|.....',
  '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
  ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...',
  '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
  '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
  '=': '.....|#####|.....|#####|.....|.....|.....',
  '%': '##..#|##..#|...#.|..#..|.#...|#..##|#..##',
  '&': '.##..|#..#.|#..#.|.##..|#.#.#|#..#.|.##.#',
  '×': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....',
  '♪': '...##|...#.|...#.|...#.|.###.|####.|.##..',
  '→': '.....|..#..|...#.|#####|...#.|..#..|.....',
  '←': '.....|..#..|.#...|#####|.#...|..#..|.....',
  '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|..#..',
  '↓': '..#..|..#..|..#..|..#..|#.#.#|.###.|..#..',
  '★': '..#..|..#..|.###.|#####|.###.|.#.#.|#...#',
  _: '.....|.....|.....|.....|.....|.....|#####',
};

const CELL_W = 6; // 5px + 1px送り

export interface BitmapTextOpts {
  color?: string;
  scale?: number;
  align?: 'left' | 'center' | 'right';
  /** 影の色（1pxずれ）。省略で影なし */
  shadow?: string;
}

export function bitmapTextWidth(text: string, scale = 1): number {
  return text.length * CELL_W * scale - scale;
}

export function bitmapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  opts: BitmapTextOpts = {},
): void {
  const { color = '#f5f1e8', scale = 1, align = 'left', shadow } = opts;
  const up = text.toUpperCase();
  let sx = x;
  const w = bitmapTextWidth(up, scale);
  if (align === 'center') sx = Math.round(x - w / 2);
  else if (align === 'right') sx = Math.round(x - w);
  const draw = (ox: number, oy: number, col: string) => {
    ctx.fillStyle = col;
    let cx = sx + ox;
    for (const ch of up) {
      const rows = G[ch];
      if (rows) {
        const lines = rows.split('|');
        for (let ry = 0; ry < lines.length; ry++) {
          const line = lines[ry];
          for (let rx = 0; rx < line.length; rx++) {
            if (line[rx] === '#') {
              ctx.fillRect(cx + rx * scale, y + oy + ry * scale, scale, scale);
            }
          }
        }
      }
      cx += CELL_W * scale;
    }
  };
  if (shadow) draw(scale, scale, shadow);
  draw(0, 0, color);
}

// ---- 日本語対応テキスト（疑似ドット化） ----

let pixelFontReady = false;

/** 同梱ピクセルフォントの読み込みを試みる（無くてもフォールバックで動く） */
export async function loadPixelFont(url: string | null): Promise<void> {
  if (!url) return;
  try {
    const face = new FontFace('GamePixel', `url(${url})`);
    await face.load();
    (document.fonts as FontFaceSet).add(face);
    pixelFontReady = true;
  } catch {
    pixelFontReady = false;
  }
}

const textCache = new Map<string, HTMLCanvasElement>();

function renderTextCanvas(text: string, size: number, color: string, bold: boolean): HTMLCanvasElement {
  const key = `${size}|${color}|${bold ? 1 : 0}|${pixelFontReady ? 1 : 0}|${text}`;
  const hit = textCache.get(key);
  if (hit) return hit;
  const family = pixelFontReady
    ? `'GamePixel','MS Gothic',monospace`
    : `'MS Gothic','Osaka-Mono',monospace`;
  // 高解像度で描いてから縮小することで、元フォントの丸みを保ったまま
  // 小さいサイズでも読める字形にする（完全な2値化のガタつきを避ける）。
  const SS = 3;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = `${bold ? 'bold ' : ''}${size * SS}px ${family}`;
  const w = Math.max(1, Math.ceil(measure.measureText(text).width / SS) + 2);
  const h = Math.ceil(size * 1.35);

  const big = document.createElement('canvas');
  big.width = w * SS;
  big.height = h * SS;
  const bcx = big.getContext('2d')!;
  bcx.font = `${bold ? 'bold ' : ''}${size * SS}px ${family}`;
  bcx.textBaseline = 'top';
  bcx.fillStyle = color;
  bcx.fillText(text, SS, SS);

  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const cx = c.getContext('2d')!;
  cx.imageSmoothingEnabled = true;
  cx.imageSmoothingQuality = 'high';
  cx.drawImage(big, 0, 0, big.width, big.height, 0, 0, w, h);

  // 完全な2値化はやめ、なだらかなコントラスト強調のみに留める。
  // 元フォントの滑らかな輪郭を活かしつつ、背景に負けない濃さを確保する。
  const img = cx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    d[i] = a <= 30 ? 0 : a >= 170 ? 255 : Math.round(Math.pow((a - 30) / 140, 0.7) * 255);
  }
  cx.putImageData(img, 0, 0);
  if (textCache.size > 400) textCache.clear();
  textCache.set(key, c);
  return c;
}

export interface TextOpts {
  size?: number; // 基本描画サイズ(px)。10か12推奨
  color?: string;
  align?: 'left' | 'center' | 'right';
  outline?: string;
  bold?: boolean;
  /** 整数拡大率 */
  scale?: number;
  lineHeight?: number;
}

/** 日本語含むテキスト描画。戻り値は総高さ */
export function text(
  ctx: CanvasRenderingContext2D,
  str: string,
  x: number,
  y: number,
  opts: TextOpts = {},
): number {
  const {
    size = 10,
    color = '#f5f1e8',
    align = 'left',
    outline,
    bold = false,
    scale = 1,
    lineHeight = Math.round(size * 1.3),
  } = opts;
  const lines = str.split('\n');
  let yy = y;
  for (const line of lines) {
    if (line !== '') {
      const c = renderTextCanvas(line, size, color, bold);
      const w = c.width * scale;
      let sx = x;
      if (align === 'center') sx = Math.round(x - w / 2);
      else if (align === 'right') sx = Math.round(x - w);
      ctx.imageSmoothingEnabled = false;
      if (outline) {
        const oc = renderTextCanvas(line, size, outline, bold);
        for (const [ox, oy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          ctx.drawImage(oc, sx + ox * scale, yy + oy * scale, w, c.height * scale);
        }
      }
      ctx.drawImage(c, sx, yy, w, c.height * scale);
    }
    yy += lineHeight * scale;
  }
  return yy - y;
}

export function textWidth(str: string, size = 10, scale = 1): number {
  let max = 0;
  for (const line of str.split('\n')) {
    const c = renderTextCanvas(line, size, '#fff', false);
    max = Math.max(max, c.width * scale);
  }
  return max;
}
