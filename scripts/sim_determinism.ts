// 결정성 카나리아 — 동일 시드 2회 실행 → 최종 해시 동일 (플랜 §5-1)
// AI 포함 전체 파이프라인의 재현성 검증. 밸런스 수치 변경 시 골든 재생성: --update

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { runMatch } from './lib/runMatch';
import type { FactionId } from '../src/core/types';

const GOLDEN_PATH = new URL('./golden.json', import.meta.url).pathname;
const CASES: { seed: number; factions: [FactionId, FactionId] }[] = [
  { seed: 101, factions: ['psion', 'demon'] },
  { seed: 202, factions: ['demon', 'demon'] },
];

const update = process.argv.includes('--update');
let failed = false;
const observed: Record<string, number> = {};

for (const c of CASES) {
  const key = `${c.factions[0]}-${c.factions[1]}-${c.seed}`;
  const a = runMatch({ ...c, invariantEvery: 10 });
  const b = runMatch({ ...c, invariantEvery: 10 });
  if (a.finalHash !== b.finalHash) {
    console.error(`❌ ${key}: 동일 시드 2회 실행 해시 불일치 (${a.finalHash} != ${b.finalHash}) — 비결정성 버그!`);
    failed = true;
    continue;
  }
  observed[key] = a.finalHash;
  console.log(`✅ ${key}: 재현성 OK (hash=${a.finalHash}, ${a.ticks}틱)`);
}

if (update) {
  writeFileSync(GOLDEN_PATH, JSON.stringify(observed, null, 2));
  console.log('📝 골든 갱신 완료 (의도된 로직/데이터 변경 확인 후에만 사용)');
} else if (existsSync(GOLDEN_PATH)) {
  const golden = JSON.parse(readFileSync(GOLDEN_PATH, 'utf8')) as Record<string, number>;
  for (const [key, hash] of Object.entries(observed)) {
    if (golden[key] !== undefined && golden[key] !== hash) {
      console.error(`❌ ${key}: 골든 불일치 — 로직 회귀 또는 의도된 변경 (의도면 --update로 재생성)`);
      failed = true;
    }
  }
  if (!failed) console.log('✅ 골든 해시 일치');
} else {
  writeFileSync(GOLDEN_PATH, JSON.stringify(observed, null, 2));
  console.log('📝 골든 최초 생성');
}

process.exit(failed ? 1 : 0);
