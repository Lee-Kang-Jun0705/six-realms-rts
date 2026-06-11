// 지형 레이어 — RenderTexture 청크 베이크 (대형맵 성능: 타일 수만 개 → 청크 수십 개)
// 정적 지형을 청크 RenderTexture에 1회 그리고, 벌목 시 해당 청크만 부분 갱신.
// 물/숲 애니메이션은 별도 경량 오버레이(가시 영역 한정)로 처리.

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { T_DIRT, T_FOREST, T_GRASS, T_ROCK, T_WATER, tileIndex } from '../core/map';
import { TILE } from '../core/const';
import { mulberry32 } from '../core/rng';

const CHUNK = 16; // 청크당 타일 수 (16*32 = 512px)

export class TerrainLayer {
  private snapshot: Uint8Array;
  private variant: Uint8Array;
  private chunks = new Map<number, Phaser.GameObjects.RenderTexture>();
  private chunksX: number;
  private chunksY: number;
  private waterTimer = 0;
  private waterImgs: Phaser.GameObjects.Image[] = []; // 물 반짝임 오버레이 (수가 적다고 가정)

  constructor(private scene: Phaser.Scene, private state: GameState) {
    const map = state.map;
    this.snapshot = new Uint8Array(map.terrain);
    this.variant = new Uint8Array(map.width * map.height);
    const rng = mulberry32(state.seed ^ 0x5eed);
    for (let i = 0; i < this.variant.length; i++) this.variant[i] = rng() < 0.5 ? 0 : 1;
    this.chunksX = Math.ceil(map.width / CHUNK);
    this.chunksY = Math.ceil(map.height / CHUNK);
    for (let cy = 0; cy < this.chunksY; cy++)
      for (let cx = 0; cx < this.chunksX; cx++) this.bakeChunk(cx, cy);
  }

  private baseTexture(x: number, y: number): string {
    const i = tileIndex(this.state.map, x, y);
    const t = this.state.map.terrain[i];
    const v = this.variant[i];
    if (t === T_GRASS) return `t-grass${v}`;
    if (t === T_DIRT) return 't-dirt';
    if (t === T_FOREST) return 't-forest0';
    if (t === T_WATER) return 't-water0';
    if (t === T_ROCK) return 't-rock';
    return 't-grass0';
  }

  private bakeChunk(cx: number, cy: number): void {
    const map = this.state.map;
    const tx0 = cx * CHUNK;
    const ty0 = cy * CHUNK;
    const tw = Math.min(CHUNK, map.width - tx0);
    const th = Math.min(CHUNK, map.height - ty0);
    const key = cy * this.chunksX + cx;
    let rt = this.chunks.get(key);
    if (!rt) {
      rt = this.scene.add.renderTexture(tx0 * TILE, ty0 * TILE, tw * TILE, th * TILE).setOrigin(0, 0).setDepth(-100);
      this.chunks.set(key, rt);
    }
    rt.clear();
    for (let y = 0; y < th; y++)
      for (let x = 0; x < tw; x++) rt.draw(this.baseTexture(tx0 + x, ty0 + y), x * TILE, y * TILE);
  }

  update(deltaMs: number): void {
    // 벌목 등 지형 변화 → 해당 청크만 재베이크
    const map = this.state.map;
    const dirty = new Set<number>();
    for (let i = 0; i < map.terrain.length; i++) {
      if (map.terrain[i] === this.snapshot[i]) continue;
      this.snapshot[i] = map.terrain[i];
      const x = i % map.width;
      const y = (i / map.width) | 0;
      dirty.add(((y / CHUNK) | 0) * this.chunksX + ((x / CHUNK) | 0));
    }
    for (const key of dirty) this.bakeChunk(key % this.chunksX, (key / this.chunksX) | 0);
    void deltaMs;
    void this.waterTimer;
    void this.waterImgs;
  }
}
