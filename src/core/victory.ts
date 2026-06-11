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

/** 틱 상한 판정승: 생산건물 최다 팀 (동점이면 무승부). 30분 무결판 방지 */
function judgeByTimeout(state: GameState): number {
  const score = new Map<number, number>();
  for (const b of state.buildings) {
    if (b.hp <= 0 || !BUILDING_STATS[b.kind].isProduction) continue;
    const t = state.teams[b.player];
    score.set(t, (score.get(t) ?? 0) + 1);
  }
  let bestTeam = -2;
  let bestScore = -1;
  let tie = false;
  for (const [t, s] of score) {
    if (s > bestScore) {
      bestScore = s;
      bestTeam = t;
      tie = false;
    } else if (s === bestScore) tie = true;
  }
  return tie || bestTeam === -2 ? -2 : state.teams.indexOf(bestTeam);
}

export function victoryTick(state: GameState): void {
  if (state.winner !== -1) return;
  // 팀별 생존: 팀 내 한 명이라도 생산건물 보유 + 미패배면 팀 생존 (1v1=각자팀, 3v3=팀 단위)
  const aliveTeams = new Set<number>();
  for (let p = 0; p < state.players.length; p++) {
    if (!state.players[p].defeated && hasProductionBuilding(state, p)) aliveTeams.add(state.teams[p]);
  }
  if (aliveTeams.size === 0) state.winner = -2;
  else if (aliveTeams.size === 1) state.winner = state.teams.indexOf([...aliveTeams][0]); // 승리팀 대표 player
  else if (state.tick >= MAX_GAME_TICKS - 1) state.winner = judgeByTimeout(state); // 마지막 틱 판정승 (루프 tick<MAX 종료 전)
}
