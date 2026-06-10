// 오디오 매니저 — pyfxr 생성 SFX 재생 (시뮬 카운터 diff 관찰 방식, 코어 무수정)

import Phaser from 'phaser';
import type { GameState } from '../core/state';

const KEYS = ['hit', 'attack', 'build', 'train', 'spell', 'select', 'victory', 'defeat', 'explosion'] as const;
type SfxKey = (typeof KEYS)[number];

const MUTE_LS = 'sixrealms-muted';

export class AudioManager {
  private lastPlay = new Map<string, number>();
  private prev = { engagements: 0, spells: 0, units: 0, buildings: 0, aliveBuildings: 0 };
  muted = false;

  constructor(private scene: Phaser.Scene) {
    this.muted = localStorage.getItem(MUTE_LS) === '1';
  }

  static preload(scene: Phaser.Scene): void {
    for (const k of KEYS) scene.load.audio(`sfx-${k}`, `sfx/${k}.wav`);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    localStorage.setItem(MUTE_LS, this.muted ? '1' : '0');
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

  /** 매 프레임 시뮬 카운터 diff → 사운드 트리거 */
  observe(state: GameState): void {
    const c = state.counters;
    const spells = Object.values(c.spellsCast).reduce((a, b) => a + b, 0);
    const units = Object.values(c.unitsProduced).reduce((a, b) => a + b, 0);
    const buildings = Object.values(c.buildingsBuilt).reduce((a, b) => a + b, 0);
    const aliveBuildings = state.buildings.filter((b) => b.hp > 0).length;

    if (c.engagements > this.prev.engagements) this.play('hit', 0.25, 150);
    if (spells > this.prev.spells) this.play('spell', 0.45, 200);
    if (units > this.prev.units && state.tick > 5) this.play('train', 0.35, 250);
    if (buildings > this.prev.buildings) this.play('build', 0.4, 200);
    if (aliveBuildings < this.prev.aliveBuildings) this.play('explosion', 0.5, 300);

    this.prev = { engagements: c.engagements, spells, units, buildings, aliveBuildings };
  }
}
