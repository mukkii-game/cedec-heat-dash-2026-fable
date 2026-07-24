// localStorage永続化（ベストタイム・設定）

const KEY = 'cedec-heat-dash-2026:v2';

export interface SaveData {
  /** 通しベストタイム（秒）。未クリアはnull */
  best: number | null;
  lang: 'ja' | 'en' | null;
  mute: boolean;
  seenOp: boolean;
}

const DEFAULTS: SaveData = {
  best: null,
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
  recordClear(time: number): boolean {
    const prev = this.data.best;
    const isBest = prev === null || time < prev;
    if (isBest) this.data.best = Math.round(time * 100) / 100;
    this.write();
    return isBest;
  }
}
