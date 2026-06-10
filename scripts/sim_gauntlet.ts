// 풀 건틀릿 — 21개 매치업 × 시드 × 포지션 스왑 × 맵 로테이션 (플랜 §5-4 ②, §5-5)
// 검사: 0크래시/불변식, 미러·포지션 공정성, 종족 승률 밴드, 사용률 dead, 무승부율
// 규모: SEEDS_PER 환경변수로 조절 (기본 2 → 132게임, 풀 통계는 야간 대규모 실행)

import { runMatch, behaviorIssues, type MatchResult } from './lib/runMatch';
import { MAPS } from '../src/data/maps';
import type { FactionId } from '../src/core/types';

const FACTIONS: FactionId[] = ['psion', 'murim', 'fantasy', 'yokai', 'demon', 'celestial'];
const SEEDS_PER = parseInt(process.env.SEEDS_PER ?? '2', 10);

interface Agg {
  results: MatchResult[];
  issues: string[];
}

const agg: Agg = { results: [], issues: [] };
let gameNo = 0;

function play(f0: FactionId, f1: FactionId, seed: number, mapIdx: number): void {
  const r = runMatch({ seed, factions: [f0, f1], mapAscii: MAPS[mapIdx % MAPS.length].ascii, invariantEvery: 4 });
  agg.results.push(r);
  const issues = behaviorIssues(r);
  for (const i of issues) agg.issues.push(`${f0} vs ${f1} seed=${seed} map=${MAPS[mapIdx % MAPS.length].id}: ${i}`);
  gameNo++;
  if (gameNo % 20 === 0) console.log(`  ... ${gameNo}게임 진행`);
}

console.log(`[건틀릿] 6종족 전 매치업 × 시드 ${SEEDS_PER} × 포지션 스왑`);
const t0 = Date.now();

for (let i = 0; i < FACTIONS.length; i++) {
  for (let j = i; j < FACTIONS.length; j++) {
    for (let s = 0; s < SEEDS_PER; s++) {
      const seed = 1000 + i * 100 + j * 10 + s;
      const mapIdx = i + j + s;
      play(FACTIONS[i], FACTIONS[j], seed, mapIdx);
      if (i !== j) play(FACTIONS[j], FACTIONS[i], seed, mapIdx); // 포지션 스왑
    }
  }
}

const total = agg.results.length;
console.log(`\n[완료] ${total}게임, ${Math.round((Date.now() - t0) / 1000)}초\n`);

// ── 1. 크래시/불변식/행동 ──
if (agg.issues.length > 0) {
  console.error(`❌ 이슈 ${agg.issues.length}건:`);
  for (const i of agg.issues.slice(0, 20)) console.error('  -', i);
}

// ── 2. 포지션 공정성 (모든 게임 P0 승률 — 맵/종족 불문 위치 편향 검출) ──
const decided = agg.results.filter((r) => r.winner !== -2);
const p0Rate = decided.filter((r) => r.winner === 0).length / Math.max(1, decided.length);
const posOk = p0Rate >= 0.4 && p0Rate <= 0.6;
console.log(`[포지션] P0 승률 ${(p0Rate * 100).toFixed(1)}% (게이트 40~60%) ${posOk ? '✅' : '❌'}`);

// ── 3. 미러 공정성 ──
const mirror = agg.results.filter((r) => r.factions[0] === r.factions[1] && r.winner !== -2);
const mirrorP0 = mirror.filter((r) => r.winner === 0).length;
console.log(`[미러] P0 승 ${mirrorP0}/${mirror.length} (소표본 — 30~70% 허용, 풀 통계는 SEEDS_PER 증가)`);
const mirrorRate = mirror.length > 0 ? mirrorP0 / mirror.length : 0.5;
const mirrorOk = mirror.length < 10 || (mirrorRate >= 0.3 && mirrorRate <= 0.7);

// ── 4. 종족 승률 밴드 (35~65%) ──
console.log('\n[종족 승률]');
let bandOk = true;
for (const f of FACTIONS) {
  const games = decided.filter((r) => r.factions.includes(f) && r.factions[0] !== r.factions[1]);
  const wins = games.filter((r) => r.factions[r.winner as 0 | 1] === f).length;
  const rate = games.length > 0 ? wins / games.length : 0.5;
  const ok = rate >= 0.35 && rate <= 0.65;
  if (!ok) bandOk = false;
  console.log(`  ${f.padEnd(10)} ${(rate * 100).toFixed(1)}% (${wins}/${games.length}) ${ok ? '✅' : '❌'}`);
}

// ── 5. 사용률 dead 검사 ──
const usage: Record<string, number> = {};
const casters: Record<string, number> = {};
for (const r of agg.results) {
  for (const [k, v] of Object.entries(r.unitsProduced)) usage[`unit:${k}`] = (usage[`unit:${k}`] ?? 0) + v;
  for (const [k, v] of Object.entries(r.spellsCast)) usage[`spell:${k}`] = (usage[`spell:${k}`] ?? 0) + v;
  for (const [k, v] of Object.entries(r.castersByFaction)) casters[k] = (casters[k] ?? 0) + v;
}
console.log('[종족별 캐스터]', JSON.stringify(casters));
console.log('\n[사용률]', JSON.stringify(usage));
const expectRoles = ['worker', 'melee', 'ranged', 'cavalry', 'caster'];
const deadRoles = expectRoles.filter((x) => !usage[`unit:${x}`]);
const expectSpells = [
  'psi-blast', 'imp-summon', 'blood-aura', 'light-step', 'pressure-point', 'ki-wave',
  'heal', 'blessing', 'fireball', 'charm', 'smite', 'aegis', 'clairvoyance', 'disguise',
];
const deadSpells = expectSpells.filter((x) => !usage[`spell:${x}`]);
if (deadRoles.length > 0) console.error(`❌ 미사용 유닛: ${deadRoles.join(',')}`);
if (deadSpells.length > 0) console.error(`⚠️ 미사용 스펠: ${deadSpells.join(',')}`);

// ── 6. 무승부율 + 게임 길이 분포 ──
const draws = agg.results.filter((r) => r.winner === -2).length;
const drawRate = draws / total;
const avgTicks = Math.round(agg.results.reduce((a, r) => a + r.ticks, 0) / total);
console.log(`\n[게임] 무승부 ${draws}/${total} (${(drawRate * 100).toFixed(1)}%) | 평균 ${avgTicks}틱 (${Math.round(avgTicks / 1200)}분)`);
const drawOk = drawRate <= 0.2;
if (!drawOk) console.error('❌ 무승부율 20% 초과 — 교착 진단 필요');

const pass = agg.issues.length === 0 && posOk && mirrorOk && bandOk && deadRoles.length === 0 && drawOk;
console.log(pass ? '\n✅ 풀 건틀릿 통과' : '\n❌ 풀 건틀릿 실패 — 위 항목 수정 필요');
process.exit(pass ? 0 : 1);
