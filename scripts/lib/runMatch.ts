// 헤드리스 매치 러너 — AI vs AI 1게임 + 불변식/행동 검사 (디아2 coop_sim 패턴 이식)

import { createGame, step, checkInvariants, hashState, type InvariantViolation } from '../../src/core/game';
import { AiController } from '../../src/core/ai/controller';
import type { FactionId } from '../../src/core/types';
import { buildTestMap } from '../../src/data/maps';
import { MAX_GAME_TICKS } from '../../src/core/const';

export interface MatchConfig {
  seed: number;
  factions: [FactionId, FactionId];
  mapAscii?: string;
  difficulty?: 'easy' | 'normal' | 'hard';
  buildOrders?: [string | undefined, string | undefined];
  maxTicks?: number;
  invariantEvery?: number; // 검사 주기 (1 = 매 틱)
}

export interface MatchResult {
  seed: number;
  factions: [FactionId, FactionId];
  winner: number; // 0/1/-2(무승부)
  ticks: number;
  durationMs: number;
  violations: InvariantViolation[];
  engagements: number;
  unitsProduced: Record<string, number>;
  spellsCast: Record<string, number>;
  buildingsBuilt: Record<string, number>;
  castersByFaction: Record<string, number>;
  finalHash: number;
  buildOrderNames: [string, string];
  crashed: string | null;
}

export function runMatch(cfg: MatchConfig): MatchResult {
  const t0 = Date.now();
  const state = createGame({
    mapAscii: cfg.mapAscii ?? buildTestMap(),
    seed: cfg.seed,
    factions: cfg.factions,
  });
  const ais = [
    new AiController({ player: 0, difficulty: cfg.difficulty ?? 'normal', buildOrderId: cfg.buildOrders?.[0] }),
    new AiController({ player: 1, difficulty: cfg.difficulty ?? 'normal', buildOrderId: cfg.buildOrders?.[1] }),
  ];
  const maxTicks = cfg.maxTicks ?? MAX_GAME_TICKS;
  const every = cfg.invariantEvery ?? 1;
  const violations: InvariantViolation[] = [];
  let crashed: string | null = null;

  try {
    while (state.winner === -1 && state.tick < maxTicks) {
      const cmds = [...ais[0].tick(state), ...ais[1].tick(state)];
      step(state, cmds);
      if (state.tick % every === 0) {
        const v = checkInvariants(state);
        if (v.length > 0 && violations.length < 50) violations.push(...v);
      }
    }
  } catch (e) {
    crashed = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
  }

  return {
    seed: cfg.seed,
    factions: cfg.factions,
    winner: state.winner === -1 ? -2 : state.winner,
    ticks: state.tick,
    durationMs: Date.now() - t0,
    violations,
    engagements: state.counters.engagements,
    unitsProduced: state.counters.unitsProduced,
    spellsCast: state.counters.spellsCast,
    buildingsBuilt: state.counters.buildingsBuilt,
    castersByFaction: state.counters.castersByFaction,
    finalHash: hashState(state),
    buildOrderNames: [ais[0].buildOrderName, ais[1].buildOrderName],
    crashed,
  };
}

/** 행동 불변식 (플랜 §5-3): 게임 단위 정상성 */
export function behaviorIssues(r: MatchResult): string[] {
  const issues: string[] = [];
  if (r.crashed) issues.push(`크래시: ${r.crashed.split('\n')[0]}`);
  if (r.violations.length > 0) issues.push(`불변식 위반 ${r.violations.length}건 (첫: ${r.violations[0].rule} ${r.violations[0].detail})`);
  if (r.engagements === 0) issues.push('교전 0회 — AI가 싸우지 않음');
  const produced = Object.values(r.unitsProduced).reduce((a, b) => a + b, 0);
  if (produced < 20) issues.push(`총 생산 ${produced}기 — 생산 정체 의심`);
  if (r.ticks < 2000) issues.push(`게임 길이 ${r.ticks}틱 — 비정상 조기 종료`);
  return issues;
}
