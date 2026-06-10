// 캐스터 오토캐스트 — 시뮬 내 결정적 규칙 (명령 로그 불필요, 리플레이 안전)
// AI/플레이어 공용: 교전 중 캐스터가 조건 충족 시 자동 시전 (8틱 스로틀)

import type { GameState } from './state';
import type { Unit } from './types';
import { spellsOf } from '../data/spells';
import { castSpell } from './spells';
import { effectivePlayer } from './combat';
import { distSq } from './vec';

export function autoCastTick(state: GameState): void {
  if (state.tick % 8 !== 0) return;
  for (const u of state.units) {
    if (u.state === 'dead' || u.role !== 'caster') continue;
    if (u.state !== 'attacking' && u.state !== 'attackMove' && u.state !== 'idle') continue;
    tryAutoCast(state, u);
  }
}

function tryAutoCast(state: GameState, caster: Unit): void {
  const player = effectivePlayer(caster) as 0 | 1;
  for (const def of spellsOf(caster.faction)) {
    if ((caster.spellCooldowns[def.id] ?? 0) > 0) continue;
    if (def.id === 'sacrifice') {
      if (tryAutoSacrifice(state, caster, player)) return;
      continue;
    }
    if (def.autoCastEnemies <= 0) continue;
    if (def.range === 0) {
      // 자기 중심 (흡혈 오라)
      if (countEnemies(state, player, caster.x, caster.y, def.params.radius ?? 3) >= def.autoCastEnemies) {
        castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId: def.id, x: caster.x, y: caster.y });
        return;
      }
      continue;
    }
    const target = nearestEnemy(state, player, caster, def.range);
    if (!target) continue;
    if (countEnemies(state, player, target.x, target.y, def.params.radius ?? 1.5) >= def.autoCastEnemies) {
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId: def.id, x: target.x, y: target.y });
      return;
    }
  }
}

/** 마계 특수: 적에게 둘러싸인 아군 소환수를 제물로 (id 오름차순 결정성) */
function tryAutoSacrifice(state: GameState, caster: Unit, player: 0 | 1): boolean {
  for (const u of state.units) {
    if (u.state === 'dead' || !u.isSummoned || u.player !== player || u.charmOwner >= 0) continue;
    if (distSq(caster.x, caster.y, u.x, u.y) > 16) continue;
    if (countEnemies(state, player, u.x, u.y, 2.0) >= 3) {
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId: 'sacrifice', targetId: u.id });
      return true;
    }
  }
  return false;
}

function countEnemies(state: GameState, player: number, x: number, y: number, radius: number): number {
  const scratch: Unit[] = [];
  state.grid.query(x, y, radius, scratch);
  let n = 0;
  for (const e of scratch) if (e.state !== 'dead' && effectivePlayer(e) !== player) n++;
  return n;
}

function nearestEnemy(state: GameState, player: number, caster: Unit, range: number): Unit | null {
  const scratch: Unit[] = [];
  state.grid.query(caster.x, caster.y, range, scratch);
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const e of scratch) {
    if (e.state === 'dead' || effectivePlayer(e) === player) continue;
    const d = distSq(caster.x, caster.y, e.x, e.y);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best;
}
