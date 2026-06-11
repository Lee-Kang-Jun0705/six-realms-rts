// 3v3 헤드리스 검증 — 6인 팀 대전이 크래시/불변식 위반 없이 결판나는지 (플랜 §5)
import { createGame, step, checkInvariants, type InvariantViolation } from '../src/core/game';
import { AiController } from '../src/core/ai/controller';
import type { FactionId, TeamId } from '../src/core/types';
import { MAPS_3V3 } from '../src/data/maps';
import { MAX_GAME_TICKS } from '../src/core/const';

const FACTIONS: FactionId[] = ['psion', 'murim', 'fantasy', 'yokai', 'demon', 'celestial'];
const TEAMS: TeamId[] = [0, 0, 0, 1, 1, 1];
const SEEDS = parseInt(process.env.SEEDS ?? '3', 10);

function runOne(seed: number): { winner: number; ticks: number; ms: number; violations: InvariantViolation[]; crash: string | null; produced: number; maxUnits: number; maxStepMs: number } {
  const t0 = Date.now();
  const state = createGame({ mapAscii: MAPS_3V3[0].ascii, seed, factions: FACTIONS, teams: TEAMS });
  const ais = FACTIONS.map((_, p) => new AiController({ player: p, difficulty: 'normal' }));
  const violations: InvariantViolation[] = [];
  let crash: string | null = null;
  let maxUnits = 0;
  let maxStepMs = 0;
  try {
    while (state.winner === -1 && state.tick < MAX_GAME_TICKS) {
      const cmds = ais.flatMap((ai) => ai.tick(state));
      const s0 = Date.now();
      step(state, cmds);
      const sm = Date.now() - s0;
      if (sm > maxStepMs) maxStepMs = sm;
      if (state.units.length > maxUnits) maxUnits = state.units.length;
      if (state.tick % 8 === 0) {
        const v = checkInvariants(state);
        if (v.length > 0 && violations.length < 30) violations.push(...v);
      }
    }
  } catch (e) {
    crash = e instanceof Error ? `${e.message}\n${e.stack?.split('\n')[1] ?? ''}` : String(e);
  }
  const produced = Object.values(state.counters.unitsProduced).reduce((a, b) => a + b, 0);
  return { winner: state.winner, ticks: state.tick, ms: Date.now() - t0, violations, crash, produced, maxUnits, maxStepMs };
}

console.log(`[3v3 검증] trinity-fields, 6인(팀 ${TEAMS.join('')}), 시드 ${SEEDS}`);
let pass = 0;
for (let s = 1; s <= SEEDS; s++) {
  const r = runOne(s);
  const team = r.winner === -2 ? '무승부' : r.winner === -1 ? '미결(틱상한)' : `팀${TEAMS[r.winner]}(대표P${r.winner})`;
  const ok = !r.crash && r.violations.length === 0 && r.produced >= 30;
  if (ok) pass++;
  console.log(`  시드 ${s}: ${team} | ${r.ticks}틱 ${r.ms}ms | 생산 ${r.produced} | 동시최대 ${r.maxUnits}기 | 최대틱 ${r.maxStepMs}ms | 불변식 ${r.violations.length} | ${r.crash ? '크래시: ' + r.crash.split('\n')[0] : 'OK'}`);
  if (r.violations.length > 0) console.log(`    위반: ${r.violations[0].rule} ${r.violations[0].detail}`);
}
console.log(`\n[결과] ${pass}/${SEEDS} 정상`);
process.exit(pass === SEEDS ? 0 : 1);
