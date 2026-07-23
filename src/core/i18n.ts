// 日英テキストテーブル。key → [ja, en]

export type Lang = 'ja' | 'en';

const STR: Record<string, [string, string]> = {
  // タイトル
  'title.sub': ['〜徒歩5分・体感30分〜', '"A 5-min walk that feels like 30"'],
  'title.press': ['タップ / SPACE でスタート', 'TAP / SPACE TO START'],
  'title.controls': [
    '↑↓/WSで移動 ←→/ADで加減速 SPACE/ENTER/クリックでジャンプ',
    '↑↓/WS MOVE  ←→/AD SPEED  SPACE/ENTER/CLICK JUMP',
  ],
  'title.start': ['さいしょから', 'START'],
  'title.day': ['日をえらぶ', 'DAY SELECT'],
  'title.lang': ['LANG: 日本語', 'LANG: ENGLISH'],
  'title.sound': ['サウンド: ON', 'SOUND: ON'],
  'title.soundOff': ['サウンド: OFF', 'SOUND: OFF'],
  'title.best': ['ベスト', 'BEST'],
  'title.total': ['そうごう', 'TOTAL'],

  // OP
  'op.1': [
    '2026年、夏。\nゲーム開発者の祭典CEDECが\n今年もパシフィコ横浜で開幕する。',
    "Summer 2026.\nCEDEC, the game creators' conference,\nopens once again in Yokohama.",
  ],
  'op.2': [
    'みなとみらい駅、地上出口。\n気温41℃。\nアスファルトの上は、たぶんもっと。',
    'Minatomirai Station, street exit.\n41°C in the shade.\nOn the asphalt? Better not to know.',
  ],
  'op.3': [
    '会場まで、徒歩5分。\n\n——体感、30分。',
    'The venue is a 5-minute walk away.\n\n...It feels like 30.',
  ],
  'op.skip': ['タップでスキップ', 'TAP TO SKIP'],

  // ステージイントロ
  'day1.title': ['DAY 1  7月22日', 'DAY 1  JULY 22'],
  'day1.sub': ['みなとみらい、晴れ。', 'Minatomirai. Sunny.'],
  'day1.tip': ['日陰はすずしい。でも、ちょっと遅い。', 'Shade keeps you cool... but slow.'],
  'day2.title': ['DAY 2  7月23日', 'DAY 2  JULY 23'],
  'day2.sub': ['猛暑日。人も増えた。', 'Extreme heat. Bigger crowds.'],
  'day2.tip': ['光る床は速いが、あつい。', 'Glare tiles: fast but scorching.'],
  'day3.title': ['DAY 3  7月24日', 'DAY 3  JULY 24'],
  'day3.sub': ['みなとみらい砂漠。', 'The Minatomirai Desert.'],
  'day3.tip': ['……砂漠？', '...Desert?'],
  'stage.ready': ['READY...', 'READY...'],
  'stage.go': ['GO!', 'GO!'],

  // セリフ（吹き出し）
  'q.start': ['よし、仕様通り行くか。', "Alright, running it as spec'd."],
  'q.shade': ['日陰、生き返る〜', 'Shade... I live again.'],
  'q.mist': ['ミストだ！', 'Mist! Blessed mist!'],
  'q.damage': ['いてっ', 'Ow!'],
  'q.laserWarn': ['テレグラフ長めで助かる…', 'Generous telegraph, thank god.'],
  'q.laserHit': ['焼ける！！', "I'm cooking!!"],
  'q.lowHp': ['とける…コンティニューほしい', "Melting... need a continue."],
  'q.store': ['回復アイテムの匂いがする…', 'I smell a healing item...'],
  'q.drink': ['うまい！', 'So good!'],
  'q.energy': ['バフきた！', 'Buff acquired!'],
  'q.card': ['プランナーです（名刺交換）', "I'm a planner— (card exchange)"],
  'q.gull': ['当たり判定シビアじゃない！？', 'This hitbox feels way too tight!?'],
  'q.sand': ['処理落ち…？いや暑さか', 'Is this lag...? No, just the heat.'],
  'q.brick': ['これ、必要な障害物か…？', 'Is this obstacle really necessary?'],
  'q.heatMax': ['アヂー！！', 'IT\'S HOT!!'],
  'q.restPant': ['はぁ…はぁ…生きてる…', 'Huff... puff... I\'m alive...'],
  'q.kickboard': ['コリジョン判定広すぎ！', "That hitbox is way too generous!"],
  'q.mirage': ['フェイク日陰？仕事しろ', 'Fake shade?! Do your job.'],
  'q.goal1': ['着いた！ 会場すずしい！！', 'Made it! Sweet AC!!'],
  'q.goal2': ['セッションに間に合った…！', 'Made it to the session...!'],
  'q.goal3': ['俺たちは、よく着いた。', 'We made it. We really did.'],

  // HUD
  'hud.day': ['DAY', 'DAY'],
  'hud.time': ['TIME', 'TIME'],
  'hud.heat': ['HEAT', 'HEAT'],
  'hud.area': ['AREA', 'AREA'],

  // リザルト
  'res.clear': ['とうちゃく！', 'ARRIVED!'],
  'res.time': ['タイム', 'TIME'],
  'res.best': ['ベスト', 'BEST'],
  'res.newRecord': ['NEW RECORD!', 'NEW RECORD!'],
  'res.rank': ['ひょうか', 'RATING'],
  'res.next': ['つぎの日へ', 'NEXT DAY'],
  'res.retry': ['リトライ (R)', 'RETRY (R)'],
  'res.toTitle': ['タイトルへ', 'TITLE'],
  'res.star3': ['プロランナー', 'PRO RUNNER'],
  'res.star2': ['さすが健脚', 'SPEED WALKER'],
  'res.star1': ['とうちゃくが優勝', 'ARRIVING IS WINNING'],

  // 総合リザルト
  'total.title': ['3日間 総合リザルト', '3-DAY FINAL RESULT'],
  'total.sum': ['総合タイム', 'TOTAL TIME'],
  'total.newRecord': ['総合 NEW RECORD!', 'TOTAL NEW RECORD!'],

  // ゲームオーバー
  'go.title': ['熱中症でリタイア…', 'HEAT KO...'],
  'go.sub': ['水分、大事。', 'Hydrate or diedrate.'],
  'go.retry': ['リトライ (R)', 'RETRY (R)'],

  // ED
  'ed.1': ['冷房の効いたロビーで、', 'In the air-conditioned lobby,'],
  'ed.2': ['ミナトは思った。', 'Minato thought:'],
  'ed.3': ['「俺たちは、よく着いた」', '"We made it. We really did."'],
  'ed.thanks': ['THANK YOU FOR PLAYING!', 'THANK YOU FOR PLAYING!'],
  'ed.fin': ['FIN.', 'FIN.'],

  // ポーズ
  'pause.title': ['ポーズ', 'PAUSED'],
  'pause.resume': ['さいかい', 'RESUME'],
  'pause.retry': ['リトライ', 'RETRY'],
  'pause.title2': ['タイトルへ', 'QUIT TO TITLE'],

  // 操作ヒント
  'hint.moveKey': ['↑↓ 移動  ←→ 減速/ダッシュ', '↑↓ MOVE  ←→ SLOW/DASH'],
  'hint.jumpKey': ['SPACE ジャンプ', 'SPACE JUMP'],
  'hint.moveTouch': ['左ドラッグ：移動＋加減速', 'DRAG LEFT: MOVE + SPEED'],
  'hint.jumpTouch': ['右タップ：ジャンプ', 'TAP RIGHT: JUMP'],
  'hint.dash': ['ダッシュは速いが、あつい！', 'Dashing is fast... and HOT!'],
};

export class I18n {
  lang: Lang;

  constructor(saved: Lang | null) {
    this.lang = saved ?? (navigator.language?.startsWith('ja') ? 'ja' : 'en');
  }

  t(key: string): string {
    const e = STR[key];
    if (!e) return key;
    return this.lang === 'ja' ? e[0] : e[1];
  }

  toggle(): void {
    this.lang = this.lang === 'ja' ? 'en' : 'ja';
  }
}

/** 32.456 → 0'32"45 */
export function fmtTime(sec: number): string {
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const cs = Math.floor((s * 100) % 100);
  return `${m}'${String(ss).padStart(2, '0')}"${String(cs).padStart(2, '0')}`;
}
