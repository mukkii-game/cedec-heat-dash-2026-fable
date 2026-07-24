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
  | 'energy'
  | 'brick'
  | 'kickboard'
  | 'canRoll';

export interface ObDef {
  type: ObType;
  x: number;
  z: number;
  /** ped: 移動速度(m/s, 正=前方へ)。cart/kickboard: sin振動の速さ。brick/canRoll: 接近速度 */
  v?: number;
  /** ped/kickboard: z振動の振幅 */
  zAmp?: number;
  /** ped: 見た目バリエーション */
  variant?: number;
  /** ped: 集団の代表に立てると、通過時に横浜ネタの雑談吹き出しを出す */
  chat?: boolean;
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
  | { kind: 'sign'; x: number; text: string; icon?: 'updown' | 'jump' | 'goal' | 'warn' | 'none' }
  | { kind: 'store'; x: number } // 入口中心x
  | { kind: 'tree'; x: number }
  | { kind: 'awning'; x: number; w: number }
  | { kind: 'banner'; x: number; text: string }
  | { kind: 'station'; x: number }
  | { kind: 'palm'; x: number }
  | { kind: 'vending'; x: number };

/** 単一コースを構成する素材（zones/obs等）。単体ではWaveメタ情報を持たない */
export interface CourseSection {
  length: number;
  /** ★評価の基準タイム(s)。s以下=★3、a以下=★2、それより遅くてもクリアなら★1 */
  par: { s: number; a: number };
  zones: Zone[];
  obs: ObDef[];
  lasers: LaserDef[];
  /** コンビニ入口中心x（z<0.18で入店） */
  stores: number[];
  wall: WallDecor[];
}

/** 通しステージ内のチェックポイント区間（旧DAY1〜3に相当） */
export interface Wave {
  n: 1 | 2 | 3;
  /** このWaveが始まる通し座標(m) */
  startX: number;
  theme: 1 | 2 | 3;
  song: 'day1' | 'day2' | 'day3';
  label: string;
}

/** 実際にプレイされる通しコース。CourseSectionを3つつなげて構成する */
export interface Course extends CourseSection {
  waves: Wave[];
}

// ==================================================
// WAVE 1 素材: みなとみらい、晴れ。 290m
// S0 駅前 → S1 並木の選択 → S2 観光客の波 → S3 ビル風の谷(初レーザー+コンビニ)
// → S4 ラストスパート(日向直進 vs 日陰迂回)
// ==================================================
const WAVE1_SRC: CourseSection = {
  length: 290,
  par: { s: 28, a: 33 },
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
    // S0: 単発でぽつんと立ち話している人（動かない。密度の「疎」を担う）
    { type: 'ped', x: 20, z: 0.35, v: 0, variant: 2 },
    // S0: 初障害物（ジャンプでも迂回でも良い）
    { type: 'cone', x: 32, z: 0.75 },
    // S1: 日陰側の観光客
    { type: 'ped', x: 68, z: 0.18, v: -0.6, variant: 0 },
    { type: 'ped', x: 86, z: 0.28, v: 0.5, variant: 1 },
    { type: 'planter', x: 76, z: 0.65 },
    { type: 'drink', x: 94, z: 0.85 },
    // 仲良く横並びで歩くカップル（2人分＝奥まで塞ぐので迂回幅が要る）
    { type: 'ped', x: 104, z: 0.42, v: -0.3, variant: 0 },
    { type: 'ped', x: 105, z: 0.58, v: -0.3, variant: 2 },
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
    // 転がるレッドブルー巨大缶（プレイヤーサイズ。ジャンプか上下移動で回避）
    { type: 'canRoll', x: 180, z: 0.5, v: 2.6 },
    // S3: レーザー区間（回避手段は影/減速/奥）
    { type: 'ped', x: 197, z: 0.8, v: 0.3, variant: 3 },
    { type: 'ped', x: 210, z: 0.6, v: -0.6, variant: 1, zAmp: 0.16 },
    { type: 'kickboard', x: 222, z: 0.5, zAmp: 0.32 },
    // S4: 分岐 — 日向(奥)は障害物2つ、日陰(手前)は遅いがクリーン
    { type: 'cardman', x: 236, z: 0.48 },
    // 後半のさらに密度アップ: 横並びで邪魔してくる3人組ブロッカーを3組連続で。
    // ゆっくり左右に揺れながら歩いてくる（zAmp）＋前進速度も遅め（v）
    { type: 'ped', x: 240, z: 0.42, v: -0.15, variant: 0, zAmp: 0.22, chat: true },
    { type: 'ped', x: 241, z: 0.54, v: -0.15, variant: 3, zAmp: 0.22 },
    { type: 'ped', x: 242, z: 0.66, v: -0.15, variant: 1, zAmp: 0.22 },
    { type: 'ped', x: 247, z: 0.38, v: -0.15, variant: 2, zAmp: 0.2, chat: true },
    { type: 'ped', x: 248, z: 0.5, v: -0.15, variant: 0, zAmp: 0.2 },
    { type: 'ped', x: 249, z: 0.62, v: -0.15, variant: 3, zAmp: 0.2 },
    { type: 'ped', x: 254, z: 0.55, v: -0.15, variant: 1, zAmp: 0.2, chat: true },
    { type: 'ped', x: 255, z: 0.67, v: -0.15, variant: 2, zAmp: 0.2 },
    { type: 'ped', x: 256, z: 0.79, v: -0.15, variant: 0, zAmp: 0.2 },
    { type: 'planter', x: 252, z: 0.2 },
    { type: 'cone', x: 264, z: 0.32 },
    { type: 'drink', x: 258, z: 0.08 },
    // ゴール直前、低障害物のスラローム（WAVE1終盤の「やたら多い」を担う締めの一押し）
    { type: 'cone', x: 270, z: 0.68 },
    { type: 'planter', x: 274, z: 0.42 },
    { type: 'coolbox', x: 278, z: 0.62 },
    { type: 'cone', x: 282, z: 0.3 },
  ],
  lasers: [
    // 初レーザー: 手前側z0.35〜1に着弾。奥のビル影に入るか、減速 or 加速で外す
    { x: 200, halfW: 5, z0: 0.35, z1: 1, triggerX: 176 },
  ],
  stores: [216],
  wall: [
    // 駅舎はスタート時に画面内へしっかり収まる位置に（看板がはっきり見えるよう）
    { kind: 'station', x: 2 },
    { kind: 'sign', x: 20, text: '↑↓', icon: 'updown' },
    { kind: 'sign', x: 30, text: 'JUMP', icon: 'jump' },
    { kind: 'tree', x: 44 },
    { kind: 'tree', x: 62 },
    { kind: 'tree', x: 80 },
    { kind: 'tree', x: 97 },
    { kind: 'banner', x: 118, text: 'CEDEC 2026 →' },
    { kind: 'vending', x: 133 },
    { kind: 'tree', x: 155 },
    { kind: 'sign', x: 172, text: '日射注意', icon: 'warn' },
    { kind: 'awning', x: 196, w: 26 },
    { kind: 'store', x: 216 },
    { kind: 'banner', x: 240, text: 'あと50m' },
    { kind: 'awning', x: 258, w: 32 },
    { kind: 'sign', x: 282, text: 'WAVE 1 CLEAR!', icon: 'goal' },
  ],
};

// ==================================================
// WAVE 2 素材: 猛暑日。人も増えた。 400m
// S0 朝 → S1 混雑 → S2 照り返し直線 → S3 砂の侵食 → S4 レーザー連続 → S5 ラスト
// ==================================================
const WAVE2_SRC: CourseSection = {
  length: 400,
  par: { s: 38, a: 45 },
  zones: [
    // S0: 朝でも既に暑い。短い日陰
    { kind: 'shade', x0: 16, x1: 36, z0: 0, z1: 0.4, shear: -6 },
    // S1: 混雑区間。日陰は手前側ひさし（人が多い）
    { kind: 'shade', x0: 62, x1: 86, z0: 0.6, z1: 1, shear: -4 },
    { kind: 'shade', x0: 106, x1: 126, z0: 0, z1: 0.35, shear: -6 },
    // S2: 照り返しの中央直線（最速レーン、ただし灼熱）
    { kind: 'glare', x0: 146, x1: 206, z0: 0.3, z1: 0.7 },
    { kind: 'shade', x0: 168, x1: 182, z0: 0, z1: 0.22, shear: -5 },
    // S3: 砂の侵食が始まる
    { kind: 'sand', x0: 218, x1: 240, z0: 0.55, z1: 1 },
    { kind: 'sand', x0: 246, x1: 270, z0: 0, z1: 0.45 },
    { kind: 'shade', x0: 282, x1: 300, z0: 0.55, z1: 1, shear: -4 },
    // S4: レーザー連続区間の小さな影の島
    { kind: 'shade', x0: 330, x1: 344, z0: 0, z1: 0.28, shear: -6 },
    // S5: ゴール前ミスト
    { kind: 'mist', x0: 388, x1: 393, z0: 0, z1: 1 },
  ],
  obs: [
    // S0
    { type: 'cone', x: 24, z: 0.7 },
    { type: 'ped', x: 40, z: 0.5, v: -0.5, variant: 0, zAmp: 0.15 },
    // S1: 混雑。ひさし日陰側に人が密集
    { type: 'ped', x: 64, z: 0.75, v: -0.6, variant: 2 },
    { type: 'ped', x: 72, z: 0.9, v: 0.4, variant: 3 },
    { type: 'suitcase', x: 80, z: 0.68, v: -0.3, variant: 1 },
    { type: 'ped', x: 90, z: 0.3, v: -0.7, variant: 0, zAmp: 0.2 },
    { type: 'cart', x: 98, z: 0.5, v: 1.0 },
    { type: 'ped', x: 112, z: 0.18, v: 0.5, variant: 2 },
    { type: 'suitcase', x: 120, z: 0.55, v: -0.4, variant: 3 },
    { type: 'cardman', x: 130, z: 0.32 },
    { type: 'drink', x: 100, z: 0.08 },
    // 転がるレッドブルー巨大缶
    { type: 'canRoll', x: 108, z: 0.5, v: 2.8 },
    // 買い物帰りの3人組（横並びで塞ぐ集団。ぎゅっと密集していて一気には抜けられない。
    // ゆっくり左右に揺れながら歩いてくる）
    { type: 'ped', x: 140, z: 0.34, v: -0.15, variant: 1, zAmp: 0.22, chat: true },
    { type: 'ped', x: 141, z: 0.46, v: -0.15, variant: 3, zAmp: 0.22 },
    { type: 'ped', x: 142, z: 0.58, v: -0.15, variant: 0, zAmp: 0.22 },
    // すぐ後ろにもう一組続き、この一帯だけ「やたらおおい」密度にする
    { type: 'ped', x: 144, z: 0.3, v: -0.35, variant: 2 },
    { type: 'ped', x: 145, z: 0.44, v: -0.35, variant: 0 },
    // S2: 照り返し直線。中央が速いが熱い
    { type: 'ped', x: 152, z: 0.12, v: -0.5, variant: 1 },
    { type: 'planter', x: 164, z: 0.85 },
    // 単発でぽつんと立って光る床を眺めている人（動かない）
    { type: 'ped', x: 170, z: 0.15, v: 0, variant: 3 },
    { type: 'energy', x: 186, z: 0.5 },
    { type: 'ped', x: 196, z: 0.88, v: 0.4, variant: 0 },
    { type: 'gull', x: 176, z: 0.4 },
    { type: 'brick', x: 210, z: 0.55, v: 2.4 },
    // S3: 砂の縫い目。ここは赤レンガが連続する「レンガ地帯」テーマ区間
    { type: 'dune', x: 228, z: 0.35 },
    { type: 'brick', x: 234, z: 0.55, v: 2.6 },
    { type: 'coolbox', x: 240, z: 0.9 },
    { type: 'dune', x: 256, z: 0.75 },
    { type: 'brick', x: 262, z: 0.4, v: 2.8 },
    { type: 'ped', x: 264, z: 0.6, v: -0.4, variant: 3, zAmp: 0.18 },
    { type: 'drink', x: 274, z: 0.15 },
    { type: 'gull', x: 288, z: 0.3 },
    // S4: レーザー連続（影の島か速度調整で抜ける。新ギミックは詰め込まない）
    { type: 'ped', x: 316, z: 0.7, v: 0.3, variant: 2 },
    { type: 'tumbleweed', x: 348, z: 0.5 },
    // S5: レーザー地帯を抜けた後の開けた直線でもうひと押し。
    // 後半3分の1、3人組ブロッカーを3組連続で立て続けに配置（ゆっくり左右に歩く）
    { type: 'ped', x: 354, z: 0.15, v: -0.15, variant: 0, zAmp: 0.2, chat: true },
    { type: 'ped', x: 355, z: 0.27, v: -0.15, variant: 3, zAmp: 0.2 },
    { type: 'ped', x: 356, z: 0.39, v: -0.15, variant: 1, zAmp: 0.2 },
    { type: 'ped', x: 360, z: 0.36, v: -0.15, variant: 2, zAmp: 0.2, chat: true },
    { type: 'ped', x: 361, z: 0.48, v: -0.15, variant: 0, zAmp: 0.2 },
    { type: 'ped', x: 362, z: 0.6, v: -0.15, variant: 3, zAmp: 0.2 },
    // もう一組、密集した3人組（コンビニ帰りの井戸端会議）
    { type: 'ped', x: 366, z: 0.32, v: -0.15, variant: 2, zAmp: 0.2, chat: true },
    { type: 'ped', x: 367, z: 0.44, v: -0.15, variant: 0, zAmp: 0.2 },
    { type: 'ped', x: 368, z: 0.56, v: -0.15, variant: 3, zAmp: 0.2 },
    { type: 'cone', x: 372, z: 0.45 },
    { type: 'coolbox', x: 376, z: 0.72 },
    { type: 'brick', x: 380, z: 0.35, v: 2.8 },
    { type: 'planter', x: 388, z: 0.85 },
    { type: 'drink', x: 384, z: 0.8 },
    // 迷惑キックボード女子、2台同時に爆走（単発でなく「たくさん一度に」の例）
    { type: 'kickboard', x: 392, z: 0.55, zAmp: 0.3, v: 3.4 },
    { type: 'kickboard', x: 397, z: 0.2, zAmp: 0.24, v: 3.7 },
  ],
  lasers: [
    // 手前側→奥側と交互に落ちる。影の島 or 速度計画で回避
    { x: 182, halfW: 5, z0: 0.45, z1: 1, triggerX: 158 },
    { x: 322, halfW: 5, z0: 0.45, z1: 1, triggerX: 300 },
    { x: 352, halfW: 6, z0: 0, z1: 0.6, triggerX: 328 },
  ],
  stores: [212, 358],
  wall: [
    { kind: 'banner', x: 20, text: '熱中症警戒アラート発令中' },
    { kind: 'tree', x: 44 },
    { kind: 'awning', x: 74, w: 24 },
    { kind: 'vending', x: 95 },
    { kind: 'tree', x: 116 },
    { kind: 'banner', x: 146, text: 'CEDEC 2026 →' },
    { kind: 'sign', x: 160, text: '照り返し', icon: 'warn' },
    { kind: 'awning', x: 175, w: 14 },
    { kind: 'store', x: 212 },
    { kind: 'sign', x: 224, text: '砂?', icon: 'warn' },
    { kind: 'palm', x: 250 },
    { kind: 'tree', x: 290 },
    { kind: 'sign', x: 300, text: '連続日射', icon: 'warn' },
    { kind: 'awning', x: 337, w: 14 },
    { kind: 'store', x: 358 },
    { kind: 'banner', x: 375, text: 'あと25m がんばれ' },
    { kind: 'sign', x: 392, text: 'WAVE 2 CLEAR!', icon: 'goal' },
  ],
};

// ==================================================
// WAVE 3 素材: みなとみらい砂漠。 500m
// 砂の間を縫い、蜃気楼に騙され、スイープレーザーを読み、
// 最後はヒート残量で日向の長い直線を走り切る「熱走ラストラン」
// ==================================================
const WAVE3_SRC: CourseSection = {
  length: 500,
  par: { s: 44, a: 52 },
  zones: [
    // 砂のフィールド（縫って走る）
    { kind: 'sand', x0: 30, x1: 62, z0: 0.45, z1: 1 },
    { kind: 'sand', x0: 74, x1: 108, z0: 0, z1: 0.5 },
    { kind: 'shade', x0: 118, x1: 132, z0: 0.6, z1: 1, shear: -4 },
    { kind: 'sand', x0: 140, x1: 172, z0: 0.35, z1: 1 },
    // 蜃気楼1: 本物そっくりの偽日陰（近づくと消える）
    { kind: 'mirage', x0: 150, x1: 168, z0: 0, z1: 0.3 },
    { kind: 'shade', x0: 180, x1: 196, z0: 0, z1: 0.3, shear: -6 },
    { kind: 'sand', x0: 210, x1: 240, z0: 0, z1: 0.55 },
    // オアシス
    { kind: 'mist', x0: 250, x1: 256, z0: 0.3, z1: 0.7 },
    { kind: 'sand', x0: 262, x1: 300, z0: 0.5, z1: 1 },
    // 蜃気楼2
    { kind: 'mirage', x0: 306, x1: 322, z0: 0.55, z1: 0.9 },
    { kind: 'shade', x0: 338, x1: 352, z0: 0.6, z1: 1, shear: -4 },
    { kind: 'sand', x0: 360, x1: 396, z0: 0, z1: 0.45 },
    { kind: 'shade', x0: 406, x1: 418, z0: 0, z1: 0.25, shear: -6 },
    // 熱走ラストラン: 440-500 は日向のみ。残ヒートが攻め幅
  ],
  obs: [
    { type: 'dune', x: 46, z: 0.25 },
    { type: 'tumbleweed', x: 70, z: 0.6 },
    { type: 'ped', x: 90, z: 0.75, v: -0.4, variant: 0, zAmp: 0.15 },
    { type: 'dune', x: 116, z: 0.3 },
    { type: 'brick', x: 124, z: 0.35, v: 2.8 },
    { type: 'gull', x: 136, z: 0.5 },
    // 転がるレッドブルー巨大缶
    { type: 'canRoll', x: 148, z: 0.5, v: 3.0 },
    { type: 'tumbleweed', x: 158, z: 0.2 },
    { type: 'coolbox', x: 176, z: 0.7 },
    { type: 'drink', x: 190, z: 0.15 },
    // 単発でぽつんと立って砂丘を撮影している人（動かない）
    { type: 'ped', x: 200, z: 0.85, v: 0, variant: 1 },
    // ここから先(190-214)はスイープ日射レーザーの通り道。新ギミックは詰め込まない
    { type: 'dune', x: 222, z: 0.8 },
    { type: 'tumbleweed', x: 236, z: 0.45 },
    // 迷惑キックボード女子、2台同時に横並びで爆走
    { type: 'kickboard', x: 240, z: 0.28, zAmp: 0.2, v: 3.8 },
    { type: 'kickboard', x: 246, z: 0.72, zAmp: 0.2, v: 4.0 },
    { type: 'suitcase', x: 258, z: 0.15, v: -0.3, variant: 1 },
    // 砂漠を渡る旅行者の集団（3人、影を求めて肩を寄せ合い固まって歩く。
    // ゆっくり左右に揺れながら歩いてくる）
    { type: 'ped', x: 270, z: 0.36, v: -0.15, variant: 1, zAmp: 0.2, chat: true },
    { type: 'ped', x: 271, z: 0.48, v: -0.15, variant: 0, zAmp: 0.2 },
    { type: 'ped', x: 272, z: 0.6, v: -0.15, variant: 3, zAmp: 0.2 },
    { type: 'ped', x: 282, z: 0.35, v: 0.4, variant: 2, zAmp: 0.2 },
    { type: 'dune', x: 296, z: 0.2 },
    { type: 'gull', x: 316, z: 0.7 },
    { type: 'drink', x: 330, z: 0.85 },
    { type: 'brick', x: 338, z: 0.4, v: 3.4 },
    { type: 'cart', x: 346, z: 0.5, v: 0.9 },
    { type: 'kickboard', x: 360, z: 0.6, zAmp: 0.42, v: 4.2 },
    { type: 'dune', x: 372, z: 0.7 },
    { type: 'brick', x: 380, z: 0.4, v: 3.4 },
    { type: 'tumbleweed', x: 388, z: 0.35 },
    // 後半3分の1、3人組ブロッカーを3組連続で立て続けに配置（ゆっくり左右に歩く）
    { type: 'ped', x: 386, z: 0.15, v: -0.15, variant: 2, zAmp: 0.2, chat: true },
    { type: 'ped', x: 387, z: 0.27, v: -0.15, variant: 0, zAmp: 0.2 },
    { type: 'ped', x: 388, z: 0.39, v: -0.15, variant: 3, zAmp: 0.2 },
    { type: 'ped', x: 392, z: 0.6, v: -0.15, variant: 1, zAmp: 0.2, chat: true },
    { type: 'ped', x: 393, z: 0.72, v: -0.15, variant: 3, zAmp: 0.2 },
    { type: 'ped', x: 394, z: 0.84, v: -0.15, variant: 0, zAmp: 0.2 },
    // もう一組、密集3人組
    { type: 'ped', x: 398, z: 0.3, v: -0.15, variant: 0, zAmp: 0.2, chat: true },
    { type: 'ped', x: 399, z: 0.42, v: -0.15, variant: 2, zAmp: 0.2 },
    { type: 'ped', x: 400, z: 0.54, v: -0.15, variant: 1, zAmp: 0.2 },
    { type: 'dune', x: 405, z: 0.75 },
    // ここから先(408-434)はスイープ日射レーザーの通り道。新ギミックは詰め込まない
    { type: 'cardman', x: 414, z: 0.55 },
    { type: 'tumbleweed', x: 420, z: 0.25 },
    { type: 'energy', x: 428, z: 0.1 },
    { type: 'ped', x: 432, z: 0.68, v: -0.2, variant: 2 },
    // 熱走ラストラン: 障害は薄く、ヒートとの勝負（ここは意図的に密度を抑える）
    { type: 'dune', x: 452, z: 0.5 },
    { type: 'drink', x: 466, z: 0.25 },
    { type: 'tumbleweed', x: 480, z: 0.6 },
  ],
  lasers: [
    { x: 100, halfW: 5, z0: 0, z1: 0.5, triggerX: 78 },
    // スイープ型: 奥から手前へ薙ぎ払う
    { x: 214, halfW: 6, z0: 0, z1: 1, triggerX: 190, sweep: true },
    { x: 312, halfW: 5, z0: 0.4, z1: 1, triggerX: 290 },
    { x: 434, halfW: 7, z0: 0, z1: 1, triggerX: 408, sweep: true },
  ],
  stores: [204, 364],
  wall: [
    { kind: 'banner', x: 14, text: 'みなとみらい砂漠 横断注意' },
    { kind: 'palm', x: 40 },
    { kind: 'palm', x: 92 },
    { kind: 'sign', x: 124, text: 'オアシスまで 126m', icon: 'none' },
    { kind: 'palm', x: 156 },
    { kind: 'sign', x: 186, text: '蜃気楼多発', icon: 'warn' },
    { kind: 'store', x: 204 },
    { kind: 'palm', x: 246 },
    { kind: 'vending', x: 254 },
    { kind: 'palm', x: 292 },
    { kind: 'sign', x: 330, text: 'スイープ日射', icon: 'warn' },
    { kind: 'palm', x: 344 },
    { kind: 'store', x: 364 },
    { kind: 'banner', x: 404, text: 'ラスト100m 走りきれ' },
    { kind: 'palm', x: 442 },
    { kind: 'palm', x: 470 },
    { kind: 'sign', x: 492, text: 'GOAL', icon: 'goal' },
  ],
};

// ==================================================
// 3区間(WAVE1〜3)を1本の通しコースに連結する。
// 各素材は元々0起点で設計されているため、開始座標ぶんだけx/x0/x1/triggerX等を
// オフセットしてから結合する（レベルデザイン自体は素材側を編集すれば良い）。
// ==================================================
function offsetZones(zs: Zone[], dx: number): Zone[] {
  return zs.map((z) => ({ ...z, x0: z.x0 + dx, x1: z.x1 + dx }));
}
function offsetObs(os: ObDef[], dx: number): ObDef[] {
  return os.map((o) => ({ ...o, x: o.x + dx }));
}
function offsetLasers(ls: LaserDef[], dx: number): LaserDef[] {
  return ls.map((l) => ({ ...l, x: l.x + dx, triggerX: l.triggerX + dx }));
}
function offsetWall(ws: WallDecor[], dx: number): WallDecor[] {
  return ws.map((w) => ({ ...w, x: w.x + dx }));
}

const WAVE2_OFFSET = WAVE1_SRC.length;
const WAVE3_OFFSET = WAVE2_OFFSET + WAVE2_SRC.length;
const TOTAL_LENGTH = WAVE3_OFFSET + WAVE3_SRC.length;

/** 通しプレイ用のメインコース。3日分を足した1本の長いステージ（WAVE1〜3） */
export const MAIN: Course = {
  length: TOTAL_LENGTH,
  par: {
    s: WAVE1_SRC.par.s + WAVE2_SRC.par.s + WAVE3_SRC.par.s,
    a: WAVE1_SRC.par.a + WAVE2_SRC.par.a + WAVE3_SRC.par.a,
  },
  zones: [...WAVE1_SRC.zones, ...offsetZones(WAVE2_SRC.zones, WAVE2_OFFSET), ...offsetZones(WAVE3_SRC.zones, WAVE3_OFFSET)],
  obs: [...WAVE1_SRC.obs, ...offsetObs(WAVE2_SRC.obs, WAVE2_OFFSET), ...offsetObs(WAVE3_SRC.obs, WAVE3_OFFSET)],
  lasers: [
    ...WAVE1_SRC.lasers,
    ...offsetLasers(WAVE2_SRC.lasers, WAVE2_OFFSET),
    ...offsetLasers(WAVE3_SRC.lasers, WAVE3_OFFSET),
  ],
  stores: [...WAVE1_SRC.stores, ...WAVE2_SRC.stores.map((s) => s + WAVE2_OFFSET), ...WAVE3_SRC.stores.map((s) => s + WAVE3_OFFSET)],
  wall: [...WAVE1_SRC.wall, ...offsetWall(WAVE2_SRC.wall, WAVE2_OFFSET), ...offsetWall(WAVE3_SRC.wall, WAVE3_OFFSET)],
  waves: [
    { n: 1, startX: 0, theme: 1, song: 'day1', label: 'WAVE 1' },
    { n: 2, startX: WAVE2_OFFSET, theme: 2, song: 'day2', label: 'WAVE 2' },
    { n: 3, startX: WAVE3_OFFSET, theme: 3, song: 'day3', label: 'WAVE 3' },
  ],
};
