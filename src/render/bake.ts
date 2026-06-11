// 텍스처 베이크 — Graphics → generateTexture (Phaser 공식 권장 패턴, 플랜 §1)
// 캐시 키: u-{faction}-{role}-{motion}-{frame} / b-{faction}-{kind}[-tN|-site] / t-{...}

import Phaser from 'phaser';
import type { BuildingKind, FactionId, UnitRole } from '../core/types';
import { BUILDING_STATS } from '../data/baseline';
import { MOTION_FRAMES, UNIT_CANVAS, drawUnitFrame, type Motion } from './artUnits';
import { buildingCanvasSize, drawBuilding, drawConstructionSite, drawGoldMine } from './artBuildings';
import { drawDirt, drawForestTile, drawGrass, drawRock, drawWater } from './artTiles';

const ROLES: UnitRole[] = ['worker', 'melee', 'ranged', 'cavalry', 'siege', 'caster', 'elite'];
const MOTIONS: Motion[] = ['idle', 'walk', 'attack', 'death'];
const KINDS: BuildingKind[] = ['hq', 'farm', 'barracks', 'hall', 'magetower', 'forge', 'tower'];

export function unitKey(faction: FactionId, role: UnitRole, motion: Motion, frame: number): string {
  return `u-${faction}-${role}-${motion}-${frame}`;
}

/** AI 생성 정적 유닛 이미지 키 (있으면 절차 드로잉보다 우선) */
export function unitImageKey(faction: FactionId, role: UnitRole): string {
  return `uimg-${faction}-${role}`;
}

// elite는 cavalry 이미지 재사용(정예 전환형) — 별도 에셋 없을 때
const IMAGE_ROLES: UnitRole[] = ['worker', 'melee', 'ranged', 'cavalry', 'siege', 'caster'];

/** public/units/{faction}-{role}.png 가 있으면 preload (없으면 onerror로 조용히 스킵) */
export function preloadUnitImages(scene: Phaser.Scene, faction: FactionId): void {
  for (const role of IMAGE_ROLES) {
    scene.load.image(unitImageKey(faction, role), `units/${faction}-${role}.png`);
  }
  scene.load.image(unitImageKey(faction, 'elite'), `units/${faction}-cavalry.png`);
}

export function buildingKey(faction: FactionId, kind: BuildingKind, tier: number): string {
  return kind === 'hq' ? `b-${faction}-hq-t${tier}` : `b-${faction}-${kind}`;
}

/** 매치에 등장하는 종족만 베이크 (lazy) */
export function bakeFaction(scene: Phaser.Scene, faction: FactionId): void {
  const g = scene.add.graphics();
  for (const role of ROLES) {
    for (const motion of MOTIONS) {
      for (let f = 0; f < MOTION_FRAMES[motion]; f++) {
        const key = unitKey(faction, role, motion, f);
        if (scene.textures.exists(key)) continue;
        g.clear();
        drawUnitFrame(g, faction, role, motion, f);
        g.generateTexture(key, UNIT_CANVAS, UNIT_CANVAS);
      }
    }
  }
  for (const kind of KINDS) {
    const s = BUILDING_STATS[kind];
    const { cw, ch } = buildingCanvasSize(s.w, s.h);
    const tiers = kind === 'hq' ? [1, 2, 3] : [1];
    for (const tier of tiers) {
      const key = buildingKey(faction, kind, tier);
      if (scene.textures.exists(key)) continue;
      g.clear();
      drawBuilding(g, faction, kind, s.w, s.h, tier as 1 | 2 | 3);
      g.generateTexture(key, cw, ch);
    }
  }
  g.destroy();
}

export function bakeCommon(scene: Phaser.Scene): void {
  const g = scene.add.graphics();
  const bake = (key: string, w: number, h: number, draw: () => void): void => {
    if (scene.textures.exists(key)) return;
    g.clear();
    draw();
    g.generateTexture(key, w, h);
  };
  bake('t-grass0', 32, 32, () => drawGrass(g, 0));
  bake('t-grass1', 32, 32, () => drawGrass(g, 1));
  bake('t-dirt', 32, 32, () => drawDirt(g));
  bake('t-forest0', 32, 32, () => drawForestTile(g, 0));
  bake('t-forest1', 32, 32, () => drawForestTile(g, 1));
  bake('t-water0', 32, 32, () => drawWater(g, 0));
  bake('t-water1', 32, 32, () => drawWater(g, 1));
  bake('t-rock', 32, 32, () => drawRock(g));
  // 건설 비계 (크기별)
  for (const kind of KINDS) {
    const s = BUILDING_STATS[kind];
    const { cw, ch } = buildingCanvasSize(s.w, s.h);
    bake(`site-${s.w}x${s.h}`, cw, ch, () => drawConstructionSite(g, s.w, s.h));
  }
  const mine = buildingCanvasSize(2, 2);
  bake('mine', mine.cw, mine.ch, () => drawGoldMine(g, 2, 2, false));
  bake('mine-collapsed', mine.cw, mine.ch, () => drawGoldMine(g, 2, 2, true));
  g.destroy();
}
