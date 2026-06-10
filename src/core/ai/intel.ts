// 정찰 인텔 갱신 — AI는 자기 안개의 visible 타일에 보이는 것만 기록 (치팅 0 보장)

import type { GameState } from '../state';
import type { PlayerId } from '../types';
import type { Intel } from './types';
import { UNIT_STATS } from '../../data/baseline';
import { buildingCenter } from '../state';
import { distSq } from '../vec';

export function createIntel(state: GameState, me: PlayerId): Intel {
  // 맵 시작 위치는 공개 정보 (래더 맵 상식) — 적 본진 추정만 시드
  const enemyStart = state.map.starts[me === 0 ? 1 : 0];
  return {
    enemyBasePos: { x: enemyStart.x, y: enemyStart.y },
    enemySeenBarracks: 0,
    enemySeenTowers: 0,
    enemySeenTier: 1,
    enemyArmyValueSeen: 0,
    lastSeenTick: 0,
    threatNearBase: 0,
  };
}

export function unitValue(role: string): number {
  const s = UNIT_STATS[role as keyof typeof UNIT_STATS];
  return s ? s.cost.gold + s.cost.wood * 0.8 : 0;
}

/** 매 의사결정 주기 호출 — 보이는 것만으로 인텔 갱신 */
export function updateIntel(state: GameState, me: PlayerId, intel: Intel): void {
  const fog = state.fog[me];
  const enemy = me === 0 ? 1 : 0;
  let seenArmy = 0;
  let barracks = 0;
  let towers = 0;
  let tier = 1;

  for (const b of state.buildings) {
    if (b.player !== enemy || b.hp <= 0) continue;
    if (!fog.isExplored(b.tileX + 1, b.tileY + 1)) continue;
    if (b.kind === 'barracks') barracks++;
    if (b.kind === 'tower') towers++;
    if (b.kind === 'hq' && b.tier > tier) tier = b.tier;
    if (b.kind === 'hq') intel.enemyBasePos = buildingCenter(b);
  }
  // 본진 위협: 내 HQ 반경 12타일 내 보이는 적 병력
  let threat = 0;
  const myHq = state.buildings.find((b) => b.player === me && b.kind === 'hq' && b.hp > 0);
  for (const u of state.units) {
    if (u.player !== enemy || u.state === 'dead' || u.role === 'worker') continue;
    if (!fog.isVisible(Math.floor(u.x), Math.floor(u.y))) continue;
    const v = unitValue(u.role);
    seenArmy += v;
    if (myHq) {
      const c = buildingCenter(myHq);
      if (distSq(u.x, u.y, c.x, c.y) < 144) threat += v;
    }
  }
  if (seenArmy > 0) {
    intel.enemyArmyValueSeen = Math.max(intel.enemyArmyValueSeen * 0.5, seenArmy);
    intel.lastSeenTick = state.tick;
  } else {
    intel.enemyArmyValueSeen *= 0.999; // 기억 감쇠
  }
  intel.enemySeenBarracks = Math.max(intel.enemySeenBarracks, barracks);
  intel.enemySeenTowers = towers;
  intel.enemySeenTier = Math.max(intel.enemySeenTier, tier);
  intel.threatNearBase = threat;
}
