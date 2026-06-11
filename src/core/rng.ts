// 결정적 시드 RNG (Mulberry32) — 시스템별 독립 스트림 (플랜 §1)
// core에서 Math.random 금지. 모든 난수는 이 모듈을 통해서만.

export type Rng = () => number; // [0, 1)

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 문자열 → 32bit 해시 (스트림명 분리용, FNV-1a) */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type StreamName = 'combat' | 'spawn' | 'ai-delay' | 'map' | 'art';

/** 루트 시드에서 이름별 독립 스트림 생성 — 시스템 간 난수 간섭 차단 */
export class RngStreams {
  private streams = new Map<string, Rng>();
  constructor(private rootSeed: number) {}

  get(name: StreamName): Rng {
    return this.getKey(name);
  }

  /** sub=0이면 공유 스트림, sub>0이면 플레이어별 독립 스트림 (미러전 P0/P1 대칭 보장) */
  private getKey(key: string): Rng {
    let rng = this.streams.get(key);
    if (!rng) {
      rng = mulberry32((this.rootSeed ^ hashString(key)) >>> 0);
      this.streams.set(key, rng);
    }
    return rng;
  }

  /** 정수 [min, max] 균등 추출. sub>0 = 플레이어별 독립 스트림 (예: AI 빌드오더/반응지연) */
  int(name: StreamName, min: number, max: number, sub = 0): number {
    const rng = sub === 0 ? this.getKey(name) : this.getKey(`${name}#${sub}`);
    return min + Math.floor(rng() * (max - min + 1));
  }
}
