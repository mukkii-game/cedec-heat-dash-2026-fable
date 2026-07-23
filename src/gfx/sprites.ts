// 全スプライト定義。文字列グリッド（1文字=1px）で描く。
// 主人公は 胴体+腕+脚 の合成で走り6フレームを生成する。

import { mk, compose, flipX, recolor, type Sprite } from './pix';

// ---- 主人公パレット ----
const P: Record<string, string> = {
  r: '#e8504b', // キャップ赤
  R: '#b03042',
  c: '#ff8a78', // キャップハイライト
  h: '#4a3524', // 髪
  t: '#3ec6c0', // シャツ
  T: '#2b8f92',
  n: '#2e4a7a', // ショーツ紺
  N: '#223558',
  o: '#f2a33c', // リュック
  O: '#c47a24',
  p: '#ff6ea8', // パスケース
  W: '#c9c2b4', // 靴影
  d: '#8a5a3a', // 靴底
  x: '#221833', // 目(気絶時の渦など)
};

// 主人公 胴体（24×19）。右向き。後ろ向きキャップ＋リュック。
const BODY = [
  '........kkkkkk..........',
  '.......kccrrrrk.........',
  '......kcrrrrrrrk........',
  '......krrrrrrrrk........',
  '...kkkkRrrrrrrrk........',
  '..kRRRRRrrrrrrrrk.......',
  '...kkkkhhsssssssk.......',
  '.......khsssswksk.......',
  '.......khsssssksk.......',
  '........kssssSk.........',
  '........kksSSk..........',
  '.....kook.kttkk.........',
  '....koookttttptk........',
  '...kooookttttptk........',
  '...koooooktttttk........',
  '...koooooktttttk........',
  '...kOOoookttttTk........',
  '....kOOokkttTTk.........',
  '.....kkk.kTTTk..........',
];

// 前腕オーバーレイ（24×19）: 走りの腕振り3態。輪郭付きで胴体から浮き立たせる
const ARM_MID = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '..........kk............',
  '.........kttkk..........',
  '.........ktsssk.........',
  '..........kkssk.........',
  '............kk..........',
  '........................',
  '........................',
  '........................',
];
const ARM_FWD = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '..........kkk...........',
  '.........kttsssk........',
  '.........ktksssk........',
  '..........k.kkk.........',
  '........................',
  '........................',
  '........................',
  '........................',
];
const ARM_BACK = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '..........kk............',
  '........kkttk...........',
  '.......ksstk............',
  '......kssk..............',
  '.......kk...............',
  '........................',
  '........................',
  '........................',
];
// 前腕上げ（ゴール/ジャンプ用）: 肩から繋がった腕
const ARM_UP = [
  '........................',
  '........................',
  '........................',
  '...................kk...',
  '..................kssk..',
  '..................kssk..',
  '.................kssk...',
  '.................ksk....',
  '................ksk.....',
  '................ksk.....',
  '...............ksk......',
  '..............kssk......',
  '..........kkttssk.......',
  '..........kttkk.........',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];
// よろけ用の非対称な腕（前へ大きく振り出してバランスを取る仕草。両手上げ系とシルエットを分ける）
const ARM_BRACE = [
  '........................',
  '........................',
  '........................',
  '........................',
  '..............kk........',
  '.............ktsk.......',
  '............ktssk.......',
  '...........ktssk........',
  '..........ktssk.........',
  '.........ktsk...........',
  '........kssk............',
  '........kk..............',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
];

// 脚オーバーレイ（24×11、y=19開始）。手前脚=s/w、奥脚=S/W で描き分け
const LEGS: string[][] = [
  // 0: 接地A 手前脚が前方に伸びる
  [
    '.......knnnnnk..........',
    '......kNnnnnnnk.........',
    '......kNnkksnnk.........',
    '.....kSSk..kssk.........',
    '....kSSk....kssk........',
    '....kWk......kssk.......',
    '...kwwk.......kssk......',
    '..kwwdk........kwwk.....',
    '..kddk.........kwwwkk...',
    '...............kddddk...',
    '........................',
  ],
  // 1: 沈み込みA
  [
    '.......knnnnnk..........',
    '......kNnnnnnnk.........',
    '......kNnkksnk..........',
    '.....kSsk.kssk..........',
    '.....kSk...kssk.........',
    '....kSk....kwwk.........',
    '....kWWk...kwwdk........',
    '....kWWk...kdddk........',
    '.....kk.................',
    '........................',
    '........................',
  ],
  // 2: 蹴り上げA
  [
    '.......knnnnnk..........',
    '......kNnnnnnnk.........',
    '......kNnkksnnk.........',
    '......kSSk.kssk.........',
    '.....kSSk..ksssk........',
    '....kWWk....kssk........',
    '...kWWk......kwwk.......',
    '...kdd........kwwdk.....',
    '..............kddk......',
    '........................',
    '........................',
  ],
  // 3: 接地B 奥脚が前方
  [
    '.......knnnnnk..........',
    '......kNnnnnnnk.........',
    '......knnkkSnnk.........',
    '.....kssk..kSSk.........',
    '....kssk....kSSk........',
    '....kwk......kSSk.......',
    '...kwwk.......kSSk......',
    '..kwwdk........kWWk.....',
    '..kddk.........kWWWkk...',
    '...............kdddk....',
    '........................',
  ],
  // 4: 沈み込みB
  [
    '.......knnnnnk..........',
    '......kNnnnnnnk.........',
    '......knnkkSnk..........',
    '.....kssk.kSSk..........',
    '.....ksk...kSSk.........',
    '....ksk....kWWk.........',
    '....kwwk...kWWdk........',
    '....kwwk...kdddk........',
    '.....kk.................',
    '........................',
    '........................',
  ],
  // 5: 蹴り上げB
  [
    '.......knnnnnk..........',
    '......kNnnnnnnk.........',
    '......knnkkSnnk.........',
    '......kssk.kSSk.........',
    '.....kssk..kSSSk........',
    '....kwwk....kSSk........',
    '...kwwk......kWWk.......',
    '...kdd........kWWdk.....',
    '..............kddk......',
    '........................',
    '........................',
  ],
];

// ジャンプ脚（両膝抱え）
const LEGS_JUMP = [
  '.......knnnnnk..........',
  '......kNnnnnnnk.........',
  '.....kSnnkksnnk.........',
  '....kSSk..kssk..........',
  '....kWWk..kwwk..........',
  '...kWWdk.kwwdk..........',
  '....kdk...kdk...........',
  '........................',
  '........................',
  '........................',
  '........................',
];
// 待機脚（直立、肩幅程度に開いて静止しているとわかる）
const LEGS_IDLE = [
  '.......knnnnnk..........',
  '......kNnnnnnnk.........',
  '.....kSnnkksnnk.........',
  '.....kSSk..kssk.........',
  '.....kSSk..kssk.........',
  '.....kWWk..kwwk.........',
  '.....kWWk..kwwk.........',
  '.....kddk..kddk.........',
  '........................',
  '........................',
  '........................',
];
// よろけ脚（開脚ブレーキ）
const LEGS_STUMBLE = [
  '.......knnnnnk..........',
  '......kNnnnnnnk.........',
  '.....kSnnkksnnk.........',
  '....kSSk...kssk.........',
  '...kSSk.....kssk........',
  '..kWWk.......kwwk.......',
  '.kWWk.........kwwk......',
  '.kddk.........kwwdk.....',
  '..............kddk......',
  '........................',
  '........................',
];

function makePlayerFrame(arm: string[], legs: string[], dy: number): Sprite {
  const body = mk(BODY, P);
  const armS = mk(arm, P);
  const legS = mk(legs, P);
  return compose(
    [
      { s: body, dx: 0, dy: dy },
      { s: armS, dx: 0, dy: dy },
      { s: legS, dx: 0, dy: 19 + Math.min(0, dy) },
    ],
    24,
    30,
    0.5,
    1,
  );
}

// 倒れ（熱中症）3フレーム: ふらり→膝つき→倒れ
const COLLAPSE_1 = [
  '........kkkkkk..........',
  '.......krrrrrrk.........',
  '......krrrrrrrrk........',
  '......krrrrrrrrk........',
  '...kkkkRrrrrrrrk........',
  '..kRRRRRrrrrrrrrk.......',
  '...kkkkhhsssssssk.......',
  '.......khssskkssk.......',
  '.......khssssssk........',
  '........kssssSk.........',
  '........kksSSk..........',
  '.....kook.kttkk...ss....',
  '....koookttttttk.ssk....',
  '...kooookttttttksk......',
  '...koooooktttttk........',
  '...koooooktttttk........',
  '...kOOooukttttTk........',
  '....kOOokkttTTk.........',
  '.....kkk.kTTTk..........',
  '.......knnnnnk..........',
  '......kNnnnnnnk.........',
  '......kNnkksnnk.........',
  '.....kSSk..kssk.........',
  '.....kSSk..kssk.........',
  '.....kWWk..kwwk.........',
  '.....kWWk..kwwk.........',
  '.....kddk..kddk.........',
  '........................',
  '........................',
  '........................',
];
const COLLAPSE_2 = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........kkkkkk..........',
  '.......krrrrrrk.........',
  '......krrrrrrrrk........',
  '...kkkkRrrrrrrrk........',
  '..kRRRRRrrrrrrrk........',
  '...kkkkhhsssssxk........',
  '.......khssssssk........',
  '........kssssSk.........',
  '.....kook.ksSk..........',
  '....koookttttttk........',
  '...kooookttttttk........',
  '...koooooktttttk........',
  '...kOOoookttttk.........',
  '....kOOokkTTTk..........',
  '.....kkknnnnnk..........',
  '......kNnnnnnnk.........',
  '.....kSSkkkssk..........',
  '....kSSk...kssk.........',
  '....kWWk...kwwk.........',
  '....kWWdk..kwwdk........',
  '.....kdk....kdk.........',
  '........................',
  '........................',
  '........................',
  '........................',
];
const COLLAPSE_3 = [
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '........................',
  '......kkkkk.............',
  '..kkkkrrrrrkk...........',
  '.kooooohsssxk...........',
  'koooooooksssskkkkkkkk...',
  'koooooookttttttnnnnssk..',
  '.kOOOOOkkttttttnnnkwwwk.',
  '..kkkkk..kkkkkkkkk.kddk.',
  '........................',
  '........................',
  '........................',
];

// ---- 障害物 ----
const CONE = [
  '....kk....',
  '...kook...',
  '...kook...',
  '..kooook..',
  '..kwwwwk..',
  '.koooooK..',
  '.koooooK..',
  'kkkkkkkkkk',
];
const CONE_P = { o: '#ff7a3c', K: '#c24d1e', w: '#f5f1e8' };

const PLANTER = [
  '..kggkkgggk.kggk..',
  '.kgggggggggggggGk.',
  'kgggGgggggGggggGGk',
  'kgGGgggGGgggGgGGk.',
  '.kkkkkkkkkkkkkkk..',
  '.kbbwbbbbwbbbbwbk.',
  '.kbbbbbbbbbbbbbbk.',
  '.kBBbbbBBbbbBBbbk.',
  '..kkkkkkkkkkkkkk..',
];
const PLANTER_P = {
  g: '#5aa84e',
  G: '#3a7a38',
  b: '#a8765a',
  B: '#7a5138',
  w: '#c9987a',
};

const COOLBOX = [
  '..kkkkkkkkkk..',
  '.kwwwwwwwwwwk.',
  'kccccccccccck.',
  'kccwccccccwcck',
  'kcccccccccccck',
  'kCCccccccccCCk',
  '.kkkkkkkkkkkk.',
];
const COOLBOX_P = { c: '#4aa8e0', C: '#2a6ea8', w: '#f5f1e8' };

// スポドリ缶
const DRINK = [
  '.kkkk.',
  'kwbbwk',
  'kbwwbk',
  'kbwwbk',
  'kbbbbk',
  'kBbbBk',
  '.kkkk.',
];
const DRINK_P = { b: '#3a8ae8', B: '#2a5ea8', w: '#f5f1e8' };

const ENERGY = [
  '.kkkk.',
  'kyggyk',
  'kgyygk',
  'kgyygk',
  'kggggk',
  'kGgGgk',
  '.kkkk.',
];
const ENERGY_P = { g: '#e8c832', G: '#b08a1e', y: '#fff1a0' };

// カモメ 2フレーム + 急降下
const GULL_A = [
  '.kk.........kk..',
  'kwwk.......kwwk.',
  '.kwwk..kk.kwwk..',
  '..kwwwkwwkwwk...',
  '...kwwwwwwwyk...',
  '....kkkwwkkk....',
  '.......kk.......',
];
const GULL_B = [
  '................',
  '................',
  '...kk......kk...',
  '..kwwkkkkkkwwk..',
  '.kwwwwwwwwwwwyk.',
  '..kkkwwwwkkkk...',
  '.....kkkk.......',
];
const GULL_P = { w: '#f5f1e8', y: '#f2a33c' };

// 回転草（左へ転がる）2フレーム
const TUMBLE_A = [
  '...kkkk....',
  '..kgddgk...',
  '.kdgddgdk..',
  'kgddkddgdk.',
  'kddgddkddk.',
  'kgdkgddgdk.',
  '.kdgddgdk..',
  '..kgddgk...',
  '...kkkk....',
];
const TUMBLE_B = [
  '...kkkk....',
  '..kdgdgk...',
  '.kgddkdgk..',
  'kddgddgddk.',
  'kgdkddgdgk.',
  'kddgdkddgk.',
  '.kgddgdgk..',
  '..kddgdk...',
  '...kkkk....',
];
const TUMBLE_P = { d: '#b08850', g: '#8a6a42' };

// 砂丘（小）: 踏むと大減速、ジャンプで越える
const DUNE = [
  '........kkkkkk........',
  '......kkssssssk.......',
  '....kkssssssSSSk......',
  '..kkssssssssSSSSk.....',
  'kkssssssssssssSSSSkk..',
];
const DUNE_P = { s: '#f2cd86', S: '#d9a45c' };

// スーツケース（旅行者の隣に置く）
const SUITCASE = [
  '...kk.....',
  '...kk.....',
  '..kkkkkk..',
  '.kcccccck.',
  '.kcCccCck.',
  '.kcccccck.',
  '.kcCccCck.',
  '.kcccccck.',
  '..kkkkkk..',
  '..kw.._wk.',
];
const SUITCASE_P = { c: '#7a68c8', C: '#54489a', _: '#221833' };

// 配達台車（歩道を縦断する）
const CART = [
  '..kkkkk.kkkkk...',
  '..kbbbbkboobk...',
  '..kbBbbkbooBk...',
  '..kbbBbkbbobk...',
  '.kkkkkkkkkkkkk..',
  '.kmmmmmmmmmmmk..',
  '.kkkkkkkkkkkkk..',
  '...kk......kk...',
  '..kwmk....kwmk..',
  '...kk......kk...',
];
const CART_P = {
  b: '#c8975a',
  B: '#a06a38',
  o: '#e8a84a',
  m: '#8a8fa8',
};

// 名刺交換マン（スーツ）
const CARDMAN = [
  '......kkkkk.....',
  '.....khhhhhk....',
  '....khhhhhhhk...',
  '....khsssssk....',
  '....khsswksk....',
  '.....ksssssk....',
  '......kssSk.....',
  '.....kkkSkk.....',
  '....kuukkuuk....',
  '...kuuuuuuuuk...',
  '..kuukuuuukuuk..',
  '..kuskuuuukusk..',
  '..kuskuuuukwwkk.',
  '..kkkkuuuukwwwk.',
  '......kuuuk.kk..',
  '.....kuukuuk....',
  '.....kuukuuk....',
  '.....kuukuuk....',
  '.....kuukuuk....',
  '....kuuk.kuuk...',
  '....kBBk.kBBk...',
  '....kBBk.kBBk...',
  '....kkk...kkk...',
];
const CARDMAN_P = {
  u: '#4a5a78', // スーツ
  h: '#2a2a3a',
  B: '#221833',
};

// ゴールアーチは背景側で合成する。ここでは横断幕のみ
// 看板（案内板ベース）
const SIGN = [
  'kkkkkkkkkkkkkkkkkkkkkk',
  'kwwwwwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwwwwwk',
  'kwwwwwwwwwwwwwwwwwwwwk',
  'kkkkkkkkkkkkkkkkkkkkkk',
  '.........kmmk.........',
  '.........kmmk.........',
  '.........kmmk.........',
  '.........kmmk.........',
  '.........kmmk.........',
];
const SIGN_P = { m: '#8a8fa8' };

export interface PlayerFrames {
  run: Sprite[];
  jump: Sprite;
  stumble: Sprite;
  collapse: Sprite[];
  win: Sprite;
  idle: Sprite;
}

export interface SpriteBank {
  player: PlayerFrames;
  cone: Sprite;
  planter: Sprite;
  coolbox: Sprite;
  drink: Sprite;
  energy: Sprite;
  gull: Sprite[];
  cardman: Sprite;
  cart: Sprite;
  tumbleweed: Sprite[];
  dune: Sprite;
  suitcase: Sprite;
  sign: Sprite;
  peds: Sprite[][]; // [variant][frame]
}

// 通行人: プレイヤーと同構造の簡略版（2フレーム）を色替え量産
function makePed(shirt: string, shirtSh: string, skirt: boolean, hat: boolean): Sprite[] {
  const pal = {
    ...P,
    t: shirt,
    T: shirtSh,
    r: hat ? '#e8d9b8' : '#4a3524',
    R: hat ? '#c4a874' : '#33251a',
  };
  const head = hat
    ? [
        '....kkkkkk....',
        '..kkrrrrrrkk..',
        '.krrrrrrrrrrk.',
        '..kkssssssk...',
        '...kssswksk...',
        '...kssssssk...',
        '....kssSk.....',
      ]
    : [
        '....kkkkk.....',
        '...krrrrrk....',
        '..krrrrrrrk...',
        '..krssssssk...',
        '..krsswksk....',
        '...ksssssk....',
        '....kssSk.....',
      ];
  const bodyA = [
    '...kkttkk.....',
    '..kttttttk....',
    '.ksttttttsk...',
    '.kskttttksk...',
    '.kk kttttkkk..',
    skirt ? '..kttttttk...' : '...kntnnk.....',
    skirt ? '..kttttttk...' : '...knnnnk.....',
    '...knnkNNk....',
    '...ksk.kSk....',
    '...kwk.kWk....',
    '..kkwk.kWkk...',
  ];
  const bodyB = [
    '...kkttkk.....',
    '..kttttttk....',
    '.ksttttttsk...',
    '.kskttttksk...',
    '.kk.kttttkkk..',
    skirt ? '..kttttttk...' : '...kntnnk.....',
    skirt ? '..kttttttk...' : '...knnnnk.....',
    '...kNnknnk....',
    '...kSk.ksk....',
    '...kWk.kwk....',
    '..kkWk.kwkk...',
  ];
  const fa = compose(
    [
      { s: mk(head, pal), dx: 0, dy: 0 },
      { s: mk(bodyA, pal), dx: 0, dy: 7 },
    ],
    14,
    18,
    0.5,
    1,
  );
  const fb = compose(
    [
      { s: mk(head, pal), dx: 0, dy: 0 },
      { s: mk(bodyB, pal), dx: 0, dy: 7 },
    ],
    14,
    18,
    0.5,
    1,
  );
  return [fa, fb];
}

export function buildSprites(): SpriteBank {
  const run: Sprite[] = [];
  // 対側運動（前脚と反対側の腕が前）になるよう脚サイクルから半周ずらす
  const armCycle = [ARM_BACK, ARM_MID, ARM_FWD, ARM_FWD, ARM_MID, ARM_BACK];
  const bob = [1, 0, 0, 1, 0, 0];
  for (let i = 0; i < 6; i++) {
    run.push(makePlayerFrame(armCycle[i], LEGS[i], bob[i]));
  }
  const jump = makePlayerFrame(ARM_UP, LEGS_JUMP, 0);
  const stumble = makePlayerFrame(ARM_BRACE, LEGS_STUMBLE, 1);
  const win = makePlayerFrame(ARM_UP, LEGS[1], 0);
  const idle = makePlayerFrame(ARM_MID, LEGS_IDLE, 0);
  const collapse = [mk(COLLAPSE_1, P), mk(COLLAPSE_2, P), mk(COLLAPSE_3, { ...P, x: '#221833' })];

  const peds = [
    makePed('#e8788a', '#b85468', true, true), // 日傘なし帽子の観光客
    makePed('#7a68c8', '#54489a', false, false), // 紫シャツ
    makePed('#68b868', '#458a48', false, true), // 緑シャツ帽子
    makePed('#e8b83c', '#b8882a', true, false), // 買い物客
  ];

  return {
    player: { run, jump, stumble, collapse, win, idle },
    cone: mk(CONE, CONE_P),
    planter: mk(PLANTER, PLANTER_P),
    coolbox: mk(COOLBOX, COOLBOX_P),
    drink: mk(DRINK, DRINK_P),
    energy: mk(ENERGY, ENERGY_P),
    gull: [mk(GULL_A, GULL_P), mk(GULL_B, GULL_P)],
    cardman: mk(CARDMAN, CARDMAN_P),
    cart: mk(CART, CART_P),
    tumbleweed: [mk(TUMBLE_A, TUMBLE_P), mk(TUMBLE_B, TUMBLE_P)],
    dune: mk(DUNE, DUNE_P),
    suitcase: mk(SUITCASE, SUITCASE_P),
    sign: mk(SIGN, SIGN_P),
    peds,
  };
}

export { flipX, recolor };
