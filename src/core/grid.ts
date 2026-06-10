// 공간 해시 그리드 — 이웃 유닛 질의 (분리 스티어링/타겟 탐색용)
// 매 틱 rebuild (유닛 수백 규모에서 충분히 저렴, 결정성: 질의 결과 id 정렬)

import type { Unit } from './types';

export class SpatialGrid {
  private cell = 2; // 타일 단위 셀 크기
  private buckets = new Map<number, Unit[]>();
  constructor(private width: number) {}

  private key(cx: number, cy: number): number {
    return cy * Math.ceil(this.width / this.cell) + cx;
  }

  rebuild(units: Unit[]): void {
    this.buckets.clear();
    for (const u of units) {
      if (u.state === 'dead') continue;
      const k = this.key(Math.floor(u.x / this.cell), Math.floor(u.y / this.cell));
      const arr = this.buckets.get(k);
      if (arr) arr.push(u);
      else this.buckets.set(k, [u]);
    }
  }

  /** 반경 내 유닛 — id 오름차순 정렬로 결정성 보장 */
  query(x: number, y: number, radius: number, out: Unit[]): Unit[] {
    out.length = 0;
    const r2 = radius * radius;
    const minCx = Math.floor((x - radius) / this.cell);
    const maxCx = Math.floor((x + radius) / this.cell);
    const minCy = Math.floor((y - radius) / this.cell);
    const maxCy = Math.floor((y + radius) / this.cell);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const arr = this.buckets.get(this.key(cx, cy));
        if (!arr) continue;
        for (const u of arr) {
          const dx = u.x - x;
          const dy = u.y - y;
          if (dx * dx + dy * dy <= r2) out.push(u);
        }
      }
    }
    out.sort((a, b) => a.id - b.id);
    return out;
  }
}
