// 오디오 매니저 — pyfxr 생성 SFX 재생 (시뮬 카운터 diff 관찰 방식, 코어 무수정)

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { BgmEngine } from './bgm';

const KEYS = [
  'hit', 'attack', 'build', 'train', 'spell', 'select', 'victory', 'defeat', 'explosion',
  'harvest', 'upgrade', 'tierup', 'wave-alert', 'mine-depleted', 'place',
] as const;
type SfxKey = (typeof KEYS)[number];

const MUTE_LS = 'sixrealms-muted';

export class AudioManager {
  private lastPlay = new Map<string, number>();
  private prev = { engagements: 0, spells: 0, units: 0, buildings: 0, aliveBuildings: 0, tier: 0, wave: 0 };
  muted = false;
  readonly bgm = new BgmEngine();

  constructor(private scene: Phaser.Scene) {
    this.muted = localStorage.getItem(MUTE_LS) === '1';
  }

  static preload(scene: Phaser.Scene): void {
    for (const k of KEYS) scene.load.audio(`sfx-${k}`, `sfx/${k}.wav`);
  }

  /** 첫 사용자 입력 후 BGM 시작 (자동재생 정책) */
  startBgm(mood: 'menu' | 'peace' | 'battle'): void {
    this.bgm.start(mood);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_LS, this.muted ? '1' : '0');
    this.bgm.toggleMute(); // bgm은 자체 localStorage 동기화 — muted 상태가 this와 일치 유지
    return this.muted;
  }

  play(key: SfxKey, volume = 0.4, throttleMs = 120): void {
    if (this.muted) return;
    const now = this.scene.time.now;
    if (now - (this.lastPlay.get(key) ?? -9999) < throttleMs) return;
    this.lastPlay.set(key, now);
    try {
      this.scene.sound.play(`sfx-${key}`, { volume });
    } catch {
      // 오디오 컨텍스트 미준비(자동재생 정책) — 무시
    }
  }

  /** 매 프레임 시뮬 카운터 diff → SFX 트리거 + BGM 전투 강도 */
  observe(state: GameState): void {
    const c = state.counters;
    const spells = Object.values(c.spellsCast).reduce((a, b) => a + b, 0);
    const units = Object.values(c.unitsProduced).reduce((a, b) => a + b, 0);
    const buildings = Object.values(c.buildingsBuilt).reduce((a, b) => a + b, 0);
    const aliveBuildings = state.buildings.filter((b) => b.hp > 0).length;
    const tier = Math.max(...state.buildings.filter((b) => b.kind === 'hq').map((b) => b.tier), 1);
    const wave = state.defense?.wave ?? 0;

    if (c.engagements > this.prev.engagements) this.play('hit', 0.22, 140);
    if (spells > this.prev.spells) this.play('spell', 0.45, 200);
    if (units > this.prev.units && state.tick > 5) this.play('train', 0.3, 250);
    if (buildings > this.prev.buildings) this.play('build', 0.4, 200);
    if (aliveBuildings < this.prev.aliveBuildings) this.play('explosion', 0.5, 300);
    if (tier > this.prev.tier && this.prev.tier > 0) this.play('tierup', 0.5, 0);
    if (wave > this.prev.wave) this.play('wave-alert', 0.5, 0);

    // BGM 전투 강도: 최근 교전 증가율 기반 (간이) — 교전 많으면 battle 레이어 상승
    const engaged = state.units.filter((u) => u.state === 'attacking').length;
    this.bgm.setBattle(Math.min(1, engaged / 12));

    this.prev = { engagements: c.engagements, spells, units, buildings, aliveBuildings, tier, wave };
  }
}
