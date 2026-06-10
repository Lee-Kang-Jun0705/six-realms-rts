// 진입점 — Phaser 부트
import Phaser from 'phaser';
import { MenuScene } from './render/MenuScene';
import { GameScene } from './render/GameScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0c0e14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MenuScene, GameScene],
});
