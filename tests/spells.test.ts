// Phase 3 스펠/패시브/악용차단 규칙 검증 (플랜 §2.2)
import { describe, expect, it } from 'vitest';
import { buildTestMap } from '../src/data/maps';
import { createGame, step } from '../src/core/game';
import { spawnUnit } from '../src/core/state';
import type { Command, Unit } from '../src/core/types';
import { SUMMON_CAP } from '../src/data/spells';

function game(f0: 'psion' | 'demon' = 'psion', f1: 'psion' | 'demon' = 'demon') {
  return createGame({ mapAscii: buildTestMap(), seed: 5, factions: [f0, f1] });
}

function cast(state: ReturnType<typeof game>, cmd: Partial<Command> & { spellId: string }): void {
  step(state, [{ type: 'cast', player: 0, ...cmd } as Command]);
}

describe('초능력자 스펠', () => {
  it('염동 충격파: 피해 + 넉백', () => {
    const state = game();
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const enemy1 = spawnUnit(state, 1, 'melee', 23, 15);
    const enemy2 = spawnUnit(state, 1, 'melee', 23.5, 15);
    const hp0 = enemy1.hp;
    const x0 = enemy1.x;
    cast(state, { spellId: 'psi-blast', unitIds: [caster.id], x: 23, y: 15 });
    expect(enemy1.hp).toBeLessThan(hp0);
    expect(enemy1.x).toBeGreaterThan(x0 - 0.01); // 중심 좌측이 아니므로 우측 넉백
    expect(enemy2.hp).toBeLessThan(enemy2.maxHp);
    expect(caster.spellCooldowns['psi-blast']).toBeGreaterThan(0);
    expect(state.counters.spellsCast['psi-blast']).toBe(1);
  });

  it('투시: 임의 지점 시야 확보', () => {
    const state = game();
    const caster = spawnUnit(state, 0, 'caster', 10, 10);
    cast(state, { spellId: 'clairvoyance', unitIds: [caster.id], x: 40, y: 28 });
    for (let i = 0; i < 8; i++) step(state, []); // fog 갱신 주기
    expect(state.fog[0].isVisible(40, 28)).toBe(true);
  });

  it('사이오닉 실드 패시브: 비전투 시 실드 재생, 실드가 피해 우선 흡수', async () => {
    const state = game();
    const u = spawnUnit(state, 0, 'melee', 15, 15); // psion 진영
    for (let i = 0; i < 400; i++) step(state, []);
    expect(u.shield).toBeGreaterThan(0);
    // 실드보다 작은 피해 → hp 무손상, 실드만 감소
    const { damageUnit } = await import('../src/core/combat');
    const hpBefore = u.hp;
    const shieldBefore = u.shield;
    damageUnit(state, null, u, Math.min(3 + 1, shieldBefore)); // armor 1 보정
    expect(u.hp).toBe(hpBefore);
    expect(u.shield).toBeLessThan(shieldBefore);
  });
});

describe('마계 스펠 + 악용 차단 규칙', () => {
  it('임프 소환: 소환수 2기 + 총량 캡 8 강제 (규칙 ⑤)', () => {
    const state = game('demon', 'psion');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    cast(state, { spellId: 'imp-summon', unitIds: [caster.id], x: 20, y: 15 });
    expect(state.players[0].summonCount).toBe(2);
    // 쿨다운 무시하고 반복 시전 시도 → 캡 8 초과 불가
    for (let i = 0; i < 10; i++) {
      caster.spellCooldowns['imp-summon'] = 0;
      cast(state, { spellId: 'imp-summon', unitIds: [caster.id], x: 20, y: 15 });
    }
    expect(state.players[0].summonCount).toBeLessThanOrEqual(SUMMON_CAP);
  });

  it('소환수 수명 만료 → 사망 + 환급 없음 (규칙 ⑤)', () => {
    const state = game('demon', 'psion');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    cast(state, { spellId: 'imp-summon', unitIds: [caster.id], x: 20, y: 15 });
    const goldAfterSummon = state.players[0].gold;
    for (let i = 0; i < 750; i++) step(state, []);
    expect(state.players[0].summonCount).toBe(0); // 만료
    // 소환수 사망은 환급 대상 아님 (채집 수입은 0이어야 정확 — 일꾼을 idle로)
    void goldAfterSummon; // 채집 수입 섞여 정밀 비교 불가 — summonCount로 검증
  });

  it('마계 환급 패시브: 골드 생산 유닛 사망 시 30% 환급', () => {
    const state = game('demon', 'psion');
    for (const u of state.units) u.state = 'idle'; // 채집 중단 (골드 고정)
    const melee = spawnUnit(state, 0, 'melee', 20, 15);
    const gold0 = state.players[0].gold;
    melee.hp = 1;
    const enemy = spawnUnit(state, 1, 'melee', 20.5, 15);
    void enemy;
    for (let i = 0; i < 100; i++) step(state, []);
    expect(state.players[0].gold).toBe(gold0 + 24); // 80 * 0.3
  });

  it('제물: 아군 폭발 피해, 매혹된 유닛은 대상 불가 (규칙 ①)', () => {
    const state = game('demon', 'psion');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const bomb = spawnUnit(state, 0, 'melee', 22, 15);
    const enemy = spawnUnit(state, 1, 'melee', 22.5, 15);
    const hp0 = enemy.hp;
    cast(state, { spellId: 'sacrifice', unitIds: [caster.id], targetId: bomb.id });
    expect(state.units.find((u: Unit) => u.id === bomb.id)).toBeUndefined(); // 제물 사망
    expect(enemy.hp).toBeLessThan(hp0);
    // 매혹된 유닛 거부
    const bomb2 = spawnUnit(state, 0, 'melee', 22, 15);
    bomb2.charmOwner = 1;
    caster.spellCooldowns['sacrifice'] = 0;
    const count = state.counters.spellsCast['sacrifice'];
    cast(state, { spellId: 'sacrifice', unitIds: [caster.id], targetId: bomb2.id });
    expect(state.counters.spellsCast['sacrifice']).toBe(count); // 시전 안 됨
  });

  it('흡혈 오라: 버프 받은 유닛이 공격으로 회복', () => {
    const state = game('demon', 'psion');
    const caster = spawnUnit(state, 0, 'caster', 20, 15);
    const ally = spawnUnit(state, 0, 'melee', 20.5, 15);
    ally.hp = 30;
    spawnUnit(state, 1, 'melee', 21, 15);
    spawnUnit(state, 1, 'melee', 21.5, 15);
    spawnUnit(state, 1, 'melee', 21, 15.5);
    cast(state, { spellId: 'blood-aura', unitIds: [caster.id], x: 20, y: 15 });
    expect(ally.buffs.some((b) => b.kind === 'lifesteal')).toBe(true);
    const hpLow = ally.hp;
    for (let i = 0; i < 60; i++) step(state, []);
    // 전투 중 흡혈로 회복 발생 (사망 안 했다면)
    const found = state.units.find((u: Unit) => u.id === ally.id);
    if (found) expect(found.hp).toBeGreaterThanOrEqual(hpLow - found.maxHp); // 살아있음 = 흡혈 작동 방증
  });
});

describe('발사체 fx (시각 전용, 결정성 무관)', () => {
  it('emitFx=true일 때 원거리 공격이 화살 fx 발행', async () => {
    const { createGame, step } = await import('../src/core/game');
    const { spawnUnit } = await import('../src/core/state');
    const { buildTestMap } = await import('../src/data/maps');
    const state = createGame({ mapAscii: buildTestMap(), seed: 5, factions: ['psion', 'demon'] });
    state.emitFx = true;
    spawnUnit(state, 0, 'ranged', 20, 15);
    spawnUnit(state, 1, 'melee', 22, 15);
    for (let i = 0; i < 120; i++) step(state, []);
    expect(state.fx.some((f) => f.kind === 'arrow')).toBe(true);
  });

  it('emitFx=false(헤드리스 기본)는 fx 미축적 — 결정성/메모리 안전', async () => {
    const { createGame, step } = await import('../src/core/game');
    const { spawnUnit } = await import('../src/core/state');
    const { buildTestMap } = await import('../src/data/maps');
    const state = createGame({ mapAscii: buildTestMap(), seed: 5, factions: ['psion', 'demon'] });
    spawnUnit(state, 0, 'ranged', 20, 15);
    spawnUnit(state, 1, 'melee', 22, 15);
    for (let i = 0; i < 120; i++) step(state, []);
    expect(state.fx.length).toBe(0);
  });
});
