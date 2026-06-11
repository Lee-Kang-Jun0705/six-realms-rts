// 절차적 BGM 엔진 — Web Audio API (파일 0KB, 즉시 재생, 평시↔전투 동적 전환)
// 레이어: 베이스 드론 + 패드 화음 + 아르페지오(평시) + 드럼/긴장(전투). 음소거/크로스페이드 지원.

type Mood = 'menu' | 'peace' | 'battle';

// 펜타토닉(불협 적음) — 분위기별 루트/스케일
const SCALES: Record<Mood, { root: number; steps: number[]; bpm: number }> = {
  menu: { root: 130.81, steps: [0, 4, 7, 11, 12], bpm: 80 }, // C 메이저7 웅장
  peace: { root: 146.83, steps: [0, 3, 5, 7, 10], bpm: 66 }, // D 마이너 펜타 잔잔
  battle: { root: 110.0, steps: [0, 2, 3, 7, 8], bpm: 132 }, // A 프리지안풍 긴장
};

export class BgmEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private layers: { peace: GainNode; battle: GainNode } | null = null;
  private timer: number | null = null;
  private step = 0;
  private mood: Mood = 'peace';
  private battleMix = 0; // 0~1 전투 강도
  muted = false;

  constructor() {
    this.muted = localStorage.getItem('sixrealms-muted') === '1';
  }

  /** 사용자 제스처 후 호출 (자동재생 정책) */
  start(mood: Mood): void {
    if (this.ctx) {
      this.setMood(mood);
      return;
    }
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
    } catch {
      return;
    }
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.32;
    this.master.connect(this.ctx.destination);
    const peace = this.ctx.createGain();
    const battle = this.ctx.createGain();
    peace.gain.value = 1;
    battle.gain.value = 0;
    peace.connect(this.master);
    battle.connect(this.master);
    this.layers = { peace, battle };
    this.mood = mood;
    this.scheduleLoop();
  }

  setMood(mood: Mood): void {
    this.mood = mood;
  }

  /** 전투 강도 0~1 (교전 유닛 수 기반) — 평시/전투 레이어 크로스페이드 */
  setBattle(intensity: number): void {
    this.battleMix = Math.max(0, Math.min(1, intensity));
    if (!this.ctx || !this.layers) return;
    const t = this.ctx.currentTime;
    this.layers.peace.gain.linearRampToValueAtTime(0.5 + (1 - this.battleMix) * 0.5, t + 0.5);
    this.layers.battle.gain.linearRampToValueAtTime(this.battleMix, t + 0.5);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem('sixrealms-muted', this.muted ? '1' : '0');
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.32, this.ctx.currentTime + 0.2);
    }
    return this.muted;
  }

  stop(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.layers = null;
  }

  private freq(deg: number, octave = 0): number {
    const s = SCALES[this.mood];
    const idx = ((deg % s.steps.length) + s.steps.length) % s.steps.length;
    const semis = s.steps[idx] + 12 * (octave + Math.floor(deg / s.steps.length));
    return s.root * Math.pow(2, semis / 12);
  }

  private note(freq: number, dur: number, gainNode: GainNode, type: OscillatorType, vol: number): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.15);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g);
    g.connect(gainNode);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(gainNode: GainNode): void {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(gainNode);
    o.start(t);
    o.stop(t + 0.2);
  }

  private scheduleLoop(): void {
    if (!this.ctx || !this.layers) return;
    const s = SCALES[this.mood];
    const beat = 60 / s.bpm;
    const peace = this.layers.peace;
    const battle = this.layers.battle;

    // 평시: 4박마다 패드 화음 + 아르페지오
    if (this.step % 2 === 0) {
      this.note(this.freq(0, -1), beat * 4, peace, 'sine', 0.18); // 베이스 드론
      this.note(this.freq(2, 0), beat * 4, peace, 'triangle', 0.06); // 패드
    }
    const arp = [0, 2, 4, 2, 3, 1][this.step % 6];
    this.note(this.freq(arp, 1), beat * 0.9, peace, 'triangle', 0.07);

    // 전투: 킥 드럼 + 긴장 베이스 (battle 레이어, mix로 볼륨 제어)
    this.kick(battle);
    if (this.step % 2 === 1) this.kick(battle);
    this.note(this.freq(0, -1), beat, battle, 'sawtooth', 0.05);
    const bassSeq = [0, 0, 3, 0, 4, 3][this.step % 6];
    this.note(this.freq(bassSeq, 0), beat * 0.5, battle, 'square', 0.04);

    this.step++;
    this.timer = window.setTimeout(() => this.scheduleLoop(), beat * 1000);
  }
}
