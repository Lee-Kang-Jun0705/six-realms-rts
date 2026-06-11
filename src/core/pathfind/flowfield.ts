// Flow Field 경로탐색 — BFS 거리장 + 방향장 (플랜 §1/§3)
// 목적지별 1회 계산, (목적지, 통행클래스, 지형버전) 키 캐시. 매 틱 재계산 금지.

import type { WorldMap, PassClass } from '../map';
import { passable, inBounds, tileIndex } from '../map';

export interface FlowField {
  /** 타일별 목적지 방향 단위벡터 (x,y 인터리브). 도달 불가 = (0,0) */
  dirs: Float32Array;
  /** BFS 거리 (타일 수). 도달 불가 = -1 */
  dist: Int32Array;
}

// 8방향 (대각선은 양옆 직교 타일이 모두 통행 가능할 때만 — 코너 끼임 방지)
const DX = [1, -1, 0, 0, 1, 1, -1, -1];
const DY = [0, 0, 1, -1, 1, -1, 1, -1];
const INV_SQRT2 = 0.7071067811865476;

export function computeFlowField(map: WorldMap, destTx: number, destTy: number, cls: PassClass): FlowField {
  const n = map.width * map.height;
  const dist = new Int32Array(n).fill(-1);
  const dirs = new Float32Array(n * 2);
  if (!inBounds(map, destTx, destTy)) return { dirs, dist };

  // BFS (균일 비용). 목적지 타일은 점유돼 있어도 시드로 허용 (금광/건물 접근용).
  // 시드가 건물/금광 내부면 같은 점유 id 타일을 BFS 통과 허용 — 3x3 본진 중심이
  // 목적지여도 외곽으로 확장됨 (유닛은 외부에서 접근만, 점유 타일 진입은 movement가 차단)
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  const start = tileIndex(map, destTx, destTy);
  const seedOcc = map.occupancy[start];
  const open = (x: number, y: number): boolean =>
    passable(map, x, y, cls) ||
    (seedOcc !== 0 && inBounds(map, x, y) && map.occupancy[tileIndex(map, x, y)] === seedOcc);
  dist[start] = 0;
  queue[tail++] = start;

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % map.width;
    const cy = (cur / map.width) | 0;
    const d = dist[cur];
    for (let k = 0; k < 8; k++) {
      const nx = cx + DX[k];
      const ny = cy + DY[k];
      if (!open(nx, ny)) continue;
      if (k >= 4 && (!open(cx + DX[k], cy) || !open(cx, cy + DY[k]))) continue;
      const ni = ny * map.width + nx;
      if (dist[ni] !== -1) continue;
      dist[ni] = d + 1;
      // 방향 = 부모(목적지 쪽) 타일로의 단위벡터
      const ddx = -DX[k];
      const ddy = -DY[k];
      const diag = k >= 4 ? INV_SQRT2 : 1;
      dirs[ni * 2] = ddx * diag;
      dirs[ni * 2 + 1] = ddy * diag;
      queue[tail++] = ni;
    }
  }
  return { dirs, dist };
}

/** LRU 캐시 — Map 삽입 순서 활용 (결정성: 키는 명령에서만 생성됨) */
export class FlowCache {
  private cache = new Map<string, FlowField>();
  constructor(private cap = 128) {}

  get(map: WorldMap, destTx: number, destTy: number, cls: PassClass): FlowField {
    const key = `${destTx},${destTy},${cls},${map.terrainVersion}`;
    const hit = this.cache.get(key);
    if (hit) {
      this.cache.delete(key);
      this.cache.set(key, hit); // LRU 갱신
      return hit;
    }
    const field = computeFlowField(map, destTx, destTy, cls);
    this.cache.set(key, field);
    if (this.cache.size > this.cap) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    return field;
  }
}

/** 유닛 위치의 흐름 방향 샘플 */
export function sampleFlow(map: WorldMap, field: FlowField, x: number, y: number): { x: number; y: number; reachable: boolean } {
  return sampleFlowTile(map, field, Math.floor(x), Math.floor(y));
}

/** 타일 좌표 직접 샘플 — 정수 경계 타이브레이크를 호출자(진영별 σ-안정 규칙)가 소유 (#44) */
export function sampleFlowTile(map: WorldMap, field: FlowField, tx: number, ty: number): { x: number; y: number; reachable: boolean } {
  if (!inBounds(map, tx, ty)) return { x: 0, y: 0, reachable: false };
  const i = tileIndex(map, tx, ty);
  if (field.dist[i] === -1) return { x: 0, y: 0, reachable: false };
  return { x: field.dirs[i * 2], y: field.dirs[i * 2 + 1], reachable: true };
}
