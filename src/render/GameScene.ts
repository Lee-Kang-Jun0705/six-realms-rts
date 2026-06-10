// 게임 씬 — 시뮬/렌더 조립 (플레이 + 관전 공용)

import Phaser from 'phaser';
import type { FactionId } from '../core/types';
import { createGame } from '../core/game';
import { SimRunner } from './SimRunner';
import { bakeCommon, bakeFaction } from './bake';
import { TerrainLayer } from './terrainLayer';
import { UnitsLayer } from './unitsLayer';
import { FogLayer } from './fogLayer';
import { CameraControls } from './cameraControls';
import { InputController } from './input';
import { Hud } from '../ui/hud';
import { Minimap } from '../ui/minimap';
import { buildTestMap } from '../data/maps';
import { TILE } from '../core/const';
import { FACTION_PALETTES } from './palette';

export interface GameSceneConfig {
  factions: [FactionId, FactionId];
  seed: number;
  mapAscii?: string;
  mode: 'play' | 'spectate';
}

export class GameScene extends Phaser.Scene {
  private runner!: SimRunner;
  private terrain!: TerrainLayer;
  private units!: UnitsLayer;
  private fog!: FogLayer;
  private cam!: CameraControls;
  private inputCtl!: InputController;
  private hud!: Hud;
  private minimap!: Minimap;
  private cfg!: GameSceneConfig;
  private ended = false;

  constructor() {
    super('game');
  }

  init(cfg: GameSceneConfig): void {
    this.cfg = cfg;
    this.ended = false;
  }

  create(): void {
    const cfg = this.cfg;
    bakeCommon(this);
    bakeFaction(this, cfg.factions[0]);
    if (cfg.factions[1] !== cfg.factions[0]) bakeFaction(this, cfg.factions[1]);

    const state = createGame({ mapAscii: cfg.mapAscii ?? buildTestMap(), seed: cfg.seed, factions: cfg.factions });
    this.runner = new SimRunner(state);
    this.terrain = new TerrainLayer(this, state);
    this.units = new UnitsLayer(this, state, this.runner);
    this.fog = new FogLayer(this, state, 0);
    this.fog.revealAll = cfg.mode === 'spectate';
    this.units.isTileVisible = (tx, ty) => this.fog.isTileVisible(tx, ty);
    this.units.isTileExplored = (tx, ty) => cfg.mode === 'spectate' || state.fog[0].isExplored(tx, ty);
    this.units.viewPlayer = cfg.mode === 'spectate' ? -1 : 0;

    this.cam = new CameraControls(this, state.map.width, state.map.height);
    const start = state.map.starts[0];
    this.cam.centerOn(start.x * TILE, start.y * TILE);

    this.inputCtl = new InputController(this, this.runner, this.units, 0, cfg.mode === 'play');
    this.hud = new Hud(this.runner, this.inputCtl, 0);
    this.minimap = new Minimap(this.hud.minimapCanvas, this, state, () => 0);
    this.minimap.revealAll = cfg.mode === 'spectate';

    // 디버그: P 일시정지, O 단일틱
    this.input.keyboard!.on('keydown-P', () => {
      this.runner.paused = !this.runner.paused;
      this.hud.toast(this.runner.paused ? '일시정지' : '재개');
    });
    this.input.keyboard!.on('keydown-O', () => {
      if (this.runner.paused) this.runner.stepOnce();
    });
    this.events.on('shutdown', () => this.hud.destroy());
  }

  update(_time: number, delta: number): void {
    const alpha = this.runner.advance(delta);
    this.terrain.update(delta);
    this.units.update(delta, alpha);
    this.fog.update(delta);
    this.cam.update(delta);
    this.hud.update(delta);
    this.minimap.update(delta);
    if (!this.ended && this.runner.state.winner !== -1) this.showResult();
  }

  private showResult(): void {
    this.ended = true;
    const w = this.runner.state.winner;
    const msg = w === -2 ? '무승부' : w === 0 ? '승리!' : '패배...';
    const faction = this.runner.state.players[w === 1 ? 1 : 0].faction;
    const color = w === 0 ? '#f5c542' : w === 1 ? '#ff5a52' : '#9aa0ae';
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 420, 160, 0x0c0e14, 0.92).setScrollFactor(0).setDepth(20000);
    this.add
      .text(width / 2, height / 2 - 20, msg, { fontSize: '42px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.add
      .text(width / 2, height / 2 + 28, `${FACTION_PALETTES[faction].name} — 클릭하면 메뉴로`, { fontSize: '16px', color: '#e8e2d0' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    this.input.once('pointerdown', () => {
      this.hud.destroy();
      this.scene.start('menu');
    });
  }
}
