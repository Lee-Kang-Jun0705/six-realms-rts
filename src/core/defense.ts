// 디펜스 모드 — 워크2 유즈맵 디펜스 장르 (웨이브 생존, 플랜 §9 차기 후보 → 사용자 지시로 추가)
// 적은 경제 없이 웨이브로 스폰되어 본진으로 진군. 처치 현상금으로 방어 구축.

import type { GameState } from './state';
import { buildingCenter, spawnUnit } from './state';
import type { Unit, UnitRole } from './types';
import { UNIT_STATS } from '../data/baseline';
import { ENTITY_HARD_CAP } from './const';
import { freeRect } from './map';
import { hasProductionBuilding } from './victory';
import { MAX_GAME_TICKS } from './const';

export interface DefenseState {
  wave: number;
  totalWaves: number;
  nextWaveTick: number;
  waveIntervalTicks: number;
  /** 현상금 배율 (처치 골드의 %) */
  bountyRatio: number;
}

export const DEFENSE_WAVE_KILL_BOUNTY_FLAT = 6;

/** createGame 후 호출: P1 기지/일꾼 제거 + 디펜스 상태 부착 */
export function setupDefense(state: GameState, totalWaves = 10, firstWaveTick = 1200, interval = 1500): void {
  // P1 건물 제거 (점유 해제 포함)
  for (const b of state.buildings) {
    if (b.player !== 1) continue;
    b.hp = 0;
    b.buildProgress = 0;
    freeRect(state.map, b.tileX, b.tileY, b.w, b.h);
  }
  state.buildings = state.buildings.filter((b) => b.player !== 1);
  state.units = state.units.filter((u) => u.player !== 1);
  state.players[1].supply = 0;
  state.players[1].supplyCap = 999;
  state.defense = {
    wave: 0,
    totalWaves,
    nextWaveTick: firstWaveTick,
    waveIntervalTicks: interval,
    bountyRatio: 0.4,
  };
  // 디펜스 시작 자금 보너스 (방어탑 빠른 건설용)
  state.players[0].gold += 200;
  state.players[0].wood += 150;
}

/** 웨이브 구성: 갈수록 다양·강력 (워크2 디펜스 유즈맵 패턴) */
function waveRoster(wave: number): UnitRole[] {
  const roster: UnitRole[] = [];
  const meleeCount = 3 + Math.floor(wave * 1.5);
  for (let i = 0; i < meleeCount; i++) roster.push('melee');
  if (wave >= 3) for (let i = 0; i < wave - 2; i++) roster.push('ranged');
  if (wave >= 5) for (let i = 0; i < Math.floor((wave - 3) / 2); i++) roster.push('cavalry');
  if (wave >= 7) roster.push('siege');
  if (wave >= 8) roster.push('caster');
  if (wave === 10) roster.push('elite', 'elite'); // 최종 보스 웨이브
  return roster;
}

export function defenseTick(state: GameState): void {
  const d = state.defense;
  if (!d || state.winner !== -1) return;
  if (state.tick >= d.nextWaveTick && d.wave < d.totalWaves) {
    d.wave++;
    d.nextWaveTick = state.tick + d.waveIntervalTicks;
    spawnWave(state, d.wave);
  }
}

function spawnWave(state: GameState, wave: number): void {
  const spawn = state.map.starts[1];
  const hq = state.buildings.find((b) => b.player === 0 && b.kind === 'hq' && b.hp > 0);
  const target = hq ? buildingCenter(hq) : { x: state.map.width / 2, y: state.map.height - 4 };
  const roster = waveRoster(wave);
  for (let i = 0; i < roster.length; i++) {
    if (state.units.length >= ENTITY_HARD_CAP - 2) break;
    const u = spawnUnit(state, 1, roster[i], spawn.x + (i % 5) * 0.8 - 1.6, spawn.y + Math.floor(i / 5) * 0.8);
    u.state = 'attackMove';
    u.destX = target.x;
    u.destY = target.y;
    u.orderX = target.x;
    u.orderY = target.y;
  }
}

/** 디펜스 승패 (victoryTick 대체): 패배 = P0 생산건물 전멸 / 승리 = 전 웨이브 소탕 */
export function defenseVictoryTick(state: GameState): void {
  const d = state.defense;
  if (!d || state.winner !== -1) return;
  if (state.players[0].defeated || !hasProductionBuilding(state, 0)) {
    state.winner = 1;
    return;
  }
  const aliveEnemies = state.units.some((u) => u.player === 1 && u.state !== 'dead');
  if (d.wave >= d.totalWaves && !aliveEnemies) {
    state.winner = 0;
    return;
  }
  if (state.tick >= MAX_GAME_TICKS) state.winner = -2;
}

/** 처치 현상금 (killUnit 훅) */
export function defenseBounty(state: GameState, dead: Unit): void {
  const d = state.defense;
  if (!d || dead.player !== 1) return;
  state.players[0].gold += Math.floor(UNIT_STATS[dead.role].cost.gold * d.bountyRatio) + DEFENSE_WAVE_KILL_BOUNTY_FLAT;
}
