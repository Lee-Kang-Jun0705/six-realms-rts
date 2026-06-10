// Phase 0 게이트: 동일 시드 → 동일 결과 (RNG 스트림 + 해시 기반)
import { describe, expect, it } from 'vitest';
import { RngStreams, mulberry32 } from '../src/core/rng';
import { StateHasher } from '../src/core/hash';
import { dirTo, dist } from '../src/core/vec';

function runToy(seed: number, ticks: number): number {
  // 장난감 시뮬: RNG + float 연산 누적 → 해시. 실제 게임 step은 Phase 1에서 교체 검증.
  const streams = new RngStreams(seed);
  const hasher = new StateHasher();
  let x = 0;
  let y = 0;
  for (let t = 0; t < ticks; t++) {
    const r = streams.get('combat')();
    const d = dirTo(x, y, r * 100, streams.get('map')() * 100);
    x += d.x * 0.7;
    y += d.y * 0.7;
    hasher.num(x).num(y).num(dist(0, 0, x, y));
    hasher.num(streams.int('ai-delay', 4, 16));
  }
  return hasher.value();
}

describe('결정성 기반 (플랜 §1 Phase 0 게이트)', () => {
  it('동일 시드 1000틱 2회 → 해시 동일', () => {
    expect(runToy(12345, 1000)).toBe(runToy(12345, 1000));
  });

  it('다른 시드 → 해시 다름', () => {
    expect(runToy(1, 1000)).not.toBe(runToy(2, 1000));
  });

  it('mulberry32 동일 시드 첫 5개 동일', () => {
    const a = mulberry32(99);
    const b = mulberry32(99);
    for (let i = 0; i < 5; i++) expect(a()).toBe(b());
  });

  it('스트림 독립성: 한 스트림 소비가 다른 스트림에 영향 없음', () => {
    const s1 = new RngStreams(7);
    const s2 = new RngStreams(7);
    s1.get('combat')(); // s1만 combat 소비
    expect(s1.get('map')()).toBe(s2.get('map')());
  });

  it('ai-delay 정수 틱 양자화 범위 [4,16]', () => {
    const s = new RngStreams(42);
    for (let i = 0; i < 200; i++) {
      const v = s.int('ai-delay', 4, 16);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(4);
      expect(v).toBeLessThanOrEqual(16);
    }
  });
});
