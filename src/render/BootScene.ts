// 부트 씬 — Phase 0 스모크용 최소 씬 (Phase 2에서 메뉴/게임 씬으로 확장)
import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, '육계대전 — Six Realms RTS\n(Phase 0 scaffold)', {
        fontSize: '28px',
        color: '#e8e2d0',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}
