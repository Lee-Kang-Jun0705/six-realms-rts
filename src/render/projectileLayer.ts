// 발사체 렌더 — 코어 fx 이벤트 소비 → 출발지→도착지 보간 이동 + 임팩트 (시각 전용)

import Phaser from 'phaser';
import type { GameState, FxEvent } from '../core/state';
import { TILE } from '../core/const';
import { COL } from './palette';

interface Proj {
  g: Phaser.GameObjects.Graphics;
  x0: number; y0: number; x1: number; y1: number;
  t: number; speed: number; kind: FxEvent['kind'];
}

const KIND_STYLE: Record<FxEvent['kind'], { color: number; r: number; speed: number; trail: boolean }> = {
  arrow: { color: 0xe8e2d0, r: 2.5, speed: 0.05, trail: true },
  bolt: { color: 0xffe08a, r: 2.5, speed: 0.05, trail: true },
  cannon: { color: 0x3a3a3a, r: 4, speed: 0.03, trail: false },
  magic: { color: 0xff7a3d, r: 6, speed: 0.035, trail: true },
  heal: { color: 0x7fffa0, r: 4, speed: 0.04, trail: false },
  smite: { color: 0xfff1a8, r: 7, speed: 0.09, trail: true },
};

export class ProjectileLayer {
  private projs: Proj[] = [];
  constructor(private scene: Phaser.Scene, private state: GameState) {
    state.emitFx = true;
  }

  update(deltaMs: number): void {
    // 코어가 쌓아둔 fx 소비 → 발사체 생성
    if (this.state.fx.length) {
      for (const fx of this.state.fx) this.spawn(fx);
      this.state.fx.length = 0;
    }
    const dt = deltaMs;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const p = this.projs[i];
      p.t += p.speed * (dt / 16.67);
      if (p.t >= 1) {
        this.impact(p);
        p.g.destroy();
        this.projs.splice(i, 1);
        continue;
      }
      this.draw(p);
    }
  }

  private spawn(fx: FxEvent): void {
    const st = KIND_STYLE[fx.kind];
    const g = this.scene.add.graphics().setDepth(8000);
    const speed = st.speed * (fx.kind === 'smite' ? 1 : 4 / Math.max(2, Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0)));
    this.projs.push({ g, x0: fx.x0, y0: fx.y0, x1: fx.x1, y1: fx.y1, t: 0, speed: Math.max(0.03, speed), kind: fx.kind });
  }

  private draw(p: Proj): void {
    const st = KIND_STYLE[p.kind];
    const x = (p.x0 + (p.x1 - p.x0) * p.t) * TILE;
    // 포물선 아크 (cannon/arrow은 살짝 위로)
    const arc = p.kind === 'cannon' || p.kind === 'arrow' ? -Math.sin(p.t * Math.PI) * 18 : 0;
    const y = (p.y0 + (p.y1 - p.y0) * p.t) * TILE + arc;
    p.g.clear();
    if (st.trail) {
      const px = (p.x0 + (p.x1 - p.x0) * Math.max(0, p.t - 0.12)) * TILE;
      const py = (p.y0 + (p.y1 - p.y0) * Math.max(0, p.t - 0.12)) * TILE;
      p.g.lineStyle(2, st.color, 0.4);
      p.g.lineBetween(px, py, x, y);
    }
    p.g.fillStyle(st.color, 1);
    p.g.fillCircle(x, y, st.r);
    if (p.kind === 'magic' || p.kind === 'smite') {
      p.g.fillStyle(0xffffff, 0.6);
      p.g.fillCircle(x, y, st.r * 0.5);
    }
  }

  private impact(p: Proj): void {
    const st = KIND_STYLE[p.kind];
    const x = p.x1 * TILE;
    const y = p.y1 * TILE;
    const burst = this.scene.add.graphics().setDepth(8001);
    burst.fillStyle(st.color, 0.8);
    burst.fillCircle(x, y, st.r * 1.6);
    burst.lineStyle(2, COL.outline, 0.5);
    burst.strokeCircle(x, y, st.r * 1.6);
    this.scene.tweens.add({
      targets: burst, alpha: 0, scale: 2, duration: 220, onComplete: () => burst.destroy(),
    });
  }
}
