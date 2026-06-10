// 건물 배치/건설 — 그리드 점유 검증 + 일꾼 건설 진행 (디아2 buildingPlacement 패턴 차용)

import type { GameState } from './state';
import { addBuilding, buildingCenter, findBuilding } from './state';
import type { Building, BuildingKind, PlayerId, Unit } from './types';
import { BUILDING_STATS } from '../data/baseline';
import { T_DIRT, T_GRASS, freeRect, inBounds, occupyRect, tileIndex } from './map';
import { distSq } from './vec';

export type PlaceReject = 'outOfBounds' | 'blocked' | 'insufficient' | 'tierLocked' | null;

export function canPlace(state: GameState, player: PlayerId, kind: BuildingKind, tx: number, ty: number): PlaceReject {
  const s = BUILDING_STATS[kind];
  const p = state.players[player];
  if (p.gold < s.cost.gold || p.wood < s.cost.wood) return 'insufficient';
  if (s.requiresTier > playerTier(state, player)) return 'tierLocked';
  for (let y = ty; y < ty + s.h; y++) {
    for (let x = tx; x < tx + s.w; x++) {
      if (!inBounds(state.map, x, y)) return 'outOfBounds';
      const t = state.map.terrain[tileIndex(state.map, x, y)];
      if (t !== T_GRASS && t !== T_DIRT) return 'blocked';
      if (state.map.occupancy[tileIndex(state.map, x, y)] !== 0) return 'blocked';
    }
  }
  return null;
}

export function playerTier(state: GameState, player: PlayerId): 1 | 2 | 3 {
  let tier: 1 | 2 | 3 = 1;
  for (const b of state.buildings) {
    if (b.player === player && b.kind === 'hq' && b.hp > 0 && b.buildProgress >= 1 && b.tier > tier) tier = b.tier;
  }
  return tier;
}

/** 배치 확정: 비용 차감 + 점유 + 내부 유닛 밀어내기 + 건설 시작 */
export function placeBuilding(state: GameState, worker: Unit, kind: BuildingKind, tx: number, ty: number): Building | null {
  if (canPlace(state, worker.player, kind, tx, ty) !== null) return null;
  const s = BUILDING_STATS[kind];
  const p = state.players[worker.player];
  p.gold -= s.cost.gold;
  p.wood -= s.cost.wood;
  const b = addBuilding(state, worker.player, kind, tx, ty, false);
  occupyRect(state.map, b.id, tx, ty, s.w, s.h);
  displaceUnits(state, tx, ty, s.w, s.h);
  assignBuilder(worker, b);
  state.counters.buildingsBuilt[kind] = (state.counters.buildingsBuilt[kind] ?? 0) + 1;
  return b;
}

export function assignBuilder(worker: Unit, b: Building): void {
  worker.state = 'building';
  worker.buildTargetId = b.id;
  const c = buildingCenter(b);
  worker.destX = c.x;
  worker.destY = c.y;
}

/** 점유 영역 안에 서 있던 유닛을 가장 가까운 외곽으로 결정적 이동 */
function displaceUnits(state: GameState, tx: number, ty: number, w: number, h: number): void {
  for (const u of state.units) {
    if (u.state === 'dead') continue;
    const ux = Math.floor(u.x);
    const uy = Math.floor(u.y);
    if (ux < tx || ux >= tx + w || uy < ty || uy >= ty + h) continue;
    // 좌/우/상/하 중 가까운 외곽으로 스냅
    const dl = u.x - tx;
    const dr = tx + w - u.x;
    const dt = u.y - ty;
    const db = ty + h - u.y;
    const m = Math.min(dl, dr, dt, db);
    if (m === dl) u.x = tx - 0.3;
    else if (m === dr) u.x = tx + w + 0.3;
    else if (m === dt) u.y = ty - 0.3;
    else u.y = ty + h + 0.3;
  }
}

const BUILD_REACH = 0.9; // 건물 외곽 기준 도달 여유

export function constructionTick(state: GameState): void {
  for (const u of state.units) {
    if (u.state !== 'building') continue;
    const b = findBuilding(state, u.buildTargetId);
    if (!b || b.buildProgress >= 1) {
      u.state = 'idle';
      u.buildTargetId = 0;
      continue;
    }
    const c = buildingCenter(b);
    const reach = Math.max(b.w, b.h) / 2 + BUILD_REACH;
    if (distSq(u.x, u.y, c.x, c.y) > reach * reach) continue; // 이동 중
    const s = BUILDING_STATS[b.kind];
    const rate = u.faction === 'fantasy' ? 1.25 : 1; // 판타지 패시브: 건설/수리 +25% (§2.2)
    b.buildProgress = Math.min(1, b.buildProgress + rate / s.buildTicks);
    b.hp = Math.min(b.maxHp, b.hp + (rate * b.maxHp) / s.buildTicks);
    if (b.buildProgress >= 1) {
      b.hp = b.maxHp;
      state.players[b.player].supplyCap += s.supplyProvided;
      u.state = 'idle';
      u.buildTargetId = 0;
    }
  }
}

/** 건물 파괴 처리 (전투에서 호출) */
export function destroyBuilding(state: GameState, b: Building): void {
  if (b.hp > 0) return;
  const s = BUILDING_STATS[b.kind];
  if (b.buildProgress >= 1) state.players[b.player].supplyCap -= s.supplyProvided;
  freeRect(state.map, b.tileX, b.tileY, b.w, b.h);
  // 건설 중이던 일꾼 해제
  for (const u of state.units) {
    if (u.buildTargetId === b.id) {
      u.buildTargetId = 0;
      if (u.state === 'building') u.state = 'idle';
    }
  }
}
