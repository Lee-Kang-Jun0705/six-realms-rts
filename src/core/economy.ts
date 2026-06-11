// 일꾼 경제 FSM — 금광 채굴 / 벌목 / 운반·납품 (워크2 골격, 플랜 §2.1)
// 채집/운반 상태는 분리 스티어링 제외(movement.ts) → 금광 앞 뭉침에도 경제 정상

import type { GameState } from './state';
import { buildingCenter, findMine, mineCenter } from './state';
import type { Building, Unit } from './types';
import { ECON } from '../data/baseline';
import { T_FOREST, chopForest, freeRect, orientationOf, tileIndex } from './map';
import { distSq } from './vec';

const MINE_REACH = 2.1; // 금광 중심 도달 판정 (2x2 점유 외곽)
const FOREST_REACH = 1.25;
const DEPOT_REACH = 2.5; // 본진 3x3 외곽

export function economyTick(state: GameState): void {
  for (const u of state.units) {
    if (u.state === 'harvesting') tickHarvest(state, u);
    else if (u.state === 'returning') tickReturn(state, u);
  }
}

function tickHarvest(state: GameState, u: Unit): void {
  if (u.harvestTargetId !== 0) tickMine(state, u);
  else tickChop(state, u);
}

function tickMine(state: GameState, u: Unit): void {
  const mine = findMine(state, u.harvestTargetId);
  if (!mine) {
    retargetOrIdle(state, u);
    return;
  }
  const c = mineCenter(mine);
  u.destX = c.x;
  u.destY = c.y;
  if (distSq(u.x, u.y, c.x, c.y) > MINE_REACH * MINE_REACH) return; // 이동 중
  u.harvestTicks++;
  if (u.harvestTicks < ECON.miningTicks) return;
  u.harvestTicks = 0;
  const got = Math.min(ECON.goldPerTrip, mine.remaining);
  mine.remaining -= got;
  if (mine.remaining <= 0) collapseMine(state, mine.id);
  u.cargo = 'gold';
  u.cargoAmount = got;
  startReturn(state, u);
}

function tickChop(state: GameState, u: Unit): void {
  const i = tileIndex(state.map, u.forestX, u.forestY);
  if (u.forestX < 0 || state.map.terrain[i] !== T_FOREST) {
    if (!retargetForest(state, u)) {
      u.state = 'idle';
      return;
    }
  }
  u.destX = u.forestX + 0.5;
  u.destY = u.forestY + 0.5;
  if (distSq(u.x, u.y, u.destX, u.destY) > FOREST_REACH * FOREST_REACH) return;
  u.harvestTicks++;
  if (u.harvestTicks < ECON.chopTicks) return;
  u.harvestTicks = 0;
  const got = chopForest(state.map, u.forestX, u.forestY, ECON.woodPerTrip);
  if (got === 0) {
    retargetForest(state, u);
    return;
  }
  u.cargo = 'wood';
  u.cargoAmount = got;
  startReturn(state, u);
}

function tickReturn(state: GameState, u: Unit): void {
  const depot = nearestDepot(state, u);
  if (!depot) {
    u.state = 'idle';
    return;
  }
  const c = buildingCenter(depot);
  u.destX = c.x;
  u.destY = c.y;
  if (distSq(u.x, u.y, c.x, c.y) > DEPOT_REACH * DEPOT_REACH) return;
  // 납품
  if (u.cargo === 'gold') state.players[u.player].gold += u.cargoAmount;
  else if (u.cargo === 'wood') state.players[u.player].wood += u.cargoAmount;
  u.cargo = null;
  u.cargoAmount = 0;
  // 다음 사이클
  if (u.harvestTargetId !== 0 && findMine(state, u.harvestTargetId)) u.state = 'harvesting';
  else if (u.forestX >= 0 && retargetForest(state, u)) u.state = 'harvesting';
  else retargetOrIdle(state, u);
}

function startReturn(state: GameState, u: Unit): void {
  u.state = 'returning';
  const depot = nearestDepot(state, u);
  if (!depot) {
    u.state = 'idle';
    return;
  }
  const c = buildingCenter(depot);
  u.destX = c.x;
  u.destY = c.y;
}

/** 완성된 본진 중 최근접 (id tie-break) */
export function nearestDepot(state: GameState, u: Unit): Building | undefined {
  let best: Building | undefined;
  let bestD = Infinity;
  for (const b of state.buildings) {
    if (b.player !== u.player || b.kind !== 'hq' || b.hp <= 0 || b.buildProgress < 1) continue;
    const c = buildingCenter(b);
    const d = distSq(u.x, u.y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

function collapseMine(state: GameState, mineId: number): void {
  const mine = state.mines.find((m) => m.id === mineId);
  if (!mine || mine.collapsed) return;
  mine.collapsed = true;
  freeRect(state.map, mine.tileX, mine.tileY, mine.w, mine.h);
}

/** 금광 고갈 시 가장 가까운 다른 금광으로 재배치, 없으면 idle */
function retargetOrIdle(state: GameState, u: Unit): void {
  let best = 0;
  let bestD = Infinity;
  for (const m of state.mines) {
    if (m.collapsed) continue;
    const c = mineCenter(m);
    const d = distSq(u.x, u.y, c.x, c.y);
    if (d < bestD) {
      bestD = d;
      best = m.id;
    }
  }
  if (best !== 0) {
    u.harvestTargetId = best;
    u.state = 'harvesting';
  } else {
    u.state = 'idle';
  }
}

/** 기존 벌목 지점 주변 최근접 숲 타일 탐색 (결정적).
 * 동거리 tie-break는 진영 방향으로 미러 — 고정 y→x 순회는 포지션 편향 (#44) */
function retargetForest(state: GameState, u: Unit): boolean {
  const cx = u.forestX >= 0 ? u.forestX : Math.floor(u.x);
  const cy = u.forestY >= 0 ? u.forestY : Math.floor(u.y);
  const sign = orientationOf(state.map, u.player);
  let bestX = -1;
  let bestY = -1;
  let bestD = Infinity;
  const R = 8;
  const y0 = Math.max(0, cy - R);
  const y1 = Math.min(state.map.height - 1, cy + R);
  const x0 = Math.max(0, cx - R);
  const x1 = Math.min(state.map.width - 1, cx + R);
  for (let i = 0; i <= y1 - y0; i++) {
    const y = sign > 0 ? y0 + i : y1 - i;
    for (let j = 0; j <= x1 - x0; j++) {
      const x = sign > 0 ? x0 + j : x1 - j;
      if (state.map.terrain[tileIndex(state.map, x, y)] !== T_FOREST) continue;
      const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      if (d < bestD) {
        bestD = d;
        bestX = x;
        bestY = y;
      }
    }
  }
  if (bestX < 0) return false;
  u.forestX = bestX;
  u.forestY = bestY;
  u.harvestTargetId = 0;
  return true;
}
