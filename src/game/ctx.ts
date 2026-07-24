// シーン間で共有するゲームコンテキスト

import type { Video } from '../core/video';
import type { Input } from '../core/input';
import type { Save } from '../core/save';
import type { I18n } from '../core/i18n';
import type { AudioSys } from '../audio/engine';
import type { MusicPlayer } from '../audio/music';
import type { SpriteBank } from '../gfx/sprites';

export interface Scene {
  enter?(): void;
  update(dt: number): void;
  render(g: CanvasRenderingContext2D): void;
}

export interface Ctx {
  video: Video;
  input: Input;
  save: Save;
  i18n: I18n;
  audio: AudioSys;
  music: MusicPlayer;
  sprites: SpriteBank;
  gotoTitle(): void;
  gotoOp(): void;
  /** startWave省略時は1（通しプレイの最初）から。デバッグ用?wave=Nでの直行にも使う */
  gotoStage(startWave?: number): void;
  gotoResult(time: number, stars: number, isBest: boolean): void;
  gotoEd(): void;
  toggleMute(): void;
}

/** クリアタイムから★1〜3を算出。時間制限は無く、遅くてもクリアなら最低★1 */
export function calcStars(time: number, par: { s: number; a: number }): number {
  if (time <= par.s) return 3;
  if (time <= par.a) return 2;
  return 1;
}
