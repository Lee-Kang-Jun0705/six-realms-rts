// 생산/연구 큐 — 유닛 훈련, 티어업, 공방/정예 연구 (워크2 골격)

import type { GameState } from './state';
import { spawnUnit } from './state';
import type { Building, PlayerId, UnitRole } from './types';
import { BUILDING_STATS, TIER_UP, UNIT_STATS, UPGRADES } from '../data/baseline';
import { orientationOf, passable } from './map';
import { SUPPLY_CAP } from './const';

const MAX_QUEUE = 5;

export type TrainReject = 'queueFull' | 'insufficient' | 'supplyBlocked' | 'tierLocked' | 'wrongBuilding' | null;

function queuedSupply(state: GameState, player: PlayerId): number {
  let sum = 0;
  for (const b of state.buildings) {
    if (b.player !== player) continue;
    for (const o of b.queue) if (o.kind === 'unit' && o.unitRole) sum += UNIT_STATS[o.unitRole].supply;
  }
  return sum;
}

export function trainUnit(state: GameState, b: Building, role: UnitRole): TrainReject {
  const p = state.players[b.player];
  let actualRole = role;
  // 정예 연구 완료 시 기동 슬롯은 정예로 생산 (워크2 기사→팔라딘 패턴)
  if (role === 'cavalry' && (p.upgrades['elite'] ?? 0) >= 1) actualRole = 'elite';
  const s = UNIT_STATS[actualRole];
  if (!BUILDING_STATS[b.kind].trains.includes(role)) return 'wrongBuilding';
  if (b.queue.length >= MAX_QUEUE) return 'queueFull';
  if (p.gold < s.cost.gold || p.wood < s.cost.wood) return 'insufficient';
  if (s.requiresTier > hqTier(state, b.player)) return 'tierLocked';
  const cap = Math.min(p.supplyCap, SUPPLY_CAP);
  if (p.supply + queuedSupply(state, b.player) + s.supply > cap) return 'supplyBlocked';
  p.gold -= s.cost.gold;
  p.wood -= s.cost.wood;
  b.queue.push({ kind: 'unit', unitRole: actualRole, ticksLeft: s.trainTicks, totalTicks: s.trainTicks });
  return null;
}

export function queueTierUp(state: GameState, b: Building): TrainReject {
  if (b.kind !== 'hq') return 'wrongBuilding';
  if (b.tier >= 3) return 'tierLocked';
  if (b.queue.length >= MAX_QUEUE) return 'queueFull';
  const next = (b.tier + 1) as 2 | 3;
  const def = TIER_UP[next];
  const p = state.players[b.player];
  if (p.gold < def.cost.gold || p.wood < def.cost.wood) return 'insufficient';
  p.gold -= def.cost.gold;
  p.wood -= def.cost.wood;
  b.queue.push({ kind: 'tierUp', ticksLeft: def.ticks, totalTicks: def.ticks });
  return null;
}

export function queueUpgrade(state: GameState, b: Building, upgradeId: string): TrainReject {
  const def = UPGRADES[upgradeId];
  if (!def) return 'wrongBuilding';
  const validHost = (upgradeId === 'elite' && b.kind === 'magetower') || (upgradeId !== 'elite' && b.kind === 'forge');
  if (!validHost) return 'wrongBuilding';
  if (b.queue.length >= MAX_QUEUE) return 'queueFull';
  const p = state.players[b.player];
  const current = p.upgrades[upgradeId] ?? 0;
  const pending = b.queue.filter((o) => o.kind === 'upgrade' && o.upgradeId === upgradeId).length;
  if (current + pending >= def.maxLevel) return 'tierLocked';
  if (p.gold < def.cost.gold || p.wood < def.cost.wood) return 'insufficient';
  p.gold -= def.cost.gold;
  p.wood -= def.cost.wood;
  b.queue.push({ kind: 'upgrade', upgradeId, ticksLeft: def.ticks, totalTicks: def.ticks });
  return null;
}

export function hqTier(state: GameState, player: PlayerId): 1 | 2 | 3 {
  let tier: 1 | 2 | 3 = 1;
  for (const b of state.buildings) {
    if (b.player === player && b.kind === 'hq' && b.hp > 0 && b.buildProgress >= 1 && b.tier > tier) tier = b.tier;
  }
  return tier;
}

export function productionTick(state: GameState): void {
  for (const b of state.buildings) {
    if (b.hp <= 0 || b.buildProgress < 1 || b.queue.length === 0) continue;
    const order = b.queue[0];
    order.ticksLeft--;
    if (order.ticksLeft > 0) continue;
    b.queue.shift();
    if (order.kind === 'unit' && order.unitRole) completeUnit(state, b, order.unitRole);
    else if (order.kind === 'tierUp') b.tier = Math.min(3, b.tier + 1) as 1 | 2 | 3;
    else if (order.kind === 'upgrade' && order.upgradeId) {
      const p = state.players[b.player];
      p.upgrades[order.upgradeId] = (p.upgrades[order.upgradeId] ?? 0) + 1;
    }
  }
}

function completeUnit(state: GameState, b: Building, role: UnitRole): void {
  const spot = findSpawnSpot(state, b);
  const u = spawnUnit(state, b.player, role, spot.x, spot.y);
  // 랠리 포인트로 이동
  u.state = 'moving';
  u.destX = b.rallyX;
  u.destY = b.rallyY;
}

/** 건물 외곽 링 스캔 — 첫 통행 가능 타일 (결정적).
 * 순회 방향은 진영별 미러 — 고정 좌상단 우선은 전선 거리 포지션 편향 (#44) */
function findSpawnSpot(state: GameState, b: Building): { x: number; y: number } {
  const sign = orientationOf(state.map, b.player);
  for (let ring = 1; ring <= 4; ring++) {
    const y0 = b.tileY - ring;
    const y1 = b.tileY + b.h + ring - 1;
    const x0 = b.tileX - ring;
    const x1 = b.tileX + b.w + ring - 1;
    for (let i = 0; i <= y1 - y0; i++) {
      const y = sign > 0 ? y0 + i : y1 - i;
      for (let j = 0; j <= x1 - x0; j++) {
        const x = sign > 0 ? x0 + j : x1 - j;
        const onEdge = x < b.tileX || x >= b.tileX + b.w || y < b.tileY || y >= b.tileY + b.h;
        if (!onEdge) continue;
        if (passable(state.map, x, y, 'ground')) return { x: x + 0.5, y: y + 0.5 };
      }
    }
  }
  return { x: b.tileX + b.w / 2, y: sign > 0 ? b.tileY + b.h + 1 : b.tileY - 1 }; // 폴백
}
