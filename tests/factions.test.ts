// Phase 4: 4종족 스펠/패시브/정예 능력 검증
import { describe, expect, it } from 'vitest';
import { buildTestMap } from '../src/data/maps';
import { createGame, step } from '../src/core/game';
import { spawnUnit, addBuilding } from '../src/core/state';
import { occupyRect } from '../src/core/map';
import { damageUnit, isTargetable, killUnit } from '../src/core/combat';
import { unitSpeed } from '../src/core/movement';
import type { Command, FactionId } from '../src/core/types';

function game(f0: FactionId, f1: FactionId = 'fantasy') {
  return createGame({ mapAscii: buildTestMap(), seed: 9, factions: [f0, f1] });
}

function cast(state: ReturnType<typeof game>, cmd: Partial<Command> & { spellId: string }): void {
  step(state, [{ type: 'cast', player: 0, ...cmd } as Command]);
}

describe('무림', () => {
  it('패시브: 이속 +8%', () => {
    const state = game('murim');
    const u = spawnUnit(state, 0, 'melee', 15, 15);
    const base = game('dummy' as FactionId, 'dummy' as FactionId);
    const d = spawnUnit(base, 0, 'melee', 15, 15);
    expect(unitSpeed(u)).toBeCloseTo(unitSpeed(d) * 1.08, 5);
  });

  it('점혈: 대상 스턴 → 이동/공격 불가', () => {
    const state = game('murim');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const enemy = spawnUnit(state, 1, 'melee', 22, 15);
    cast(state, { spellId: 'pressure-point', unitIds: [caster.id], targetId: enemy.id });
    expect(enemy.buffs.some((b) => b.kind === 'stun')).toBe(true);
    const x0 = enemy.x;
    step(state, [{ type: 'move', player: 1, unitIds: [enemy.id], x: 30, y: 15 }]);
    for (let i = 0; i < 20; i++) step(state, []);
    expect(Math.abs(enemy.x - x0)).toBeLessThan(0.05); // 스턴 중 이동 불가
  });

  it('기공파: 직선상 적들 피해', () => {
    const state = game('murim');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const e1 = spawnUnit(state, 1, 'melee', 22, 15);
    const e2 = spawnUnit(state, 1, 'melee', 24, 15);
    const off = spawnUnit(state, 1, 'melee', 22, 18); // 선 밖
    cast(state, { spellId: 'ki-wave', unitIds: [caster.id], x: 25, y: 15 });
    expect(e1.hp).toBeLessThan(e1.maxHp);
    expect(e2.hp).toBeLessThan(e2.maxHp);
    expect(off.hp).toBe(off.maxHp);
  });
});

describe('판타지', () => {
  it('패시브: 건물 HP +20%', () => {
    const state = game('fantasy', 'murim');
    const b = addBuilding(state, 0, 'barracks', 14, 8, true);
    expect(b.maxHp).toBe(Math.floor(800 * 1.2));
  });

  it('치유: 아군 회복', () => {
    const state = game('fantasy', 'murim');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const ally = spawnUnit(state, 0, 'melee', 21, 15);
    ally.hp = 20;
    cast(state, { spellId: 'heal', unitIds: [caster.id], targetId: ally.id });
    expect(ally.hp).toBe(48); // 20 + 28
  });

  it('가호+신성보호막 비중첩: 최대 1개만 적용 (규칙 ②)', () => {
    const state = game('fantasy', 'murim');
    const u = spawnUnit(state, 0, 'melee', 15, 15);
    u.buffs.push({ kind: 'protect', ticks: 100, power: 0.3 });
    u.buffs.push({ kind: 'protect', ticks: 100, power: 0.5 });
    const hp0 = u.hp;
    damageUnit(state, null, u, 21); // armor 1 → 20, 최대 보호 50%만 → 10
    expect(hp0 - u.hp).toBe(10);
  });
});

describe('요괴', () => {
  it('매혹: 적 유닛 일시 조종 + 시간 종료 시 복귀 (규칙 ①)', () => {
    const state = game('yokai', 'fantasy');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const enemy = spawnUnit(state, 1, 'cavalry', 22, 15);
    cast(state, { spellId: 'charm', unitIds: [caster.id], targetId: enemy.id });
    expect(enemy.charmOwner).toBe(0);
    for (let i = 0; i < 210; i++) step(state, []);
    expect(enemy.charmOwner).toBe(-1); // 복귀
  });

  it('그림자 은신: 디텍터 없으면 타겟 불가, 방어탑 근처면 가능', () => {
    const state = game('yokai', 'fantasy');
    const u = spawnUnit(state, 0, 'melee', 20, 15);
    u.buffs.push({ kind: 'stealth', ticks: 500, power: 0 });
    expect(isTargetable(state, u, 1)).toBe(false);
    const tower = addBuilding(state, 1, 'tower', 21, 14, true);
    occupyRect(state.map, tower.id, 21, 14, 2, 2);
    expect(isTargetable(state, u, 1)).toBe(true);
  });

  it('숲 통과 이동 (패시브)', async () => {
    const state = game('yokai', 'fantasy');
    const { passClassOf } = await import('../src/core/movement');
    const u = spawnUnit(state, 0, 'melee', 5, 22);
    expect(passClassOf(u)).toBe('forest');
  });
});

describe('천계', () => {
  it('부활: 최근 사망 비정예 1기 소생', () => {
    const state = game('celestial', 'murim');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const soldier = spawnUnit(state, 0, 'melee', 21, 15);
    killUnit(state, soldier);
    const count0 = state.units.filter((u) => u.player === 0 && u.role === 'melee' && u.state !== 'dead').length;
    cast(state, { spellId: 'revive', unitIds: [caster.id] });
    const count1 = state.units.filter((u) => u.player === 0 && u.role === 'melee' && u.state !== 'dead').length;
    expect(count1).toBe(count0 + 1);
  });

  it('정예 불사: 사망 시 1회 부활, 2회째는 사망 (규칙 ⑥)', () => {
    const state = game('celestial', 'murim');
    const elite = spawnUnit(state, 0, 'elite', 20, 15);
    elite.hp = 1;
    damageUnit(state, null, elite, 100);
    expect(elite.state).not.toBe('dead'); // 1회 부활
    expect(elite.hp).toBeGreaterThan(0);
    elite.hp = 1;
    damageUnit(state, null, elite, 100);
    expect(elite.state).toBe('dead'); // 2회째 사망
  });

  it('부활 스펠은 정예 미대상 (규칙 ⑥): 정예 사망은 기록 안 됨', () => {
    const state = game('celestial', 'murim');
    const elite = spawnUnit(state, 0, 'elite', 20, 15);
    elite.usedRevive = true;
    killUnit(state, elite);
    expect(state.recentDeaths.some((d) => d.player === 0)).toBe(false);
  });
});
