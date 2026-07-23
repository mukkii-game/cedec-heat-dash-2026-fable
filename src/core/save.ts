// localStorage永続化（ベストタイム・クリア状況・設定）

const KEY = 'cedec-heat-dash-2026:v1';

export interface SaveData {
  /** 日別ベストタイム（秒）。未クリアはnull */
  best: (number | null)[];
  /** 通しプレイの総合ベスト（秒） */
  bestTotal: number | null;
  cleared: boolean[];
  lang: 'ja' | 'en' | null;
  mute: boolean;
  seenOp: boolean;
}

const DEFAULTS: SaveData = {
  best: [null, null, null],
  bestTotal: null,
  cleared: [false, false, false],
  lang: null,
  mute: false,
  seenOp: false,
};

export class Save {
  data: SaveData;

  constructor() {
    this.data = { ...DEFAULTS };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.data = { ...DEFAULTS, ...parsed };
        this.data.best = [0, 1, 2].map((i) => parsed.best?.[i] ?? null);
        this.data.cleared = [0, 1, 2].map((i) => !!parsed.cleared?.[i]);
      }
    } catch {
      // 破損時はデフォルトで続行
    }
  }

  write(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // プライベートブラウズ等では保存なしで続行
    }
  }

  /** クリア記録。ベスト更新ならtrue */
  recordClear(day: number, time: number): boolean {
    this.data.cleared[day] = true;
    const prev = this.data.best[day];
    const isBest = prev === null || time < prev;
    if (isBest) this.data.best[day] = Math.round(time * 100) / 100;
    this.write();
    return isBest;
  }

  recordTotal(total: number): boolean {
    const prev = this.data.bestTotal;
    const isBest = prev === null || total < prev;
    if (isBest) this.data.bestTotal = Math.round(total * 100) / 100;
    this.write();
    return isBest;
  }
}
