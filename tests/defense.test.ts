// 디펜스 모드 검증 — 웨이브 스폰/현상금/승패 (유즈맵 디펜스)
import { describe, expect, it } from 'vitest';
import { createGame, step, checkInvariants } from '../src/core/game';
import { spawnUnit } from '../src/core/state';
import { DEFENSE_MAP } from '../src/data/maps';

function defenseGame(seed = 3) {
  return createGame({ mapAscii: DEFENSE_MAP.ascii, seed, factions: ['fantasy', 'demon'], defense: true });
}

describe('디펜스 모드', () => {
  it('셋업: P1 기지/유닛 제거 + 시작 보너스', () => {
    const state = defenseGame();
    expect(state.buildings.filter((b) => b.player === 1).length).toBe(0);
    expect(state.units.filter((u) => u.player === 1).length).toBe(0);
    expect(state.defense?.totalWaves).toBe(10);
    expect(state.players[0].gold).toBe(800); // 600 + 보너스 200
  });

  it('웨이브 1 스폰 → 본진으로 진군 + 현상금 지급', () => {
    const state = defenseGame();
    for (let i = 0; i < 1300; i++) step(state, []);
    expect(state.defense?.wave).toBe(1);
    const enemies = state.units.filter((u) => u.player === 1);
    expect(enemies.length).toBeGreaterThanOrEqual(4);
    // 진군 목적지 = 본진 방향 (아래쪽)
    expect(enemies[0].orderY).toBeGreaterThan(20);
    // 수비 병력 배치 → 처치 시 골드 증가
    const gold0 = state.players[0].gold;
    for (let i = 0; i < 8; i++) spawnUnit(state, 0, 'ranged', 20 + i * 0.5, 18);
    let killed = false;
    for (let i = 0; i < 3000 && !killed; i++) {
      step(state, []);
      killed = state.units.filter((u) => u.player === 1).length === 0 && state.defense!.wave === 1;
    }
    expect(state.players[0].gold).toBeGreaterThan(gold0); // 현상금 (채집 수입 포함이지만 현상금 플랫 +6 보장)
    expect(checkInvariants(state).length).toBe(0);
  });

  it('무방어 → 본진 파괴 → 패배 (winner=1)', () => {
    const state = defenseGame();
    // 일꾼 채집 중단 + 본진 약화로 빠른 판정
    for (const u of state.units) u.state = 'idle';
    const hq = state.buildings.find((b) => b.player === 0 && b.kind === 'hq')!;
    hq.hp = 60;
    let ticks = 0;
    while (state.winner === -1 && ticks < 12000) {
      step(state, []);
      ticks++;
    }
    expect(state.winner).toBe(1);
  });

  it('전 웨이브 소탕 → 승리 (winner=0)', () => {
    const state = defenseGame();
    // 강력한 수비군 배치 + 빠른 검증을 위해 2웨이브로 축소
    state.defense!.totalWaves = 2;
    state.defense!.waveIntervalTicks = 800;
    for (let i = 0; i < 14; i++) spawnUnit(state, 0, 'elite', 18 + (i % 7), 16 + Math.floor(i / 7));
    let ticks = 0;
    while (state.winner === -1 && ticks < 15000) {
      step(state, []);
      ticks++;
    }
    expect(state.winner, `winner=${state.winner} wave=${state.defense?.wave} ticks=${ticks}`).toBe(0);
  }, 30000);
});
