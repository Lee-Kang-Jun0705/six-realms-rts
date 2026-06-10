// 게임 씬 — 시뮬/렌더 조립 (플레이 + 관전 공용)

import Phaser from 'phaser';
import type { FactionId } from '../core/types';
import { createGame } from '../core/game';
import { AiController } from '../core/ai/controller';
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
    // AI 연결: 대전 = P1만 / 관전 = 양측
    this.runner.ais =
      cfg.mode === 'spectate'
        ? [new AiController({ player: 0 }), new AiController({ player: 1 })]
        : [new AiController({ player: 1 })];
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
    this.hud = new Hud(this.runner, this.inputCtl, 0, cfg.mode === 'spectate');
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
    if (cfg.mode === 'spectate') this.setupSpectator();
    this.events.on('shutdown', () => this.hud.destroy());
  }

  /** 관전: 배속(1/2/3키)/액션캠(V)/연속 루프 (플랜 §2.5) */
  private actionCam = true;
  private camTimer = 0;

  private setupSpectator(): void {
    const kb = this.input.keyboard!;
    kb.on('keydown-ONE', () => this.setSpeed(1));
    kb.on('keydown-TWO', () => this.setSpeed(2));
    kb.on('keydown-THREE', () => this.setSpeed(4));
    kb.on('keydown-V', () => {
      this.actionCam = !this.actionCam;
      this.hud.toast(this.actionCam ? '액션 카메라 ON' : '자유 카메라');
    });
    this.hud.toast('관전: 1/2/3 배속 · V 액션캠 · 매치 종료 시 자동 다음 매치');
  }

  private setSpeed(n: number): void {
    this.runner.speedMultiplier = n;
    this.hud.toast(`배속 x${n}`);
  }

  /** 교전 지점 자동 추적: 가장 가까운 적대 유닛 쌍의 중점으로 부드럽게 이동 */
  private updateActionCam(delta: number): void {
    if (this.cfg.mode !== 'spectate' || !this.actionCam) return;
    this.camTimer += delta;
    if (this.camTimer < 1200) return;
    this.camTimer = 0;
    const st = this.runner.state;
    let best: { x: number; y: number } | null = null;
    let bestD = 36; // 6타일 이내 교전만
    for (const u of st.units) {
      if (u.state !== 'attacking' || u.role === 'worker') continue;
      const t = st.units.find((e) => e.id === u.targetId);
      if (!t) continue;
      const d = (u.x - t.x) ** 2 + (u.y - t.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = { x: (u.x + t.x) / 2, y: (u.y + t.y) / 2 };
      }
    }
    if (best) {
      this.cameras.main.pan(best.x * TILE, best.y * TILE, 900, 'Sine.easeInOut', true);
    }
  }

  update(_time: number, delta: number): void {
    const alpha = this.runner.advance(delta);
    this.terrain.update(delta);
    this.units.update(delta, alpha);
    this.fog.update(delta);
    this.cam.update(delta);
    this.hud.update(delta);
    this.minimap.update(delta);
    this.updateActionCam(delta);
    if (!this.ended && this.runner.state.winner !== -1) this.showResult();
  }

  private showResult(): void {
    this.ended = true;
    const w = this.runner.state.winner;
    const spectate = this.cfg.mode === 'spectate';
    const winFaction = this.runner.state.players[w === 1 ? 1 : 0].faction;
    const msg = w === -2 ? '무승부' : spectate ? `${FACTION_PALETTES[winFaction].name} 승리!` : w === 0 ? '승리!' : '패배...';
    const color = w === 0 ? '#f5c542' : w === 1 ? '#ff5a52' : '#9aa0ae';
    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, 460, 160, 0x0c0e14, 0.92).setScrollFactor(0).setDepth(20000);
    this.add
      .text(width / 2, height / 2 - 20, msg, { fontSize: '42px', color, fontStyle: 'bold' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    const sub = spectate ? '5초 후 다음 매치 자동 시작 — ESC 메뉴' : '클릭하면 메뉴로';
    this.add
      .text(width / 2, height / 2 + 28, sub, { fontSize: '16px', color: '#e8e2d0' })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(20001);
    if (spectate) {
      // 연속 관전 루프: 랜덤 종족/시드 로테이션 (플랜 §2.5 "멍때리고 구경")
      const timer = this.time.delayedCall(5000, () => {
        this.hud.destroy();
        const pool: FactionId[] = ['psion', 'demon'];
        const f0 = pool[(this.cfg.seed + 1) % pool.length];
        const f1 = pool[(this.cfg.seed + 7) % pool.length];
        this.scene.restart({ factions: [f0, f1], seed: this.cfg.seed + 1, mode: 'spectate' } satisfies GameSceneConfig);
      });
      this.input.keyboard!.once('keydown-ESC', () => {
        timer.remove();
        this.hud.destroy();
        this.scene.start('menu');
      });
    } else {
      this.input.once('pointerdown', () => {
        this.hud.destroy();
        this.scene.start('menu');
      });
    }
  }
}
