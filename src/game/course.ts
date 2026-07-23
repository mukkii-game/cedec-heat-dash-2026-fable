// コース定義。すべて手作業設計（GAME_DESIGN.md の区間設計に対応）。
// x: メートル（0=スタート）、z: 0(奥)〜1(手前)

export type ZoneKind = 'shade' | 'sand' | 'glare' | 'mist' | 'mirage';

export interface Zone {
  kind: ZoneKind;
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  /** 建物影の斜め度（px）。壁の建物由来なら負値で左へ流す */
  shear?: number;
}

export type ObType =
  | 'cone'
  | 'planter'
  | 'coolbox'
  | 'ped'
  | 'suitcase'
  | 'cardman'
  | 'gull'
  | 'cart'
  | 'tumbleweed'
  | 'dune'
  | 'drink'
  | 'energy';

export interface ObDef {
  type: ObType;
  x: number;
  z: number;
  /** ped: 移動速度(m/s, 正=前方へ)。cart: 縦断速度 */
  v?: number;
  /** ped: z振動の振幅 */
  zAmp?: number;
  /** ped: 見た目バリエーション */
  variant?: number;
}

export interface LaserDef {
  /** 着弾帯の中心x */
  x: number;
  /** 半幅(m) */
  halfW: number;
  z0: number;
  z1: number;
  /** プレイヤーがこのxを超えたら警告開始 */
  triggerX: number;
  /** 奥→手前へスイープする（Day3） */
  sweep?: boolean;
}

export type WallDecor =
  | { kind: 'sign'; x: number; text: string; icon?: 'updown' | 'jump' | 'goal' | 'none' }
  | { kind: 'store'; x: number } // 入口中心x
  | { kind: 'tree'; x: number }
  | { kind: 'awning'; x: number; w: number }
  | { kind: 'banner'; x: number; text: string }
  | { kind: 'station'; x: number }
  | { kind: 'palm'; x: number }
  | { kind: 'vending'; x: number };

export interface Course {
  day: 1 | 2 | 3;
  length: number;
  /** 制限時間(s) */
  limit: number;
  /** ランク基準 */
  par: { s: number; a: number; b: number };
  zones: Zone[];
  obs: ObDef[];
  lasers: LaserDef[];
  /** コンビニ入口中心x（z<0.18で入店） */
  stores: number[];
  wall: WallDecor[];
}

// ==================================================
// DAY 1: みなとみらい、晴れ。 290m / 制限60秒
// S0 駅前 → S1 並木の選択 → S2 観光客の波 → S3 ビル風の谷(初レーザー+コンビニ)
// → S4 ラストスパート(日向直進 vs 日陰迂回)
// ==================================================
export const DAY1: Course = {
  day: 1,
  length: 290,
  limit: 60,
  par: { s: 28, a: 33, b: 42 },
  zones: [
    // S0: 最初の日陰（奥側）— 「日陰=青くて気持ちいい」を学ぶ
    { kind: 'shade', x0: 22, x1: 42, z0: 0, z1: 0.5, shear: -6 },
    // S1: 並木の日陰（奥）だが観光客あり。手前は日向で無人
    { kind: 'shade', x0: 58, x1: 100, z0: 0, z1: 0.42, shear: -5 },
    // S2: 中間の短い日陰
    { kind: 'shade', x0: 146, x1: 168, z0: 0, z1: 0.38, shear: -6 },
    // S3: レーザーを遮る大きなビル影（奥〜中央）
    { kind: 'shade', x0: 186, x1: 210, z0: 0, z1: 0.55, shear: -8 },
    // S4: 手前側のひさし日陰（安全迂回ルート）
    { kind: 'shade', x0: 246, x1: 276, z0: 0.58, z1: 1, shear: -4 },
    // ミスト: ゴール手前のご褒美
    { kind: 'mist', x0: 280, x1: 285, z0: 0, z1: 1 },
  ],
  obs: [
    // S0: 初障害物（ジャンプでも迂回でも良い）
    { type: 'cone', x: 32, z: 0.75 },
    // S1: 日陰側の観光客
    { type: 'ped', x: 68, z: 0.18, v: -0.6, variant: 0 },
    { type: 'ped', x: 86, z: 0.28, v: 0.5, variant: 1 },
    { type: 'planter', x: 76, z: 0.65 },
    { type: 'drink', x: 94, z: 0.85 },
    // S2: 人の波（上下にゆっくり巡回=読んで抜ける）
    { type: 'ped', x: 120, z: 0.55, v: -0.8, variant: 2, zAmp: 0.18 },
    { type: 'ped', x: 128, z: 0.78, v: 0.4, variant: 3 },
    { type: 'ped', x: 137, z: 0.32, v: -0.5, variant: 1, zAmp: 0.22 },
    { type: 'ped', x: 146, z: 0.62, v: 0.6, variant: 0, zAmp: 0.14 },
    { type: 'ped', x: 153, z: 0.14, v: -0.4, variant: 2 },
    { type: 'cart', x: 160, z: 0.5, v: 1.1 },
    { type: 'gull', x: 166, z: 0.55 },
    { type: 'drink', x: 141, z: 0.92 },
    { type: 'coolbox', x: 133, z: 0.05 },
    // S3: レーザー区間（回避手段は影/減速/奥）
    { type: 'ped', x: 197, z: 0.8, v: 0.3, variant: 3 },
    { type: 'ped', x: 210, z: 0.6, v: -0.6, variant: 1, zAmp: 0.16 },
    // S4: 分岐 — 日向(奥)は障害物2つ、日陰(手前)は遅いがクリーン
    { type: 'cardman', x: 236, z: 0.48 },
    { type: 'planter', x: 252, z: 0.2 },
    { type: 'cone', x: 264, z: 0.32 },
    { type: 'drink', x: 258, z: 0.08 },
  ],
  lasers: [
    // 初レーザー: 手前側z0.35〜1に着弾。奥のビル影に入るか、減速 or 加速で外す
    { x: 200, halfW: 5, z0: 0.35, z1: 1, triggerX: 176 },
  ],
  stores: [216],
  wall: [
    { kind: 'station', x: -8 },
    { kind: 'sign', x: 8, text: '↑↓', icon: 'updown' },
    { kind: 'sign', x: 15, text: 'JUMP', icon: 'jump' },
    { kind: 'tree', x: 30 },
    { kind: 'tree', x: 62 },
    { kind: 'tree', x: 80 },
    { kind: 'tree', x: 97 },
    { kind: 'banner', x: 118, text: 'CEDEC 2026 →' },
    { kind: 'vending', x: 133 },
    { kind: 'tree', x: 155 },
    { kind: 'sign', x: 172, text: '!', icon: 'none' },
    { kind: 'awning', x: 196, w: 26 },
    { kind: 'store', x: 216 },
    { kind: 'banner', x: 240, text: 'あと50m' },
    { kind: 'awning', x: 258, w: 32 },
    { kind: 'sign', x: 282, text: 'GOAL', icon: 'goal' },
  ],
};

export const COURSES: Record<number, Course> = { 1: DAY1 };
