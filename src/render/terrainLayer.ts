// 지형 레이어 — RenderTexture 청크 베이크 (대형맵 성능: 타일 수만 개 → 청크 수십 개)
// 정적 지형을 청크 RenderTexture에 1회 그리고, 벌목 시 해당 청크만 부분 갱신.
// 물/숲 애니메이션은 별도 경량 오버레이(가시 영역 한정)로 처리.

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { T_DIRT, T_FOREST, T_GRASS, T_ROCK, T_WATER, tileIndex } from '../core/map';
import { TILE } from '../core/const';
import { mulberry32 } from '../core/rng';
import { tileImageKey } from './bake';

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

  /** [이미지키, 절차키] — 이미지 있으면 그것, 없으면 절차 폴백 */
  private baseTexture(x: number, y: number): { img: string; proc: string } {
    const i = tileIndex(this.state.map, x, y);
    const t = this.state.map.terrain[i];
    const v = this.variant[i];
    if (t === T_GRASS) return { img: tileImageKey(v ? 'grass2' : 'grass'), proc: `t-grass${v}` };
    if (t === T_DIRT) return { img: tileImageKey('dirt'), proc: 't-dirt' };
    if (t === T_FOREST) return { img: tileImageKey('forest'), proc: 't-forest0' };
    if (t === T_WATER) return { img: tileImageKey('water'), proc: 't-water0' };
    if (t === T_ROCK) return { img: tileImageKey('rock'), proc: 't-rock' };
    return { img: tileImageKey('grass'), proc: 't-grass0' };
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
    // 128px 타일 이미지를 TILE(32)로 축소 draw하기 위한 재사용 스탬프
    const stamp = this.scene.add.image(0, 0, tileImageKey('grass')).setOrigin(0, 0).setVisible(false);
    stamp.setDisplaySize(TILE, TILE);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const tex = this.baseTexture(tx0 + x, ty0 + y);
        if (this.scene.textures.exists(tex.img)) {
          stamp.setTexture(tex.img).setDisplaySize(TILE, TILE);
          rt.draw(stamp, x * TILE, y * TILE);
        } else {
          rt.draw(tex.proc, x * TILE, y * TILE); // 절차 폴백 (32px)
        }
      }
    }
    stamp.destroy();
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
