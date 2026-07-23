// ゲームプレイ本体。走行・熱・障害物・レーザー・コンビニ・HUD・演出。

import { VW, VH, FLOOR_TOP, HUD_TOP } from '../core/video';
import { bitmapText, text, textWidth } from '../core/font';
import { fmtTime } from '../core/i18n';
import { Background, THEMES, zToY, scaleAt, ppmAt, sxOf, PSX, hash } from '../gfx/bg';
import { blit, blitHeatTint, flipX, type Sprite } from '../gfx/pix';
import {
  makeTree,
  makePalm,
  makeVending,
  makeStation,
  makeStore,
  makePillar,
  makeDome,
  makeSign,
  makeBanner,
} from '../gfx/wallart';
import { COURSES, type Course, type ObDef } from './course';
import { calcStars, type Ctx, type Scene } from './ctx';

// ---- 調整値（GAME_DESIGN.md §3） ----
const V_MIN = 4.5;
const ACCEL = 5.0;
const DECEL = 8.0;
const BRAKE_DECEL = 11.0;
const Z_SPEED = 1.5;
const JUMP_T = 0.55;
const JUMP_H = 17; // px
const STUMBLE_T = 0.5;
const INVULN_T = 1.2;
const MAX_SUN = 10.0;
const MAX_SHADE = 8.4;
const MAX_GLARE = 10.8;
const DASH_MULT = 1.4; // ダッシュ時の上限倍率
const BRAKE_V = 3.8;
const SAND_MULT = 0.6;
// ヒート（0=快適 100=熱中症）。日向で上がり日陰で下がる
const HEAT_SUN = 2.2;
const HEAT_SHADE = -3.0;
const HEAT_GLARE = 5.5;
const HEAT_MIST = -12.0;
const HEAT_DASH_SUN = 4.3; // ダッシュ中の追加ヒート（日向合計+6.5/s＝押しっぱなしが安全な支配戦略にならない水準）
const HEAT_DASH_SHADE = 2.4;
const BRAKE_HEAT_MULT = 0.55; // ブレーキ中は日向の蓄熱を抑える
const STORE_TIME = 1.4;
const STORE_COOL = 55;
const CARD_TIME = 0.7;
// 距離/警告時間は「巡航速度(8.4〜10.8m/s)では届かず、ダッシュ速度(11.8〜15.1m/s)
// でだけ被弾しうる」を維持しつつ、GAME_DESIGN.md §10の「1秒以上の予告」を満たす値
const GULL_TRIGGER_DIST = 18; // m
const GULL_WARN_T = 1.0; // s
const GULL_DIVE_T = 0.6; // s
const GULL_HIT_FROM = 0.15; // dive開始からの被弾有効化(s)
/** 表示用スプライト倍率（画面上の存在感。当たり判定はメートル系で不変） */
const SPR = 1.45;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  grav: number;
}

interface Ob extends ObDef {
  baseZ: number;
  curZ: number;
  curX: number;
  phase: number;
  taken?: boolean; // drink等
  done?: boolean; // cardman
  // gull
  gullState?: 'idle' | 'warn' | 'dive' | 'gone';
  gullT?: number;
}

interface LaserRt {
  state: 'idle' | 'warn' | 'fire' | 'done';
  t: number;
  hitDone: boolean;
}

interface Quip {
  text: string;
  t: number;
}

type StState = 'intro' | 'ready' | 'play' | 'goal' | 'dead';

export class Stage implements Scene {
  private ctx: Ctx;
  private course: Course;
  private day: number;
  private bg: Background;
  private state: StState = 'intro';
  private stateT = 0;
  private paused = false;
  private pauseSel = 0;

  // player
  private px = 0;
  private pz = 0.6;
  private v = V_MIN;
  /** ヒートゲージ 0(快適)〜100(熱中症) */
  private heat = 0;
  private dashing = false;
  private braking = false;
  /** ダッシュ=前傾(+)、ブレーキ=後傾(-)。滑らかに追従するラジアン角 */
  private tiltAngle = 0;
  private airT = -1; // -1=接地
  private stumbleT = 0;
  private invulnT = 0;
  private cardT = 0;
  private storeT = 0;
  private storeUsed = new Set<number>();
  private animT = 0;
  private timer = 0;

  private obs: Ob[] = [];
  private lasers: LaserRt[] = [];
  /** 蜃気楼ゾーンの残存度（コースzones配列と同indexで1→0） */
  private mirageFade: number[] = [];
  private particles: Particle[] = [];
  private quips: Quip[] = [];
  private quipCd = 0;
  private shakeT = 0;
  private flashT = 0;
  private time = 0; // 演出用グローバル時間
  private firstShade = false;
  private firstLowHp = false;
  private firstBrick = false;
  private hintT = 4.5;
  /** ?auto=1: 簡易AIで自走（クリア可能性検証・デモ用） */
  private autoPilot = new URLSearchParams(location.search).has('auto');

  // wall art
  private artTree: Sprite;
  private artPalm: Sprite;
  private artVending: Sprite;
  private artStation: Sprite;
  private artStore: Sprite;
  private artPillar: Sprite;
  private artDome: Sprite;
  private pedFlip: Sprite[][];

  constructor(ctx: Ctx, day: number) {
    this.ctx = ctx;
    this.day = day;
    this.course = COURSES[day] ?? COURSES[1];
    this.bg = new Background(THEMES[day] ?? THEMES[1]);
    this.artTree = makeTree();
    this.artPalm = makePalm();
    this.artVending = makeVending();
    this.artStation = makeStation();
    this.artStore = makeStore();
    this.artPillar = makePillar();
    this.artDome = makeDome();
    this.pedFlip = ctx.sprites.peds.map((fr) => fr.map(flipX));
    this.reset();
  }

  private reset(): void {
    this.px = 0;
    this.pz = 0.6;
    this.v = V_MIN;
    this.heat = 0;
    this.dashing = false;
    this.braking = false;
    this.tiltAngle = 0;
    this.airT = -1;
    this.stumbleT = 0;
    this.invulnT = 0;
    this.cardT = 0;
    this.storeT = 0;
    this.storeUsed.clear();
    this.timer = 0;
    this.state = 'intro';
    this.stateT = 0;
    this.paused = false;
    this.particles = [];
    this.quips = [];
    this.quipCd = 0;
    this.firstShade = false;
    this.firstLowHp = false;
    this.firstBrick = false;
    this.hintT = 4.5;
    // phaseは決定論的（座標由来のhash）にする。乱数だと同じ日でも毎回
    // 人・カモメの動きが変わり、「覚えて上達する」がタイムに乗らなくなるため。
    this.obs = this.course.obs.map((o) => ({
      ...o,
      baseZ: o.z,
      curZ: o.z,
      curX: o.x,
      phase: hash(o.x * 3.7 + o.z * 11.3) * Math.PI * 2,
      gullState: o.type === 'gull' ? 'idle' : undefined,
      gullT: 0,
    }));
    this.lasers = this.course.lasers.map(() => ({ state: 'idle', t: 0, hitDone: false }));
    this.mirageFade = this.course.zones.map(() => 1);
  }

  enter(): void {
    this.ctx.music.stop();
  }

  // ---- 環境 ----
  private env(x: number, z: number) {
    let shaded = false;
    let sand = false;
    let glare = false;
    let mist = false;
    for (const zn of this.course.zones) {
      if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) {
        if (zn.kind === 'shade') shaded = true;
        else if (zn.kind === 'sand') sand = true;
        else if (zn.kind === 'glare') glare = true;
        else if (zn.kind === 'mist') mist = true;
      }
    }
    let maxV = shaded ? MAX_SHADE : glare ? MAX_GLARE : MAX_SUN;
    if (sand && this.airT < 0) maxV *= SAND_MULT;
    let heatRate = shaded ? HEAT_SHADE : glare ? HEAT_GLARE : HEAT_SUN;
    if (mist) heatRate = HEAT_MIST;
    return { maxV, heatRate, shaded, sand, glare, mist };
  }

  private quip(str: string, force = false): void {
    if (this.quipCd > 0 && !force) return;
    this.quips = [{ text: str, t: 1.8 }];
    this.quipCd = 2.2;
    this.ctx.audio.sfx('quip');
  }

  private damage(amount: number, opts: { trip?: boolean } = {}): void {
    if (this.invulnT > 0) return;
    this.heat = Math.min(100, this.heat + amount);
    this.v = Math.max(V_MIN * 0.7, this.v * (opts.trip ? 0.5 : 0.35));
    this.stumbleT = STUMBLE_T;
    this.invulnT = INVULN_T;
    this.shakeT = 0.25;
    this.ctx.audio.sfx('damage');
    this.quip(this.ctx.i18n.t('q.damage'));
    for (let i = 0; i < 8; i++) {
      this.spawnP(PSX, zToY(this.pz) - 14, (Math.random() - 0.5) * 60, -Math.random() * 50, 0.4, '#ffd94d', 2, 120);
    }
    if (this.heat >= 100) {
      this.state = 'dead';
      this.stateT = 0;
      this.ctx.music.stop();
      this.ctx.audio.sfx('collapse');
      this.quip(this.ctx.i18n.t('q.heatMax'), true);
    }
  }

  private spawnP(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    color: string,
    size: number,
    grav = 0,
  ): void {
    if (this.particles.length > 180) return;
    this.particles.push({ x, y, vx, vy, life, maxLife: life, color, size, grav });
  }

  // ---- 更新 ----
  update(dt: number): void {
    this.time += dt;
    const { input, audio, i18n, music } = this.ctx;

    // ポーズ切替
    if ((this.state === 'play' || this.state === 'ready') && input.pausePressed) {
      this.paused = !this.paused;
      audio.sfx('uiOk');
    }
    // プレイ中でもRで即リトライ（「失敗してもすぐ再挑戦」を貫くため、
    // ポーズ/死亡後だけでなくいつでも効くようにする）
    if (
      !this.paused &&
      (this.state === 'play' || this.state === 'ready' || this.state === 'intro') &&
      input.retryPressed
    ) {
      audio.sfx('uiOk');
      this.reset();
      return;
    }
    if (input.mutePressed) this.ctx.toggleMute();
    // HUDのボタン（タップ）
    for (const tp of input.taps) {
      if (tp.y > HUD_TOP) {
        if (tp.x > VW - 20) this.ctx.toggleMute();
        else if (tp.x > VW - 40) {
          if (this.state === 'play') this.paused = !this.paused;
        }
      }
    }
    // プレイ中以外（ポーズ/死亡/ゴール等）は加減速の持続音を必ず止める
    if (this.paused || this.state !== 'play') {
      audio.setDashLoop(false);
      audio.setBrakeLoop(false);
    }

    if (this.paused) {
      this.updatePause();
      return;
    }

    this.stateT += dt;
    this.quipCd = Math.max(0, this.quipCd - dt);
    for (const q of this.quips) q.t -= dt;
    this.quips = this.quips.filter((q) => q.t > 0);
    this.updateParticles(dt);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.flashT = Math.max(0, this.flashT - dt);

    switch (this.state) {
      case 'intro':
        if (this.stateT > 1.7 || input.confirmPressed) {
          this.state = 'ready';
          this.stateT = 0;
          audio.sfx('countBeep');
        }
        break;
      case 'ready':
        if (this.stateT >= 0.9 && this.stateT - dt < 0.9) {
          audio.sfx('go');
          music.play(`day${this.day}` as 'day1' | 'day2' | 'day3');
          this.quip(i18n.t('q.start'));
        }
        if (this.stateT >= 0.9) {
          this.state = 'play';
          this.stateT = 0;
        }
        break;
      case 'play':
        this.updatePlay(dt);
        break;
      case 'goal':
        this.updateGoal(dt);
        break;
      case 'dead':
        this.updateDead(dt);
        break;
    }
    music.update();
  }

  private updatePause(): void {
    // ポーズ/再開のトグル自体は update() 冒頭で処理済み（同フレーム内で
    // pausePressed を再度見ると、まだクリアされておらず即座に解除してしまうため、
    // ここでは扱わない）。
    const { input, audio } = this.ctx;
    const items = 3;
    for (const tp of input.taps) {
      const idx = Math.floor((tp.y - 130) / 22);
      if (tp.x > 170 && tp.x < 310 && idx >= 0 && idx < items) {
        this.pauseSel = idx;
        this.pauseAction();
        return;
      }
    }
    if (input.jumpPressed || input.confirmPressed) {
      this.pauseAction();
      return;
    }
    if (input.retryPressed) {
      this.pauseSel = 1;
      this.pauseAction();
      return;
    }
    // キーボード上下（edge検出を簡略化: moveYの符号変化で送る）
    if (this.pauseMoveCd <= 0) {
      if (input.moveY < -0.5) {
        this.pauseSel = (this.pauseSel + items - 1) % items;
        this.pauseMoveCd = 0.22;
        audio.sfx('uiMove');
      } else if (input.moveY > 0.5) {
        this.pauseSel = (this.pauseSel + 1) % items;
        this.pauseMoveCd = 0.22;
        audio.sfx('uiMove');
      }
    }
    this.pauseMoveCd = Math.max(0, this.pauseMoveCd - 1 / 60);
  }
  private pauseMoveCd = 0;

  private pauseAction(): void {
    const { audio } = this.ctx;
    audio.sfx('uiOk');
    if (this.pauseSel === 0) this.paused = false;
    else if (this.pauseSel === 1) {
      this.reset();
    } else {
      this.ctx.gotoTitle();
    }
  }

  private updatePlay(dt: number): void {
    const { input, audio, i18n, music } = this.ctx;
    this.timer += dt;
    this.animT += dt * (this.v / 7);
    this.hintT = Math.max(0, this.hintT - dt);

    // 障害物・レーザーは停止中も動かし続ける
    this.updateObs(dt);
    this.updateLasers(dt);

    // コンビニ滞在
    if (this.storeT > 0) {
      this.storeT -= dt;
      this.v = 0;
      for (let i = 0; i < 2; i++) {
        this.spawnP(PSX + (Math.random() - 0.5) * 30, zToY(this.pz) - 20 - Math.random() * 10, -10, 8, 0.5, '#bfe8ff', 1, 0);
      }
      if (this.storeT <= 0) {
        this.heat = Math.max(0, this.heat - STORE_COOL);
        this.v = V_MIN;
        this.invulnT = 0.5;
      }
      return;
    }
    // 名刺交換
    if (this.cardT > 0) {
      this.cardT -= dt;
      this.v = 0;
      if (this.cardT <= 0) {
        this.v = V_MIN;
        this.quip(i18n.t('q.card'));
      }
      return;
    }

    // 入力（?auto=1 でオートパイロット。クリア可能性検証とデモに使用）
    const ai = this.autoPilot ? this.autoInput() : null;
    const moveY = ai ? ai.my : input.moveY;
    const moveX = ai ? ai.ax : input.moveX;
    const jumpIn = ai ? ai.jump : input.jumpPressed;

    // 奥行き移動
    const zRate = this.airT >= 0 ? 0.3 : this.stumbleT > 0 ? 0.5 : 1;
    this.pz = Math.min(0.97, Math.max(0.03, this.pz + moveY * Z_SPEED * zRate * dt));

    // 環境と速度（ダッシュ=速いが熱い / ブレーキ=遅いが涼しく安全）
    const env = this.env(this.px, this.pz);
    const wasDashing = this.dashing;
    const wasBraking = this.braking;
    this.dashing = moveX > 0.35 && this.stumbleT <= 0;
    this.braking = moveX < -0.35;
    let targetV = env.maxV;
    let dashHeat = 0;
    if (this.dashing) {
      targetV = env.maxV * DASH_MULT;
      dashHeat = env.shaded ? HEAT_DASH_SHADE : HEAT_DASH_SUN;
      if (!wasDashing) audio.sfx('dash');
    } else if (this.braking) {
      targetV = Math.min(targetV, BRAKE_V);
    }
    if (this.dashing !== wasDashing) audio.setDashLoop(this.dashing);
    if (this.braking !== wasBraking) audio.setBrakeLoop(this.braking);
    // 加減速の体の傾き（ダッシュ=前傾/右回り、ブレーキ=後傾/左回り）を滑らかに追従
    const tiltTarget = this.dashing ? 0.17 : this.braking ? -0.13 : 0;
    this.tiltAngle += (tiltTarget - this.tiltAngle) * Math.min(1, dt * 10);
    if (this.v < targetV) this.v = Math.min(targetV, this.v + (this.dashing ? ACCEL * 1.5 : ACCEL) * dt);
    else this.v = Math.max(targetV, this.v - (this.braking ? BRAKE_DECEL : DECEL) * dt);
    if (this.stumbleT > 0) this.v = Math.min(this.v, env.maxV * 0.75);
    this.px += this.v * dt;

    // ヒート収支
    let heatRate = env.heatRate + dashHeat;
    if (this.braking && heatRate > 0) heatRate *= BRAKE_HEAT_MULT;
    this.heat = Math.min(100, Math.max(0, this.heat + heatRate * dt));
    if (this.heat >= 100) {
      this.state = 'dead';
      this.stateT = 0;
      music.stop();
      audio.sfx('collapse');
      this.quip(i18n.t('q.heatMax'), true);
      return;
    }
    if (this.heat > 75) {
      audio.sfxLowHp(this.heat);
      if (!this.firstLowHp) {
        this.firstLowHp = true;
        this.quip(i18n.t('q.lowHp'));
      }
    }

    // 日陰演出
    if (env.shaded && !this.wasShaded) {
      audio.sfx('shade');
      if (!this.firstShade) {
        this.firstShade = true;
        this.quip(i18n.t('q.shade'));
      }
      for (let i = 0; i < 6; i++) {
        this.spawnP(PSX + (Math.random() - 0.5) * 20, zToY(this.pz) - 24, (Math.random() - 0.5) * 20, -20, 0.5, '#9fd0ff', 1, 0);
      }
    }
    if (env.mist && !this.wasMist) {
      audio.sfx('mist');
      this.quip(i18n.t('q.mist'));
    }
    this.wasShaded = env.shaded;
    this.wasMist = env.mist;

    // 汗・土埃（ヒートが高いほど汗が増える）
    if (!env.shaded && Math.random() < dt * (1.5 + this.heat * 0.06)) {
      this.spawnP(PSX + 6, zToY(this.pz) - 26, 14, -26, 0.4, '#bfe8ff', 1, 90);
    }
    if (this.airT < 0 && this.v > 6 && Math.random() < dt * (this.dashing ? 26 : 14)) {
      this.spawnP(PSX - 8, zToY(this.pz) - 1, -30 - Math.random() * 30, -12 - Math.random() * 18, 0.3, env.sand ? '#d9a45c' : '#cbb694', 1, 160);
    }

    // ジャンプ
    if (this.airT >= 0) {
      this.airT += dt;
      if (this.airT >= JUMP_T) {
        this.airT = -1;
        audio.sfx('land');
        for (let i = 0; i < 4; i++) {
          this.spawnP(PSX + (Math.random() - 0.5) * 10, zToY(this.pz), (Math.random() - 0.5) * 50, -10, 0.25, '#cbb694', 1, 140);
        }
      }
    } else if (jumpIn && this.stumbleT <= 0) {
      this.airT = 0;
      // ジャンプ連打で万能回避にならないよう、踏切りで少し速度を削る
      this.v *= 0.94;
      audio.sfx('jump');
    }

    this.stumbleT = Math.max(0, this.stumbleT - dt);
    this.invulnT = Math.max(0, this.invulnT - dt);

    // 蜃気楼: 近づくと消える（揺らぎで偽物と分かるが、初見は騙される）
    for (let i = 0; i < this.course.zones.length; i++) {
      const zn = this.course.zones[i];
      if (zn.kind !== 'mirage') continue;
      if (this.px > zn.x0 - 14 && this.mirageFade[i] > 0) {
        const prev = this.mirageFade[i];
        this.mirageFade[i] = Math.max(0, prev - dt * 1.8);
        if (prev > 0.5 && this.mirageFade[i] <= 0.5) {
          this.quip(i18n.t('q.mirage'));
          audio.sfx('mist');
        }
      }
    }

    this.checkStore();
    this.checkCollisions();

    // 終盤ブースト
    music.heat = this.px / this.course.length > 0.8;

    // ゴール
    if (this.px >= this.course.length) {
      this.state = 'goal';
      this.stateT = 0;
      music.stop();
      audio.sfx('goal');
      this.quip(i18n.t(`q.goal${this.day}`));
      for (let i = 0; i < 50; i++) {
        this.spawnP(
          PSX + Math.random() * 200,
          40 + Math.random() * 120,
          (Math.random() - 0.5) * 40,
          20 + Math.random() * 40,
          1.6,
          ['#e8504b', '#3ec6c0', '#f2a33c', '#f5f1e8', '#ff6ea8'][i % 5],
          2,
          30,
        );
      }
    }
  }
  private wasShaded = false;
  private wasMist = false;

  private updateGoal(dt: number): void {
    const restStart = 1.3;
    if (this.stateT < restStart) {
      // ゴール直後は惰性で少し進みつつ減速→バンザイ
      this.animT += dt * (this.v / 7);
      this.px += this.v * dt;
      this.v = Math.max(V_MIN, this.v - 6 * dt);
    } else {
      // 膝をついて座り込み、湯気を上げてしばし休む
      this.v = 0;
      if (this.stateT - dt <= restStart) this.quip(this.ctx.i18n.t('q.restPant'), true);
      if (Math.random() < dt * 5) {
        const bx = PSX + (Math.random() - 0.5) * 6;
        this.spawnP(bx, zToY(this.pz) - 20, (Math.random() - 0.5) * 4, -18 - Math.random() * 10, 1.0, 'rgba(230,230,235,0.6)', 2, -6);
      }
    }
    if (this.stateT > restStart + 2.1) {
      const t = Math.round(this.timer * 100) / 100;
      const stars = calcStars(t, this.course.par);
      const isBest = this.ctx.save.recordClear(this.day - 1, t);
      this.ctx.gotoResult(this.day, t, stars, isBest);
    }
  }

  private updateDead(dt: number): void {
    const { input } = this.ctx;
    if (this.stateT > 1.2) {
      if (input.retryPressed || input.jumpPressed || input.confirmPressed) {
        this.ctx.audio.sfx('uiOk');
        this.reset();
        return;
      }
      for (const tp of input.taps) {
        if (tp.y > 150 && tp.y < 200) {
          this.ctx.audio.sfx('uiOk');
          this.reset();
          return;
        }
        if (tp.y >= 200 && tp.y < 230) {
          this.ctx.gotoTitle();
          return;
        }
      }
    }
    void dt;
  }

  /** 簡易オートパイロット: 影を好み、障害物を避け/跳び、レーザー帯から逃げ、熱が高いとコンビニへ */
  private autoInput(): { my: number; ax: number; jump: boolean } {
    let targetZ = 0.55;
    let jump = false;
    let dangerAhead = false;
    if (this.heat > 30) {
      for (const zn of this.course.zones) {
        if (zn.kind !== 'shade') continue;
        if (zn.x1 < this.px + 2 || zn.x0 > this.px + 30) continue;
        targetZ = (zn.z0 + zn.z1) / 2;
        break;
      }
    }
    if (this.heat > 58) {
      for (const sx of this.course.stores) {
        if (!this.storeUsed.has(sx) && sx > this.px - 1 && sx < this.px + 26) targetZ = 0.08;
      }
    }
    let laserEngaged = false;
    for (let i = 0; i < this.lasers.length; i++) {
      const rt = this.lasers[i];
      if (rt.state !== 'warn' && rt.state !== 'fire') continue;
      const def = this.course.lasers[i];
      if (this.px > def.x - def.halfW - 14 && this.px < def.x + def.halfW + 2) {
        laserEngaged = true;
        if (def.sweep) {
          // スイープは始点(z0)側で待ち、帯が通過したらそのまま
          targetZ = Math.max(0.06, def.z0 + 0.03);
          break;
        }
        const env = this.env(this.px, this.pz);
        const inBand = this.pz > def.z0 - 0.05 && this.pz < def.z1 + 0.05;
        if (inBand && !env.shaded) {
          targetZ = def.z0 > 0.15 ? def.z0 - 0.15 : def.z1 + 0.15;
          targetZ = Math.min(0.95, Math.max(0.05, targetZ));
        } else {
          targetZ = this.pz;
        }
      }
    }
    // 砂を避ける（レーザー対応中でなければ）
    if (!laserEngaged) {
      for (const zn of this.course.zones) {
        if (zn.kind !== 'sand') continue;
        if (zn.x1 < this.px + 1 || zn.x0 > this.px + 14) continue;
        if (targetZ >= zn.z0 - 0.06 && targetZ <= zn.z1 + 0.06) {
          const below = zn.z0 - 0.12;
          const above = zn.z1 + 0.12;
          targetZ = below > 0.05 && (Math.abs(below - this.pz) < Math.abs(above - this.pz) || above > 0.95) ? below : Math.min(0.95, above);
        }
      }
    }
    for (const o of this.obs) {
      if (o.taken || o.done || o.type === 'drink' || o.type === 'energy') continue;
      if (o.type === 'gull' && o.gullState !== 'warn' && o.gullState !== 'dive') continue;
      const dx = o.curX - this.px;
      if (dx < 0.5 || dx > 10) continue;
      if (Math.abs(o.curZ - this.pz) > 0.16) continue;
      dangerAhead = true;
      const jumpable =
        o.type === 'cone' ||
        o.type === 'planter' ||
        o.type === 'coolbox' ||
        o.type === 'tumbleweed' ||
        o.type === 'dune' ||
        o.type === 'brick';
      if (jumpable && dx < this.v * 0.32 && this.airT < 0) {
        jump = true;
      } else if (!jumpable) {
        targetZ = o.curZ > this.pz ? Math.max(0.05, o.curZ - 0.28) : Math.min(0.95, o.curZ + 0.28);
      }
    }
    // ダッシュ判断: 熱に余裕があり進路が安全なとき
    const ax = !laserEngaged && !dangerAhead && this.heat < 52 ? 1 : 0;
    const dzT = targetZ - this.pz;
    return { my: Math.abs(dzT) < 0.03 ? 0 : Math.sign(dzT), ax, jump };
  }

  private updateObs(dt: number): void {
    for (const o of this.obs) {
      if (o.taken || o.done) continue;
      const dist = o.curX - this.px;
      if (dist < -30 || dist > 90) continue;
      switch (o.type) {
        case 'ped':
        case 'suitcase': {
          o.curX += (o.v ?? 0) * dt;
          if (o.zAmp) {
            o.curZ = o.baseZ + Math.sin(this.time * 0.9 + o.phase) * o.zAmp;
            o.curZ = Math.min(0.95, Math.max(0.05, o.curZ));
          }
          break;
        }
        case 'gull': {
          // トリガー距離・予告時間は、巡航〜ダッシュ速度(8.4〜15.1m/s)で
          // 実際に被弾しうる窓に収まるよう調整済み（でないと理論上ノーダメージになる）
          o.gullT = (o.gullT ?? 0) + dt;
          if (o.gullState === 'idle' && this.px > o.x - GULL_TRIGGER_DIST) {
            o.gullState = 'warn';
            o.gullT = 0;
            this.ctx.audio.sfx('gull');
          } else if (o.gullState === 'warn' && o.gullT > GULL_WARN_T) {
            o.gullState = 'dive';
            o.gullT = 0;
          } else if (o.gullState === 'dive' && o.gullT > GULL_DIVE_T) {
            o.gullState = 'gone';
            o.gullT = 0;
          }
          break;
        }
        case 'tumbleweed': {
          o.curX -= 3.2 * dt;
          break;
        }
        case 'cart': {
          o.curZ = o.baseZ + Math.sin(this.time * (o.v ?? 0.8) + o.phase) * 0.42;
          o.curZ = Math.min(0.95, Math.max(0.05, o.curZ));
          break;
        }
        case 'kickboard': {
          // 迷惑にーちゃん: 通常のpedより速いサインカーブで縦横無尽に動く
          o.curX += (o.v ?? 3.4) * dt;
          o.curZ = o.baseZ + Math.sin(this.time * 3.6 + o.phase) * (o.zAmp ?? 0.4);
          o.curZ = Math.min(0.95, Math.max(0.05, o.curZ));
          break;
        }
        case 'brick': {
          // ゆっくり回転しながらこちらへ向かってくる(ゼビウス バキュラ風)
          o.curX -= (o.v ?? 2.6) * dt;
          o.curZ = o.baseZ + Math.sin(this.time * 1.4 + o.phase) * 0.06;
          if (!this.firstBrick && dist < 30) {
            this.firstBrick = true;
            this.quip(this.ctx.i18n.t('q.brick'));
          }
          break;
        }
      }
    }
  }

  private updateLasers(dt: number): void {
    const { audio, i18n } = this.ctx;
    for (let i = 0; i < this.lasers.length; i++) {
      const rt = this.lasers[i];
      const def = this.course.lasers[i];
      switch (rt.state) {
        case 'idle':
          if (this.px > def.triggerX) {
            rt.state = 'warn';
            rt.t = 0;
            audio.sfx('laserWarn');
            this.quip(i18n.t('q.laserWarn'));
          }
          break;
        case 'warn':
          rt.t += dt;
          if (rt.t > 0.85 && rt.t - dt <= 0.85) audio.sfx('laserWarn');
          if (rt.t >= 1.8) {
            rt.state = 'fire';
            rt.t = 0;
            audio.sfx('laserFire');
            this.flashT = 0.12;
            this.shakeT = 0.3;
          }
          break;
        case 'fire': {
          rt.t += dt;
          const dur = def.sweep ? 1.05 : 0.6;
          // 被弾判定（スイープは奥→手前へ移動する帯）
          if (!rt.hitDone && this.invulnT <= 0) {
            const inX = Math.abs(this.px - def.x) < def.halfW;
            let inZ: boolean;
            if (def.sweep) {
              const c = def.z0 + (def.z1 - def.z0) * Math.min(1, rt.t / dur);
              inZ = Math.abs(this.pz - c) < 0.15;
            } else {
              inZ = this.pz >= def.z0 && this.pz <= def.z1;
            }
            const env = this.env(this.px, this.pz);
            if (inX && inZ && !env.shaded) {
              rt.hitDone = true;
              this.damage(22);
            }
          }
          if (rt.t >= dur) {
            rt.state = 'done';
          }
          break;
        }
      }
    }
  }

  private checkStore(): void {
    if (this.airT >= 0) return;
    for (const sx of this.course.stores) {
      if (this.storeUsed.has(sx)) continue;
      if (this.pz < 0.18 && Math.abs(this.px - sx) < 2.4) {
        this.storeUsed.add(sx);
        this.storeT = STORE_TIME;
        this.ctx.audio.sfx('store');
        this.quip(this.ctx.i18n.t('q.store'));
      }
    }
  }

  private checkCollisions(): void {
    const jumpClear = this.airT >= 0 && Math.sin((Math.PI * this.airT) / JUMP_T) > 0.35;
    for (const o of this.obs) {
      if (o.taken || o.done) continue;
      const dx = o.curX - this.px;
      if (dx < -3 || dx > 3) continue;
      const dz = Math.abs(o.curZ - this.pz);
      switch (o.type) {
        case 'drink':
          if (Math.abs(dx) < 0.9 && dz < 0.14) {
            o.taken = true;
            this.heat = Math.max(0, this.heat - 16);
            this.ctx.audio.sfx('drink');
            this.quip(this.ctx.i18n.t('q.drink'));
          }
          break;
        case 'energy':
          if (Math.abs(dx) < 0.9 && dz < 0.14) {
            o.taken = true;
            this.heat = Math.max(0, this.heat - 12);
            this.v = Math.min(15, this.v + 2.5);
            this.ctx.audio.sfx('energy');
            this.quip(this.ctx.i18n.t('q.energy'));
          }
          break;
        case 'cone':
          if (!jumpClear && Math.abs(dx) < 0.7 && dz < 0.1) this.damage(8, { trip: true });
          break;
        case 'planter':
          if (!jumpClear && Math.abs(dx) < 1.2 && dz < 0.1) this.damage(8, { trip: true });
          break;
        case 'coolbox':
          if (!jumpClear && Math.abs(dx) < 0.9 && dz < 0.09) this.damage(8, { trip: true });
          break;
        case 'dune':
          if (!jumpClear && Math.abs(dx) < 1.4 && dz < 0.12 && this.invulnT <= 0) {
            this.v *= 0.5;
            this.quip(this.ctx.i18n.t('q.sand'));
          }
          break;
        case 'ped':
        case 'suitcase':
          if (Math.abs(dx) < (o.type === 'suitcase' ? 1.2 : 0.8) && dz < 0.11) this.damage(10);
          break;
        case 'cart':
          if (Math.abs(dx) < 1.0 && dz < 0.13) this.damage(12);
          break;
        case 'tumbleweed':
          if (!jumpClear && Math.abs(dx) < 0.8 && dz < 0.1) this.damage(10);
          break;
        case 'cardman':
          if (Math.abs(dx) < 0.8 && dz < 0.12 && this.cardT <= 0 && this.invulnT <= 0) {
            o.done = true;
            this.cardT = CARD_TIME;
            this.ctx.audio.sfx('card');
          }
          break;
        case 'gull':
          if (o.gullState === 'dive' && (o.gullT ?? 0) > GULL_HIT_FROM && !jumpClear) {
            if (Math.abs(dx) < 0.9 && dz < 0.1) {
              this.damage(12);
              o.gullState = 'gone';
            }
          }
          break;
        case 'kickboard':
          if (Math.abs(dx) < 1.1 && dz < 0.13) {
            this.damage(12);
            this.quip(this.ctx.i18n.t('q.kickboard'));
          }
          break;
        case 'brick':
          if (!jumpClear && Math.abs(dx) < 0.9 && dz < 0.13) this.damage(11);
          break;
      }
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.grav * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // ---- 描画 ----
  render(g: CanvasRenderingContext2D): void {
    const camX = this.px;
    const shakeX = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    const shakeY = this.shakeT > 0 ? Math.round((Math.random() - 0.5) * 3) : 0;

    g.save();
    g.translate(shakeX, shakeY);

    this.bg.drawBack(g, camX, this.time, this.computeSunTarget(camX));
    this.bg.drawFloor(g, camX);

    // ゾーン（砂→照り返し→ミスト→影の順）
    for (const kind of ['sand', 'glare', 'mist', 'shade', 'mirage'] as const) {
      for (let zi = 0; zi < this.course.zones.length; zi++) {
        const zn = this.course.zones[zi];
        if (zn.kind !== kind) continue;
        if (zn.x1 < camX - 15 || zn.x0 > camX + 60) continue;
        if (kind === 'mirage') {
          const f = this.mirageFade[zi];
          if (f <= 0.02) continue;
          g.globalAlpha = f;
          this.bg.drawZone(g, camX, this.time, zn.kind, zn.x0, zn.x1, zn.z0, zn.z1, zn.shear ?? 0);
          g.globalAlpha = 1;
        } else {
          this.bg.drawZone(g, camX, this.time, zn.kind, zn.x0, zn.x1, zn.z0, zn.z1, zn.shear ?? 0);
        }
      }
    }

    this.drawLaserTelegraphs(g, camX);
    this.drawWall(g, camX);
    this.drawGoalArch(g, camX, false);
    this.drawEntities(g, camX);
    this.drawGoalArch(g, camX, true);
    this.drawLaserBeams(g, camX);

    g.restore();

    // 陽炎（Day3: 遠景を横に揺らす走査歪み）
    if (this.bg.theme.desert) {
      for (let i = 0; i < 6; i++) {
        const y = 46 + i * 9;
        const off = Math.round(Math.sin(this.time * 2.6 + i * 1.9) * 1.6);
        if (off !== 0) g.drawImage(g.canvas, 0, y, VW, 4, off, y, VW, 4);
      }
    }

    // パーティクル（スクリーン空間）
    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, (p.life / p.maxLife) * 1.6);
      g.fillStyle = p.color;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    g.globalAlpha = 1;

    // スピードライン
    if ((this.dashing && this.v > 8.5) || this.v > 11) {
      g.globalAlpha = 0.25;
      g.fillStyle = '#ffffff';
      for (let i = 0; i < 5; i++) {
        const y = 30 + ((i * 47 + Math.floor(this.time * 240)) % 180);
        const x = (i * 133 + Math.floor(this.time * 600)) % VW;
        g.fillRect(VW - x, y, 24, 1);
      }
      g.globalAlpha = 1;
    }

    if (this.flashT > 0) {
      g.globalAlpha = Math.min(0.55, this.flashT * 4);
      g.fillStyle = '#fff8dc';
      g.fillRect(0, 0, VW, VH);
      g.globalAlpha = 1;
    }

    this.drawQuips(g);
    this.drawHud(g);
    this.drawOverlays(g);
  }

  private drawWall(g: CanvasRenderingContext2D, camX: number): void {
    const ppm0 = ppmAt(0);
    for (const d of this.course.wall) {
      const sx = PSX + (d.x - camX) * ppm0;
      if (sx < -80 || sx > VW + 80) continue;
      const baseY = FLOOR_TOP + 1;
      switch (d.kind) {
        case 'tree':
          blit(g, this.artTree, sx, baseY);
          break;
        case 'palm':
          blit(g, this.artPalm, sx, baseY);
          break;
        case 'vending':
          blit(g, this.artVending, sx, baseY);
          break;
        case 'station':
          blit(g, this.artStation, sx, baseY);
          break;
        case 'store':
          blit(g, this.artStore, sx, baseY + 1);
          // 入口マット
          this.drawStoreMat(g, camX, d.x);
          break;
        case 'sign':
          blit(g, makeSign(d.text, d.icon ?? 'none'), sx, baseY);
          break;
        case 'banner':
          blit(g, makeBanner(d.text), sx, baseY - 18);
          break;
        case 'awning': {
          const w = Math.round(d.w * ppm0);
          const x0 = Math.round(sx - w / 2);
          // 店舗ファサード（ひさしの持ち主）
          g.fillStyle = '#221833';
          g.fillRect(x0 - 2, 60, w + 4, 45);
          g.fillStyle = '#e8dcc8';
          g.fillRect(x0, 62, w, 42);
          // 2階窓
          g.fillStyle = '#8fb8cc';
          for (let i = 6; i < w - 10; i += 16) {
            g.fillRect(x0 + i, 66, 8, 8);
            g.fillStyle = '#221833';
            g.fillRect(x0 + i, 74, 8, 1);
            g.fillStyle = '#8fb8cc';
          }
          // 1階ショーウィンドウ
          g.fillStyle = '#bfe8f2';
          g.fillRect(x0 + 4, 90, w - 8, 13);
          // ひさし
          g.fillStyle = '#221833';
          g.fillRect(x0 - 3, 78, w + 6, 12);
          for (let i = 0; i < w + 4; i += 8) {
            g.fillStyle = Math.floor(i / 8) % 2 === 0 ? '#e8504b' : '#f5f1e8';
            g.fillRect(x0 - 2 + i, 79, Math.min(7, w + 4 - i - 1), 10);
          }
          g.fillStyle = '#b03042';
          g.fillRect(x0 - 3, 88, w + 6, 2);
          break;
        }
      }
    }
  }

  private drawStoreMat(g: CanvasRenderingContext2D, camX: number, x: number): void {
    // 入口ゾーンの床マット（z<0.18）
    const y0 = Math.round(zToY(0));
    const y1 = Math.round(zToY(0.18));
    for (let y = y0; y <= y1; y++) {
      const sx0 = sxOf(x - 2.4, camX, 0.09);
      const sx1 = sxOf(x + 2.4, camX, 0.09);
      g.fillStyle = (y + Math.floor(this.time * 6)) % 4 < 2 ? 'rgba(120,220,255,0.5)' : 'rgba(80,180,240,0.35)';
      g.fillRect(Math.round(sx0), y, Math.round(sx1 - sx0), 1);
    }
  }

  private drawGoalArch(g: CanvasRenderingContext2D, camX: number, front: boolean): void {
    const gx = this.course.length;
    const sxFar = sxOf(gx, camX, 0.02);
    const sxNear = sxOf(gx, camX, 0.98);
    if (sxNear < -60 || sxFar > VW + 120) return;
    const yFar = zToY(0.02);
    const yNear = zToY(0.98);
    if (!front) {
      // ゴール地点にそびえる「パシフィコ横浜」風ドーム（遠くからでも見える目印）
      blit(g, this.artDome, sxFar, yFar + 4, 0.62);
      blit(g, this.artPillar, sxFar, yFar, 0.72);
      // 横断幕（奥→手前へ斜めの帯）
      const topFar = yFar - 58 * 0.72;
      const topNear = yNear - 58;
      g.fillStyle = '#221833';
      g.beginPath();
      g.moveTo(sxFar - 4, topFar);
      g.lineTo(sxNear - 5, topNear);
      g.lineTo(sxNear + 7, topNear + 14);
      g.lineTo(sxFar + 6, topFar + 10);
      g.closePath();
      g.fill();
      g.fillStyle = '#e8504b';
      g.beginPath();
      g.moveTo(sxFar - 3, topFar + 1);
      g.lineTo(sxNear - 4, topNear + 1);
      g.lineTo(sxNear + 6, topNear + 13);
      g.lineTo(sxFar + 5, topFar + 9);
      g.closePath();
      g.fill();
      const midX = (sxFar + sxNear) / 2;
      const midY = (topFar + topNear) / 2 + 2;
      bitmapText(g, 'GOAL', midX, midY, { color: '#f5f1e8', align: 'center', shadow: '#221833' });
    } else {
      blit(g, this.artPillar, sxNear, yNear + 4, 1);
    }
  }

  /** 発射前は太陽が着弾地点の真上へ移動して来る演出のターゲットを計算 */
  private computeSunTarget(camX: number): { x: number; y: number; blend: number } | undefined {
    let best: { x: number; y: number; blend: number } | undefined;
    for (let i = 0; i < this.lasers.length; i++) {
      const rt = this.lasers[i];
      if (rt.state !== 'warn' && rt.state !== 'fire') continue;
      const def = this.course.lasers[i];
      const zMid = (def.z0 + def.z1) / 2;
      const x = Math.round(sxOf(def.x, camX, Math.min(0.35, zMid)));
      let blend: number;
      if (rt.state === 'warn') blend = Math.min(1, rt.t / 1.3);
      else blend = 1;
      const target = { x, y: 16, blend };
      // fire中を優先、なければ最も進行したwarnを採用
      if (!best || rt.state === 'fire' || blend > best.blend) best = target;
    }
    return best;
  }

  private drawLaserTelegraphs(g: CanvasRenderingContext2D, camX: number): void {
    for (let i = 0; i < this.lasers.length; i++) {
      const rt = this.lasers[i];
      if (rt.state !== 'warn') continue;
      const def = this.course.lasers[i];
      const blink = Math.sin(this.time * 16) > 0 || rt.t > 1.3;
      if (!blink) continue;
      const alpha = rt.t > 1.3 ? 0.55 : 0.3;
      const y0 = Math.round(zToY(def.z0));
      const y1 = Math.round(zToY(def.z1));
      for (let y = y0; y <= y1; y++) {
        // 対応するz
        const sx0 = this.telegraphX(def.x - def.halfW, camX, y);
        const sx1 = this.telegraphX(def.x + def.halfW, camX, y);
        g.fillStyle = `rgba(255,90,50,${alpha})`;
        g.fillRect(sx0, y, sx1 - sx0, 1);
      }
      // 枠と「!」
      const cx = this.telegraphX(def.x, camX, Math.round((y0 + y1) / 2));
      bitmapText(g, '!', cx, y0 - 12, { color: '#ff5a32', align: 'center', scale: 1, shadow: '#221833' });
    }
  }

  private telegraphX(x: number, camX: number, y: number): number {
    // yからzを逆算してx位置を出す（drawZoneと同じ考え方の簡略版）
    const c = Math.min(1, Math.max(0, (y - FLOOR_TOP) / (232 - FLOOR_TOP)));
    const z = (-0.55 + Math.sqrt(0.3025 + 1.8 * c)) / 0.9;
    return Math.round(sxOf(x, camX, z));
  }

  private drawLaserBeams(g: CanvasRenderingContext2D, camX: number): void {
    for (let i = 0; i < this.lasers.length; i++) {
      const rt = this.lasers[i];
      if (rt.state !== 'fire') continue;
      const def = this.course.lasers[i];
      const dur = def.sweep ? 1.05 : 0.6;
      let zLo = def.z0;
      let zHi = def.z1;
      if (def.sweep) {
        const c = def.z0 + (def.z1 - def.z0) * Math.min(1, rt.t / dur);
        zLo = Math.max(0, c - 0.15);
        zHi = Math.min(1, c + 0.15);
      }
      const zMid = (zLo + zHi) / 2;
      const sx0 = Math.round(sxOf(def.x - def.halfW, camX, zMid));
      const sx1 = Math.round(sxOf(def.x + def.halfW, camX, zMid));
      const w = sx1 - sx0;
      const fade = rt.t < 0.08 ? rt.t / 0.08 : rt.t > dur - 0.15 ? Math.max(0, (dur - rt.t) / 0.15) : 1;
      const yBot = Math.round(zToY(zHi));
      // 半透明のメッシュ状ビーム（背景が透けて見えるよう、市松状に間引いて塗る）
      const meshOffset = Math.floor(this.time * 40);
      g.globalAlpha = 0.5 * fade;
      g.fillStyle = '#ff8c42';
      for (let y = 0; y < yBot; y += 2) {
        const xOff = (y + meshOffset) % 4 < 2 ? 0 : 1;
        g.fillRect(sx0 - 3 + xOff, y, w + 6, 1);
      }
      g.globalAlpha = 0.62 * fade;
      g.fillStyle = '#fff6c8';
      const coreX = sx0 + Math.round(w * 0.18);
      const coreW = Math.round(w * 0.64);
      for (let y = 0; y < yBot; y += 2) {
        g.fillRect(coreX, y, coreW, 1);
      }
      g.globalAlpha = 1;
      // 着弾の白熱
      const y0 = Math.round(zToY(zLo));
      for (let y = y0; y <= yBot; y += 1) {
        if ((y + Math.floor(this.time * 30)) % 3 === 0) continue;
        const ex0 = this.telegraphX(def.x - def.halfW, camX, y);
        const ex1 = this.telegraphX(def.x + def.halfW, camX, y);
        g.fillStyle = `rgba(255,246,200,${0.7 * fade})`;
        g.fillRect(ex0, y, ex1 - ex0, 1);
      }
      // 火花
      if (Math.random() < 0.6) {
        this.spawnP(sx0 + Math.random() * w, zToY(zMid), (Math.random() - 0.5) * 80, -60 - Math.random() * 60, 0.35, '#ffd94d', 2, 300);
      }
    }
  }

  private drawEntities(g: CanvasRenderingContext2D, camX: number): void {
    interface DrawItem {
      z: number;
      fn: () => void;
    }
    const items: DrawItem[] = [];
    const S = this.ctx.sprites;

    for (const o of this.obs) {
      if (o.taken) continue;
      const sx = sxOf(o.curX, camX, o.curZ);
      if (sx < -40 || sx > VW + 40) continue;
      const sy = zToY(o.curZ);
      const sc = scaleAt(o.curZ);
      switch (o.type) {
        case 'cone':
          items.push({ z: o.curZ, fn: () => blit(g, S.cone, sx, sy, sc * SPR) });
          break;
        case 'planter':
          items.push({ z: o.curZ, fn: () => blit(g, S.planter, sx, sy, sc * SPR) });
          break;
        case 'coolbox':
          items.push({ z: o.curZ, fn: () => blit(g, S.coolbox, sx, sy, sc * SPR) });
          break;
        case 'drink': {
          const bob = Math.sin(this.time * 4 + o.phase) * 2;
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 8 * sc * SPR);
              blit(g, S.drink, sx, sy - 6 + bob, sc * SPR);
              if (Math.sin(this.time * 5 + o.phase) > 0.7) {
                g.fillStyle = '#fff';
                g.fillRect(Math.round(sx + 4 * sc), Math.round(sy - 12 + bob), 1, 1);
              }
            },
          });
          break;
        }
        case 'energy': {
          const bob = Math.sin(this.time * 4 + o.phase) * 2;
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 8 * sc * SPR);
              blit(g, S.energy, sx, sy - 6 + bob, sc * SPR);
            },
          });
          break;
        }
        case 'ped': {
          const v = o.variant ?? 0;
          const frames = (o.v ?? 0) >= 0 ? S.peds[v % S.peds.length] : this.pedFlip[v % S.peds.length];
          const f = frames[Math.floor(this.time * 4 + o.phase) % 2];
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 9 * sc * SPR);
              blit(g, f, sx, sy, sc * SPR);
            },
          });
          break;
        }
        case 'cart': {
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 11 * sc * SPR);
              blit(g, S.cart, sx, sy, sc * SPR);
            },
          });
          break;
        }
        case 'suitcase': {
          const v = o.variant ?? 0;
          const frames = (o.v ?? 0) >= 0 ? S.peds[v % S.peds.length] : this.pedFlip[v % S.peds.length];
          const f = frames[Math.floor(this.time * 4 + o.phase) % 2];
          const side = (o.v ?? 0) >= 0 ? -1 : 1;
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 13 * sc * SPR);
              blit(g, S.suitcase, sx + side * 9 * sc * SPR, sy, sc * SPR);
              blit(g, f, sx, sy, sc * SPR);
            },
          });
          break;
        }
        case 'tumbleweed': {
          const f = S.tumbleweed[Math.floor(this.time * 9) % 2];
          const bounce = Math.abs(Math.sin(this.time * 7 + o.phase)) * 5 * sc;
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 8 * sc * SPR);
              blit(g, f, sx, sy - bounce, sc * SPR);
            },
          });
          break;
        }
        case 'dune': {
          items.push({
            z: o.curZ,
            fn: () => blit(g, S.dune, sx, sy + 1, sc * SPR),
          });
          break;
        }
        case 'brick': {
          const f = S.brick[Math.floor(this.time * 5 + o.phase * 3) % 4];
          const bob = Math.sin(this.time * 2 + o.phase) * 3;
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 9 * sc * SPR, 'rgba(34,24,51,0.25)');
              blit(g, f, sx, sy - 8 * sc * SPR - bob, sc * SPR);
            },
          });
          break;
        }
        case 'kickboard': {
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 15 * sc * SPR);
              blit(g, S.kickboard, sx, sy, sc * SPR);
            },
          });
          break;
        }
        case 'cardman': {
          items.push({
            z: o.curZ,
            fn: () => {
              this.drawShadow(g, sx, sy, 9 * sc * SPR);
              blit(g, S.cardman, sx, sy, sc * SPR);
              if (!o.done) {
                // 名刺を差し出す「!」
                const bob2 = Math.sin(this.time * 6) > 0 ? 0 : 1;
                g.fillStyle = '#f5f1e8';
                g.fillRect(Math.round(sx - 14 * sc), Math.round(sy - 26 * sc + bob2), 5, 3);
              }
            },
          });
          break;
        }
        case 'gull': {
          if (o.gullState === 'warn') {
            const blink = Math.sin(this.time * 12) > -0.3;
            items.push({
              z: o.curZ,
              fn: () => {
                if (blink) this.drawShadow(g, sx, sy, 10 * sc * SPR, 'rgba(34,24,51,0.55)');
              },
            });
          } else if (o.gullState === 'dive') {
            const t = (o.gullT ?? 0) / GULL_DIVE_T;
            const by = sy - (1 - Math.sin(Math.PI * Math.min(1, t * 1.1))) * 70 - 4;
            const f = S.gull[Math.floor(this.time * 10) % 2];
            items.push({
              z: o.curZ,
              fn: () => {
                this.drawShadow(g, sx, sy, 10 * sc * SPR);
                blit(g, f, sx, by, sc * SPR);
              },
            });
          }
          break;
        }
      }
    }

    // プレイヤー
    items.push({ z: this.pz, fn: () => this.drawPlayer(g) });

    items.sort((a, b) => a.z - b.z);
    for (const it of items) it.fn();
  }

  private drawShadow(g: CanvasRenderingContext2D, x: number, y: number, w: number, color = 'rgba(34,24,51,0.35)'): void {
    g.fillStyle = color;
    const wi = Math.round(w);
    g.fillRect(Math.round(x - wi / 2), Math.round(y) - 1, wi, 2);
    g.fillRect(Math.round(x - wi / 2) + 1, Math.round(y), wi - 2, 1);
  }

  private drawPlayer(g: CanvasRenderingContext2D): void {
    const S = this.ctx.sprites.player;
    const sy = zToY(this.pz);
    const sc = scaleAt(this.pz);
    // 点滅（無敵中）
    if (this.invulnT > 0 && Math.floor(this.time * 16) % 2 === 0 && this.state === 'play') return;

    const airFrac = this.airT >= 0 ? Math.sin((Math.PI * this.airT) / JUMP_T) : 0;
    const jy = airFrac * JUMP_H * sc * SPR;
    this.drawShadow(g, PSX, sy, (12 - airFrac * 5) * sc * SPR);

    let spr: Sprite;
    if (this.state === 'dead') {
      const i = Math.min(2, Math.floor(this.stateT / 0.35));
      spr = S.collapse[i];
    } else if (this.state === 'goal' && this.stateT > 1.3) {
      spr = S.restKneel;
    } else if (this.state === 'goal' && this.stateT > 0.4) {
      spr = S.win;
    } else if (this.storeT > 0) {
      spr = S.idle;
    } else if (this.cardT > 0) {
      spr = S.idle;
    } else if (this.airT >= 0) {
      spr = S.jump;
    } else if (this.stumbleT > 0) {
      spr = S.stumble;
    } else if (this.state === 'intro' || this.state === 'ready') {
      spr = S.idle;
    } else {
      spr = S.run[Math.floor(this.animT * 10) % 6];
    }
    // ヒートゲージ演出: 足元から頭へ赤みがせり上がる（0=白いまま/100=全身真っ赤）
    // 加減速の傾き: 足元(接地点)を軸に回転させる
    const anchorY = sy;
    g.save();
    g.translate(PSX, anchorY);
    g.rotate(this.tiltAngle);
    g.translate(-PSX, -anchorY);
    // 危険域(ヒート85%以上)は明滅を重ねて「死にそう」を体そのもので伝える
    const heatPulse = this.heat >= 85 ? Math.max(0, Math.sin(this.time * 10)) * 0.15 : 0;
    blitHeatTint(g, spr, PSX, sy - jy, sc * SPR, this.heat / 100, undefined, heatPulse);
    g.restore();

    // 高速オーラ（ダッシュ中の残像）
    if (this.dashing && this.v > 8 && this.state === 'play' && this.airT < 0) {
      g.save();
      g.translate(PSX, anchorY);
      g.rotate(this.tiltAngle);
      g.translate(-PSX, -anchorY);
      g.globalAlpha = 0.22;
      blit(g, spr, PSX - 8, sy - jy, sc * SPR);
      g.globalAlpha = 0.1;
      blit(g, spr, PSX - 15, sy - jy, sc * SPR);
      g.globalAlpha = 1;
      g.restore();
    }
  }

  private drawQuips(g: CanvasRenderingContext2D): void {
    for (const q of this.quips) {
      const sy = zToY(this.pz) - 34 * scaleAt(this.pz) * SPR - (this.airT >= 0 ? 12 : 0);
      const alpha = q.t < 0.3 ? q.t / 0.3 : 1;
      g.globalAlpha = alpha;
      // 幅は実測（文字数ベースの概算だと長い日本語テキストで吹き出しからはみ出すため）
      const w = Math.min(220, textWidth(q.text, 10) + 10);
      const x0 = Math.round(PSX - 10);
      const y0 = Math.round(sy - 16);
      g.fillStyle = '#f5f1e8';
      g.fillRect(x0, y0, w, 15);
      g.fillStyle = '#221833';
      g.fillRect(x0, y0 - 1, w, 1);
      g.fillRect(x0, y0 + 15, w, 1);
      g.fillRect(x0 - 1, y0, 1, 15);
      g.fillRect(x0 + w, y0, 1, 15);
      // しっぽ
      g.fillStyle = '#f5f1e8';
      g.fillRect(x0 + 4, y0 + 15, 3, 2);
      g.fillRect(x0 + 5, y0 + 17, 2, 1);
      text(g, q.text, x0 + 4, y0 + 2, { size: 10, color: '#221833' });
      g.globalAlpha = 1;
    }
  }

  private drawHud(g: CanvasRenderingContext2D): void {
    const { i18n } = this.ctx;
    // HUD帯
    g.fillStyle = '#14101f';
    g.fillRect(0, HUD_TOP, VW, VH - HUD_TOP);
    g.fillStyle = '#3ec6c0';
    g.fillRect(0, HUD_TOP, VW, 1);

    const rowY = HUD_TOP + 5;
    // DAY
    bitmapText(g, `DAY${this.day}`, 5, rowY, { color: '#ffd94d' });
    // TIME（制限は無く、クリア時の★評価に使うだけの計測用）
    bitmapText(g, 'TIME', 44, rowY, { color: '#8f86b8' });
    bitmapText(g, fmtTime(this.timer), 72, rowY, { color: '#f5f1e8' });

    // ヒートゲージ用のHUDバーは廃止。主人公の体そのもの（足元から頭へ赤みが
    // せり上がる演出、drawPlayer内のblitHeatTint）だけがヒートの表示を兼ねる。

    // AREA進行バー（ヒートバー廃止で空いた分、幅を広く取る）
    bitmapText(g, 'AREA', 150, rowY, { color: '#8f86b8' });
    const ax = 178;
    const aw = 250;
    g.fillStyle = '#221833';
    g.fillRect(ax - 1, rowY + 1, aw + 2, 5);
    g.fillStyle = '#2b8f92';
    g.fillRect(ax, rowY + 2, Math.round((aw * Math.min(1, this.px / this.course.length))), 3);
    // マーカー: コンビニ・ゴール
    for (const sxr of this.course.stores) {
      const mx = ax + Math.round((aw * sxr) / this.course.length);
      g.fillStyle = '#4aa8e0';
      g.fillRect(mx, rowY, 2, 2);
    }
    g.fillStyle = '#e8504b';
    g.fillRect(ax + aw - 1, rowY - 1, 2, 4);
    // プレイヤー位置
    const pmx = ax + Math.round((aw * Math.min(1, this.px / this.course.length)));
    g.fillStyle = '#ffd94d';
    g.fillRect(pmx - 1, rowY + 1, 3, 5);

    // ポーズ・ミュートボタン
    const btnY = rowY;
    g.fillStyle = '#241b3a';
    g.fillRect(VW - 38, btnY - 2, 16, 12);
    g.fillRect(VW - 18, btnY - 2, 16, 12);
    g.fillStyle = '#8f86b8';
    g.fillRect(VW - 34, btnY, 3, 8);
    g.fillRect(VW - 29, btnY, 3, 8);
    bitmapText(g, this.ctx.audio.muted ? '×' : '♪', VW - 14, btnY, {
      color: this.ctx.audio.muted ? '#ff5a32' : '#8f86b8',
    });

    // 下段: 日付・スピード風味
    const place =
      this.day === 3
        ? i18n.lang === 'ja'
          ? 'みなとみらい砂漠'
          : 'MINATOMIRAI DESERT'
        : i18n.lang === 'ja'
          ? 'みなとみらい'
          : 'MINATOMIRAI';
    const sub = i18n.lang === 'ja' ? `7月${21 + this.day}日 ${place}` : `JULY ${21 + this.day} ${place}`;
    text(g, sub, 5, HUD_TOP + 18, { size: 10, color: '#6a6090' });
    bitmapText(g, `${(this.v * 3.6).toFixed(0)}KM/H`, VW - 45, HUD_TOP + 20, { color: '#6a6090' });
  }

  private drawOverlays(g: CanvasRenderingContext2D): void {
    const { i18n, input } = this.ctx;
    if (this.state === 'intro') {
      g.fillStyle = 'rgba(20,16,31,0.78)';
      g.fillRect(0, 0, VW, VH);
      const a = Math.min(1, this.stateT / 0.3);
      g.globalAlpha = a;
      text(g, i18n.t(`day${this.day}.title`), VW / 2, 78, { size: 12, color: '#ffd94d', align: 'center', scale: 2, bold: true });
      text(g, i18n.t(`day${this.day}.sub`), VW / 2, 122, { size: 12, color: '#f5f1e8', align: 'center', bold: true });
      text(g, i18n.t(`day${this.day}.tip`), VW / 2, 150, { size: 10, color: '#8f86b8', align: 'center' });
      g.globalAlpha = 1;
    } else if (this.state === 'ready') {
      bitmapText(g, this.stateT < 0.9 ? 'READY...' : 'GO!', VW / 2, 100, {
        color: '#ffd94d',
        align: 'center',
        scale: 3,
        shadow: '#221833',
      });
    } else if (this.state === 'play' && this.hintT > 0 && this.timer < 6) {
      const alpha = Math.min(0.9, this.hintT);
      g.globalAlpha = alpha;
      if (input.touchMode) {
        text(g, i18n.t('hint.moveTouch'), 8, 40, { size: 10, color: '#f5f1e8', outline: '#221833' });
        text(g, i18n.t('hint.jumpTouch'), VW - 8 - 150, 40, { size: 10, color: '#f5f1e8', outline: '#221833' });
      } else {
        text(g, `${i18n.t('hint.moveKey')}  /  ${i18n.t('hint.jumpKey')}`, VW / 2 - 110, 36, {
          size: 10,
          color: '#f5f1e8',
          outline: '#221833',
        });
      }
      g.globalAlpha = 1;
    } else if (this.state === 'play' && this.day === 1 && this.timer > 6.5 && this.timer < 9.5) {
      // ダッシュ教示（初日のみ）
      g.globalAlpha = Math.min(0.9, (9.5 - this.timer) / 1.5, (this.timer - 6.5) / 0.5);
      text(g, i18n.t('hint.dash'), VW / 2, 36, { size: 10, color: '#ffd94d', align: 'center', outline: '#221833' });
      g.globalAlpha = 1;
    } else if (this.state === 'dead') {
      if (this.stateT > 0.8) {
        const a = Math.min(0.8, (this.stateT - 0.8) * 2);
        g.fillStyle = `rgba(60,16,20,${a * 0.7})`;
        g.fillRect(0, 0, VW, VH);
        text(g, i18n.t('go.title'), VW / 2, 92, { size: 12, color: '#ff8a70', align: 'center', scale: 2, bold: true });
        text(g, i18n.t('go.sub'), VW / 2, 128, { size: 10, color: '#f5f1e8', align: 'center' });
        if (this.stateT > 1.2) {
          const blink = Math.floor(this.time * 2) % 2 === 0;
          text(g, i18n.t('go.retry'), VW / 2, 168, { size: 12, color: blink ? '#ffd94d' : '#c8b830', align: 'center', bold: true });
          text(g, i18n.t('res.toTitle'), VW / 2, 205, { size: 10, color: '#8f86b8', align: 'center' });
        }
      }
    } else if (this.state === 'goal') {
      if (this.stateT > 0.3) {
        bitmapText(g, 'GOAL!!', VW / 2, 86, { color: '#ffd94d', align: 'center', scale: 3, shadow: '#221833' });
      }
    }

    if (this.paused) {
      g.fillStyle = 'rgba(20,16,31,0.82)';
      g.fillRect(0, 0, VW, VH);
      text(g, i18n.t('pause.title'), VW / 2, 90, { size: 12, color: '#ffd94d', align: 'center', scale: 2, bold: true });
      const labels = [i18n.t('pause.resume'), i18n.t('pause.retry'), i18n.t('pause.title2')];
      for (let i = 0; i < 3; i++) {
        const sel = this.pauseSel === i;
        text(g, (sel ? '▶ ' : '  ') + labels[i], VW / 2, 132 + i * 22, {
          size: 11,
          color: sel ? '#f5f1e8' : '#8f86b8',
          align: 'center',
          bold: sel,
        });
      }
    }
  }
}
