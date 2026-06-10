// 전투 — 타겟 획득(최근접+id tie-break)/추격/윈드업/데미지/스플래시/사망 (플랜 §2)

import type { GameState } from './state';
import { buildingCenter, findBuilding, findUnit } from './state';
import type { Building, Unit } from './types';
import { ARMOR_PER_LV, BUILDING_STATS, UNIT_STATS, WEAPON_DMG_PER_LV } from '../data/baseline';
import { destroyBuilding } from './building';
import { defenseBounty } from './defense';
import { dirTo, distSq } from './vec';
import { passable } from './map';

const CHASE_GIVEUP = 9; // 추격 포기 거리 (타일)

/** 같은 틱의 모든 공격을 수집 후 일괄 적용 — id 순서 선공 편향 제거 (동시 해소) */
interface QueuedAttack {
  attacker: Unit | null;
  targetUnit?: Unit;
  targetBuilding?: Building;
  /** 타워 등 고정 데미지 (dealAttack 미경유) */
  flatDamage?: number;
}

/** 틱 홀짝으로 순회 방향 교차 — id 오름차순 고정 처리의 P0(낮은 id) 선행 우위 상쇄 */
export function fairOrder(state: GameState): Unit[] {
  return state.tick % 2 === 0 ? state.units : [...state.units].reverse();
}

export function combatTick(state: GameState): void {
  const scratch: Unit[] = [];
  const attacks: QueuedAttack[] = [];
  for (const u of fairOrder(state)) {
    if (u.state === 'dead' || u.role === 'worker') {
      if (u.role === 'worker' && u.state === 'attacking') tickAttack(state, u, attacks); // 일꾼 강제 공격 명령 시
      continue;
    }
    if (u.state === 'attacking') tickAttack(state, u, attacks);
    else if (u.state === 'attackMove' || u.state === 'idle') tryAcquire(state, u, scratch);
  }
  towerTick(state, attacks);
  // 일괄 적용: 양측이 같은 틱에 서로를 죽일 수 있음 (상호 동시 처치 = 공정)
  for (const a of attacks) {
    if (a.flatDamage !== undefined && a.targetUnit) damageUnit(state, null, a.targetUnit, a.flatDamage);
    else if (a.attacker) dealAttack(state, a.attacker, a.targetUnit, a.targetBuilding);
  }
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
  const me = effectivePlayer(u);
  for (const n of scratch) {
    if (n.state === 'dead' || effectivePlayer(n) === me) continue;
    if (!isTargetable(state, n, me)) continue;
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

export function hasBuff(u: Unit, kind: string): boolean {
  for (const b of u.buffs) if (b.kind === kind) return true;
  return false;
}

export function buffPower(u: Unit, kind: string): number {
  let p = 0;
  for (const b of u.buffs) if (b.kind === kind) p = Math.max(p, b.power);
  return p;
}

export function isStunned(u: Unit): boolean {
  return hasBuff(u, 'stun');
}

function isDead(u: Unit): boolean {
  return u.state === 'dead';
}

/** 은신/둔갑 유닛은 적 디텍터(완성된 방어탑 시야 내)가 없으면 타겟 불가 (§2.1 디텍터) */
export function isTargetable(state: GameState, target: Unit, byPlayer: number): boolean {
  if (!hasBuff(target, 'stealth') && !hasBuff(target, 'disguise')) return true;
  const detectRange = BUILDING_STATS.tower.vision;
  for (const b of state.buildings) {
    if (b.player !== byPlayer || b.kind !== 'tower' || b.hp <= 0 || b.buildProgress < 1) continue;
    const c = buildingCenter(b);
    if (distSq(target.x, target.y, c.x, c.y) <= detectRange * detectRange) return true;
  }
  return false;
}

function tickAttack(state: GameState, u: Unit, attacks: QueuedAttack[]): void {
  if (isStunned(u)) {
    u.windup = 0;
    return;
  }
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
    // 초능력자 정예: 점멸 추격 (§2.2 정예 능력)
    if (u.faction === 'psion' && u.role === 'elite' && (u.spellCooldowns['blink'] ?? 0) === 0 && d2 > 6) {
      const d = dirTo(tx, ty, u.x, u.y);
      const bx = tx + d.x * 1.0;
      const by = ty + d.y * 1.0;
      if (passable(state.map, Math.floor(bx), Math.floor(by), 'ground')) {
        u.x = bx;
        u.y = by;
        u.spellCooldowns['blink'] = 240;
        state.counters.spellsCast['blink'] = (state.counters.spellsCast['blink'] ?? 0) + 1;
      }
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
  const frenzy = buffPower(u, 'frenzy');
  u.attackCooldown = Math.max(4, Math.floor(stats.attackCooldown / (1 + frenzy)));
  attacks.push({ attacker: u, targetUnit, targetBuilding }); // 일괄 적용 큐 (동시 해소)
}

function dealAttack(state: GameState, u: Unit, targetUnit?: Unit, targetBuilding?: Building): void {
  const stats = UNIT_STATS[u.role];
  const p = state.players[u.player];
  // 공격 시 은신/둔갑 해제
  u.buffs = u.buffs.filter((b) => b.kind !== 'stealth' && b.kind !== 'disguise');
  let dmg = stats.damage + (p.upgrades['weapon'] ?? 0) * WEAPON_DMG_PER_LV;
  const bless = buffPower(u, 'blessing');
  if (bless > 0) dmg = Math.floor(dmg * (1 + bless));
  if (targetUnit) {
    damageUnit(state, u, targetUnit, dmg);
    if (stats.splash > 0) splashAround(state, u, targetUnit.x, targetUnit.y, stats.splash, dmg, targetUnit.id);
    // 무림 정예: 검기 스플래시 (§2.2 정예 능력)
    if (u.faction === 'murim' && u.role === 'elite') {
      splashAround(state, u, targetUnit.x, targetUnit.y, 1.1, Math.floor(dmg * 0.5), targetUnit.id);
      state.counters.spellsCast['sword-wave'] = (state.counters.spellsCast['sword-wave'] ?? 0) + 1;
    }
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
  if (target.state === 'dead') return; // 같은 틱 중복 처치 가드
  const tStats = UNIT_STATS[target.role];
  const tp = state.players[target.player];
  const armor = tStats.armor + (tp.upgrades['armor'] ?? 0) * ARMOR_PER_LV;
  let dmg = Math.max(1, raw - armor);
  // 피해감소는 최대 1개만 적용 (악용 차단 규칙 ② — 가호+보호막 비중첩)
  const protect = buffPower(target, 'protect');
  if (protect > 0) dmg = Math.max(1, Math.floor(dmg * (1 - protect)));
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
    // 흡혈: 마계 정예 패시브 30% + 흡혈 오라 버프
    let steal = attacker.faction === 'demon' && attacker.role === 'elite' ? 0.3 : 0;
    for (const b of attacker.buffs) if (b.kind === 'lifesteal') steal = Math.max(steal, b.power);
    if (steal > 0) attacker.hp = Math.min(attacker.maxHp, attacker.hp + Math.floor(dmg * steal));
  }
  if (target.hp <= 0) {
    killUnit(state, target);
    // 요괴 정예: 구미호 폭주 — 처치 시 이속/공속 버스트 (§2.2 정예 능력)
    if (attacker && isDead(target) && attacker.faction === 'yokai' && attacker.role === 'elite') {
      attacker.buffs.push({ kind: 'haste', ticks: 100, power: 0.4 });
      attacker.buffs.push({ kind: 'frenzy', ticks: 100, power: 0.5 });
      state.counters.spellsCast['fox-frenzy'] = (state.counters.spellsCast['fox-frenzy'] ?? 0) + 1;
    }
  }
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
    state.counters.spellsCast['undying'] = (state.counters.spellsCast['undying'] ?? 0) + 1;
    return;
  }
  u.state = 'dead';
  u.hp = 0;
  defenseBounty(state, u); // 디펜스 모드 처치 현상금
  const p = state.players[u.player];
  if (u.isSummoned) {
    p.summonCount = Math.max(0, p.summonCount - 1);
  } else {
    p.supply = Math.max(0, p.supply - UNIT_STATS[u.role].supply);
    // 마계 패시브: 골드 생산 유닛만 30% 환급 (소환수·매혹 제외, §2.2 규칙 ⑤)
    if (u.faction === 'demon' && u.charmOwner < 0) {
      p.gold += Math.floor(UNIT_STATS[u.role].cost.gold * 0.3);
    }
    // 부활 스펠 기록 (비정예만 — 규칙 ⑥)
    if (u.role !== 'elite') {
      state.recentDeaths.push({ player: u.player, role: u.role, tick: state.tick });
      if (state.recentDeaths.length > 12) state.recentDeaths.shift();
    }
  }
}

function towerTick(state: GameState, attacks: QueuedAttack[]): void {
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
      // 타워 = 디텍터: 은신도 직접 공격 가능 (§2.1)
      const d = distSq(c.x, c.y, n.x, n.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    if (best) {
      b.attackCooldown = atk.cooldown;
      attacks.push({ attacker: null, targetUnit: best, flatDamage: atk.damage });
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
    // 수명 만료(소환수) → 사망
    let expired = false;
    for (const b of u.buffs) {
      if (b.kind === 'expire' && b.ticks <= 1) {
        killUnit(state, u);
        expired = true;
        break;
      }
    }
    if (expired) continue;
    u.buffs = u.buffs.filter((b) => --b.ticks > 0);
    tickPassiveRegen(u);
    tickCharm(u);
  }
}

function tickPassiveRegen(u: Unit): void {
  // 판타지 정예: HP 50% 이하 자동 신성 보호막 (§2.2 정예 능력, 규칙 ② 비중첩 적용됨)
  if (u.faction === 'fantasy' && u.role === 'elite' && u.hp < u.maxHp * 0.5 && !hasBuff(u, 'protect')) {
    u.buffs.push({ kind: 'protect', ticks: 60, power: 0.5 });
  }
  if (u.outOfCombatTicks < 80) return; // 4초 비전투
  if (u.faction === 'psion') {
    const cap = Math.floor(u.maxHp * 0.1); // 밸런스: 건틀릿 66.7% → 너프 (15%→10%)
    if (u.shield < cap && u.outOfCombatTicks % 12 === 0) u.shield++;
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
