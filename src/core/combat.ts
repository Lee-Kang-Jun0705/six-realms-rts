// 전투 — 타겟 획득(최근접+id tie-break)/추격/윈드업/데미지/스플래시/사망 (플랜 §2)

import type { GameState } from './state';
import { buildingCenter, findBuilding, findUnit } from './state';
import type { Building, Unit } from './types';
import { ARMOR_PER_LV, BUILDING_STATS, UNIT_STATS, WEAPON_DMG_PER_LV } from '../data/baseline';
import { destroyBuilding } from './building';
import { distSq } from './vec';

const CHASE_GIVEUP = 9; // 추격 포기 거리 (타일)

export function combatTick(state: GameState): void {
  const scratch: Unit[] = [];
  for (const u of state.units) {
    if (u.state === 'dead' || u.role === 'worker') {
      if (u.role === 'worker' && u.state === 'attacking') tickAttack(state, u); // 일꾼 강제 공격 명령 시
      continue;
    }
    if (u.state === 'attacking') tickAttack(state, u);
    else if (u.state === 'attackMove' || u.state === 'idle') tryAcquire(state, u, scratch);
  }
  towerTick(state);
}

function tryAcquire(state: GameState, u: Unit, scratch: Unit[]): void {
  const stats = UNIT_STATS[u.role];
  if (stats.aggroRange <= 0) return;
  const enemy = nearestEnemyUnit(state, u, stats.aggroRange, scratch) ?? undefined;
  if (enemy) {
    if (u.state === 'idle') {
      // 수비 교전: 복귀 지점 = 현재 위치
      u.orderX = u.x;
      u.orderY = u.y;
    }
    u.targetId = enemy.id;
    u.state = 'attacking';
    return;
  }
  if (u.state === 'attackMove') {
    const b = nearestEnemyBuilding(state, u, stats.aggroRange + 2);
    if (b) {
      u.targetId = b.id;
      u.state = 'attacking';
    }
  }
}

function nearestEnemyUnit(state: GameState, u: Unit, range: number, scratch: Unit[]): Unit | null {
  state.grid.query(u.x, u.y, range, scratch);
  let best: Unit | null = null;
  let bestD = Infinity;
  for (const n of scratch) {
    if (n.state === 'dead' || effectivePlayer(n) === effectivePlayer(u)) continue;
    const d = distSq(u.x, u.y, n.x, n.y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function nearestEnemyBuilding(state: GameState, u: Unit, range: number): Building | null {
  let best: Building | null = null;
  let bestD = Infinity;
  const r2 = range * range;
  for (const b of state.buildings) {
    if (b.hp <= 0 || b.player === effectivePlayer(u)) continue;
    const c = buildingCenter(b);
    const d = distSq(u.x, u.y, c.x, c.y);
    if (d <= r2 && d < bestD) {
      bestD = d;
      best = b;
    }
  }
  return best;
}

/** 매혹 중에는 시전자(charmOwner=매혹한 플레이어) 진영으로 행동 */
export function effectivePlayer(u: Unit): number {
  return u.charmOwner >= 0 ? u.charmOwner : u.player;
}

function tickAttack(state: GameState, u: Unit): void {
  const stats = UNIT_STATS[u.role];
  const targetUnit = findUnit(state, u.targetId);
  const targetBuilding = targetUnit ? undefined : findBuilding(state, u.targetId);
  if (!targetUnit && !targetBuilding) {
    // 타겟 소멸 → 명령 원목적지로 attackMove 재개 (추격으로 덮인 destX 복원)
    u.targetId = 0;
    u.windup = 0;
    u.destX = u.orderX;
    u.destY = u.orderY;
    const dx = u.orderX - u.x;
    const dy = u.orderY - u.y;
    u.state = dx * dx + dy * dy > 1 ? 'attackMove' : 'idle';
    return;
  }
  const tx = targetUnit ? targetUnit.x : buildingCenter(targetBuilding!).x;
  const ty = targetUnit ? targetUnit.y : buildingCenter(targetBuilding!).y;
  const reach = stats.range + (targetBuilding ? Math.max(targetBuilding.w, targetBuilding.h) / 2 : 0.3);
  const d2 = distSq(u.x, u.y, tx, ty);

  if (d2 > reach * reach) {
    if (d2 > CHASE_GIVEUP * CHASE_GIVEUP && targetUnit) {
      u.targetId = 0;
      u.state = 'attackMove';
      return;
    }
    u.destX = tx;
    u.destY = ty;
    u.windup = 0;
    return; // movement가 추격
  }
  // 사거리 내 — 정지 사격
  u.destX = u.x;
  u.destY = u.y;
  if (u.attackCooldown > 0) return;
  if (u.windup === 0) {
    u.windup = stats.windup;
    return;
  }
  u.windup--;
  if (u.windup > 0) return;
  u.attackCooldown = stats.attackCooldown;
  dealAttack(state, u, targetUnit, targetBuilding);
}

function dealAttack(state: GameState, u: Unit, targetUnit?: Unit, targetBuilding?: Building): void {
  const stats = UNIT_STATS[u.role];
  const p = state.players[u.player];
  const dmg = stats.damage + (p.upgrades['weapon'] ?? 0) * WEAPON_DMG_PER_LV;
  if (targetUnit) {
    damageUnit(state, u, targetUnit, dmg);
    if (stats.splash > 0) splashAround(state, u, targetUnit.x, targetUnit.y, stats.splash, dmg, targetUnit.id);
  } else if (targetBuilding) {
    damageBuilding(state, targetBuilding, dmg * stats.bonusVsBuilding);
  }
}

function splashAround(state: GameState, u: Unit, x: number, y: number, radius: number, dmg: number, excludeId: number): void {
  const scratch: Unit[] = [];
  state.grid.query(x, y, radius, scratch);
  for (const n of scratch) {
    if (n.id === excludeId || n.state === 'dead' || effectivePlayer(n) === effectivePlayer(u)) continue;
    damageUnit(state, u, n, Math.floor(dmg * 0.6));
  }
}

export function damageUnit(state: GameState, attacker: Unit | null, target: Unit, raw: number): void {
  const tStats = UNIT_STATS[target.role];
  const tp = state.players[target.player];
  const armor = tStats.armor + (tp.upgrades['armor'] ?? 0) * ARMOR_PER_LV;
  let dmg = Math.max(1, raw - armor);
  for (const b of target.buffs) if (b.kind === 'protect') dmg = Math.max(1, Math.floor(dmg * (1 - b.power)));
  // 실드 우선 흡수 (초능력자 패시브)
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, dmg);
    target.shield -= absorbed;
    dmg -= absorbed;
  }
  target.hp -= dmg;
  target.outOfCombatTicks = 0;
  if (attacker) {
    attacker.outOfCombatTicks = 0;
    state.counters.engagements++;
    // 마계 정예 흡혈 (§2.2 — Phase 3에서 데이터화)
    if (attacker.faction === 'demon' && attacker.role === 'elite') {
      attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.floor(dmg * 0.3));
    }
  }
  if (target.hp <= 0) killUnit(state, target);
}

export function damageBuilding(state: GameState, b: Building, dmg: number): void {
  b.hp -= Math.max(1, dmg);
  if (b.hp <= 0) {
    b.hp = 0;
    destroyBuilding(state, b);
  }
}

export function killUnit(state: GameState, u: Unit): void {
  if (u.state === 'dead') return;
  // 천계 불사: 사망 시 1회 부활 (게임당 1회, §2.2 규칙 ⑥)
  if (u.faction === 'celestial' && u.role === 'elite' && !u.usedRevive) {
    u.usedRevive = true;
    u.hp = Math.floor(u.maxHp * 0.5);
    return;
  }
  u.state = 'dead';
  u.hp = 0;
  const p = state.players[u.player];
  if (u.isSummoned) {
    p.summonCount = Math.max(0, p.summonCount - 1);
  } else {
    p.supply = Math.max(0, p.supply - UNIT_STATS[u.role].supply);
    // 마계 패시브: 골드 생산 유닛만 30% 환급 (소환수·매혹 제외, §2.2 규칙 ⑤)
    if (u.faction === 'demon' && u.charmOwner < 0) {
      p.gold += Math.floor(UNIT_STATS[u.role].cost.gold * 0.3);
    }
  }
}

function towerTick(state: GameState): void {
  const scratch: Unit[] = [];
  for (const b of state.buildings) {
    if (b.kind !== 'tower' || b.hp <= 0 || b.buildProgress < 1) continue;
    const atk = BUILDING_STATS.tower.attack!;
    if (b.attackCooldown > 0) {
      b.attackCooldown--;
      continue;
    }
    const c = buildingCenter(b);
    state.grid.query(c.x, c.y, atk.range, scratch);
    let best: Unit | null = null;
    let bestD = Infinity;
    for (const n of scratch) {
      if (n.state === 'dead' || effectivePlayer(n) === b.player) continue;
      const d = distSq(c.x, c.y, n.x, n.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (best) {
      b.attackCooldown = atk.cooldown;
      damageUnit(state, null, best, atk.damage);
    }
  }
}

/** 쿨다운/버프/매혹/재생 등 시간 진행 */
export function statusTick(state: GameState): void {
  for (const u of state.units) {
    if (u.state === 'dead') continue;
    if (u.attackCooldown > 0) u.attackCooldown--;
    u.outOfCombatTicks++;
    for (const key of Object.keys(u.spellCooldowns)) {
      if (u.spellCooldowns[key] > 0) u.spellCooldowns[key]--;
    }
    u.buffs = u.buffs.filter((b) => --b.ticks > 0);
    tickPassiveRegen(u);
    tickCharm(u);
  }
}

function tickPassiveRegen(u: Unit): void {
  if (u.outOfCombatTicks < 60) return; // 3초 비전투
  if (u.faction === 'psion') {
    const cap = Math.floor(u.maxHp * 0.15);
    if (u.shield < cap && u.outOfCombatTicks % 10 === 0) u.shield++;
  } else if (u.faction === 'celestial') {
    if (u.hp < u.maxHp && u.outOfCombatTicks % 20 === 0) u.hp++;
  }
}

function tickCharm(u: Unit): void {
  if (u.charmOwner < 0) return;
  u.charmTicks--;
  if (u.charmTicks <= 0) {
    u.charmOwner = -1;
    u.targetId = 0;
    u.state = 'idle';
  }
}
