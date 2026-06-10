// Phase 1 PoC 스파이크 게이트 (플랜 §3) — 통과 전 본 구현 진행 금지
// ① 일꾼 12기 금광 채집 루프 정상 (경제 마비 없음)
// ② 유닛 80기 초크 통과 교착 0
import { describe, expect, it } from 'vitest';
import { buildTestMap } from '../src/data/maps';
import { createGame, step, checkInvariants } from '../src/core/game';
import { spawnUnit } from '../src/core/state';
import type { Command } from '../src/core/types';

const MAP = buildTestMap();

describe('PoC ① 일꾼 12기 채집 (분리 제외 레이어 검증)', () => {
  it('금광 1개에 일꾼 12기 → 골드 지속 증가, 정지 구간 없음', () => {
    const state = createGame({ mapAscii: MAP, seed: 7, factions: ['dummy', 'dummy'] });
    const mine = state.mines[0];
    // 기존 5기 + 추가 7기 = 12기 전부 같은 금광에
    for (let i = 0; i < 7; i++) {
      const u = spawnUnit(state, 0, 'worker', 8 + (i % 3), 7 + Math.floor(i / 3));
      u.harvestTargetId = mine.id;
      u.state = 'harvesting';
    }
    const samples: number[] = [];
    for (let w = 0; w < 10; w++) {
      for (let t = 0; t < 300; t++) step(state, []);
      samples.push(state.players[0].gold);
    }
    // 모든 300틱 윈도우에서 골드 증가 (채집 교착 = 어딘가 정체)
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i], `윈도우 ${i}에서 골드 정체`).toBeGreaterThan(samples[i - 1]);
    }
    expect(checkInvariants(state).length).toBe(0);
  });
});

describe('PoC ② 80기 초크 통과 (교착 0)', () => {
  it('좌측 80기 → 우측 attackMove, 초크(폭4) 통과율 95%+', () => {
    const state = createGame({ mapAscii: MAP, seed: 11, factions: ['dummy', 'dummy'] });
    const ids: number[] = [];
    // 좌측 영역에 80기 밀집 스폰 (10x8 블록)
    for (let i = 0; i < 80; i++) {
      const u = spawnUnit(state, 0, 'melee', 8 + (i % 10) * 0.9, 12 + Math.floor(i / 10) * 0.9);
      ids.push(u.id);
    }
    const cmds: Command[] = [{ type: 'attackMove', player: 0, unitIds: ids, x: 40, y: 16 }];
    step(state, cmds);
    // 초크 갭(x=23~24, y=14~17) 통과에 충분한 시간
    for (let t = 0; t < 4000; t++) step(state, []);
    const crossed = state.units.filter((u) => ids.includes(u.id) && u.x > 26).length;
    expect(crossed / ids.length, `통과율 ${crossed}/${ids.length}`).toBeGreaterThanOrEqual(0.95);
    expect(checkInvariants(state).length).toBe(0);
  });
});

describe('PoC ③ 최소 건틀릿 (유닛 충돌 → 게임 종료 도달)', () => {
  it('비대칭 군대 본진 공격 → 승자 판정까지 완주', () => {
    const state = createGame({ mapAscii: MAP, seed: 23, factions: ['dummy', 'dummy'] });
    const ids0: number[] = [];
    const ids1: number[] = [];
    for (let i = 0; i < 25; i++) ids0.push(spawnUnit(state, 0, 'melee', 10 + (i % 5), 14 + Math.floor(i / 5)).id);
    for (let i = 0; i < 12; i++) ids1.push(spawnUnit(state, 1, 'melee', 36 + (i % 4), 16 + Math.floor(i / 4)).id);
    step(state, [
      { type: 'attackMove', player: 0, unitIds: ids0, x: 41, y: 26 },
      { type: 'attackMove', player: 1, unitIds: ids1, x: 6, y: 5 },
    ]);
    let ticks = 0;
    while (state.winner === -1 && ticks < 20000) {
      step(state, []);
      ticks++;
    }
    expect(state.winner, `winner=${state.winner} (${ticks}틱)`).toBe(0);
  }, 30000);
});
