// 안개 렌더 — 타일당 1px 캔버스 텍스처 → 32배 확대(선형 보간 = 부드러운 경계)

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import { FOG_EXPLORED, FOG_VISIBLE } from '../core/fog';
import { TILE } from '../core/const';

export class FogLayer {
  private canvasTex: Phaser.Textures.CanvasTexture;
  private image: Phaser.GameObjects.Image;
  private timer = 0;
  /** 관전 모드 = 안개 해제 */
  revealAll = false;

  constructor(scene: Phaser.Scene, private state: GameState, private viewPlayer: number) {
    const { width, height } = state.map;
    const tex = scene.textures.createCanvas('fog-canvas', width, height);
    if (!tex) throw new Error('fog canvas 생성 실패');
    this.canvasTex = tex;
    this.image = scene.add
      .image(0, 0, 'fog-canvas')
      .setOrigin(0, 0)
      .setScale(TILE)
      .setDepth(9500);
    this.redraw();
  }

  setViewPlayer(p: number): void {
    this.viewPlayer = p;
    this.redraw();
  }

  update(deltaMs: number): void {
    this.timer += deltaMs;
    if (this.timer < 200) return;
    this.timer = 0;
    this.redraw();
  }

  private redraw(): void {
    if (this.revealAll) {
      this.image.setVisible(false);
      return;
    }
    this.image.setVisible(true);
    const { width, height } = this.state.map;
    const fog = this.state.fog[this.viewPlayer as 0 | 1].data;
    const ctx = this.canvasTex.getContext();
    const img = ctx.createImageData(width, height);
    for (let i = 0; i < fog.length; i++) {
      const o = i * 4;
      img.data[o] = 8;
      img.data[o + 1] = 10;
      img.data[o + 2] = 16;
      img.data[o + 3] = fog[i] === FOG_VISIBLE ? 0 : fog[i] === FOG_EXPLORED ? 115 : 255;
    }
    ctx.putImageData(img, 0, 0);
    this.canvasTex.refresh();
  }

  isTileVisible(tx: number, ty: number): boolean {
    if (this.revealAll) return true;
    return this.state.fog[this.viewPlayer as 0 | 1].isVisible(tx, ty);
  }
}
