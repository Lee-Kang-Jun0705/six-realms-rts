// RTS 카메라 — 엣지 스크롤 + WASD/방향키 + 휠 줌 (플랜 m-1)

import Phaser from 'phaser';
import { TILE } from '../core/const';

const EDGE = 24; // 엣지 스크롤 감지 px
const SPEED = 520; // px/s (줌 1 기준)

export class CameraControls {
  private keys: Record<string, Phaser.Input.Keyboard.Key>;

  constructor(private scene: Phaser.Scene, mapW: number, mapH: number) {
    const cam = scene.cameras.main;
    cam.setBounds(-TILE, -TILE, mapW * TILE + TILE * 2, mapH * TILE + TILE * 2);
    const kb = scene.input.keyboard!;
    this.keys = {
      w: kb.addKey('W'), a: kb.addKey('A'), s: kb.addKey('S'), d: kb.addKey('D'),
      up: kb.addKey('UP'), left: kb.addKey('LEFT'), down: kb.addKey('DOWN'), right: kb.addKey('RIGHT'),
    };
    scene.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const z = Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.5, 2.4);
      cam.setZoom(z);
    });
  }

  centerOn(x: number, y: number): void {
    this.scene.cameras.main.centerOn(x, y);
  }

  update(deltaMs: number): void {
    const cam = this.scene.cameras.main;
    const dt = deltaMs / 1000;
    const v = (SPEED * dt) / cam.zoom;
    let dx = 0;
    let dy = 0;
    if (this.keys.w.isDown || this.keys.up.isDown) dy -= v;
    if (this.keys.s.isDown || this.keys.down.isDown) dy += v;
    if (this.keys.a.isDown || this.keys.left.isDown) dx -= v;
    if (this.keys.d.isDown || this.keys.right.isDown) dx += v;
    const p = this.scene.input.activePointer;
    if (dx === 0 && dy === 0 && p.isDown === false && document.hasFocus()) {
      const { width, height } = this.scene.scale;
      if (p.x <= EDGE) dx -= v;
      else if (p.x >= width - EDGE) dx += v;
      if (p.y <= EDGE) dy -= v;
      else if (p.y >= height - EDGE) dy += v;
    }
    if (dx !== 0 || dy !== 0) {
      cam.scrollX += dx;
      cam.scrollY += dy;
    }
  }
}
