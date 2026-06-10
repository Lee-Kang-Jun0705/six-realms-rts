// Phase 1 코어 검증 — 맵/경로/경제/건설/생산/전투/승패/결정성
import { describe, expect, it } from 'vitest';
import { buildTestMap } from '../src/data/maps';
import { parseMap, passable, T_FOREST, T_ROCK, tileIndex } from '../src/core/map';
import { computeFlowField } from '../src/core/pathfind/flowfield';
import { createGame, step, hashState, checkInvariants } from '../src/core/game';
import { spawnUnit, addBuilding, findBuilding } from '../src/core/state';
import { occupyRect } from '../src/core/map';
import type { Command } from '../src/core/types';

const MAP = buildTestMap();

function freshGame(seed = 42) {
  return createGame({ mapAscii: MAP, seed, factions: ['dummy', 'dummy'] });
}

function run(state: ReturnType<typeof createGame>, ticks: number, cmds: Command[] = []) {
  for (let i = 0; i < ticks; i++) step(state, i === 0 ? cmds : []);
}

describe('맵 파싱', () => {
  it('크기/시작점/금광/지형 파싱', () => {
    const map = parseMap(MAP);
    expect(map.width).toBe(48);
    expect(map.height).toBe(32);
    expect(map.starts[0]).toEqual({ x: 6, y: 5 });
    expect(map.starts[1]).toEqual({ x: 41, y: 26 });
    expect(map.mineSpots.length).toBe(2);
    expect(map.terrain[tileIndex(map, 23, 5)]).toBe(T_ROCK);
    expect(map.terrain[tileIndex(map, 5, 22)]).toBe(T_FOREST);
    expect(passable(map, 5, 22, 'ground')).toBe(false); // 숲은 지상 통행 불가
    expect(passable(map, 5, 22, 'forest')).toBe(true); // 요괴는 통과
  });
});

describe('Flow Field', () => {
  it('초크 너머 도달 가능 + 벽 내부 도달 불가', () => {
    const map = parseMap(MAP);
    const field = computeFlowField(map, 41, 26, 'ground');
    expect(field.dist[tileIndex(map, 6, 5)]).toBeGreaterThan(0); // 좌상단에서 도달 가능
    expect(field.dist[tileIndex(map, 23, 5)]).toBe(-1); // 바위 내부 불가
  });
});

describe('경제 (일꾼 자동 채집)', () => {
  it('2000틱 후 양 진영 골드 증가 + 불변식 0', () => {
    const state = freshGame();
    const g0 = state.players[0].gold;
    let violations = 0;
    for (let i = 0; i < 2000; i++) {
      step(state, []);
      violations += checkInvariants(state).length;
    }
    expect(violations).toBe(0);
    expect(state.players[0].gold).toBeGreaterThan(g0 + 100);
    expect(state.players[1].gold).toBeGreaterThan(g0 + 100);
  });
});

describe('건설/생산', () => {
  it('농장 건설 → 보급 +4', () => {
    const state = freshGame();
    const cap0 = state.players[0].supplyCap;
    const workerId = state.units.find((u) => u.player === 0)!.id;
    run(state, 1, [{ type: 'build', player: 0, unitIds: [workerId], buildingKind: 'farm', x: 12, y: 8 }]);
    run(state, 800);
    expect(state.players[0].supplyCap).toBe(cap0 + 4);
  });

  it('본진에서 일꾼 훈련 → 유닛 증가, 자원 차감', () => {
    const state = freshGame();
    const hq = state.buildings.find((b) => b.player === 0)!;
    const units0 = state.units.filter((u) => u.player === 0).length;
    const gold0 = state.players[0].gold;
    run(state, 1, [{ type: 'train', player: 0, buildingId: hq.id, unitRole: 'worker' }]);
    expect(state.players[0].gold).toBe(gold0 - 50);
    run(state, 200);
    expect(state.units.filter((u) => u.player === 0).length).toBe(units0 + 1);
  });
});

describe('전투/승패', () => {
  it('근접 10 vs 5 → 다수 승리 + 교전 카운터 증가', () => {
    const state = freshGame();
    for (let i = 0; i < 10; i++) spawnUnit(state, 0, 'melee', 20, 14 + (i % 4));
    for (let i = 0; i < 5; i++) spawnUnit(state, 1, 'melee', 28, 14 + (i % 4));
    const ids0 = state.units.filter((u) => u.player === 0 && u.role === 'melee').map((u) => u.id);
    const ids1 = state.units.filter((u) => u.player === 1 && u.role === 'melee').map((u) => u.id);
    run(state, 1, [
      { type: 'attackMove', player: 0, unitIds: ids0, x: 28, y: 15 },
      { type: 'attackMove', player: 1, unitIds: ids1, x: 20, y: 15 },
    ]);
    run(state, 2000);
    expect(state.units.filter((u) => u.player === 1 && u.role === 'melee').length).toBe(0);
    expect(state.units.filter((u) => u.player === 0 && u.role === 'melee').length).toBeGreaterThan(0);
    expect(state.counters.engagements).toBeGreaterThan(0);
  });

  it('모든 생산 건물 파괴 → 승자 판정', () => {
    const state = freshGame();
    const hq1 = state.buildings.find((b) => b.player === 1)!;
    hq1.hp = 1;
    for (let i = 0; i < 6; i++) spawnUnit(state, 0, 'melee', 38, 23);
    const ids = state.units.filter((u) => u.player === 0 && u.role === 'melee').map((u) => u.id);
    run(state, 1, [{ type: 'attackMove', player: 0, unitIds: ids, x: 41, y: 26 }]);
    run(state, 3000);
    expect(state.winner).toBe(0);
  });
});

describe('결정성 (카나리아)', () => {
  it('동일 시드 1500틱 2회 → 동일 해시', () => {
    const a = freshGame(777);
    const b = freshGame(777);
    const cmds: Command[] = [];
    for (let i = 0; i < 1500; i++) {
      step(a, cmds);
      step(b, cmds);
    }
    expect(hashState(a)).toBe(hashState(b));
  });

  it('다른 시드 → 다른 진행 가능 (해시 비교는 동일 명령 기준)', () => {
    const a = freshGame(1);
    run(a, 500);
    expect(checkInvariants(a).length).toBe(0);
  });
});

describe('티어/배치 거부', () => {
  it('T1에서 전당(T2 요구) 배치 거부', () => {
    const state = freshGame();
    const worker = state.units.find((u) => u.player === 0)!;
    const before = state.buildings.length;
    run(state, 1, [{ type: 'build', player: 0, unitIds: [worker.id], buildingKind: 'hall', x: 14, y: 8 }]);
    expect(state.buildings.length).toBe(before);
  });

  it('점유 타일 위 배치 거부', () => {
    const state = freshGame();
    const map = state.map;
    addBuilding(state, 0, 'farm', 14, 8, true);
    const farm = state.buildings[state.buildings.length - 1];
    occupyRect(map, farm.id, 14, 8, 2, 2);
    expect(findBuilding(state, farm.id)).toBeTruthy();
    const worker = state.units.find((u) => u.player === 0)!;
    const before = state.buildings.length;
    run(state, 1, [{ type: 'build', player: 0, unitIds: [worker.id], buildingKind: 'farm', x: 14, y: 8 }]);
    expect(state.buildings.length).toBe(before);
  });
});
