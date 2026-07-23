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
  /** 通しプレイ中の各日タイム */
  runTimes: number[];
  fullRun: boolean;
  gotoTitle(): void;
  gotoOp(): void;
  gotoStage(day: number, fullRun: boolean): void;
  gotoResult(day: number, time: number, rank: string, isBest: boolean): void;
  gotoEd(): void;
  toggleMute(): void;
}

export function calcRank(time: number, par: { s: number; a: number; b: number }): string {
  if (time <= par.s) return 'S';
  if (time <= par.a) return 'A';
  if (time <= par.b) return 'B';
  return 'C';
}
