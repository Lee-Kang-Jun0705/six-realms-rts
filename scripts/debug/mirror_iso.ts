// 격리 실험: 동일 종족 + 동일 빌드오더 강제 미러전 → P0 승률 (엔진 편향 측정)
import { runMatch } from '../lib/runMatch';
import { MAPS } from '../../src/data/maps';
let p0 = 0, p1 = 0, draw = 0;
const bos = ['eco', 'rush', 'tech'];
for (let s = 0; s < 45; s++) {
  const bo = `psion-${bos[s % 3]}`;
  const r = runMatch({
    seed: 7000 + s, factions: ['psion', 'psion'], mapAscii: MAPS[s % 5].ascii,
    buildOrders: [bo, bo],
  });
  if (r.winner === 0) p0++; else if (r.winner === 1) p1++; else draw++;
}
console.log(`P0 ${p0} / P1 ${p1} / 무승부 ${draw} → P0 ${(100 * p0 / Math.max(1, p0 + p1)).toFixed(1)}%`);
