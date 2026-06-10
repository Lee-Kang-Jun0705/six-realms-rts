// 지형 레이어 — 타일 이미지 + 물/숲 프레임 교차(움직이는 배경) + 벌목 갱신

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { T_DIRT, T_FOREST, T_GRASS, T_ROCK, T_WATER, tileIndex } from '../core/map';
import { TILE } from '../core/const';
import { mulberry32 } from '../core/rng';

export class TerrainLayer {
  private tiles: Phaser.GameObjects.Image[] = [];
  private snapshot: Uint8Array;
  private waterFrame = 0;
  private waterTimer = 0;
  private forestTimer = 0;
  private forestFrame = 0;
  private variant: Uint8Array; // 잔디 변형 (결정적)

  constructor(scene: Phaser.Scene, private state: GameState) {
    const map = state.map;
    this.snapshot = new Uint8Array(map.terrain);
    this.variant = new Uint8Array(map.width * map.height);
    const rng = mulberry32(state.seed ^ 0x5eed);
    for (let i = 0; i < this.variant.length; i++) this.variant[i] = rng() < 0.5 ? 0 : 1;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const img = scene.add.image(x * TILE, y * TILE, this.textureFor(x, y)).setOrigin(0, 0).setDepth(-100);
        this.tiles.push(img);
      }
    }
  }

  private textureFor(x: number, y: number): string {
    const i = tileIndex(this.state.map, x, y);
    const t = this.state.map.terrain[i];
    const v = this.variant[i];
    if (t === T_GRASS) return `t-grass${v}`;
    if (t === T_DIRT) return 't-dirt';
    if (t === T_FOREST) return `t-forest${this.forestFrame === 0 ? 0 : v}`;
    if (t === T_WATER) return `t-water${this.waterFrame}`;
    if (t === T_ROCK) return 't-rock';
    return 't-grass0';
  }

  update(deltaMs: number): void {
    this.waterTimer += deltaMs;
    this.forestTimer += deltaMs;
    let waterFlip = false;
    let forestFlip = false;
    if (this.waterTimer > 550) {
      this.waterTimer = 0;
      this.waterFrame = 1 - this.waterFrame;
      waterFlip = true;
    }
    if (this.forestTimer > 900) {
      this.forestTimer = 0;
      this.forestFrame = 1 - this.forestFrame;
      forestFlip = true;
    }
    const map = this.state.map;
    for (let i = 0; i < map.terrain.length; i++) {
      const t = map.terrain[i];
      const changed = t !== this.snapshot[i];
      if (!changed && !(waterFlip && t === T_WATER) && !(forestFlip && t === T_FOREST)) continue;
      this.snapshot[i] = t;
      const x = i % map.width;
      const y = (i / map.width) | 0;
      this.tiles[i].setTexture(this.textureFor(x, y));
    }
  }
}
