// 단일 매치 시뮬 — npm run sim:match [-- seed=7 f0=psion f1=demon diff=normal]

import { runMatch, behaviorIssues } from './lib/runMatch';
import type { FactionId } from '../src/core/types';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split('=') as [string, string]));
const seed = parseInt(args.seed ?? '7', 10);
const f0 = (args.f0 ?? 'psion') as FactionId;
const f1 = (args.f1 ?? 'demon') as FactionId;

console.log(`[sim:match] seed=${seed} ${f0} vs ${f1}`);
const r = runMatch({
  seed,
  factions: [f0, f1],
  difficulty: (args.diff as 'easy' | 'normal' | 'hard') ?? 'normal',
});

console.log(`승자: ${r.winner === -2 ? '무승부' : `P${r.winner}(${r.factions[r.winner as 0 | 1]})`}`);
console.log(`틱: ${r.ticks} (게임 ${Math.round(r.ticks / 20 / 60)}분) | 실행 ${r.durationMs}ms`);
console.log(`빌드오더: [P0] ${r.buildOrderNames[0]} / [P1] ${r.buildOrderNames[1]}`);
console.log(`교전: ${r.engagements} | 생산:`, r.unitsProduced, '| 스펠:', r.spellsCast);
console.log(`건물:`, r.buildingsBuilt);
const issues = behaviorIssues(r);
if (issues.length > 0) {
  console.error('⚠️ 이슈:');
  for (const i of issues) console.error('  -', i);
  process.exit(1);
}
console.log('✅ 불변식/행동 검사 통과');
