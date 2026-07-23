// キーボード＋ポインタ統合入力。
// 横画面: 左半分ドラッグ=奥行き移動 / 右半分タップ=ジャンプ
// 縦画面: 下部デッキの上下パッド＋JUMPボタン（描画もここが担当）

import type { Video, Rect } from './video';

const DRAG_RANGE = 40; // CSSpx: 仮想スティックの飽和距離

interface PointerState {
  id: number;
  role: 'move' | 'jump' | 'padUp' | 'padDown';
  startX: number;
  startY: number;
  curX: number;
  curY: number;
}

export class Input {
  /** -1(奥)〜+1(手前) */
  moveY = 0;
  private jumpQ = false;
  private confirmQ = false;
  private pauseQ = false;
  private muteQ = false;
  private retryQ = false;
  private langQ = false;
  /** ビュー座標(480×270)でのタップ位置（メニュー用） */
  taps: { x: number; y: number }[] = [];
  /** 最後の入力がタッチか（操作ヒント出し分け用） */
  touchMode = false;
  onFirstGesture: (() => void) | null = null;

  private keys = new Set<string>();
  private pointers = new Map<number, PointerState>();
  private video: Video;
  private gestured = false;

  // 縦画面デッキのボタン矩形（キャンバス物理座標）
  padUp: Rect = { x: 0, y: 0, w: 0, h: 0 };
  padDown: Rect = { x: 0, y: 0, w: 0, h: 0 };
  padJump: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(video: Video) {
    this.video = video;
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.pointers.clear();
    });
    const c = video.canvas;
    c.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    c.addEventListener('pointermove', (e) => this.onPointerMove(e));
    c.addEventListener('pointerup', (e) => this.onPointerUp(e));
    c.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private fireGesture(): void {
    if (!this.gestured) {
      this.gestured = true;
      this.onFirstGesture?.();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)
    ) {
      e.preventDefault();
    }
    this.fireGesture();
    this.touchMode = false;
    if (e.repeat) return;
    this.keys.add(e.code);
    switch (e.code) {
      case 'Space':
      case 'KeyZ':
      case 'KeyX':
        this.jumpQ = true;
        this.confirmQ = true;
        break;
      case 'Enter':
        this.confirmQ = true;
        break;
      case 'Escape':
      case 'KeyP':
        this.pauseQ = true;
        break;
      case 'KeyM':
        this.muteQ = true;
        break;
      case 'KeyR':
        this.retryQ = true;
        break;
      case 'KeyL':
        this.langQ = true;
        break;
    }
  }

  private layoutDeck(): void {
    const d = this.video.deckRect;
    if (d.h <= 0) return;
    const m = Math.floor(d.w * 0.045);
    const padW = Math.floor(d.w * 0.42);
    const topY = d.y + Math.floor(d.h * 0.1);
    const usableH = Math.floor(d.h * 0.82);
    const padH = Math.floor(usableH * 0.47);
    this.padUp = { x: d.x + m, y: topY, w: padW, h: padH };
    this.padDown = { x: d.x + m, y: topY + usableH - padH, w: padW, h: padH };
    const jw = Math.floor(d.w * 0.42);
    const jh = Math.floor(usableH * 0.62);
    this.padJump = {
      x: d.x + d.w - m - jw,
      y: topY + Math.floor((usableH - jh) / 2),
      w: jw,
      h: jh,
    };
  }

  private hit(r: Rect, x: number, y: number): boolean {
    return x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.fireGesture();
    this.touchMode = e.pointerType !== 'mouse';
    this.video.canvas.setPointerCapture?.(e.pointerId);
    const cc = this.video.toCanvasCoords(e.clientX, e.clientY);
    const vc = this.video.toViewCoords(e.clientX, e.clientY);
    if (vc) this.taps.push(vc);
    this.confirmQ = true;

    this.layoutDeck();
    let role: PointerState['role'];
    if (this.video.mode === 'portrait' && this.hit(this.padJump, cc.x, cc.y)) {
      role = 'jump';
      this.jumpQ = true;
    } else if (this.video.mode === 'portrait' && this.hit(this.padUp, cc.x, cc.y)) {
      role = 'padUp';
    } else if (this.video.mode === 'portrait' && this.hit(this.padDown, cc.x, cc.y)) {
      role = 'padDown';
    } else if (e.clientX < window.innerWidth * 0.45) {
      role = 'move';
    } else {
      role = 'jump';
      this.jumpQ = true;
    }
    this.pointers.set(e.pointerId, {
      id: e.pointerId,
      role,
      startX: e.clientX,
      startY: e.clientY,
      curX: e.clientX,
      curY: e.clientY,
    });
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.curX = e.clientX;
    p.curY = e.clientY;
  }

  private onPointerUp(e: PointerEvent): void {
    this.pointers.delete(e.pointerId);
  }

  /** 毎フレーム呼ぶ。moveYを確定する */
  update(): void {
    let my = 0;
    if (this.keys.has('ArrowUp') || this.keys.has('KeyW')) my -= 1;
    if (this.keys.has('ArrowDown') || this.keys.has('KeyS')) my += 1;
    for (const p of this.pointers.values()) {
      if (p.role === 'move') {
        const d = (p.curY - p.startY) / DRAG_RANGE;
        const dz = Math.abs(d) < 0.12 ? 0 : Math.max(-1, Math.min(1, d));
        my += dz;
      } else if (p.role === 'padUp') my -= 1;
      else if (p.role === 'padDown') my += 1;
    }
    this.moveY = Math.max(-1, Math.min(1, my));
  }

  /** フレーム終端で単発入力をクリア */
  endFrame(): void {
    this.jumpQ = false;
    this.confirmQ = false;
    this.pauseQ = false;
    this.muteQ = false;
    this.retryQ = false;
    this.langQ = false;
    this.taps.length = 0;
  }

  get jumpPressed(): boolean {
    return this.jumpQ;
  }
  get confirmPressed(): boolean {
    return this.confirmQ;
  }
  get pausePressed(): boolean {
    return this.pauseQ;
  }
  get mutePressed(): boolean {
    return this.muteQ;
  }
  get retryPressed(): boolean {
    return this.retryQ;
  }
  get langPressed(): boolean {
    return this.langQ;
  }
  /** 移動パッド/ドラッグが押されているか（デッキ描画用） */
  get holdingUp(): boolean {
    return this.moveY < -0.2;
  }
  get holdingDown(): boolean {
    return this.moveY > 0.2;
  }
  get holdingJumpPad(): boolean {
    for (const p of this.pointers.values()) if (p.role === 'jump') return true;
    return false;
  }

  /** 縦画面タッチデッキの描画（実キャンバスへ、ドット絵調） */
  drawDeck(ctx: CanvasRenderingContext2D): void {
    if (this.video.mode !== 'portrait') return;
    this.layoutDeck();
    const d = this.video.deckRect;
    if (d.h < 40) return;
    const px = Math.max(2, Math.floor(this.video.scale));

    const drawPad = (r: Rect, active: boolean, dir: 'up' | 'down' | null, label: string) => {
      ctx.fillStyle = active ? '#3ec6c0' : '#241b3a';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = active ? '#7fe8e2' : '#4a3a6a';
      ctx.fillRect(r.x, r.y, r.w, px);
      ctx.fillRect(r.x, r.y, px, r.h);
      ctx.fillStyle = active ? '#1b7a76' : '#171028';
      ctx.fillRect(r.x, r.y + r.h - px, r.w, px);
      ctx.fillRect(r.x + r.w - px, r.y, px, r.h);
      const cx = r.x + r.w / 2;
      const cy = r.y + r.h / 2;
      ctx.fillStyle = active ? '#14101f' : '#8f86b8';
      if (dir) {
        const s = Math.min(r.w, r.h) * 0.22;
        ctx.beginPath();
        if (dir === 'up') {
          ctx.moveTo(cx, cy - s);
          ctx.lineTo(cx - s, cy + s * 0.7);
          ctx.lineTo(cx + s, cy + s * 0.7);
        } else {
          ctx.moveTo(cx, cy + s);
          ctx.lineTo(cx - s, cy - s * 0.7);
          ctx.lineTo(cx + s, cy - s * 0.7);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.font = `bold ${Math.floor(Math.min(r.w, r.h) * 0.28)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cx, cy);
      }
    };
    drawPad(this.padUp, this.holdingUp, 'up', '');
    drawPad(this.padDown, this.holdingDown, 'down', '');
    drawPad(this.padJump, this.holdingJumpPad, null, 'JUMP');
  }
}
