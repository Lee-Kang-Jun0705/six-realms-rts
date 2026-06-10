// 미니맵 — 지형/안개/유닛 점/카메라 사각형, 클릭 = 카메라 이동 (플랜 §2.4 UI)

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { T_DIRT, T_FOREST, T_GRASS, T_ROCK, T_WATER } from '../core/map';
import { FOG_UNSEEN, FOG_VISIBLE } from '../core/fog';
import { TILE } from '../core/const';

const TERRAIN_COLORS: Record<number, string> = {
  [T_GRASS]: '#5a9e4b',
  [T_DIRT]: '#9c7d4d',
  [T_FOREST]: '#2a6e34',
  [T_WATER]: '#3b6eb5',
  [T_ROCK]: '#5d5f66',
};
const TEAM = ['#3aa0ff', '#ff5a52'];

export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private timer = 999;
  revealAll = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private scene: Phaser.Scene,
    private state: GameState,
    private viewPlayer: () => number,
  ) {
    canvas.width = state.map.width * 4;
    canvas.height = state.map.height * 4;
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', (e) => this.jump(e));
    canvas.addEventListener('pointermove', (e) => {
      if (e.buttons === 1) this.jump(e);
    });
  }

  private jump(e: PointerEvent): void {
    const r = this.canvas.getBoundingClientRect();
    const tx = ((e.clientX - r.left) / r.width) * this.state.map.width;
    const ty = ((e.clientY - r.top) / r.height) * this.state.map.height;
    this.scene.cameras.main.centerOn(tx * TILE, ty * TILE);
  }

  update(deltaMs: number): void {
    this.timer += deltaMs;
    if (this.timer < 250) return;
    this.timer = 0;
    const { map } = this.state;
    const fog = this.state.fog[this.viewPlayer() as 0 | 1].data;
    const c = this.ctx;
    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const i = y * map.width + x;
        const f = this.revealAll ? FOG_VISIBLE : fog[i];
        if (f === FOG_UNSEEN) {
          c.fillStyle = '#07080c';
        } else {
          c.fillStyle = TERRAIN_COLORS[map.terrain[i]] ?? '#5a9e4b';
        }
        c.fillRect(x * 4, y * 4, 4, 4);
        if (f !== FOG_UNSEEN && f !== FOG_VISIBLE && !this.revealAll) {
          c.fillStyle = 'rgba(7,8,12,0.45)';
          c.fillRect(x * 4, y * 4, 4, 4);
        }
      }
    }
    // 금광 (탐험한 곳만 — 정보 누출 방지)
    for (const m of this.state.mines) {
      if (m.collapsed) continue;
      if (!this.revealAll && fog[m.tileY * map.width + m.tileX] === FOG_UNSEEN) continue;
      c.fillStyle = '#f5c542';
      c.fillRect(m.tileX * 4, m.tileY * 4, 8, 8);
    }
    // 건물/유닛 점
    for (const b of this.state.buildings) {
      if (b.hp <= 0) continue;
      if (!this.revealAll && b.player !== this.viewPlayer() && fog[b.tileY * map.width + b.tileX] === FOG_UNSEEN) continue;
      c.fillStyle = TEAM[b.player];
      c.fillRect(b.tileX * 4, b.tileY * 4, b.w * 4, b.h * 4);
    }
    for (const u of this.state.units) {
      const tx = Math.floor(u.x);
      const ty = Math.floor(u.y);
      if (!this.revealAll && u.player !== this.viewPlayer() && fog[ty * map.width + tx] !== FOG_VISIBLE) continue;
      c.fillStyle = TEAM[u.player];
      c.fillRect(tx * 4 - 1, ty * 4 - 1, 3, 3);
    }
    // 카메라 뷰포트
    const cam = this.scene.cameras.main;
    const wv = cam.worldView;
    c.strokeStyle = '#e8e2d0';
    c.lineWidth = 1;
    c.strokeRect((wv.x / TILE) * 4, (wv.y / TILE) * 4, (wv.width / TILE) * 4, (wv.height / TILE) * 4);
  }
}
