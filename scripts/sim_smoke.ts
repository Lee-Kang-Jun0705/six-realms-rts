// 스모크 건틀릿 — 코드 변경마다 실행 (플랜 §5-4 ①)
// 미러 2종 + 비미러 1종 × 시드 → 0크래시/불변식/행동/사용률 검사

import { runMatch, behaviorIssues, type MatchResult } from './lib/runMatch';
import type { FactionId } from '../src/core/types';

const SEEDS = [11, 22];
const MATCHUPS: [FactionId, FactionId][] = [
  // 미러 2종 + 6종족 전부가 최소 1회 등장하는 비미러 로테이션
  ['psion', 'psion'],
  ['demon', 'demon'],
  ['psion', 'demon'],
  ['murim', 'fantasy'],
  ['yokai', 'celestial'],
  ['murim', 'yokai'],
  ['fantasy', 'celestial'],
];

const results: MatchResult[] = [];
let failed = false;

for (const [f0, f1] of MATCHUPS) {
  for (const seed of SEEDS) {
    const r = runMatch({ seed, factions: [f0, f1], invariantEvery: 1 });
    results.push(r);
    const issues = behaviorIssues(r);
    const tag = `${f0} vs ${f1} seed=${seed}`;
    if (issues.length > 0) {
      failed = true;
      console.error(`❌ ${tag}: ${issues.join(' / ')}`);
    } else {
      const w = r.winner === -2 ? '무승부' : `P${r.winner}`;
      console.log(`✅ ${tag}: ${w} ${r.ticks}틱 ${r.durationMs}ms 교전${r.engagements}`);
    }
  }
}

// 사용률 집계 (dead 콘텐츠 경보 — 스모크 레벨: 유닛 역할)
const usage: Record<string, number> = {};
for (const r of results) {
  for (const [k, v] of Object.entries(r.unitsProduced)) usage[`unit:${k}`] = (usage[`unit:${k}`] ?? 0) + v;
  for (const [k, v] of Object.entries(r.spellsCast)) usage[`spell:${k}`] = (usage[`spell:${k}`] ?? 0) + v;
}
console.log('\n[사용률]', usage);
const deadRoles = ['worker', 'melee', 'ranged'].filter((r) => !usage[`unit:${r}`]);
if (deadRoles.length > 0) {
  failed = true;
  console.error(`❌ 미사용 기본 유닛: ${deadRoles.join(',')}`);
}

// 미러 승률 (포지션 공정성 신호 — 시드 적어 정보성 출력만)
const mirror = results.filter((r) => r.factions[0] === r.factions[1] && r.winner !== -2);
const p0Wins = mirror.filter((r) => r.winner === 0).length;
console.log(`[미러] P0 승 ${p0Wins}/${mirror.length} (풀 건틀릿에서 48~52% 검증)`);

if (failed) {
  console.error('\n❌ 스모크 실패');
  process.exit(1);
}
console.log('\n✅ 스모크 건틀릿 통과');
