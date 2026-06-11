// 유닛/건물/금광 스프라이트 동기화 — 보간/모션/사망 연출/체력바/선택링

import Phaser from 'phaser';
import type { GameState } from '../core/state';
import type { Unit } from '../core/types';
import type { SimRunner } from './SimRunner';
import { MOTION_FRAMES, type Motion } from './artUnits';
import { buildingKey, unitImageKey, unitKey } from './bake';
import { BUILDING_PAD } from './artBuildings';
import { COL, teamColor } from './palette';
import { TILE } from '../core/const';

interface UnitView {
  sprite: Phaser.GameObjects.Image;
  faction: Unit['faction'];
  role: Unit['role'];
  player: number;
  facing: number; // 1=우, -1=좌
  lastX: number;
  lastY: number;
}

export class UnitsLayer {
  private views = new Map<number, UnitView>();
  private buildingViews = new Map<number, { sprite: Phaser.GameObjects.Image; progress: number; tier: number }>();
  private mineViews = new Map<number, { sprite: Phaser.GameObjects.Image; collapsed: boolean }>();
  private overlay: Phaser.GameObjects.Graphics;
  private animTime = 0;
  selection = new Set<number>();
  /** 시야 판정 콜백 (GameScene이 주입) — 적 유닛 안개 은폐 */
  isTileVisible: (tx: number, ty: number) => boolean = () => true;
  isTileExplored: (tx: number, ty: number) => boolean = () => true;
  viewPlayer = 0;

  constructor(private scene: Phaser.Scene, private state: GameState, private runner: SimRunner) {
    this.overlay = scene.add.graphics().setDepth(9000);
  }

  update(deltaMs: number, alpha: number): void {
    this.animTime += deltaMs;
    this.syncMines();
    this.syncBuildings();
    this.syncUnits(alpha);
    this.drawOverlay(alpha);
  }

  private motionOf(u: Unit): Motion {
    if (u.state === 'attacking' || (u.state === 'harvesting' && u.harvestTicks > 0) || u.state === 'building') return 'attack';
    const moved = Math.abs(u.x - u.lastX) + Math.abs(u.y - u.lastY) > 0.002;
    if (moved && u.state !== 'idle') return 'walk';
    return 'idle';
  }

  /** AI 정적 이미지가 로드돼 있으면 그 키, 아니면 절차 드로잉 키 */
  private hasImage(faction: Unit['faction'], role: Unit['role']): boolean {
    return this.scene.textures.exists(unitImageKey(faction, role));
  }

  private syncUnits(alpha: number): void {
    const seen = new Set<number>();
    for (const u of this.state.units) {
      seen.add(u.id);
      const useImage = this.hasImage(u.faction, u.role);
      let v = this.views.get(u.id);
      if (!v) {
        const startKey = useImage ? unitImageKey(u.faction, u.role) : unitKey(u.faction, u.role, 'idle', 0);
        const sprite = this.scene.add.image(0, 0, startKey).setOrigin(0.5, 0.875);
        if (useImage) sprite.setDisplaySize(40, 40); // 256px 원본 → 약 1.25타일 표시
        v = { sprite, faction: u.faction, role: u.role, player: u.player, facing: 1, lastX: u.x, lastY: u.y };
        this.views.set(u.id, v);
      }
      const x = this.runner.lerpX(u.id, u.x, alpha) * TILE;
      const y = this.runner.lerpY(u.id, u.y, alpha) * TILE;
      const dx = x - v.lastX;
      if (Math.abs(dx) > 0.5) v.facing = dx > 0 ? 1 : -1;
      v.lastX = x;
      v.lastY = y;
      const motion = this.motionOf(u);
      if (useImage) {
        // 정적 스프라이트 + 살짝의 생동감(공격 시 전진 펀치, 이동 시 미세 bob) — 위치만 흔들고 그림은 고정
        v.sprite.setTexture(unitImageKey(u.faction, u.role));
        const bob = motion === 'walk' ? Math.sin(this.animTime / 90 + u.id) * 1.2 : 0;
        v.sprite.setPosition(x, y + bob).setDepth(y);
      } else {
        const frames = MOTION_FRAMES[motion];
        const frame = Math.floor(this.animTime / (motion === 'attack' ? 110 : 140)) % frames;
        v.sprite.setTexture(unitKey(u.faction, u.role, motion, frame));
        v.sprite.setPosition(x, y).setDepth(y);
      }
      v.sprite.setFlipX(v.facing < 0);
      const veiled = u.buffs.some((b) => b.kind === 'stealth' || b.kind === 'disguise');
      const isEnemy = u.player !== this.viewPlayer && this.viewPlayer >= 0;
      const hidden =
        (u.player !== this.viewPlayer && this.viewPlayer >= 0 && !this.isTileVisible(Math.floor(u.x), Math.floor(u.y))) ||
        (veiled && isEnemy); // 은신/둔갑 적 유닛은 미표시 (디텍터 판정은 시뮬에서)
      v.sprite.setVisible(!hidden);
      v.sprite.setAlpha(veiled && !hidden ? 0.45 : 1);
    }
    // 사라진 유닛 → 사망 연출 + 선택 목록에서 제거 (죽은 유닛 카운트 잔존 버그)
    for (const [id, v] of this.views) {
      if (seen.has(id)) continue;
      this.views.delete(id);
      this.selection.delete(id);
      this.playDeath(v);
    }
  }

  private playDeath(v: UnitView): void {
    const sprite = v.sprite;
    // 정적 이미지 유닛은 death 프레임이 없음 → 쓰러짐(회전)+페이드로 연출
    if (this.hasImage(v.faction, v.role)) {
      this.scene.tweens.add({
        targets: sprite, alpha: 0, angle: v.facing < 0 ? -80 : 80, scaleX: sprite.scaleX * 0.9,
        duration: 600, onComplete: () => sprite.destroy(),
      });
      return;
    }
    let frame = 0;
    sprite.setTexture(unitKey(v.faction, v.role, 'death', 0));
    this.scene.time.addEvent({
      delay: 110,
      repeat: 3,
      callback: () => {
        frame = Math.min(3, frame + 1);
        sprite.setTexture(unitKey(v.faction, v.role, 'death', frame));
        sprite.setAlpha(1 - frame * 0.22);
      },
    });
    this.scene.tweens.add({ targets: sprite, alpha: 0, delay: 500, duration: 600, onComplete: () => sprite.destroy() });
  }

  private syncBuildings(): void {
    const seen = new Set<number>();
    for (const b of this.state.buildings) {
      if (b.hp <= 0) continue;
      seen.add(b.id);
      let v = this.buildingViews.get(b.id);
      const wantKey = b.buildProgress < 1 ? `site-${b.w}x${b.h}` : buildingKey(b.faction, b.kind, b.tier);
      if (!v) {
        const sprite = this.scene.add
          .image(b.tileX * TILE - BUILDING_PAD, b.tileY * TILE - BUILDING_PAD - 10, wantKey)
          .setOrigin(0, 0)
          .setDepth((b.tileY + b.h) * TILE);
        v = { sprite, progress: b.buildProgress, tier: b.tier };
        this.buildingViews.set(b.id, v);
      }
      if ((v.progress < 1 && b.buildProgress >= 1) || v.tier !== b.tier) {
        v.sprite.setTexture(wantKey);
        v.progress = b.buildProgress;
        v.tier = b.tier;
      }
      const hidden = b.player !== this.viewPlayer && !this.isTileExplored(b.tileX + 1, b.tileY + 1);
      v.sprite.setVisible(!hidden);
    }
    for (const [id, v] of this.buildingViews) {
      if (seen.has(id)) continue;
      this.buildingViews.delete(id);
      const s = v.sprite;
      this.scene.tweens.add({ targets: s, alpha: 0, scaleY: 0.6, duration: 500, onComplete: () => s.destroy() });
    }
  }

  private syncMines(): void {
    for (const m of this.state.mines) {
      let v = this.mineViews.get(m.id);
      if (!v) {
        const sprite = this.scene.add
          .image(m.tileX * TILE - BUILDING_PAD, m.tileY * TILE - BUILDING_PAD - 10, 'mine')
          .setOrigin(0, 0)
          .setDepth((m.tileY + m.h) * TILE);
        v = { sprite, collapsed: false };
        this.mineViews.set(m.id, v);
      }
      if (m.collapsed && !v.collapsed) {
        v.collapsed = true;
        v.sprite.setTexture('mine-collapsed');
      }
    }
  }

  /** 선택링 + 체력바 + 실드바 (매 프레임 1회 Graphics 재드로) */
  private drawOverlay(alpha: number): void {
    const g = this.overlay;
    g.clear();
    for (const u of this.state.units) {
      const x = this.runner.lerpX(u.id, u.x, alpha) * TILE;
      const y = this.runner.lerpY(u.id, u.y, alpha) * TILE;
      // 발밑 팀 컬러 링 (아군/적 구분 — 같은 종족 그림이라 색링으로 식별)
      const tc = teamColor(u.player);
      g.fillStyle(tc, 0.28);
      g.fillEllipse(x, y + 4, 22, 9);
      g.lineStyle(2, tc, 0.9);
      g.strokeEllipse(x, y + 4, 22, 9);
      if (this.selection.has(u.id)) {
        g.lineStyle(2.5, 0x9bff8a, 1);
        g.strokeEllipse(x, y + 4, 28, 13);
      }
      if (u.hp < u.maxHp || this.selection.has(u.id)) {
        const w = 24;
        const ratio = Math.max(0, u.hp / u.maxHp);
        g.fillStyle(COL.outline, 0.8);
        g.fillRect(x - w / 2 - 1, y - 38, w + 2, 5);
        g.fillStyle(ratio > 0.4 ? COL.hpGreen : COL.hpRed, 1);
        g.fillRect(x - w / 2, y - 37, w * ratio, 3);
        if (u.shield > 0) {
          const cap = Math.max(1, Math.floor(u.maxHp * 0.15));
          g.fillStyle(0x35f0e0, 1);
          g.fillRect(x - w / 2, y - 40, w * Math.min(1, u.shield / cap), 2);
        }
      }
    }
    for (const b of this.state.buildings) {
      if (b.hp <= 0) continue;
      const cx = (b.tileX + b.w / 2) * TILE;
      const topY = b.tileY * TILE - 14;
      if (b.hp < b.maxHp || b.buildProgress < 1) {
        const w = b.w * TILE - 8;
        g.fillStyle(COL.outline, 0.8);
        g.fillRect(cx - w / 2 - 1, topY, w + 2, 6);
        const ratio = b.buildProgress < 1 ? b.buildProgress : b.hp / b.maxHp;
        g.fillStyle(b.buildProgress < 1 ? 0xf2c14e : ratio > 0.4 ? COL.hpGreen : COL.hpRed, 1);
        g.fillRect(cx - w / 2, topY + 1, w * Math.max(0, ratio), 4);
      }
      g.fillStyle(teamColor(b.player), 1);
      g.fillCircle(b.tileX * TILE + 6, b.tileY * TILE + 6, 3);
    }
  }
}
