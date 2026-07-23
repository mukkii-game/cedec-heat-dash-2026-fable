// ステップシーケンサBGM。全曲オリジナル。
// 曲 = セクション列（intro→loop）。各セクションはレーン別パターン文字列。
// ドラム: 1文字=1ステップ(16分)。音程レーン: 空白区切りトークン 'A4' 'A4:4'(4ステップ) '.'(休符)

import type { AudioSys } from './engine';

const SEMI: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

function freq(note: string): number {
  const m = /^([A-G])([#b]?)(\d)$/.exec(note);
  if (!m) return 440;
  let s = SEMI[m[1]];
  if (m[2] === '#') s += 1;
  else if (m[2] === 'b') s -= 1;
  const oct = parseInt(m[3], 10);
  return 440 * Math.pow(2, (oct - 4) + s / 12);
}

interface NoteEv {
  step: number;
  f: number;
  dur: number; // steps
}

function parseLane(tokens: string): NoteEv[] {
  const out: NoteEv[] = [];
  let step = 0;
  for (const tk of tokens.trim().split(/\s+/)) {
    if (tk === '.') {
      step += 1;
      continue;
    }
    const [n, d] = tk.split(':');
    const dur = d ? parseInt(d, 10) : 1;
    out.push({ step, f: freq(n), dur });
    step += dur;
  }
  return out;
}

export interface Section {
  steps: number;
  kick?: string;
  snare?: string;
  hat?: string; // x=closed o=open
  bass?: string;
  lead?: string;
  arp?: string;
  /** リード音量スケール */
  leadVol?: number;
}

export interface Song {
  bpm: number;
  intro: Section[];
  loop: Section[];
  /** 16分あたりのスウィング(0-0.2) */
  swing?: number;
}

// ---- 楽曲データ ----

const D1_KICK = 'x...x...x...x...';
const D1_SNARE = '....x.......x...';
const D1_HAT = 'x.xxx.xxx.xxx.xo';

function bar(kick = D1_KICK, snare = D1_SNARE, hat = D1_HAT) {
  return { kick, snare, hat };
}

/**
 * DAY1「朝のシャッフル」A自然短調（ジャズのii-V-i進行, Dm7-G7-Cmaj7-Fmaj7-Bm7b5-E7-Am7）
 * 132BPM、強めのスウィングでシャッフルビート。メトロクロスのような「軽快なのに
 * どこか物悲しい」チップチューン・ジャズを狙う（既存曲のメロディーは一切使用しない）。
 */
const DAY1_SONG: Song = {
  bpm: 132,
  swing: 0.17,
  intro: [
    { steps: 16, kick: D1_KICK, hat: 'x.x.x.x.x.x.x.x.', bass: 'A2 . A3 . D2 . D3 . G2 . G3 . C2 . C3 .' },
  ],
  loop: [
    {
      // Dm7
      steps: 16,
      ...bar(),
      bass: 'D2 . D3 . D2 . D3 . D2 . D3 . D2 A2 G#2 .',
      lead: 'D5:2 F5:2 A4:2 C5:2 D5:2 F5:2 E5:4',
      arp: 'D3 F3 A3 F3 D3 F3 A3 F3 D3 F3 A3 F3 D3 F3 A3 F3',
    },
    {
      // G7
      steps: 16,
      ...bar(),
      bass: 'G2 . G3 . G2 . G3 . G2 . G3 . G2 D2 B2 .',
      lead: 'B4:2 D5:2 F5:2 D5:2 B4:2 G4:2 F4:4',
      arp: 'G3 B3 D4 B3 G3 B3 D4 B3 G3 B3 D4 B3 G3 B3 D4 B3',
    },
    {
      // Cmaj7
      steps: 16,
      ...bar(),
      bass: 'C2 . C3 . C2 . C3 . C2 . C3 . C2 G2 E2 .',
      lead: 'E5:2 G5:2 B4:2 G4:2 E4:2 C5:2 B4:4',
      arp: 'C3 E3 G3 E3 C3 E3 G3 E3 C3 E3 G3 E3 C3 E3 G3 E3',
    },
    {
      // Fmaj7
      steps: 16,
      ...bar(),
      bass: 'F2 . F3 . F2 . F3 . F2 . F3 . F2 C2 C3 .',
      lead: 'F5:2 A4:2 C5:2 E5:2 F5:2 C5:2 A4:4',
      arp: 'F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3',
    },
    {
      // Bm7b5（ii of V、半音下降で少し翳りを出す）
      steps: 16,
      ...bar(),
      bass: 'B2 . B3 . B2 . B3 . B2 . B3 . B2 F2 D#2 .',
      lead: 'D5:2 F5:2 A4:2 F4:2 D4:2 B4:2 A4:4',
      arp: 'B3 D4 F4 D4 B3 D4 F4 D4 B3 D4 F4 D4 B3 D4 F4 D4',
    },
    {
      // E7（属7、導音G#で緊張）
      steps: 16,
      ...bar(),
      bass: 'E2 . E3 . E2 . E3 . E2 . E3 . E2 B2 G#2 .',
      lead: 'G#4:2 B4:2 D5:2 B4:2 G#4:2 E4:2 D4:4',
      arp: 'E3 G#3 B3 G#3 E3 G#3 B3 G#3 E3 G#3 B3 G#3 E3 G#3 B3 G#3',
    },
    {
      // Am7（トニック帰着。ここだけ少し温かく）
      steps: 16,
      ...bar(),
      bass: 'A2 . A3 . A2 . A3 . A2 . A3 . A2 E2 G2 .',
      lead: 'E5:2 C5:2 A4:2 C5:2 E5:2 G4:2 A4:4',
      arp: 'A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4',
    },
    {
      // E7 ターンアラウンド → ループ先頭のDm7へ戻る
      steps: 16,
      kick: 'x...x...x...x.xx',
      snare: '....x.......x..x',
      hat: 'x.xxx.xxx.xxxxxo',
      bass: 'E2 . E3 . E2 . E3 . E2 F#2 G#2 . A2 . B2 .',
      lead: 'E4 F#4 G#4 A4 B4:2 . B4:2 . B4:2 D5:2 G#4:2',
      arp: 'E3 G#3 B3 G#3 F#3 A3 C#4 A3 G#3 B3 D#4 B3 A3 C#4 E4 A4',
    },
  ],
};

/** DAY2「シェイド・ハンター」Dドリアン 140BPM 緊張感を増した追走ビート */
const D2_KICK = 'x...x...x..x..x.';
const D2_SNARE = '....x.......x...';
const D2_HAT = 'xxx.xxx.xxx.xxxo';

function bar2(kick = D2_KICK, snare = D2_SNARE, hat = D2_HAT) {
  return { kick, snare, hat };
}

const DAY2_SONG: Song = {
  bpm: 140,
  swing: 0.13,
  intro: [
    { steps: 16, kick: D2_KICK, hat: 'x.x.x.x.x.x.x.x.', bass: 'D2 . D3 . D2 . D3 . D2 . D3 . C2 C2 D2 .' },
  ],
  loop: [
    {
      steps: 16,
      ...bar2(),
      bass: 'D2:2 D2:2 D3:2 D2:2 D2:2 D3:2 D2:2 C2:2',
      lead: 'D5:3 C5:1 A4:2 F4:2 A4:3 C5:1 D5:2 E5:2',
      arp: 'D3 F3 A3 F3 D3 F3 A3 F3 D3 F3 A3 F3 D3 F3 A3 F3',
    },
    {
      steps: 16,
      ...bar2(),
      bass: 'F2:2 F2:2 F3:2 F2:2 F2:2 F3:2 F2:2 E2:2',
      lead: 'F5:3 E5:1 C5:2 A4:2 C5:4 A4:4',
      arp: 'F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3',
    },
    {
      steps: 16,
      ...bar2(),
      bass: 'C2:2 C2:2 C3:2 C2:2 C2:2 C3:2 C2:2 B1:2',
      lead: 'E5:3 D5:1 C5:2 G4:2 E4:3 G4:1 C5:4',
      arp: 'C3 E3 G3 E3 C3 E3 G3 E3 C3 E3 G3 E3 C3 E3 G3 E3',
    },
    {
      steps: 16,
      ...bar2(),
      bass: 'G2:2 G2:2 G3:2 G2:2 G2:2 G3:2 F2:2 E2:2',
      lead: 'B4:2 D5:2 G5:3 F5:1 D5:2 B4:2 G4:4',
      arp: 'G3 B3 D4 B3 G3 B3 D4 B3 G3 B3 D4 B3 G3 B3 D4 B3',
    },
    {
      steps: 16,
      ...bar2(),
      bass: 'D2:2 D2:2 D3:2 D2:2 D2:2 D3:2 D2:2 C2:2',
      lead: 'D5:3 C5:1 A4:2 F4:2 A4:2 C5:2 D5:4',
      arp: 'D3 F3 A3 F3 D3 F3 A3 F3 D3 F3 A3 F3 D3 F3 A3 F3',
    },
    {
      steps: 16,
      ...bar2(),
      bass: 'F2:2 F2:2 F3:2 F2:2 F2:2 F3:2 F2:2 G2:2',
      lead: 'F5:2 G5:2 A5:3 G5:1 F5:2 E5:2 C5:4',
      arp: 'F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3 F3 A3 C4 A3',
    },
    {
      steps: 16,
      ...bar2(),
      bass: 'A2:2 A2:2 A3:2 A2:2 A2:2 A3:2 A2:2 G2:2',
      lead: 'E5:3 C5:1 A4:2 B4:2 C5:2 B4:2 A4:4',
      arp: 'A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4',
    },
    {
      steps: 16,
      kick: 'x...x...x..xx.xx',
      snare: '....x.......x.xx',
      hat: 'xxx.xxx.xxxxxxxo',
      bass: 'G2:2 G2:2 G3:2 G2:2 A2:2 A3:2 B2:2 C3:2',
      lead: 'G4 A4 B4 C5 D5:2 E5:2 F5:2 G5:2 D5:2 B4:2',
      arp: 'G3 B3 D4 B3 G3 B3 D4 B3 A3 C4 E4 C4 B3 D4 F4 D4',
    },
  ],
};

/** DAY3「ミナトミライ・ミラージュ」Eフリジアン・ドミナント 148BPM 砂漠の熱狂 */
const D3_KICK = 'x..x.x..x..x.x..';
const D3_SNARE = '....x.......x...';
const D3_HAT = 'x.x.x.xxx.x.x.xo';

function bar3(kick = D3_KICK, snare = D3_SNARE, hat = D3_HAT) {
  return { kick, snare, hat };
}

const DAY3_SONG: Song = {
  bpm: 148,
  swing: 0.15,
  intro: [
    { steps: 16, kick: D3_KICK, hat: 'x.x.x.x.x.x.x.x.', bass: 'E2 . E2 E3 . E2 . E3 E2 . E2 F2 E2 . B1 .' },
  ],
  loop: [
    {
      steps: 16,
      ...bar3(),
      bass: 'E2 . E2 E3 . E2 . E3 E2 . E2 F2 E2 . B1 .',
      lead: 'E5:2 F5:2 E5:2 D5:2 C5:2 B4:2 C5:2 B4:2',
      arp: 'E3 G#3 B3 G#3 E3 G#3 B3 G#3 E3 G#3 B3 G#3 E3 G#3 B3 G#3',
    },
    {
      steps: 16,
      ...bar3(),
      bass: 'E2 . E2 E3 . E2 . E3 F2 . F2 F3 . E2 . D2',
      lead: 'G#4:2 A4:2 B4:2 C5:2 B4:3 A4:1 G#4:2 E4:2',
      arp: 'E3 G#3 B3 G#3 E3 G#3 B3 G#3 F3 A3 C4 A3 F3 A3 C4 A3',
    },
    {
      steps: 16,
      ...bar3(),
      bass: 'E2 . E2 E3 . E2 . E3 E2 . E2 F2 E2 . B1 .',
      lead: 'E5:2 F5:2 G#5:3 F5:1 E5:2 D5:2 C5:2 D5:2',
      arp: 'E3 G#3 B3 G#3 E3 G#3 B3 G#3 E3 G#3 B3 G#3 E3 G#3 B3 G#3',
    },
    {
      steps: 16,
      ...bar3(),
      bass: 'G2 . G2 G3 . G2 . G3 F2 . F2 F3 E2 E2 E3 .',
      lead: 'B4:2 C5:2 B4:2 A4:2 G#4:3 A4:1 B4:4',
      arp: 'G3 B3 D4 B3 G3 B3 D4 B3 F3 A3 C4 A3 E3 G#3 B3 G#3',
    },
    {
      steps: 16,
      ...bar3(),
      bass: 'E2 . E2 E3 . E2 . E3 E2 . E2 F2 E2 . B1 .',
      lead: 'E5 . E5 . F5:2 E5:2 D5:2 C5:2 D5:2 C5:2',
      arp: 'E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4 E4 G#4 B4 G#4',
    },
    {
      steps: 16,
      ...bar3(),
      bass: 'E2 . E2 E3 . E2 . E3 F2 . F2 F3 . E2 . D2',
      lead: 'B4:2 C5:2 D5:2 C5:2 B4:2 A4:2 G#4:4',
      arp: 'E4 G#4 B4 G#4 E4 G#4 B4 G#4 F4 A4 C5 A4 F4 A4 C5 A4',
    },
    {
      steps: 16,
      ...bar3(),
      bass: 'A2 . A2 A3 . A2 . A3 A2 . A2 B2 A2 . E2 .',
      lead: 'A4:2 B4:2 C5:2 D5:2 E5:2 F5:2 E5:2 D5:2',
      arp: 'A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4 A3 C4 E4 C4',
    },
    {
      steps: 16,
      kick: 'x..x.x..x.xxx.xx',
      snare: '....x.....x.x.xx',
      hat: 'x.x.x.xxxxx.xxxo',
      bass: 'E2 E2 E3 E2 F2 F2 F3 F2 G2 G2 G#2 G#2 B2 B2 B1 .',
      lead: 'E5 F5 G#5 A5 B5:2 . B5:2 . A5:2 G#5:2 F5:2',
      arp: 'E4 G#4 B4 G#4 F4 A4 C5 A4 G4 B4 D5 B4 B3 D#4 F#4 D#4',
    },
  ],
};

/** タイトル「フェスの朝」ゆったりチップ */
const TITLE_SONG: Song = {
  bpm: 104,
  swing: 0.14,
  intro: [],
  loop: [
    {
      steps: 16,
      kick: 'x.......x.......',
      hat: '..x...x...x...x.',
      bass: 'A2:8 A2:8',
      lead: 'A4:4 C#5:4 B4:4 E4:4',
      leadVol: 0.6,
      arp: 'A3 E4 A4 E4 A3 E4 A4 E4 A3 E4 A4 E4 A3 E4 A4 E4',
    },
    {
      steps: 16,
      kick: 'x.......x.......',
      hat: '..x...x...x...x.',
      bass: 'F#2:8 F#2:8',
      lead: 'F#4:4 A4:4 C#5:6 B4:2',
      leadVol: 0.6,
      arp: 'F#3 C#4 F#4 C#4 F#3 C#4 F#4 C#4 F#3 C#4 F#4 C#4 F#3 C#4 F#4 C#4',
    },
    {
      steps: 16,
      kick: 'x.......x.......',
      hat: '..x...x...x...x.',
      bass: 'D2:8 D2:8',
      lead: 'D5:4 C#5:4 B4:4 A4:4',
      leadVol: 0.6,
      arp: 'D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3 D3 A3 D4 A3',
    },
    {
      steps: 16,
      kick: 'x.......x.....x.',
      hat: '..x...x...x...xo',
      bass: 'E2:8 E2:4 E2:4',
      lead: 'B4:4 G#4:4 E4:8',
      leadVol: 0.6,
      arp: 'E3 B3 E4 B3 E3 B3 E4 B3 E3 G#3 B3 E4 B3 G#3 E3 B2',
    },
  ],
};

/** ゴールジングル */
const GOAL_JINGLE: Song = {
  bpm: 140,
  intro: [
    {
      steps: 16,
      kick: 'x...x...x...x...',
      snare: '..........x.x.x.',
      lead: 'A4 C#5 E5 A5:3 . G#5:2 A5:6',
      bass: 'A2:4 D2:4 E2:4 A2:4',
      arp: 'A3 C#4 E4 A4 D3 F#3 A3 D4 E3 G#3 B3 E4 A3 C#4 E4 A4',
    },
  ],
  loop: [],
};

/** ゲームオーバージングル（熱でとける） */
const GAMEOVER_JINGLE: Song = {
  bpm: 92,
  intro: [
    {
      steps: 16,
      lead: 'E5:3 Eb5:3 D5:3 C#5:3 C5:4',
      bass: 'A2:8 Ab2:8',
      leadVol: 0.7,
    },
  ],
  loop: [],
};

/** ED「俺たちは、よく着いた」ハーフテンポの主題再現 */
const ED_SONG: Song = {
  bpm: 76,
  intro: [],
  loop: [
    {
      steps: 16,
      kick: 'x.......x.......',
      hat: '....x.......x...',
      bass: 'A2:8 E2:8',
      lead: 'A4:4 C#5:4 E5:4 C#5:4',
      leadVol: 0.55,
      arp: 'A3 E4 C#4 E4 A3 E4 C#4 E4 E3 B3 G#3 B3 E3 B3 G#3 B3',
    },
    {
      steps: 16,
      kick: 'x.......x.......',
      hat: '....x.......x...',
      bass: 'F#2:8 D2:8',
      lead: 'B4:4 A4:4 F#4:8',
      leadVol: 0.55,
      arp: 'F#3 C#4 A3 C#4 F#3 C#4 A3 C#4 D3 A3 F#3 A3 D3 A3 F#3 A3',
    },
  ],
};

export type SongName = 'day1' | 'day2' | 'day3' | 'title' | 'goal' | 'gameover' | 'ed';
const SONGS: Record<SongName, Song> = {
  day1: DAY1_SONG,
  day2: DAY2_SONG,
  day3: DAY3_SONG,
  title: TITLE_SONG,
  goal: GOAL_JINGLE,
  gameover: GAMEOVER_JINGLE,
  ed: ED_SONG,
};

interface ParsedSection {
  steps: number;
  kick: boolean[];
  snare: boolean[];
  hatC: boolean[];
  hatO: boolean[];
  bass: NoteEv[];
  lead: NoteEv[];
  arp: NoteEv[];
  leadVol: number;
}

function parseSection(s: Section): ParsedSection {
  const drums = (pat: string | undefined, ch: string): boolean[] => {
    const out = new Array<boolean>(s.steps).fill(false);
    if (pat) {
      for (let i = 0; i < s.steps; i++) out[i] = pat[i % pat.length] === ch;
    }
    return out;
  };
  return {
    steps: s.steps,
    kick: drums(s.kick, 'x'),
    snare: drums(s.snare, 'x'),
    hatC: drums(s.hat, 'x'),
    hatO: drums(s.hat, 'o'),
    bass: s.bass ? parseLane(s.bass) : [],
    lead: s.lead ? parseLane(s.lead) : [],
    arp: s.arp ? parseLane(s.arp) : [],
    leadVol: s.leadVol ?? 1,
  };
}

export class MusicPlayer {
  private au: AudioSys;
  private song: Song | null = null;
  private sections: ParsedSection[] = [];
  private introCount = 0;
  private secIdx = 0;
  private step = 0;
  private nextTime = 0;
  private stepDur = 0;
  private playing = false;
  /** 終盤ブースト（ハイハット増量＋リード1oct上を薄く重ねる） */
  heat = false;
  /** 日ごとにスネアの質感を変える（1=通常/2=締まった/3=乾いた金属質） */
  private snareStyle: 1 | 2 | 3 = 1;

  constructor(au: AudioSys) {
    this.au = au;
  }

  play(name: SongName): void {
    const c = this.au.ctx;
    if (!c) return;
    const song = SONGS[name];
    this.song = song;
    this.sections = [...song.intro, ...song.loop].map(parseSection);
    this.introCount = song.intro.length;
    this.secIdx = 0;
    this.step = 0;
    this.stepDur = 60 / song.bpm / 4;
    this.nextTime = c.currentTime + 0.08;
    this.playing = true;
    this.heat = false;
    this.snareStyle = name === 'day3' ? 3 : name === 'day2' ? 2 : 1;
  }

  stop(): void {
    this.playing = false;
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  update(): void {
    const c = this.au.ctx;
    if (!c || !this.playing || !this.song) return;
    while (this.nextTime < c.currentTime + 0.16) {
      const sec = this.sections[this.secIdx];
      if (!sec) {
        this.playing = false;
        return;
      }
      this.scheduleStep(sec, this.step, this.nextTime);
      const swing = this.song.swing ?? 0;
      const dur = this.stepDur * (this.step % 2 === 0 ? 1 + swing : 1 - swing);
      this.nextTime += dur;
      this.step++;
      if (this.step >= sec.steps) {
        this.step = 0;
        this.secIdx++;
        if (this.secIdx >= this.sections.length) {
          if (this.song.loop.length === 0) {
            this.playing = false;
            return;
          }
          this.secIdx = this.introCount; // ループ先頭へ
        }
      }
    }
  }

  private scheduleStep(sec: ParsedSection, step: number, t: number): void {
    const c = this.au.ctx!;
    const when = t - c.currentTime;
    const mg = this.au.musicGain;
    if (sec.kick[step]) {
      this.au.tone({ type: 'sine', f0: 150, f1: 44, t: 0.11, vol: 0.4, when, dest: mg, slideT: 0.09 });
      this.au.noise({ t: 0.012, vol: 0.1, when, dest: mg, lp: 2400 });
    }
    if (sec.snare[step]) {
      // 日ごとの質感差: Day1=通常 / Day2=締まったタイト / Day3=乾いた金属質を一枚重ねる
      if (this.snareStyle === 2) {
        this.au.noise({ t: 0.07, vol: 0.13, when, hp: 2200, lp: 7500, dest: mg });
        this.au.tone({ type: 'triangle', f0: 210, f1: 165, t: 0.06, vol: 0.1, when, dest: mg });
      } else if (this.snareStyle === 3) {
        this.au.noise({ t: 0.1, vol: 0.12, when, hp: 1600, lp: 7500, dest: mg });
        this.au.tone({ type: 'triangle', f0: 190, f1: 150, t: 0.08, vol: 0.09, when, dest: mg });
        this.au.noise({ t: 0.03, vol: 0.05, when, hp: 5000, dest: mg });
      } else {
        this.au.noise({ t: 0.1, vol: 0.13, when, hp: 1600, lp: 7500, dest: mg });
        this.au.tone({ type: 'triangle', f0: 190, f1: 150, t: 0.08, vol: 0.1, when, dest: mg });
      }
    }
    if (sec.hatC[step]) {
      this.au.noise({ t: 0.025, vol: 0.05, when, hp: 6800, dest: mg });
    }
    if (sec.hatO[step]) {
      this.au.noise({ t: 0.12, vol: 0.055, when, hp: 6200, dest: mg });
    }
    if (this.heat && step % 4 === 2) {
      this.au.noise({ t: 0.04, vol: 0.04, when, hp: 7800, dest: mg });
    }
    for (const n of sec.bass) {
      if (n.step === step) {
        this.playBass(n.f, this.stepDur * n.dur, t);
      }
    }
    for (const n of sec.lead) {
      if (n.step === step) {
        this.playLead(n.f, this.stepDur * n.dur, t, 0.105 * sec.leadVol);
        if (this.heat) this.playLead(n.f * 2, this.stepDur * n.dur, t, 0.032 * sec.leadVol);
      }
    }
    for (const n of sec.arp) {
      if (n.step === step) {
        this.playArp(n.f, this.stepDur * n.dur, t);
      }
    }
  }

  private playBass(f: number, dur: number, t: number): void {
    const c = this.au.ctx!;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 620;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.01);
    g.gain.setValueAtTime(0.15, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.95);
    o.connect(flt);
    flt.connect(g);
    g.connect(this.au.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private playLead(f: number, dur: number, t: number, vol: number): void {
    const c = this.au.ctx!;
    const o = c.createOscillator();
    o.type = 'square';
    o.frequency.value = f;
    // 角を丸めるローパス
    const flt = c.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.value = 2100;
    flt.Q.value = 0.7;
    // ビブラート
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.5;
    const lg = c.createGain();
    lg.gain.value = dur > 0.25 ? f * 0.006 : 0;
    lfo.connect(lg);
    lg.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.setValueAtTime(vol * 0.85, t + Math.max(0.015, dur * 0.8));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(flt);
    flt.connect(g);
    g.connect(this.au.musicGain);
    g.connect(this.au.delay);
    o.start(t);
    o.stop(t + dur + 0.05);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  }

  private playArp(f: number, dur: number, t: number): void {
    const c = this.au.ctx!;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur, 0.14));
    o.connect(g);
    g.connect(this.au.musicGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
}
