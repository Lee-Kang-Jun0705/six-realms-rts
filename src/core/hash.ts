// 상태 해시 (결정성 카나리아용) — FNV-1a 32bit 증분 해셔 (플랜 §5-1)

export class StateHasher {
  private h = 0x811c9dc5;

  num(n: number): this {
    // float64를 비트 단위로 해시 (누적 오차까지 동일해야 결정적)
    const buf = new DataView(new ArrayBuffer(8));
    buf.setFloat64(0, n, true);
    for (let i = 0; i < 8; i++) {
      this.h ^= buf.getUint8(i);
      this.h = Math.imul(this.h, 0x01000193);
    }
    return this;
  }

  str(s: string): this {
    for (let i = 0; i < s.length; i++) {
      this.h ^= s.charCodeAt(i);
      this.h = Math.imul(this.h, 0x01000193);
    }
    return this;
  }

  value(): number {
    return this.h >>> 0;
  }
}
