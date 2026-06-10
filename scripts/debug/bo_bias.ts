// 건틀릿 실제 시드에서 draw#1(P0) vs draw#2(P1) 빌드오더 분포 비교
import { RngStreams } from '../../src/core/rng';
const d0: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
const d1: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
for (let i = 0; i < 6; i++) for (let j = i; j < 6; j++) for (let s = 0; s < 8; s++) {
  const seed = 1000 + i * 100 + j * 10 + s;
  const st = new RngStreams(seed);
  d0[st.int('ai-delay', 0, 2)]++;
  d1[st.int('ai-delay', 0, 2)]++;
}
console.log('P0 (draw#1) 분포 [러시,eco,tech]:', d0);
console.log('P1 (draw#2) 분포 [러시,eco,tech]:', d1);
