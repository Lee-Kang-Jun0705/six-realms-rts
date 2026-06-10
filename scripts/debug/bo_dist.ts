// 시드별 빌드오더 선택 분포 확인 (스트림 첫 추출 편향 진단)
import { RngStreams } from '../../src/core/rng';
const dist: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
const psionSeeds: number[] = [];
for (let i = 0; i < 6; i++) for (let j = i; j < 6; j++) for (let s = 0; s < 2; s++) {
  const seed = 1000 + i * 100 + j * 10 + s;
  if (i === 0 || j === 0) psionSeeds.push(seed);
}
console.log('psion 등장 시드 수:', psionSeeds.length);
const psionDist: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
for (const seed of psionSeeds) {
  const st = new RngStreams(seed);
  const pick0 = st.int('ai-delay', 0, 2); // ai0 첫 추출
  const pick1 = st.int('ai-delay', 0, 2); // ai1
  psionDist[pick0]++;
  dist[pick0]++;
  dist[pick1]++;
}
console.log('psion P0 BO 분포 (0=러시,1=eco,2=tech):', psionDist);
console.log('전체 분포:', dist);
