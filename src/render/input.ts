// RTS 입력 — 박스 셀렉션 / 우클릭 컨텍스트 명령 / 어택땅 / 컨트롤그룹 / 건설 고스트
// 즉시 피드백: 선택/박스는 렌더 프레임에서 표시, 시뮬 반영은 다음 틱 (플랜 M-4)

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import type { SimRunner } from '../render/SimRunner';
import type { UnitsLayer } from './unitsLayer';
import type { BuildingKind, Unit } from '../core/types';
import { T_FOREST, tileIndex, inBounds } from '../core/map';
import { canPlace } from '../core/building';
import { BUILDING_STATS } from '../data/baseline';
import { TILE } from '../core/const';
import { distSq } from '../core/vec';

export type InputMode = 'normal' | 'attackTarget' | { build: BuildingKind };

export class InputController {
  mode: InputMode = 'normal';
  selectedBuilding = 0;
  private dragStart: { x: number; y: number } | null = null;
  private boxG: Phaser.GameObjects.Graphics;
  private ghost: Phaser.GameObjects.Image | null = null;
  private groups = new Map<number, number[]>();
  onSelectionChange: () => void = () => {};
  onToast: (msg: string) => void = () => {};

  constructor(
    private scene: Phaser.Scene,
    private runner: SimRunner,
    private units: UnitsLayer,
    private player: 0 | 1,
    private interactive: boolean, // 관전 모드 = false
  ) {
    this.boxG = scene.add.graphics().setDepth(10000).setScrollFactor(0);
    this.bindPointer();
    this.bindKeys();
  }

  private get state(): GameState {
    return this.runner.state;
  }

  selection(): number[] {
    return [...this.units.selection];
  }

  private bindPointer(): void {
    const input = this.scene.input;
    input.mouse?.disableContextMenu();
    input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.interactive) return;
      if (p.rightButtonDown()) this.onRightClick(p);
      else if (p.leftButtonDown()) this.onLeftDown(p);
    });
    input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragStart && p.leftButtonDown()) this.drawBox(p);
      if (this.ghost) this.moveGhost(p);
    });
    input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (p.button === 0 && this.dragStart) this.onLeftUp(p);
    });
  }

  private world(p: Phaser.Input.Pointer): { x: number; y: number } {
    const w = this.scene.cameras.main.getWorldPoint(p.x, p.y);
    return { x: w.x / TILE, y: w.y / TILE };
  }

  private onLeftDown(p: Phaser.Input.Pointer): void {
    if (typeof this.mode === 'object') {
      this.tryPlaceBuilding(p);
      return;
    }
    if (this.mode === 'attackTarget') {
      const w = this.world(p);
      this.issueAttackMove(w.x, w.y);
      this.mode = 'normal';
      return;
    }
    this.dragStart = { x: p.x, y: p.y };
  }

  private onLeftUp(p: Phaser.Input.Pointer): void {
    const start = this.dragStart!;
    this.dragStart = null;
    this.boxG.clear();
    const dx = Math.abs(p.x - start.x);
    const dy = Math.abs(p.y - start.y);
    const additive = p.event.shiftKey;
    if (dx < 6 && dy < 6) this.clickSelect(p, additive);
    else this.boxSelect(start, p, additive);
    this.onSelectionChange();
  }

  private drawBox(p: Phaser.Input.Pointer): void {
    const s = this.dragStart!;
    this.boxG.clear();
    this.boxG.lineStyle(1.5, 0x9bff8a, 0.9);
    this.boxG.strokeRect(Math.min(s.x, p.x), Math.min(s.y, p.y), Math.abs(p.x - s.x), Math.abs(p.y - s.y));
  }

  private clickSelect(p: Phaser.Input.Pointer, additive: boolean): void {
    const w = this.world(p);
    let best: Unit | null = null;
    let bestD = 0.8 * 0.8;
    for (const u of this.state.units) {
      if (u.player !== this.player) continue;
      const d = distSq(u.x, u.y - 0.3, w.x, w.y);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    if (!additive) this.units.selection.clear();
    this.selectedBuilding = 0;
    if (best) {
      this.units.selection.add(best.id);
      return;
    }
    // 건물 선택
    const tx = Math.floor(w.x);
    const ty = Math.floor(w.y);
    for (const b of this.state.buildings) {
      if (b.player !== this.player || b.hp <= 0) continue;
      if (tx >= b.tileX && tx < b.tileX + b.w && ty >= b.tileY && ty < b.tileY + b.h) {
        this.selectedBuilding = b.id;
        this.units.selection.clear();
        return;
      }
    }
  }

  private boxSelect(s: { x: number; y: number }, p: Phaser.Input.Pointer, additive: boolean): void {
    const cam = this.scene.cameras.main;
    const a = cam.getWorldPoint(Math.min(s.x, p.x), Math.min(s.y, p.y));
    const b = cam.getWorldPoint(Math.max(s.x, p.x), Math.max(s.y, p.y));
    if (!additive) this.units.selection.clear();
    this.selectedBuilding = 0;
    for (const u of this.state.units) {
      if (u.player !== this.player) continue;
      const px = u.x * TILE;
      const py = u.y * TILE;
      if (px >= a.x && px <= b.x && py >= a.y && py <= b.y) this.units.selection.add(u.id);
    }
  }

  private onRightClick(p: Phaser.Input.Pointer): void {
    if (typeof this.mode === 'object' || this.mode === 'attackTarget') {
      this.cancelMode();
      return;
    }
    const sel = this.selection();
    if (sel.length === 0) return;
    const w = this.world(p);
    const tx = Math.floor(w.x);
    const ty = Math.floor(w.y);
    // 적 유닛 → 공격
    for (const u of this.state.units) {
      if (u.player === this.player) continue;
      if (distSq(u.x, u.y, w.x, w.y) < 0.65) {
        this.runner.enqueue({ type: 'attackMove', player: this.player, unitIds: sel, x: w.x, y: w.y, targetId: u.id });
        return;
      }
    }
    // 적 건물 → 공격
    for (const b of this.state.buildings) {
      if (b.player === this.player || b.hp <= 0) continue;
      if (tx >= b.tileX && tx < b.tileX + b.w && ty >= b.tileY && ty < b.tileY + b.h) {
        this.runner.enqueue({ type: 'attackMove', player: this.player, unitIds: sel, x: w.x, y: w.y, targetId: b.id });
        return;
      }
    }
    // 금광 → 채집
    for (const m of this.state.mines) {
      if (m.collapsed) continue;
      if (tx >= m.tileX && tx < m.tileX + m.w && ty >= m.tileY && ty < m.tileY + m.h) {
        this.runner.enqueue({ type: 'harvest', player: this.player, unitIds: sel, targetId: m.id });
        return;
      }
    }
    // 숲 → 벌목
    if (inBounds(this.state.map, tx, ty) && this.state.map.terrain[tileIndex(this.state.map, tx, ty)] === T_FOREST) {
      this.runner.enqueue({ type: 'harvest', player: this.player, unitIds: sel, x: w.x, y: w.y });
      return;
    }
    this.runner.enqueue({ type: 'move', player: this.player, unitIds: sel, x: w.x, y: w.y });
  }

  private issueAttackMove(x: number, y: number): void {
    const sel = this.selection();
    if (sel.length > 0) this.runner.enqueue({ type: 'attackMove', player: this.player, unitIds: sel, x, y });
  }

  private bindKeys(): void {
    const kb = this.scene.input.keyboard!;
    kb.on('keydown-A', (e: KeyboardEvent) => {
      if (!this.interactive || e.ctrlKey || e.metaKey) return;
      if (this.selection().length > 0) this.mode = 'attackTarget';
    });
    kb.on('keydown-S', (e: KeyboardEvent) => {
      if (!this.interactive || e.ctrlKey || e.metaKey) return;
      const sel = this.selection();
      if (sel.length > 0) this.runner.enqueue({ type: 'stop', player: this.player, unitIds: sel });
    });
    kb.on('keydown-ESC', () => this.cancelMode());
    for (let n = 1; n <= 9; n++) {
      kb.on(`keydown-${'ONE TWO THREE FOUR FIVE SIX SEVEN EIGHT NINE'.split(' ')[n - 1]}`, (e: KeyboardEvent) => {
        if (!this.interactive) return;
        if (e.ctrlKey || e.metaKey) {
          this.groups.set(n, this.selection());
        } else {
          const g = (this.groups.get(n) ?? []).filter((id) => this.state.units.some((u) => u.id === id));
          if (g.length > 0) {
            this.units.selection = new Set(g);
            this.selectedBuilding = 0;
            this.onSelectionChange();
          }
        }
      });
    }
  }

  /** 건설 모드 진입 (HUD 버튼에서 호출) */
  enterBuildMode(kind: BuildingKind): void {
    if (this.ghost) this.ghost.destroy();
    this.mode = { build: kind };
    const faction = this.state.players[this.player].faction;
    const s = BUILDING_STATS[kind];
    this.ghost = this.scene.add
      .image(0, 0, kind === 'hq' ? `b-${faction}-hq-t1` : `b-${faction}-${kind}`)
      .setOrigin(0, 0)
      .setAlpha(0.55)
      .setDepth(9800);
    void s;
  }

  private moveGhost(p: Phaser.Input.Pointer): void {
    if (!this.ghost || typeof this.mode !== 'object') return;
    const w = this.world(p);
    const tx = Math.floor(w.x);
    const ty = Math.floor(w.y);
    this.ghost.setPosition(tx * TILE - 8, ty * TILE - 18);
    const ok = canPlace(this.state, this.player, this.mode.build, tx, ty) === null;
    this.ghost.setTint(ok ? 0xffffff : 0xff6666);
  }

  private tryPlaceBuilding(p: Phaser.Input.Pointer): void {
    if (typeof this.mode !== 'object') return;
    const kind = this.mode.build;
    const w = this.world(p);
    const tx = Math.floor(w.x);
    const ty = Math.floor(w.y);
    const reject = canPlace(this.state, this.player, kind, tx, ty);
    if (reject) {
      this.onToast(reject === 'insufficient' ? '자원이 부족합니다' : reject === 'tierLocked' ? '본진 티어가 낮습니다' : '건설 불가 지역입니다');
      return;
    }
    const workers = this.selection().filter((id) => this.state.units.find((u) => u.id === id && u.role === 'worker'));
    if (workers.length === 0) {
      this.onToast('일꾼을 선택하세요');
      this.cancelMode();
      return;
    }
    this.runner.enqueue({ type: 'build', player: this.player, unitIds: workers, buildingKind: kind, x: tx, y: ty });
    this.cancelMode();
  }

  cancelMode(): void {
    this.mode = 'normal';
    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }
  }
}
