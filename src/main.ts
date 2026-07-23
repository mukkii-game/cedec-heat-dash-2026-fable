// CEDEC HEAT DASH 2026 - エントリポイント

import { Video } from './core/video';
import { Input } from './core/input';
import { Save } from './core/save';
import { I18n } from './core/i18n';
import { loadPixelFont } from './core/font';
import { AudioSys } from './audio/engine';
import { MusicPlayer } from './audio/music';
import { buildSprites } from './gfx/sprites';
import type { Ctx, Scene } from './game/ctx';
import { Stage } from './game/stage';
import { TitleScene, OpScene, ResultScene, EdScene } from './game/scenes';

async function boot(): Promise<void> {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const video = new Video(canvas);
  const input = new Input(video);
  const save = new Save();
  const i18n = new I18n(save.data.lang);
  const audio = new AudioSys(save.data.mute);
  const music = new MusicPlayer(audio);
  // PixelMplus10（M+ライセンス、THIRD_PARTY_ASSETS.md参照）。失敗時はシステムフォントへフォールバック
  await loadPixelFont(new URL('./assets/PixelMplus10-Regular.ttf', import.meta.url).href);
  const sprites = buildSprites();

  let scene: Scene;

  const ctx: Ctx = {
    video,
    input,
    save,
    i18n,
    audio,
    music,
    sprites,
    runTimes: [0, 0, 0],
    fullRun: true,
    gotoTitle() {
      setScene(new TitleScene(ctx));
    },
    gotoOp() {
      setScene(new OpScene(ctx));
    },
    gotoStage(day, fullRun) {
      ctx.fullRun = fullRun;
      if (day === 1) ctx.runTimes = [0, 0, 0];
      setScene(new Stage(ctx, day));
    },
    gotoResult(day, time, rank, isBest) {
      setScene(new ResultScene(ctx, day, time, rank, isBest));
    },
    gotoEd() {
      setScene(new EdScene(ctx));
    },
    toggleMute() {
      audio.setMuted(!audio.muted);
      save.data.mute = audio.muted;
      save.write();
    },
  };

  function setScene(s: Scene): void {
    scene = s;
    s.enter?.();
  }

  // E2Eテスト用の読み取り専用デバッグフック（挙動には影響しない）
  (window as unknown as { __debug: unknown }).__debug = {
    get paused(): boolean | null {
      const s = scene as unknown as { paused?: boolean };
      return typeof s.paused === 'boolean' ? s.paused : null;
    },
    get timer(): number | null {
      const s = scene as unknown as { timer?: number };
      return typeof s.timer === 'number' ? s.timer : null;
    },
  };

  input.onFirstGesture = () => audio.unlock();

  const params = new URLSearchParams(location.search);
  if (params.has('sprites')) {
    const { SpriteDebugScene } = await import('./game/debugScene');
    setScene(new SpriteDebugScene(ctx));
  } else if (params.has('day')) {
    // 開発用: 指定日へ直行
    const d = Math.min(3, Math.max(1, parseInt(params.get('day') ?? '1', 10) || 1));
    setScene(new Stage(ctx, d));
  } else {
    setScene(new TitleScene(ctx));
  }

  // 固定タイムステップ（60Hz）+ 可変描画
  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 60;

  function frame(now: number): void {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25; // タブ復帰時の暴走防止
    acc += dt;
    input.update();
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      scene.update(STEP);
      input.endFrame();
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;

    video.beginFrame();
    const g = video.vctx;
    g.imageSmoothingEnabled = false;
    scene.render(g);
    video.present();
    input.drawDeck(video.ctx);
  }
  requestAnimationFrame(frame);
}

void boot();
