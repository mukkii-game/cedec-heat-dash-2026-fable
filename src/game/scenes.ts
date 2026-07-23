// タイトル / OP / リザルト / 総合リザルト / ED

import { VW, VH } from '../core/video';
import { bitmapText, text } from '../core/font';
import { fmtTime } from '../core/i18n';
import { Background, THEMES } from '../gfx/bg';
import { blit } from '../gfx/pix';
import { COURSES } from './course';
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
  private menu = new Menu(4);
  private mode: 'press' | 'menu' | 'days' = 'press';
  private daySel = 0;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
    this.bg = new Background(THEMES[1]);
  }

  enter(): void {
    this.ctx.music.stop();
    this.t = 0;
  }

  update(dt: number): void {
    const { input, audio, save, i18n, music } = this.ctx;
    this.t += dt;
    this.camX += dt * 6;
    // 音楽はAudioContext解放後に
    if (audio.ctx && !music.isPlaying) music.play('title');
    music.update();

    if (input.mutePressed) this.ctx.toggleMute();
    if (input.langPressed) {
      i18n.toggle();
      save.data.lang = i18n.lang;
      save.write();
    }

    if (this.mode === 'press') {
      if (input.confirmPressed || input.taps.length > 0) {
        audio.sfx('uiOk');
        this.mode = 'menu';
      }
      return;
    }

    if (this.mode === 'menu') {
      const rows = [0, 1, 2, 3].map((i) => ({ y: 152 + i * 20 - 4, h: 20 }));
      const tapped = this.menu.tap(this.ctx, rows);
      if (tapped !== null) {
        this.menu.sel = tapped;
        this.activate();
        return;
      }
      if (this.menu.update(this.ctx, dt) === 'ok') this.activate();
      return;
    }

    // day select
    const unlocked = this.unlockedDays();
    const rows = unlocked.concat([-1]).map((_, i) => ({ y: 152 + i * 20 - 4, h: 20 }));
    const tapped = this.menu.tap(this.ctx, rows);
    if (tapped !== null) {
      this.daySel = tapped;
      this.activateDay();
      return;
    }
    if (this.menu.update(this.ctx, dt) === 'ok') {
      this.daySel = this.menu.sel;
      this.activateDay();
    }
  }

  private unlockedDays(): number[] {
    const { save } = this.ctx;
    const out = [1];
    if (save.data.cleared[0] && COURSES[2]) out.push(2);
    if (save.data.cleared[1] && COURSES[3]) out.push(3);
    return out;
  }

  private activate(): void {
    const { audio, save, i18n } = this.ctx;
    audio.sfx('uiOk');
    switch (this.menu.sel) {
      case 0:
        if (save.data.seenOp) this.ctx.gotoStage(1, true);
        else this.ctx.gotoOp();
        break;
      case 1:
        this.mode = 'days';
        this.menu = new Menu(this.unlockedDays().length + 1);
        break;
      case 2:
        i18n.toggle();
        save.data.lang = i18n.lang;
        save.write();
        break;
      case 3:
        this.ctx.toggleMute();
        break;
    }
  }

  private activateDay(): void {
    const days = this.unlockedDays();
    this.ctx.audio.sfx('uiOk');
    if (this.daySel >= days.length) {
      this.mode = 'menu';
      this.menu = new Menu(4);
      return;
    }
    this.ctx.gotoStage(days[this.daySel], false);
  }

  render(g: CanvasRenderingContext2D): void {
    const { i18n, save } = this.ctx;
    this.bg.drawBack(g, this.camX, this.t);
    this.bg.drawFloor(g, this.camX);
    // 手前に薄暮ビネット
    g.fillStyle = 'rgba(20,16,31,0.3)';
    g.fillRect(0, 0, VW, VH);

    // ロゴ
    const ly = 42 + Math.sin(this.t * 1.5) * 2;
    bitmapText(g, 'CEDEC', VW / 2, ly, { color: '#3ec6c0', align: 'center', scale: 3, shadow: '#221833' });
    bitmapText(g, 'HEAT DASH', VW / 2, ly + 26, { color: '#ffd94d', align: 'center', scale: 4, shadow: '#b03042' });
    bitmapText(g, '2026', VW / 2, ly + 62, { color: '#f5f1e8', align: 'center', scale: 2, shadow: '#221833' });
    text(g, i18n.t('title.sub'), VW / 2, ly + 82, { size: 10, color: '#f5f1e8', align: 'center' });

    if (this.mode === 'press') {
      if (Math.floor(this.t * 2) % 2 === 0) {
        text(g, i18n.t('title.press'), VW / 2, 172, { size: 11, color: '#ffd94d', align: 'center', bold: true });
      }
      // ベストタイム
      const bests = save.data.best;
      if (bests.some((b) => b !== null)) {
        let bx = VW / 2 - 100;
        for (let i = 0; i < 3; i++) {
          const b = bests[i];
          bitmapText(g, `DAY${i + 1} ${b === null ? '--' : fmtTime(b)}`, bx, 208, { color: '#8f86b8' });
          bx += 78;
        }
      }
      if (save.data.bestTotal !== null) {
        bitmapText(g, `${i18n.lang === 'ja' ? 'TOTAL' : 'TOTAL'} ${fmtTime(save.data.bestTotal)}`, VW / 2, 222, {
          color: '#ffd94d',
          align: 'center',
        });
      }
    } else if (this.mode === 'menu') {
      const labels = [
        i18n.t('title.start'),
        i18n.t('title.day'),
        i18n.t('title.lang'),
        this.ctx.audio.muted ? i18n.t('title.soundOff') : i18n.t('title.sound'),
      ];
      for (let i = 0; i < labels.length; i++) {
        const sel = this.menu.sel === i;
        text(g, (sel ? '▶ ' : '  ') + labels[i], VW / 2, 150 + i * 20, {
          size: 11,
          color: sel ? '#f5f1e8' : '#8f86b8',
          align: 'center',
          bold: sel,
        });
      }
    } else {
      const days = this.unlockedDays();
      const bests = save.data.best;
      for (let i = 0; i < days.length; i++) {
        const sel = this.menu.sel === i;
        const b = bests[days[i] - 1];
        text(g, `${sel ? '▶ ' : '  '}DAY ${days[i]}  ${b === null ? '' : fmtTime(b)}`, VW / 2, 150 + i * 20, {
          size: 11,
          color: sel ? '#f5f1e8' : '#8f86b8',
          align: 'center',
          bold: sel,
        });
      }
      const sel = this.menu.sel === days.length;
      text(g, (sel ? '▶ ' : '  ') + (i18n.lang === 'ja' ? 'もどる' : 'BACK'), VW / 2, 150 + days.length * 20, {
        size: 11,
        color: sel ? '#f5f1e8' : '#8f86b8',
        align: 'center',
      });
    }

    text(g, '© 2026 HEAT DASH PROJECT', VW / 2, VH - 14, { size: 8, color: '#4a4468', align: 'center' });
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
        this.ctx.gotoStage(1, true);
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
      // 白飛びする出口
      g.fillStyle = '#fff6c8';
      g.fillRect(190, 50, 100, 110);
      g.fillStyle = '#ffd94d';
      g.fillRect(205, 50, 70, 110);
      const spr = this.ctx.sprites.player.idle;
      blit(g, spr, VW / 2, 160, 1.4);
    } else {
      const spr = this.ctx.sprites.player.run[2];
      blit(g, spr, VW / 2, 130, 1.6);
      bitmapText(g, '5 MIN', VW / 2 - 70, 60, { color: '#3ec6c0', align: 'center', scale: 2 });
      bitmapText(g, '30 MIN?!', VW / 2 + 70, 60, { color: '#ff5a32', align: 'center', scale: 2 });
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
  readonly day: number;
  private time: number;
  private rank: string;
  private isBest: boolean;

  constructor(ctx: Ctx, day: number, time: number, rank: string, isBest: boolean) {
    this.ctx = ctx;
    this.day = day;
    this.time = time;
    this.rank = rank;
    this.isBest = isBest;
  }

  enter(): void {
    this.t = 0;
    this.ctx.music.play('goal');
  }

  private get hasNext(): boolean {
    return this.ctx.fullRun && COURSES[this.day + 1] !== undefined;
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
      this.ctx.gotoStage(this.day, this.ctx.fullRun);
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
        if (this.hasNext) {
          this.ctx.runTimes[this.day - 1] = this.time;
          this.ctx.gotoStage(this.day + 1, true);
        } else if (this.ctx.fullRun) {
          this.ctx.runTimes[this.day - 1] = this.time;
          this.ctx.gotoEd();
        } else {
          this.ctx.gotoTitle();
        }
        break;
      case 1:
        this.ctx.gotoStage(this.day, this.ctx.fullRun);
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

    text(g, `DAY ${this.day}  ${i18n.t('res.clear')}`, VW / 2, 44, {
      size: 12,
      color: '#ffd94d',
      align: 'center',
      scale: 1,
      bold: true,
    });

    // タイムロール
    const shown = this.t < 0.9 ? this.time * Math.min(1, this.t / 0.9) : this.time;
    bitmapText(g, `${i18n.t('res.time')}`, VW / 2 - 80, 78, { color: '#8f86b8' });
    bitmapText(g, fmtTime(shown), VW / 2 + 10, 74, { color: '#f5f1e8', scale: 2 });

    const best = save.data.best[this.day - 1];
    if (best !== null) {
      bitmapText(g, `${i18n.t('res.best')} ${fmtTime(best)}`, VW / 2, 104, { color: '#8f86b8', align: 'center' });
    }
    if (this.isBest && this.t > 1.8 && Math.floor(this.t * 3) % 2 === 0) {
      bitmapText(g, i18n.t('res.newRecord'), VW / 2, 118, { color: '#ffd94d', align: 'center' });
    }

    // ランクスタンプ
    if (this.t > 1.4) {
      const pop = Math.min(1, (this.t - 1.4) / 0.15);
      const sc = 4 + (1 - pop) * 4;
      const col = { S: '#ffd94d', A: '#3ec6c0', B: '#4ad84a', C: '#8f86b8' }[this.rank] ?? '#8f86b8';
      bitmapText(g, this.rank, VW / 2 + 130, 66, { color: col, align: 'center', scale: Math.round(sc), shadow: '#221833' });
      text(g, i18n.t(`res.rank${this.rank}`), VW / 2 + 130, 112, { size: 9, color: col, align: 'center' });
    }

    if (this.t > 1.2) {
      const labels = [
        this.hasNext ? i18n.t('res.next') : this.ctx.fullRun ? 'ED →' : i18n.t('res.toTitle'),
        i18n.t('res.retry'),
        i18n.t('res.toTitle'),
      ];
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
  ['ミナトは、3日間 完走した。', 'Minato survived all three days.'],
];

export class EdScene implements Scene {
  private ctx: Ctx;
  private t = 0;
  private phase: 'lobby' | 'result' | 'credits' | 'fin' = 'lobby';
  private isBestTotal = false;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
  }

  enter(): void {
    this.t = 0;
    this.ctx.music.play('ed');
    const total = this.ctx.runTimes.reduce((a, b) => a + b, 0);
    if (total > 0) this.isBestTotal = this.ctx.save.recordTotal(total);
  }

  update(dt: number): void {
    this.t += dt;
    this.ctx.music.update();
    const tapped = this.ctx.input.confirmPressed || this.ctx.input.taps.length > 0;
    switch (this.phase) {
      case 'lobby':
        if (this.t > 7.5 || (this.t > 1 && tapped)) {
          this.phase = 'result';
          this.t = 0;
          this.ctx.audio.sfx('uiOk');
        }
        break;
      case 'result':
        if (this.t > 1.6 && this.t - dt <= 1.6) this.ctx.audio.sfx('rank');
        if (this.t > 2 && this.isBestTotal && this.t - dt <= 2) this.ctx.audio.sfx('record');
        if (this.t > 6 || (this.t > 2.2 && tapped)) {
          this.phase = 'credits';
          this.t = 0;
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
    const { i18n, save } = this.ctx;
    g.fillStyle = NIGHT;
    g.fillRect(0, 0, VW, VH);

    if (this.phase === 'lobby') {
      // 冷房の効いた会場ロビー（青の世界＝3日間の暑さとの対比）
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

    if (this.phase === 'result') {
      const total = this.ctx.runTimes.reduce((a, b) => a + b, 0);
      text(g, i18n.t('total.title'), VW / 2, 36, { size: 12, color: '#ffd94d', align: 'center', bold: true });
      for (let i = 0; i < 3; i++) {
        const tm = this.ctx.runTimes[i];
        const show = this.t > 0.4 + i * 0.35;
        if (show && tm > 0) {
          bitmapText(g, `DAY${i + 1}`, VW / 2 - 90, 68 + i * 18, { color: '#8f86b8' });
          bitmapText(g, fmtTime(tm), VW / 2 + 60, 68 + i * 18, { color: '#f5f1e8', align: 'right' });
        }
      }
      if (this.t > 1.6) {
        g.fillStyle = '#3ec6c0';
        g.fillRect(VW / 2 - 90, 126, 150, 1);
        bitmapText(g, i18n.t('total.sum'), VW / 2 - 90, 136, { color: '#3ec6c0' });
        bitmapText(g, fmtTime(total), VW / 2 + 60, 132, { color: '#ffd94d', align: 'right', scale: 2 });
      }
      if (this.t > 2 && this.isBestTotal && Math.floor(this.t * 3) % 2 === 0) {
        bitmapText(g, i18n.t('total.newRecord'), VW / 2, 168, { color: '#ffd94d', align: 'center' });
      }
      const bt = save.data.bestTotal;
      if (bt !== null && this.t > 1.8) {
        bitmapText(g, `${i18n.t('res.best')} ${fmtTime(bt)}`, VW / 2, 190, { color: '#8f86b8', align: 'center' });
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
