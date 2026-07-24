// タイトル / OP / リザルト / 総合リザルト / ED

import { VW, VH, HUD_TOP } from '../core/video';
import { bitmapText, text } from '../core/font';
import { fmtTime } from '../core/i18n';
import { Background, THEMES, zToY, scaleAt, PSX } from '../gfx/bg';
import { blit } from '../gfx/pix';
import { pixCircle, makeStation } from '../gfx/wallart';
import type { Ctx, Scene } from './ctx';

const NIGHT = '#14101f';

/** メニュー操作の共通処理 */
class Menu {
  sel = 0;
  private cd = 0;
  constructor(private count: number) {}
  setCount(n: number): void {
    this.count = n;
    this.sel = Math.min(this.sel, n - 1);
  }
  update(ctx: Ctx, dt: number): 'ok' | null {
    const { input, audio } = ctx;
    this.cd = Math.max(0, this.cd - dt);
    if (this.cd <= 0) {
      if (input.moveY < -0.5) {
        this.sel = (this.sel + this.count - 1) % this.count;
        this.cd = 0.2;
        audio.sfx('uiMove');
      } else if (input.moveY > 0.5) {
        this.sel = (this.sel + 1) % this.count;
        this.cd = 0.2;
        audio.sfx('uiMove');
      }
    }
    if (input.confirmPressed) return 'ok';
    return null;
  }
  /** タップでの選択。行の矩形リストを渡す */
  tap(ctx: Ctx, rows: { y: number; h: number }[]): number | null {
    for (const tp of ctx.input.taps) {
      for (let i = 0; i < rows.length; i++) {
        if (tp.y >= rows[i].y && tp.y < rows[i].y + rows[i].h && tp.x > 60 && tp.x < VW - 60) {
          return i;
        }
      }
    }
    return null;
  }
}

// ==================================================
export class TitleScene implements Scene {
  private ctx: Ctx;
  private bg: Background;
  private t = 0;
  private camX = 0;
  private menu = new Menu(2);

  constructor(ctx: Ctx) {
    this.ctx = ctx;
    this.bg = new Background(THEMES[1]);
  }

  enter(): void {
    this.ctx.music.stop();
    this.t = 0;
  }

  update(dt: number): void {
    const { audio, music } = this.ctx;
    this.t += dt;
    this.camX += dt * 6;
    // 音楽はAudioContext解放後に
    if (audio.ctx && !music.isPlaying) music.play('title');
    music.update();

    const rows = [0, 1].map((i) => ({ y: 100 + i * 24 - 4, h: 22 }));
    const tapped = this.menu.tap(this.ctx, rows);
    if (tapped !== null) {
      this.menu.sel = tapped;
      this.activate();
      return;
    }
    if (this.menu.update(this.ctx, dt) === 'ok') this.activate();
  }

  private activate(): void {
    const { audio, save, i18n } = this.ctx;
    audio.sfx('uiOk');
    i18n.lang = this.menu.sel === 0 ? 'ja' : 'en';
    save.data.lang = i18n.lang;
    save.write();
    if (save.data.seenOp) this.ctx.gotoStage(1);
    else this.ctx.gotoOp();
  }

  render(g: CanvasRenderingContext2D): void {
    this.bg.drawBack(g, this.camX, this.t);
    this.bg.drawFloor(g, this.camX);

    // アトラクト: 走り続けるミナト
    const S = this.ctx.sprites.player;
    const dz = 0.62 + Math.sin(this.t * 0.7) * 0.08;
    const dy = zToY(dz);
    const dsc = scaleAt(dz) * 2.9;
    g.fillStyle = 'rgba(34,24,51,0.35)';
    g.fillRect(Math.round(PSX - 8), Math.round(dy) - 1, 17, 2);
    blit(g, S.run[Math.floor(this.t * 10) % 6], PSX, dy, dsc);
    // 足元の土埃
    g.fillStyle = '#cbb694';
    for (let i = 0; i < 3; i++) {
      const n = (this.t * 7 + i * 1.7) % 2;
      if (n < 1) g.fillRect(Math.round(PSX - 10 - n * 16), Math.round(dy - 2 - n * 3), 1, 1);
    }

    // 手前に薄暮ビネット
    g.fillStyle = 'rgba(20,16,31,0.3)';
    g.fillRect(0, 0, VW, VH);

    // 下端の筐体フレーム帯（HUD帯と同意匠。空白防止）
    g.fillStyle = '#14101f';
    g.fillRect(0, HUD_TOP, VW, VH - HUD_TOP);
    g.fillStyle = '#3ec6c0';
    g.fillRect(0, HUD_TOP, VW, 1);

    // ロゴ（背後に太陽、巨大なアーケード風ロゴタイプ）
    // ペタ塗りの水色〜青＋白フチ＋黒い継ぎ目で立体感を出す3層構成
    const LOGO_SCALE = 6;
    const ly = 24 + Math.sin(this.t * 1.5) * 2;
    pixCircle(g, VW / 2, Math.round(ly + 21), 76, 'rgba(255,217,77,0.22)');
    pixCircle(g, VW / 2, Math.round(ly + 21), 62, 'rgba(255,180,60,0.28)');
    // 白い外側の縁取り
    for (const [ox, oy] of [
      [-5, -5], [-3, -5], [0, -5], [3, -5], [5, -5],
      [-5, -3], [5, -3],
      [-5, 0], [5, 0],
      [-5, 3], [5, 3],
      [-5, 5], [-3, 5], [0, 5], [3, 5], [5, 5],
    ]) {
      bitmapText(g, 'RETRO-CROSS', VW / 2 + ox, ly + oy, { color: '#ffffff', align: 'center', scale: LOGO_SCALE });
    }
    // 黒い継ぎ目（縁がわずかに浮き上がった立体感）
    for (const [ox, oy] of [
      [-2, -2], [0, -2], [2, -2],
      [-2, 0], [2, 0],
      [-2, 2], [0, 2], [2, 2],
    ]) {
      bitmapText(g, 'RETRO-CROSS', VW / 2 + ox, ly + oy, { color: '#1a1a24', align: 'center', scale: LOGO_SCALE });
    }
    // 本体（水色と青の間のペタ塗り）
    bitmapText(g, 'RETRO-CROSS', VW / 2, ly, { color: '#2f9fd8', align: 'center', scale: LOGO_SCALE });

    // 言語選択（選ぶとそのままスタート）
    const labels = ['日本語でスタート', 'Start in English'];
    for (let i = 0; i < labels.length; i++) {
      const sel = this.menu.sel === i;
      text(g, (sel ? '▶ ' : '  ') + labels[i], VW / 2, 100 + i * 24, {
        size: 12,
        color: sel ? '#ffd94d' : '#f5f1e8',
        align: 'center',
        bold: sel,
      });
    }

    // アーケード風コピーライト表記
    text(g, '© 2026 MUKKII', VW / 2, 160, { size: 9, color: '#f5f1e8', align: 'center' });
    text(g, 'ALL RIGHT RESERVED', VW / 2, 173, { size: 9, color: '#f5f1e8', align: 'center' });

    // MUKKIIロゴ（丸みのある太字の赤。NAMCO風パロディ）
    text(g, 'MUKKII', VW / 2, 190, {
      size: 22,
      color: '#e0201e',
      align: 'center',
      bold: true,
      outline: '#7a0f0e',
    });
  }
}

// ==================================================
export class OpScene implements Scene {
  private ctx: Ctx;
  private t = 0;
  private panel = 0;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
  }

  enter(): void {
    this.ctx.music.stop();
    this.t = 0;
    this.panel = 0;
  }

  update(dt: number): void {
    const { input } = this.ctx;
    this.t += dt;
    this.ctx.music.update();
    const advance = input.confirmPressed || input.taps.length > 0 || this.t > 4.5;
    if (advance) {
      this.ctx.audio.sfx('uiOk');
      this.panel++;
      this.t = 0;
      if (this.panel >= 3) {
        this.ctx.save.data.seenOp = true;
        this.ctx.save.write();
        this.ctx.gotoStage(1);
      }
    }
  }

  render(g: CanvasRenderingContext2D): void {
    const { i18n } = this.ctx;
    g.fillStyle = NIGHT;
    g.fillRect(0, 0, VW, VH);
    const alpha = Math.min(1, this.t / 0.4);
    g.globalAlpha = alpha;
    // パネルごとの簡易ビジュアル
    if (this.panel === 0) {
      g.fillStyle = '#2e4a7a';
      g.fillRect(140, 60, 200, 90);
      g.fillStyle = '#bfe8f2';
      g.fillRect(148, 68, 184, 60);
      bitmapText(g, 'CEDEC 2026', VW / 2, 84, { color: '#221833', align: 'center', scale: 2 });
      bitmapText(g, 'JULY 22-24', VW / 2, 106, { color: '#2e4a7a', align: 'center' });
    } else if (this.panel === 1) {
      // 駅出口。外は白飛びする灼熱
      blit(g, makeStation(), VW / 2, 160, 1.8);
      g.fillStyle = 'rgba(255,246,200,0.9)';
      g.fillRect(212, 74, 56, 82);
      g.fillStyle = '#ffd94d';
      g.fillRect(226, 74, 28, 82);
      pixCircle(g, 240, 60, 14, '#fff6c8');
      pixCircle(g, 240, 60, 10, '#ffd94d');
      const spr = this.ctx.sprites.player.idle;
      blit(g, spr, 180, 158, 1.4);
    } else {
      // 走り出す
      const spr = this.ctx.sprites.player.run[Math.floor(this.t * 10) % 6];
      g.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 4; i++) {
        const y = 90 + i * 18;
        const x = (i * 133 + Math.floor(this.t * 500)) % VW;
        g.fillRect(VW - x, y, 30, 1);
      }
      blit(g, spr, VW / 2, 132, 1.8);
      bitmapText(g, '5 MIN', VW / 2 - 80, 56, { color: '#3ec6c0', align: 'center', scale: 2, shadow: '#221833' });
      text(g, '→', VW / 2, 60, { size: 12, color: '#8f86b8', align: 'center' });
      bitmapText(g, '30 MIN?!', VW / 2 + 78, 56, { color: '#ff5a32', align: 'center', scale: 2, shadow: '#221833' });
    }
    text(g, i18n.t(`op.${this.panel + 1}`), VW / 2, 178, {
      size: 11,
      color: '#f5f1e8',
      align: 'center',
      bold: true,
    });
    g.globalAlpha = 1;
    text(g, i18n.t('op.skip'), VW - 12, VH - 16, { size: 8, color: '#4a4468', align: 'right' });
  }
}

// ==================================================
export class ResultScene implements Scene {
  private ctx: Ctx;
  private t = 0;
  private menu = new Menu(3);
  private time: number;
  private stars: number;
  private isBest: boolean;

  constructor(ctx: Ctx, time: number, stars: number, isBest: boolean) {
    this.ctx = ctx;
    this.time = time;
    this.stars = stars;
    this.isBest = isBest;
  }

  enter(): void {
    this.t = 0;
    this.ctx.music.play('goal');
  }

  update(dt: number): void {
    const { input } = this.ctx;
    this.t += dt;
    this.ctx.music.update();
    if (this.t > 1.4 && this.t - dt <= 1.4) {
      this.ctx.audio.sfx('rank');
    }
    if (this.t > 1.8 && this.isBest && this.t - dt <= 1.8) {
      this.ctx.audio.sfx('record');
    }
    if (this.t < 1.2) return;

    if (input.retryPressed) {
      this.ctx.gotoStage(1);
      return;
    }
    const rows = [0, 1, 2].map((i) => ({ y: 172 + i * 20 - 4, h: 20 }));
    const tapped = this.menu.tap(this.ctx, rows);
    if (tapped !== null) {
      this.menu.sel = tapped;
      this.activate();
      return;
    }
    if (this.menu.update(this.ctx, dt) === 'ok') this.activate();
  }

  private activate(): void {
    this.ctx.audio.sfx('uiOk');
    switch (this.menu.sel) {
      case 0:
        this.ctx.gotoEd();
        break;
      case 1:
        this.ctx.gotoStage(1);
        break;
      case 2:
        this.ctx.gotoTitle();
        break;
    }
  }

  render(g: CanvasRenderingContext2D): void {
    const { i18n, save } = this.ctx;
    g.fillStyle = NIGHT;
    g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#241b3a';
    g.fillRect(60, 30, VW - 120, VH - 60);
    g.fillStyle = '#3ec6c0';
    g.fillRect(60, 30, VW - 120, 2);

    text(g, i18n.t('res.clear'), VW / 2, 44, {
      size: 12,
      color: '#ffd94d',
      align: 'center',
      scale: 1,
      bold: true,
    });

    // タイムロール
    const shown = this.t < 0.9 ? this.time * Math.min(1, this.t / 0.9) : this.time;
    bitmapText(g, `${i18n.t('res.time')}`, VW / 2 - 60, 62, { color: '#8f86b8', align: 'right' });
    bitmapText(g, fmtTime(shown), VW / 2 - 50, 58, { color: '#f5f1e8', scale: 2 });

    // ★評価スタンプ（タイムの下に中央揃え）
    if (this.t > 1.4) {
      const pop = Math.min(1, (this.t - 1.4) / 0.15);
      const sc = Math.max(2, Math.round(2 + (1 - pop) * 1.6));
      for (let i = 0; i < 3; i++) {
        const filled = i < this.stars;
        const col = filled ? '#ffd94d' : '#3a3358';
        bitmapText(g, '★', VW / 2 - 26 + i * 26, 96, { color: col, align: 'center', scale: sc, shadow: '#221833' });
      }
      text(g, i18n.t(`res.star${this.stars}`), VW / 2, 122, { size: 9, color: '#ffd94d', align: 'center' });
    }

    const best = save.data.best;
    if (best !== null) {
      bitmapText(g, `${i18n.t('res.best')} ${fmtTime(best)}`, VW / 2, 140, { color: '#8f86b8', align: 'center' });
    }
    if (this.isBest && this.t > 1.8 && Math.floor(this.t * 3) % 2 === 0) {
      bitmapText(g, i18n.t('res.newRecord'), VW / 2, 154, { color: '#ffd94d', align: 'center' });
    }

    if (this.t > 1.2) {
      const labels = [i18n.t('res.toEd'), i18n.t('res.retry'), i18n.t('res.toTitle')];
      for (let i = 0; i < 3; i++) {
        const sel = this.menu.sel === i;
        text(g, (sel ? '▶ ' : '  ') + labels[i], VW / 2, 170 + i * 20, {
          size: 11,
          color: sel ? '#f5f1e8' : '#8f86b8',
          align: 'center',
          bold: sel,
        });
      }
    }
  }
}

// ==================================================
// ED: 冷房のロビー → 総合リザルト → スタッフロール → FIN
const CREDITS: [string, string][] = [
  ['CEDEC HEAT DASH 2026', 'CEDEC HEAT DASH 2026'],
  ['', ''],
  ['ランナー：ミナト', 'RUNNER: MINATO'],
  ['日射担当：太陽（本人）', 'SOLAR LASER: THE SUN (itself)'],
  ['冷房協力：スズシヤ全店', 'COOLING: SUZUSHIYA STORES'],
  ['道路監修：徒歩5分という概念', 'ROUTE DESIGN: THE CONCEPT OF "5-MIN WALK"'],
  ['群衆：観光客のみなさん', 'CROWD: TOURISTS'],
  ['営業：名刺交換マン', 'SALES: BUSINESS CARD GUY'],
  ['特殊効果：陽炎・蜃気楼', 'VFX: HEAT HAZE & MIRAGE'],
  ['気候：うだる暑さ', 'CLIMATE: SCORCHING'],
  ['', ''],
  ['SPECIAL THANKS', 'SPECIAL THANKS'],
  ['水分 / 塩分 / 日陰のみなさん', 'WATER / SALT / ALL SHADES'],
  ['そして走った あなた', 'AND YOU, WHO RAN'],
  ['', ''],
  ['ミナトは、めざせCEDECを走り抜いた。', 'Minato ran the whole way to CEDEC.'],
];

export class EdScene implements Scene {
  private ctx: Ctx;
  private t = 0;
  private phase: 'lobby' | 'credits' | 'fin' = 'lobby';

  constructor(ctx: Ctx) {
    this.ctx = ctx;
  }

  enter(): void {
    this.t = 0;
    this.ctx.music.play('ed');
  }

  update(dt: number): void {
    this.t += dt;
    this.ctx.music.update();
    const tapped = this.ctx.input.confirmPressed || this.ctx.input.taps.length > 0;
    switch (this.phase) {
      case 'lobby':
        if (this.t > 7.5 || (this.t > 1 && tapped)) {
          this.phase = 'credits';
          this.t = 0;
          this.ctx.audio.sfx('uiOk');
        }
        break;
      case 'credits': {
        const dur = CREDITS.length * 1.1 + 2;
        if (this.t > dur || (this.t > 1.5 && tapped)) {
          this.phase = 'fin';
          this.t = 0;
        }
        break;
      }
      case 'fin':
        if (this.t > 2.5 && tapped) this.ctx.gotoTitle();
        break;
    }
  }

  render(g: CanvasRenderingContext2D): void {
    const { i18n } = this.ctx;
    g.fillStyle = NIGHT;
    g.fillRect(0, 0, VW, VH);

    if (this.phase === 'lobby') {
      // 冷房の効いた会場ロビー（クールダウンした世界＝暑さとの対比）
      const bands = ['#1a2a4a', '#1e3458', '#244068', '#2a4c78', '#305888'];
      for (let i = 0; i < bands.length; i++) {
        g.fillStyle = bands[i];
        g.fillRect(0, i * 34, VW, 34);
      }
      // 床
      g.fillStyle = '#182444';
      g.fillRect(0, 170, VW, 100);
      g.fillStyle = '#22305a';
      for (let x = 0; x < VW; x += 40) g.fillRect(x, 170, 1, 100);
      for (let y = 170; y < 270; y += 20) g.fillRect(0, y, VW, 1);
      // 窓の外は灼熱
      g.fillStyle = '#221833';
      g.fillRect(40, 30, 90, 110);
      g.fillStyle = '#ff9e4f';
      g.fillRect(44, 34, 82, 102);
      g.fillStyle = '#ffd166';
      g.fillRect(44, 100, 82, 36);
      // AC吹き出しの冷気
      g.fillStyle = 'rgba(180,230,255,0.5)';
      for (let i = 0; i < 14; i++) {
        const x = 200 + ((i * 53 + this.t * 40) % 240);
        const y = 30 + ((i * 31 + this.t * 22) % 90);
        g.fillRect(Math.round(x), Math.round(y), 2, 1);
      }
      // 主人公（涼んでいる）
      blit(g, this.ctx.sprites.player.idle, 240, 208, 2.4);
      const lines = ['ed.1', 'ed.2', 'ed.3'];
      for (let i = 0; i < lines.length; i++) {
        if (this.t > 1 + i * 1.9) {
          const isPunch = i === 2;
          text(g, i18n.t(lines[i]), 300, 52 + i * 26, {
            size: isPunch ? 12 : 10,
            color: isPunch ? '#ffd94d' : '#c8c2e0',
            bold: isPunch,
          });
        }
      }
      return;
    }

    if (this.phase === 'credits') {
      const scroll = this.t * 26;
      for (let i = 0; i < CREDITS.length; i++) {
        const y = VH + 20 + i * 26 - scroll;
        if (y < -20 || y > VH + 20) continue;
        const line = i18n.lang === 'ja' ? CREDITS[i][0] : CREDITS[i][1];
        const isTitle = i === 0;
        text(g, line, VW / 2, y, {
          size: isTitle ? 12 : 10,
          color: isTitle ? '#3ec6c0' : '#c8c2e0',
          align: 'center',
          bold: isTitle,
        });
      }
      return;
    }

    // fin
    text(g, i18n.t('ed.3'), VW / 2, 100, { size: 13, color: '#ffd94d', align: 'center', bold: true });
    text(g, i18n.t('ed.thanks'), VW / 2, 140, { size: 11, color: '#3ec6c0', align: 'center' });
    text(g, i18n.t('ed.fin'), VW / 2, 170, { size: 10, color: '#8f86b8', align: 'center' });
    if (this.t > 2.5 && Math.floor(this.t * 2) % 2 === 0) {
      text(g, i18n.t('title.press'), VW / 2, 214, { size: 9, color: '#8f86b8', align: 'center' });
    }
  }
}
