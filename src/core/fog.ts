// 전장의 안개 — 플레이어별 3상태 (0 미탐험 / 1 탐험됨 / 2 현재 시야)
// 갱신은 4틱마다 (AI 의사결정 주기와 동일 — 플랜 M-6 비용 통제)

import type { WorldMap } from './map';
import { tileIndex, inBounds } from './map';

export const FOG_UNSEEN = 0;
export const FOG_EXPLORED = 1;
export const FOG_VISIBLE = 2;

export class Fog {
  data: Uint8Array;
  constructor(private map: WorldMap) {
    this.data = new Uint8Array(map.width * map.height);
  }

  /** visible → explored 강등 후 시야원 재스탬프 */
  beginUpdate(): void {
    const d = this.data;
    for (let i = 0; i < d.length; i++) if (d[i] === FOG_VISIBLE) d[i] = FOG_EXPLORED;
  }

  stampCircle(cx: number, cy: number, radius: number): void {
    const r = Math.ceil(radius);
    const r2 = radius * radius;
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(this.map.height - 1, Math.ceil(cy + r));
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(this.map.width - 1, Math.ceil(cx + r));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        if (dx * dx + dy * dy <= r2) this.data[tileIndex(this.map, x, y)] = FOG_VISIBLE;
      }
    }
  }

  isVisible(tx: number, ty: number): boolean {
    if (!inBounds(this.map, tx, ty)) return false;
    return this.data[tileIndex(this.map, tx, ty)] === FOG_VISIBLE;
  }

  isExplored(tx: number, ty: number): boolean {
    if (!inBounds(this.map, tx, ty)) return false;
    return this.data[tileIndex(this.map, tx, ty)] >= FOG_EXPLORED;
  }
}
