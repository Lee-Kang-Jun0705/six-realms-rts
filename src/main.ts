// 진입점 — Phaser 부트 (씬은 Phase 2에서 본격 구현)
import Phaser from 'phaser';
import { BootScene } from './render/BootScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0c0e14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene],
});
