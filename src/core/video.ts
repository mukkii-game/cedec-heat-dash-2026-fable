// 内部480×270のドット絵ビューを、横=レターボックス / 縦=上部ビュー+下部タッチデッキ
// の2レイアウトで実画面へ最近傍拡大する表示システム。

export const VW = 480;
export const VH = 270;

// 床の疑似奥行きレイアウト（ART_DIRECTION.md準拠）
export const HORIZON_Y = 100;
export const FLOOR_TOP = 104; // z=0（奥）
export const FLOOR_BOTTOM = 232; // z=1（手前）
export const HUD_TOP = 236;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type LayoutMode = 'landscape' | 'portrait';

export class Video {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** 内部ゲームビュー（480×270） */
  readonly view: HTMLCanvasElement;
  readonly vctx: CanvasRenderingContext2D;

  mode: LayoutMode = 'landscape';
  viewRect: Rect = { x: 0, y: 0, w: VW, h: VH };
  /** 縦画面時の下部タッチデッキ領域（実画面座標） */
  deckRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  scale = 1;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.view = document.createElement('canvas');
    this.view.width = VW;
    this.view.height = VH;
    this.vctx = this.view.getContext('2d')!;
    this.vctx.imageSmoothingEnabled = false;
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => this.resize());
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    if (w >= h) {
      this.mode = 'landscape';
      const s = Math.min(cw / VW, ch / VH);
      const vw = Math.floor(VW * s);
      const vh = Math.floor(VH * s);
      this.scale = s;
      this.viewRect = {
        x: Math.floor((cw - vw) / 2),
        y: Math.floor((ch - vh) / 2),
        w: vw,
        h: vh,
      };
      this.deckRect = { x: 0, y: 0, w: 0, h: 0 };
    } else {
      this.mode = 'portrait';
      const s = cw / VW;
      const vh = Math.floor(VH * s);
      const topPad = Math.floor(ch * 0.04);
      this.scale = s;
      this.viewRect = { x: 0, y: topPad, w: cw, h: vh };
      const deckY = topPad + vh;
      this.deckRect = { x: 0, y: deckY, w: cw, h: ch - deckY };
    }
    this.ctx.imageSmoothingEnabled = false;
  }

  /** 実画面座標 → ビュー内座標（480×270系）。ビュー外はnull */
  toViewCoords(clientX: number, clientY: number): { x: number; y: number } | null {
    const px = clientX * this.dpr;
    const py = clientY * this.dpr;
    const r = this.viewRect;
    if (px < r.x || py < r.y || px >= r.x + r.w || py >= r.y + r.h) return null;
    return { x: ((px - r.x) / r.w) * VW, y: ((py - r.y) / r.h) * VH };
  }

  /** 実画面座標(CSS px)→キャンバス物理座標 */
  toCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    return { x: clientX * this.dpr, y: clientY * this.dpr };
  }

  beginFrame(): void {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#14101f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  /** 内部ビューを実画面へ転送 */
  present(): void {
    const r = this.viewRect;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.view, r.x, r.y, r.w, r.h);
  }
}
