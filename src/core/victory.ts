// 승패 판정 — 패배 = 모든 생산 건물 파괴 / 무승부 = 틱 상한 (플랜 §2.1)

import type { GameState } from './state';
import { BUILDING_STATS } from '../data/baseline';
import { MAX_GAME_TICKS } from './const';

export function hasProductionBuilding(state: GameState, player: number): boolean {
  for (const b of state.buildings) {
    if (b.player === player && b.hp > 0 && BUILDING_STATS[b.kind].isProduction) return true;
  }
  return false;
}

export function victoryTick(state: GameState): void {
  if (state.winner !== -1) return;
  const p0Dead = state.players[0].defeated || !hasProductionBuilding(state, 0);
  const p1Dead = state.players[1].defeated || !hasProductionBuilding(state, 1);
  if (p0Dead && p1Dead) state.winner = -2;
  else if (p0Dead) state.winner = 1;
  else if (p1Dead) state.winner = 0;
  else if (state.tick >= MAX_GAME_TICKS) state.winner = -2;
}
