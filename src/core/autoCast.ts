// 캐스터 오토캐스트 — 시뮬 내 결정적 규칙 (명령 로그 불필요, 리플레이 안전)
// AI/플레이어 공용: 교전 중 캐스터가 조건 충족 시 자동 시전 (8틱 스로틀)

import type { GameState } from './state';
import type { Unit } from './types';
import { spellsOf } from '../data/spells';
import { castSpell } from './spells';
import { effectivePlayer } from './combat';
import { distSq } from './vec';
import { UNIT_STATS } from '../data/baseline';

function unitValue(role: Unit['role']): number {
  const s = UNIT_STATS[role];
  return s.cost.gold + s.cost.wood * 0.8;
}

export function autoCastTick(state: GameState): void {
  if (state.tick % 8 !== 0) return;
  // 8틱 주기라 16틱 단위로 방향 교차 — 스펠 선공 편향 상쇄
  const order = state.tick % 16 === 0 ? state.units : [...state.units].reverse();
  for (const u of order) {
    if (u.state === 'dead' || u.role !== 'caster') continue;
    if (u.state !== 'attacking' && u.state !== 'attackMove' && u.state !== 'idle') continue;
    tryAutoCast(state, u);
  }
}

function tryAutoCast(state: GameState, caster: Unit): void {
  const player = effectivePlayer(caster) as 0 | 1;
  for (const def of spellsOf(caster.faction)) {
    if ((caster.spellCooldowns[def.id] ?? 0) > 0) continue;
    if (trySpecial(state, caster, player, def.id)) return;
    if (def.autoCastEnemies <= 0) continue;
    if (def.range === 0) {
      // 자기 중심 오라류
      if (countEnemies(state, player, caster.x, caster.y, def.params.autoRadius ?? def.params.radius ?? 3) >= def.autoCastEnemies) {
        castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId: def.id, x: caster.x, y: caster.y });
        return;
      }
      continue;
    }
    const target = nearestEnemy(state, player, caster, def.range);
    if (!target) continue;
    // 단일 대상 스펠은 targetId, 지점 스펠은 좌표
    const single = def.id === 'pressure-point' || def.id === 'smite';
    if (single) {
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId: def.id, targetId: target.id, x: target.x, y: target.y });
      return;
    }
    if (countEnemies(state, player, target.x, target.y, def.params.radius ?? 1.5) >= def.autoCastEnemies) {
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId: def.id, x: target.x, y: target.y });
      return;
    }
  }
}

/** 특수 조건 스펠 (autoCastEnemies=0 계열) — 시전 시 true */
function trySpecial(state: GameState, caster: Unit, player: 0 | 1, spellId: string): boolean {
  switch (spellId) {
    case 'sacrifice':
      return tryAutoSacrifice(state, caster, player);
    case 'heal': {
      const ally = findAlly(state, caster, player, 4.5, (u) => u.hp < u.maxHp * 0.6 && u.role !== 'worker');
      if (!ally) return false;
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId, targetId: ally.id });
      return true;
    }
    case 'charm': {
      // 가장 비싼 적 1기 (정예/공성 우선)
      const scratch: Unit[] = [];
      state.grid.query(caster.x, caster.y, 4.5, scratch);
      let best: Unit | null = null;
      let bestV = 0;
      for (const e of scratch) {
        if (e.state === 'dead' || effectivePlayer(e) === player || e.charmOwner >= 0 || e.isSummoned) continue;
        const v = unitValue(e.role);
        if (v > bestV) {
          bestV = v;
          best = e;
        }
      }
      if (!best || bestV < 90) return false; // 싸구려에 낭비 금지 (사수급부터)
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId, targetId: best.id });
      return true;
    }
    case 'shadow-veil': {
      const ally = findAlly(state, caster, player, 3, (u) => u.hp < u.maxHp * 0.45 && u.outOfCombatTicks < 20);
      if (!ally) return false;
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId, targetId: ally.id });
      return true;
    }
    case 'revive': {
      if (!state.recentDeaths.some((d) => d.player === player)) return false;
      castSpell(state, { type: 'cast', player, unitIds: [caster.id], spellId });
      return true;
    }
    default:
      return false;
  }
}

function findAlly(
  state: GameState, caster: Unit, player: number, range: number, pred: (u: Unit) => boolean,
): Unit | null {
  const scratch: Unit[] = [];
  state.grid.query(caster.x, caster.y, range, scratch);
  for (const u of scratch) {
    if (u.state === 'dead' || effectivePlayer(u) !== player || u.id === caster.id) continue;
    if (pred(u)) return u;
  }
  return null;
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
