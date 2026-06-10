// Phase 5 게이트: 전 맵 AI 매치 완주
import { runMatch, behaviorIssues } from '../lib/runMatch';
import { MAPS } from '../../src/data/maps';
import type { FactionId } from '../../src/core/types';

const PAIRS: [FactionId, FactionId][] = [
  ['psion', 'demon'], ['murim', 'celestial'], ['fantasy', 'yokai'], ['yokai', 'demon'], ['celestial', 'psion'],
];
let fail = 0;
MAPS.forEach((m, i) => {
  const r = runMatch({ seed: 50 + i, factions: PAIRS[i], mapAscii: m.ascii });
  const issues = behaviorIssues(r);
  const w = r.winner === -2 ? '무승부' : `P${r.winner}`;
  if (issues.length > 0) {
    fail++;
    console.error(`❌ ${m.ko} (${PAIRS[i].join(' vs ')}): ${issues.join(' / ')}`);
  } else {
    console.log(`✅ ${m.ko} (${PAIRS[i].join(' vs ')}): ${w} ${r.ticks}틱 교전${r.engagements}`);
  }
});
process.exit(fail > 0 ? 1 : 0);
