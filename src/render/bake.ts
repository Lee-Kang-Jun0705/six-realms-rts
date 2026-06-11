// 텍스처 베이크 — Graphics → generateTexture (Phaser 공식 권장 패턴, 플랜 §1)
// 캐시 키: u-{faction}-{role}-{motion}-{frame} / b-{faction}-{kind}[-tN|-site] / t-{...}

import Phaser from 'phaser';
import type { BuildingKind, FactionId, UnitRole } from '../core/types';
import { BUILDING_STATS } from '../data/baseline';
import { hasUnitImages } from '../data/unitManifest';
import { hasBuildingImages } from '../data/buildingManifest';
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

/** 보유 종족(매니페스트)만 유닛 이미지 preload — 미보유는 절차 드로잉 폴백 */
export function preloadUnitImages(scene: Phaser.Scene, faction: FactionId): void {
  if (!hasUnitImages(faction)) return;
  for (const role of IMAGE_ROLES) {
    scene.load.image(unitImageKey(faction, role), `units/${faction}-${role}.png`);
  }
  scene.load.image(unitImageKey(faction, 'elite'), `units/${faction}-cavalry.png`);
}

export function buildingKey(faction: FactionId, kind: BuildingKind, tier: number): string {
  return kind === 'hq' ? `b-${faction}-hq-t${tier}` : `b-${faction}-${kind}`;
}

/** AI 생성 건물 이미지 키 (있으면 절차 드로잉보다 우선, 티어 무관 1장) */
export function buildingImageKey(faction: FactionId, kind: BuildingKind): string {
  return `bimg-${faction}-${kind}`;
}

/** 보유 종족만 건물 이미지 preload */
export function preloadBuildingImages(scene: Phaser.Scene, faction: FactionId): void {
  if (!hasBuildingImages(faction)) return;
  for (const kind of KINDS) {
    scene.load.image(buildingImageKey(faction, kind), `buildings/${faction}-${kind}.png`);
  }
}

// AI 지형 타일 (있으면 절차 t-* 대신 사용). 키: tileimg-{name}
const TILE_NAMES = ['grass', 'grass2', 'dirt', 'forest', 'water', 'rock'] as const;
export function tileImageKey(name: string): string {
  return `tileimg-${name}`;
}
export function preloadTileImages(scene: Phaser.Scene): void {
  for (const n of TILE_NAMES) scene.load.image(tileImageKey(n), `tiles/${n}.png`);
}

// AI 맵 오브젝트 (있으면 절차 도형 대신 사용). 키: objimg-{name}
const OBJECT_NAMES = ['mine'] as const;
export function objectImageKey(name: string): string {
  return `objimg-${name}`;
}
export function preloadObjectImages(scene: Phaser.Scene): void {
  for (const n of OBJECT_NAMES) scene.load.image(objectImageKey(n), `objects/${n}.png`);
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
