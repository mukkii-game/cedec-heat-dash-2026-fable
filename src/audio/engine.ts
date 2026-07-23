// Web Audio 基盤 + 効果音シンセ。
// AudioContextは初回ジェスチャーで生成/再開（自動再生制限対応）。

export type SfxName =
  | 'uiMove'
  | 'uiOk'
  | 'jump'
  | 'dash'
  | 'land'
  | 'damage'
  | 'shade'
  | 'mist'
  | 'drink'
  | 'energy'
  | 'store'
  | 'laserWarn'
  | 'laserFire'
  | 'gull'
  | 'quip'
  | 'card'
  | 'lowHp'
  | 'timeWarn'
  | 'countBeep'
  | 'go'
  | 'goal'
  | 'rank'
  | 'record'
  | 'collapse';

export class AudioSys {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicGain!: GainNode;
  sfxGain!: GainNode;
  delay!: DelayNode;
  muted = false;
  private lowHpAt = 0;

  constructor(muted: boolean) {
    this.muted = muted;
  }

  /** 初回ユーザー操作から呼ぶ */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      const c = this.ctx;
      this.master = c.createGain();
      // 高域を丸めて耳当たりを柔らかく
      const softener = c.createBiquadFilter();
      softener.type = 'lowpass';
      softener.frequency.value = 7200;
      softener.Q.value = 0.5;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      this.master.connect(softener);
      softener.connect(comp);
      comp.connect(c.destination);
      this.musicGain = c.createGain();
      this.musicGain.gain.value = 0.42;
      this.musicGain.connect(this.master);
      this.sfxGain = c.createGain();
      this.sfxGain.gain.value = 0.48;
      this.sfxGain.connect(this.master);
      // リード用エコー
      this.delay = c.createDelay(0.5);
      this.delay.delayTime.value = 0.23;
      const fb = c.createGain();
      fb.gain.value = 0.26;
      const wet = c.createGain();
      wet.gain.value = 0.22;
      this.delay.connect(fb);
      fb.connect(this.delay);
      this.delay.connect(wet);
      wet.connect(this.musicGain);
      this.applyMute();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setMuted(m: boolean): void {
    this.muted = m;
    this.applyMute();
  }
  private applyMute(): void {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.78, this.ctx.currentTime, 0.02);
    }
  }

  // ---- 低レベルシンセ ----
  tone(opts: {
    type?: OscillatorType;
    f0: number;
    f1?: number;
    t?: number; // 音長
    a?: number; // アタック
    vol?: number;
    when?: number;
    slideT?: number;
    dest?: AudioNode;
  }): void {
    const c = this.ctx;
    if (!c) return;
    const { type = 'square', f0, f1, t = 0.12, a = 0.004, vol = 0.25, when = 0, slideT } = opts;
    const t0 = c.currentTime + when;
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== undefined) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + (slideT ?? t));
    }
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    o.connect(g);
    g.connect(opts.dest ?? this.sfxGain);
    o.start(t0);
    o.stop(t0 + t + 0.05);
  }

  noise(opts: {
    t?: number;
    vol?: number;
    when?: number;
    hp?: number;
    lp?: number;
    dest?: AudioNode;
  }): void {
    const c = this.ctx;
    if (!c) return;
    const { t = 0.1, vol = 0.25, when = 0, hp, lp } = opts;
    const t0 = c.currentTime + when;
    const len = Math.max(1, Math.floor(c.sampleRate * t));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    let node: AudioNode = src;
    if (hp) {
      const f = c.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = hp;
      node.connect(f);
      node = f;
    }
    if (lp) {
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = lp;
      node.connect(f);
      node = f;
    }
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    node.connect(g);
    g.connect(opts.dest ?? this.sfxGain);
    src.start(t0);
    src.stop(t0 + t + 0.02);
  }

  // ---- 効果音 ----
  sfx(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'uiMove':
        this.tone({ f0: 660, t: 0.05, vol: 0.09, type: 'triangle' });
        break;
      case 'uiOk':
        this.tone({ f0: 660, t: 0.06, vol: 0.12, type: 'triangle' });
        this.tone({ f0: 990, t: 0.09, vol: 0.12, type: 'triangle', when: 0.05 });
        break;
      case 'jump':
        this.tone({ f0: 340, f1: 700, t: 0.13, vol: 0.14, type: 'triangle' });
        break;
      case 'dash':
        this.noise({ t: 0.18, vol: 0.07, hp: 900, lp: 3600 });
        this.tone({ f0: 220, f1: 480, t: 0.16, vol: 0.09, type: 'sine' });
        break;
      case 'land':
        this.noise({ t: 0.04, vol: 0.07, lp: 800 });
        break;
      case 'damage':
        this.noise({ t: 0.1, vol: 0.18, lp: 1500 });
        this.tone({ f0: 240, f1: 90, t: 0.18, vol: 0.18, type: 'triangle' });
        break;
      case 'shade':
        this.tone({ f0: 880, f1: 440, t: 0.16, vol: 0.1, type: 'sine' });
        this.tone({ f0: 1320, f1: 660, t: 0.16, vol: 0.06, type: 'sine', when: 0.03 });
        break;
      case 'mist':
        this.noise({ t: 0.3, vol: 0.06, hp: 3600, lp: 6800 });
        this.tone({ f0: 1560, f1: 2100, t: 0.2, vol: 0.05, type: 'sine' });
        break;
      case 'drink':
        this.tone({ f0: 523, t: 0.05, vol: 0.12, type: 'triangle' });
        this.tone({ f0: 659, t: 0.05, vol: 0.12, type: 'triangle', when: 0.05 });
        this.tone({ f0: 784, t: 0.09, vol: 0.12, type: 'triangle', when: 0.1 });
        break;
      case 'energy':
        this.tone({ f0: 523, t: 0.04, vol: 0.12, type: 'triangle' });
        this.tone({ f0: 784, t: 0.04, vol: 0.12, type: 'triangle', when: 0.04 });
        this.tone({ f0: 1046, t: 0.04, vol: 0.12, type: 'triangle', when: 0.08 });
        this.tone({ f0: 1568, t: 0.12, vol: 0.11, type: 'triangle', when: 0.12 });
        break;
      case 'store':
        // 入店チャイム
        this.tone({ f0: 784, t: 0.12, vol: 0.12, type: 'sine' });
        this.tone({ f0: 587, t: 0.18, vol: 0.12, type: 'sine', when: 0.13 });
        this.noise({ t: 0.5, vol: 0.035, hp: 4200, lp: 7000, when: 0.2 }); // 冷気
        break;
      case 'laserWarn':
        this.tone({ f0: 830, t: 0.08, vol: 0.12, type: 'triangle' });
        this.tone({ f0: 830, t: 0.08, vol: 0.12, type: 'triangle', when: 0.14 });
        break;
      case 'laserFire':
        this.noise({ t: 0.45, vol: 0.14, hp: 500, lp: 4200 });
        this.tone({ f0: 1600, f1: 200, t: 0.45, vol: 0.11, type: 'triangle' });
        this.tone({ f0: 130, f1: 55, t: 0.4, vol: 0.16, type: 'sine' });
        break;
      case 'gull':
        this.tone({ f0: 1180, f1: 880, t: 0.1, vol: 0.08, type: 'triangle' });
        this.tone({ f0: 1320, f1: 990, t: 0.12, vol: 0.07, type: 'triangle', when: 0.12 });
        break;
      case 'quip':
        this.tone({ f0: 880, t: 0.03, vol: 0.05, type: 'triangle' });
        break;
      case 'card':
        this.tone({ f0: 440, t: 0.06, vol: 0.1, type: 'triangle' });
        this.tone({ f0: 554, t: 0.1, vol: 0.1, type: 'triangle', when: 0.07 });
        break;
      case 'lowHp': {
        const now = this.ctx.currentTime;
        if (now - this.lowHpAt > 1.1) {
          this.lowHpAt = now;
          this.tone({ f0: 392, t: 0.08, vol: 0.08, type: 'triangle' });
          this.tone({ f0: 330, t: 0.1, vol: 0.08, type: 'triangle', when: 0.1 });
        }
        break;
      }
      case 'timeWarn':
        this.tone({ f0: 740, t: 0.07, vol: 0.09, type: 'triangle' });
        break;
      case 'countBeep':
        this.tone({ f0: 440, t: 0.1, vol: 0.13, type: 'triangle' });
        break;
      case 'go':
        this.tone({ f0: 880, t: 0.28, vol: 0.16, type: 'triangle' });
        break;
      case 'goal':
        for (let i = 0; i < 4; i++) {
          this.tone({ f0: [523, 659, 784, 1046][i], t: 0.16, vol: 0.13, type: 'triangle', when: i * 0.09 });
        }
        break;
      case 'rank':
        this.noise({ t: 0.12, vol: 0.16, lp: 1000 });
        this.tone({ f0: 120, f1: 60, t: 0.16, vol: 0.18, type: 'sine' });
        break;
      case 'record':
        for (let i = 0; i < 6; i++) {
          this.tone({ f0: 784 * Math.pow(2, i / 12), t: 0.07, vol: 0.09, when: i * 0.05, type: 'triangle' });
        }
        break;
      case 'collapse':
        this.tone({ f0: 440, f1: 110, t: 0.7, vol: 0.15, type: 'triangle' });
        break;
    }
  }
}
