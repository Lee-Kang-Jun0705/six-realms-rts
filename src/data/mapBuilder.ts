// 맵 빌더 — 180도 회전 대칭을 구조적으로 보장 (밸런스 자동 확보, 플랜 §2.3)
// 절반만 설계하면 mirror()가 점대칭 복사. 시작점/금광도 자동 대칭.

export class MapBuilder {
  private g: string[][];

  constructor(public width: number, public height: number) {
    this.g = [];
    for (let y = 0; y < height; y++) this.g.push(new Array<string>(width).fill('.'));
    this.border();
  }

  private border(): void {
    for (let x = 0; x < this.width; x++) {
      this.g[0][x] = '#';
      this.g[this.height - 1][x] = '#';
    }
    for (let y = 0; y < this.height; y++) {
      this.g[y][0] = '#';
      this.g[y][this.width - 1] = '#';
    }
  }

  set(x: number, y: number, ch: string): void {
    if (x < 1 || y < 1 || x >= this.width - 1 || y >= this.height - 1) return;
    this.g[y][x] = ch;
  }

  rect(x0: number, y0: number, w: number, h: number, ch: string): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, ch);
  }

  /** 타원형 덩어리 (숲/바위/물) */
  blob(cx: number, cy: number, rx: number, ry: number, ch: string): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, ch);
      }
    }
  }

  start(x: number, y: number): void {
    this.set(x, y, '1');
    this.set(this.width - 1 - x, this.height - 1 - y, '2');
  }

  /** 금광 2x2 앵커 — 대칭 쌍 자동 배치 (mirrorPair=false면 중앙 단독) */
  mine(x: number, y: number, mirrorPair = true): void {
    this.set(x, y, 'G');
    if (mirrorPair) this.set(this.width - 2 - x, this.height - 2 - y, 'G'); // 2x2 풋프린트 보정
  }

  /** 지형을 점대칭 복사 (상반부 → 하반부). 시작점/금광 마커는 제외 */
  mirror(): void {
    const half = Math.floor((this.width * this.height) / 2);
    for (let i = 0; i < half; i++) {
      const x = i % this.width;
      const y = (i / this.width) | 0;
      const ch = this.g[y][x];
      if (ch === '1' || ch === '2' || ch === 'G') continue;
      const mx = this.width - 1 - x;
      const my = this.height - 1 - y;
      if (this.g[my][mx] === '1' || this.g[my][mx] === '2' || this.g[my][mx] === 'G') continue;
      this.g[my][mx] = ch;
    }
  }

  build(): string {
    return this.g.map((r) => r.join('')).join('\n');
  }
}
