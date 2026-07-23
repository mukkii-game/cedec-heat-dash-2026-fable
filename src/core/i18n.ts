// 日英テキストテーブル。key → [ja, en]

export type Lang = 'ja' | 'en';

const STR: Record<string, [string, string]> = {
  // タイトル
  'title.sub': ['〜徒歩5分・体感30分〜', '"A 5-min walk that feels like 30"'],
  'title.press': ['タップ / SPACE でスタート', 'TAP / SPACE TO START'],
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
  'q.start': ['よし、行くか。', "Alright, let's go."],
  'q.shade': ['日陰、生き返る〜', 'Shade... I live again.'],
  'q.mist': ['ミストだ！', 'Mist! Blessed mist!'],
  'q.damage': ['いてっ', 'Ow!'],
  'q.laserWarn': ['なんか光ってる！？', "Why is the ground glowing?!"],
  'q.laserHit': ['焼ける！！', "I'm cooking!!"],
  'q.lowHp': ['とける〜…', "I'm melting..."],
  'q.store': ['コンビニ、天国かよ…', 'Convenience store = heaven.'],
  'q.drink': ['うまい！', 'So good!'],
  'q.energy': ['効くぅ〜！', 'That kicks in!'],
  'q.card': ['どうも〜（名刺交換）', 'Oh hi— (card exchange)'],
  'q.gull': ['カモメ！？', 'Seagull?!'],
  'q.sand': ['砂!?', 'Sand?!'],
  'q.mirage': ['日陰が消えた！？', 'The shade... vanished?!'],
  'q.goal1': ['着いた！ 会場すずしい！！', 'Made it! Sweet AC!!'],
  'q.goal2': ['セッションに間に合った…！', 'Made it to the session...!'],
  'q.goal3': ['俺たちは、よく着いた。', 'We made it. We really did.'],

  // HUD
  'hud.day': ['DAY', 'DAY'],
  'hud.time': ['TIME', 'TIME'],
  'hud.heat': ['HEAT', 'HEAT'],
  'hud.area': ['AREA', 'AREA'],
  'hud.limit': ['LIMIT', 'LIMIT'],

  // リザルト
  'res.clear': ['とうちゃく！', 'ARRIVED!'],
  'res.time': ['タイム', 'TIME'],
  'res.best': ['ベスト', 'BEST'],
  'res.newRecord': ['NEW RECORD!', 'NEW RECORD!'],
  'res.rank': ['ランク', 'RANK'],
  'res.next': ['つぎの日へ', 'NEXT DAY'],
  'res.retry': ['リトライ (R)', 'RETRY (R)'],
  'res.toTitle': ['タイトルへ', 'TITLE'],
  'res.rankS': ['プロランナー', 'PRO RUNNER'],
  'res.rankA': ['さすが健脚', 'SPEED WALKER'],
  'res.rankB': ['よい汗', 'GOOD HUSTLE'],
  'res.rankC': ['とうちゃくが優勝', 'ARRIVING IS WINNING'],

  // 総合リザルト
  'total.title': ['3日間 総合リザルト', '3-DAY FINAL RESULT'],
  'total.sum': ['総合タイム', 'TOTAL TIME'],
  'total.newRecord': ['総合 NEW RECORD!', 'TOTAL NEW RECORD!'],

  // ゲームオーバー
  'go.title': ['熱中症でリタイア…', 'HEAT KO...'],
  'go.sub': ['水分、大事。', 'Hydrate or diedrate.'],
  'go.timeup': ['タイムアップ…', 'TIME UP...'],
  'go.timeupSub': ['基調講演が始まってしまった。', 'The keynote has started without you.'],
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
  'hint.moveKey': ['↑↓ うごく', '↑↓ MOVE'],
  'hint.jumpKey': ['SPACE ジャンプ', 'SPACE JUMP'],
  'hint.moveTouch': ['左がわドラッグ：うごく', 'DRAG LEFT SIDE: MOVE'],
  'hint.jumpTouch': ['右がわタップ：ジャンプ', 'TAP RIGHT SIDE: JUMP'],
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
