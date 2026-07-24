// ?catalog=1&idx=N : 敵・ギミック一覧レビュー用シーン（開発専用）。
// 1画面=1体として、絵の修正指示をしやすくするためのカタログ。

import { VW, VH } from '../core/video';
import { text } from '../core/font';
import { blit } from '../gfx/pix';
import { Background, THEMES } from '../gfx/bg';
import { makeStore } from '../gfx/wallart';
import type { Ctx, Scene } from './ctx';

interface CatalogEntry {
  id: string;
  label: string;
  note: string;
  theme?: 1 | 2 | 3;
  needsFloor?: boolean;
  draw: (g: CanvasRenderingContext2D, ctx: Ctx, t: number, bg?: Background) => void;
}

const OS = 5.5; // 単体オブジェクトの表示倍率
const MS = 4.2; // 複数並べる時の表示倍率
const OY = 175; // 単体オブジェクトの接地y

const ENTRIES: CatalogEntry[] = [
  { id: 'cone', label: 'コーン', note: '低障害物。ジャンプ/迂回で回避', draw: (g, c) => blit(g, c.sprites.cone, VW / 2, OY, OS) },
  { id: 'planter', label: 'プランター', note: '低障害物。ジャンプ/迂回で回避', draw: (g, c) => blit(g, c.sprites.planter, VW / 2, OY, OS) },
  { id: 'coolbox', label: 'クーラーボックス', note: '低障害物。ジャンプ/迂回で回避', draw: (g, c) => blit(g, c.sprites.coolbox, VW / 2, OY, OS) },
  { id: 'drink', label: 'レッドブルー缶', note: '取得アイテム。ヒート-16', draw: (g, c) => blit(g, c.sprites.drink, VW / 2, OY - 10, OS) },
  { id: 'energy', label: '金のエナドリ', note: '取得アイテム。ヒート-12＋速度+2.5', draw: (g, c) => blit(g, c.sprites.energy, VW / 2, OY - 10, OS) },
  {
    id: 'ped',
    label: '通行人・観光客（4カラーバリエーション）',
    note: 'ゆっくり移動。ジャンプ不可（背が高い）',
    draw: (g, c) => {
      for (let v = 0; v < c.sprites.peds.length; v++) {
        blit(g, c.sprites.peds[v][0], VW / 2 - 150 + v * 100, OY, MS);
      }
    },
  },
  { id: 'suitcase', label: 'スーツケース旅行者', note: '横に広い。迂回のみ', draw: (g, c) => blit(g, c.sprites.suitcase, VW / 2, OY, OS) },
  { id: 'cardman', label: '名刺交換マン', note: '接触で0.7秒の名刺交換タイム（ヒート増加なし）', draw: (g, c) => blit(g, c.sprites.cardman, VW / 2, OY + 10, OS) },
  {
    id: 'gull',
    label: 'カモメ（影の警告→急降下）',
    note: '影マーカー1.0秒→急降下。ダッシュ速度域だけ被弾しうる',
    draw: (g, c, t) => {
      g.fillStyle = t % 1 < 0.6 ? 'rgba(34,24,51,0.55)' : 'rgba(34,24,51,0.15)';
      g.beginPath();
      g.ellipse(VW / 2 - 110, OY - 5, 16, 5, 0, 0, Math.PI * 2);
      g.fill();
      text(g, '警告(影)', VW / 2 - 110, OY + 4, { size: 8, color: '#c8c2e0', align: 'center' });
      blit(g, c.sprites.gull[0], VW / 2 + 60, OY - 40, MS);
      blit(g, c.sprites.gull[1], VW / 2 + 150, OY - 40, MS);
      text(g, '急降下(2フレーム)', VW / 2 + 105, OY + 4, { size: 8, color: '#c8c2e0', align: 'center' });
    },
  },
  { id: 'cart', label: '台車', note: '奥⇔手前にサインカーブで横断', draw: (g, c) => blit(g, c.sprites.cart, VW / 2, OY, OS) },
  {
    id: 'tumbleweed',
    label: '回転草（2フレーム）',
    note: '左へ転がってくる。ジャンプ/迂回で回避',
    draw: (g, c) => {
      blit(g, c.sprites.tumbleweed[0], VW / 2 - 70, OY, MS);
      blit(g, c.sprites.tumbleweed[1], VW / 2 + 70, OY, MS);
    },
  },
  { id: 'dune', label: '砂丘（小）', note: '踏むと大減速。ジャンプで回避', draw: (g, c) => blit(g, c.sprites.dune, VW / 2, OY, OS) },
  {
    id: 'brick',
    label: '赤レンガ（バキュラ風、回転4方向）',
    note: 'ゆっくり回転しながら接近。ジャンプで回避可',
    draw: (g, c) => {
      for (let i = 0; i < 4; i++) blit(g, c.sprites.brick[i], VW / 2 - 150 + i * 100, OY, MS);
    },
  },
  {
    id: 'kickboard',
    label: '迷惑キックボード（なびく髪、2フレーム）',
    note: 'サインカーブで縦横無尽。ジャンプ不可。単発/複数同時出現あり',
    draw: (g, c) => {
      blit(g, c.sprites.kickboardGirl[0], VW / 2 - 80, OY, MS);
      blit(g, c.sprites.kickboardGirl[1], VW / 2 + 80, OY, MS);
    },
  },
  {
    id: 'sun_calm',
    label: '太陽（通常時）',
    note: '普段はやや微笑んだ表情',
    theme: 1,
    draw: () => {
      /* handled via bg in render() */
    },
  },
  {
    id: 'sun_angry',
    label: '太陽（日射レーザー攻撃時）',
    note: '警告〜照射に連動して真っ赤に、目は赤く光り口は牙状に開く',
    theme: 3,
    draw: () => {
      /* handled via bg in render() */
    },
  },
  {
    id: 'zone_shade',
    label: '日陰ゾーン',
    note: '減速するが回復。日射レーザーを遮断',
    theme: 1,
    needsFloor: true,
    draw: (g, _c, t, bg) => bg!.drawZone(g, 0, t, 'shade', -60, 60, 0, 1, 0),
  },
  {
    id: 'zone_sand',
    label: '砂ゾーン',
    note: '踏むと大減速。ジャンプ中は影響なし',
    theme: 3,
    needsFloor: true,
    draw: (g, _c, t, bg) => bg!.drawZone(g, 0, t, 'sand', -60, 60, 0, 1, 0),
  },
  {
    id: 'zone_glare',
    label: '照り返しゾーン',
    note: '最速だが最も熱い。光る床',
    theme: 2,
    needsFloor: true,
    draw: (g, _c, t, bg) => bg!.drawZone(g, 0, t, 'glare', -60, 60, 0, 1, 0),
  },
  {
    id: 'zone_mist',
    label: 'ミストゾーン',
    note: '小さく稀。通過するとヒート-12のボーナス',
    theme: 1,
    needsFloor: true,
    draw: (g, _c, t, bg) => bg!.drawZone(g, 0, t, 'mist', -60, 60, 0, 1, 0),
  },
  {
    id: 'zone_mirage',
    label: '蜃気楼シェード',
    note: '日陰に見えるが近づくと消える偽物。揺らぎで見分け可',
    theme: 3,
    needsFloor: true,
    draw: (g, _c, t, bg) => bg!.drawZone(g, 0, t, 'mirage', -60, 60, 0, 1, 0),
  },
  {
    id: 'store',
    label: 'コンビニ「スズシヤ」',
    note: '入店で1.4秒停止＋ヒート-55＋速度リセット',
    theme: 1,
    needsFloor: true,
    draw: (g) => blit(g, makeStore(), VW / 2, 160, 1.6),
  },
];

export const CATALOG_COUNT = ENTRIES.length;

export class CatalogScene implements Scene {
  private ctx: Ctx;
  private t = 0;
  private idx: number;
  private bgs: Background[];

  constructor(ctx: Ctx, idx: number) {
    this.ctx = ctx;
    this.idx = Math.max(0, Math.min(ENTRIES.length - 1, idx));
    this.bgs = [new Background(THEMES[1]), new Background(THEMES[2]), new Background(THEMES[3])];
  }

  update(dt: number): void {
    this.t += dt;
  }

  render(g: CanvasRenderingContext2D): void {
    const e = ENTRIES[this.idx];
    const bg = this.bgs[(e.theme ?? 1) - 1];

    if (e.id === 'sun_calm' || e.id === 'sun_angry') {
      bg.drawBack(g, 0, this.t, e.id === 'sun_angry' ? { x: 240, y: 30, blend: 1 } : undefined);
      bg.drawFloor(g, 0);
    } else if (e.needsFloor) {
      bg.drawBack(g, 0, this.t);
      bg.drawFloor(g, 0);
    } else {
      g.fillStyle = '#2a2440';
      g.fillRect(0, 0, VW, VH);
      g.fillStyle = '#1e1a34';
      g.fillRect(0, 214, VW, VH - 214);
    }

    e.draw(g, this.ctx, this.t, e.needsFloor || e.id.startsWith('sun_') ? bg : undefined);

    g.fillStyle = 'rgba(20,16,31,0.85)';
    g.fillRect(0, 0, VW, 26);
    text(g, `${this.idx + 1}/${ENTRIES.length}  ${e.label}`, VW / 2, 5, {
      size: 11,
      color: '#ffd94d',
      align: 'center',
      bold: true,
    });
    g.fillStyle = 'rgba(20,16,31,0.85)';
    g.fillRect(0, VH - 20, VW, 20);
    text(g, e.note, VW / 2, VH - 15, { size: 8, color: '#c8c2e0', align: 'center' });
  }
}
