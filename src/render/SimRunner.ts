// 시뮬 러너 — 고정 틱 accumulator + 렌더 보간 알파 + 명령 큐 (Gaffer 패턴, 플랜 §1)

import type { Command } from '../core/types';
import type { GameState } from '../core/state';
import { step } from '../core/game';
import { MAX_CATCHUP_TICKS, TICK_MS } from '../core/const';

export class SimRunner {
  private acc = 0;
  private pending: Command[] = [];
  /** 직전 틱 유닛 위치 (보간용) */
  prevPos = new Map<number, { x: number; y: number }>();
  speedMultiplier = 1; // 관전 배속
  paused = false;

  constructor(public state: GameState) {}

  enqueue(cmd: Command): void {
    this.pending.push(cmd);
  }

  /** 렌더 프레임마다 호출. 반환 = 보간 알파 [0,1) */
  advance(deltaMs: number): number {
    if (this.paused || this.state.winner !== -1) return 1;
    this.acc += deltaMs * this.speedMultiplier;
    let steps = 0;
    while (this.acc >= TICK_MS && steps < MAX_CATCHUP_TICKS * this.speedMultiplier) {
      this.snapshotPositions();
      step(this.state, this.pending);
      this.pending = [];
      this.acc -= TICK_MS;
      steps++;
    }
    if (this.acc >= TICK_MS) this.acc = 0; // 데스 스파이럴 방지: 잔여 버림
    return Math.min(1, this.acc / TICK_MS);
  }

  /** 디버그: 단일 틱 스텝 */
  stepOnce(): void {
    this.snapshotPositions();
    step(this.state, this.pending);
    this.pending = [];
  }

  private snapshotPositions(): void {
    this.prevPos.clear();
    for (const u of this.state.units) this.prevPos.set(u.id, { x: u.x, y: u.y });
  }

  lerpX(id: number, x: number, alpha: number): number {
    const p = this.prevPos.get(id);
    return p ? p.x + (x - p.x) * alpha : x;
  }

  lerpY(id: number, y: number, alpha: number): number {
    const p = this.prevPos.get(id);
    return p ? p.y + (y - p.y) * alpha : y;
  }
}
