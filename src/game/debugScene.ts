// ?sprites=1 : スプライト検品用デバッグシーン（開発専用）

import { VW, VH } from '../core/video';
import { bitmapText } from '../core/font';
import { blit } from '../gfx/pix';
import type { Ctx, Scene } from './ctx';

export class SpriteDebugScene implements Scene {
  private ctx: Ctx;
  private t = 0;

  constructor(ctx: Ctx) {
    this.ctx = ctx;
  }

  update(dt: number): void {
    this.t += dt;
  }

  render(g: CanvasRenderingContext2D): void {
    g.fillStyle = '#3a4a5a';
    g.fillRect(0, 0, VW, VH);
    g.fillStyle = '#4a5a6a';
    for (let y = 0; y < VH; y += 8) {
      for (let x = (y / 8) % 2 === 0 ? 0 : 8; x < VW; x += 16) {
        g.fillRect(x, y, 8, 8);
      }
    }
    const S = this.ctx.sprites;
    const sc = 3;
    // 走り6フレーム
    bitmapText(g, 'RUN', 8, 4, { color: '#fff' });
    for (let i = 0; i < 6; i++) {
      blit(g, S.player.run[i], 30 + i * 76, 100, sc);
    }
    // アニメ再生
    blit(g, S.player.run[Math.floor(this.t * 10) % 6], 30 + 6 * 76, 100, sc);
    // その他ポーズ
    const poses = [S.player.jump, S.player.stumble, S.player.win, S.player.idle, ...S.player.collapse];
    for (let i = 0; i < poses.length; i++) {
      blit(g, poses[i], 30 + i * 68, 195, 2);
    }
    // 障害物・モブ
    const items = [S.cone, S.planter, S.coolbox, S.drink, S.energy, S.gull[0], S.gull[1], S.cardman];
    let x = 8;
    for (const it of items) {
      blit(g, it, x + it.w, 260, 2);
      x += it.w * 2 + 12;
    }
    for (let v = 0; v < S.peds.length; v++) {
      blit(g, S.peds[v][Math.floor(this.t * 4) % 2], x + 20, 260, 2);
      x += 40;
    }
  }
}
