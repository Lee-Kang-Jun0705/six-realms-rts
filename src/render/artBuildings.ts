// 건물 절차 드로잉 — 베이스 7종 + 종족 모티프(지붕색/깃발) + 건설중 비계 (플랜 §2.6)

import Phaser from 'phaser';
import type { BuildingKind, FactionId } from '../core/types';
import { COL, FACTION_PALETTES } from './palette';
import { TILE } from '../core/const';

type G = Phaser.GameObjects.Graphics;

export const BUILDING_PAD = 8; // 캔버스 여백 (지붕 돌출)

export function buildingCanvasSize(w: number, h: number): { cw: number; ch: number } {
  return { cw: w * TILE + BUILDING_PAD * 2, ch: h * TILE + BUILDING_PAD * 2 + 10 };
}

export function drawBuilding(g: G, faction: FactionId, kind: BuildingKind, w: number, h: number, tier: 1 | 2 | 3): void {
  const pal = FACTION_PALETTES[faction];
  const px = BUILDING_PAD;
  const py = BUILDING_PAD + 10;
  const W = w * TILE;
  const H = h * TILE;
  g.lineStyle(3, COL.outline, 1);
  switch (kind) {
    case 'hq':
      drawKeep(g, pal.main, pal.sub, pal.accent, px, py, W, H, tier);
      break;
    case 'farm':
      drawFarm(g, pal.main, px, py, W, H);
      break;
    case 'tower':
      drawTower(g, pal.main, pal.sub, px, py, W, H);
      break;
    case 'magetower':
      drawMageTower(g, pal.main, pal.accent, px, py, W, H);
      break;
    case 'forge':
      drawForge(g, pal.main, px, py, W, H);
      break;
    default: // barracks / hall — 큰 집 + 깃발
      drawHall(g, pal.main, pal.sub, px, py, W, H, kind === 'hall');
  }
}

function base(g: G, color: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(COL.rock, 1);
  g.fillRoundedRect(x, y + h * 0.45, w, h * 0.55, 6);
  g.strokeRoundedRect(x, y + h * 0.45, w, h * 0.55, 6);
  g.fillStyle(color, 1);
  g.fillRoundedRect(x + 2, y + h * 0.45 + 2, w - 4, 8, 4);
}

function roof(g: G, color: number, x: number, y: number, w: number, peak: number): void {
  g.fillStyle(color, 1);
  g.fillTriangle(x - 5, y, x + w + 5, y, x + w / 2, y - peak);
  g.strokeTriangle(x - 5, y, x + w + 5, y, x + w / 2, y - peak);
}

function flag(g: G, color: number, x: number, y: number): void {
  g.lineStyle(2.5, COL.outline, 1);
  g.lineBetween(x, y, x, y - 16);
  g.fillStyle(color, 1);
  g.fillTriangle(x, y - 16, x, y - 8, x + 12, y - 12);
  g.strokeTriangle(x, y - 16, x, y - 8, x + 12, y - 12);
}

function door(g: G, x: number, y: number): void {
  g.fillStyle(COL.woodDark, 1);
  g.fillRoundedRect(x - 6, y - 12, 12, 12, { tl: 6, tr: 6, bl: 0, br: 0 });
  g.strokeRoundedRect(x - 6, y - 12, 12, 12, { tl: 6, tr: 6, bl: 0, br: 0 });
}

function drawKeep(g: G, main: number, sub: number, accent: number, x: number, y: number, w: number, h: number, tier: number): void {
  // 본진: 성채 — 티어마다 측탑 추가
  g.fillStyle(sub, 1);
  g.fillRoundedRect(x + 4, y + h * 0.3, w - 8, h * 0.7, 6);
  g.strokeRoundedRect(x + 4, y + h * 0.3, w - 8, h * 0.7, 6);
  // 중앙 탑
  g.fillStyle(main, 1);
  g.fillRoundedRect(x + w / 2 - 14, y + 2, 28, h * 0.45, 4);
  g.strokeRoundedRect(x + w / 2 - 14, y + 2, 28, h * 0.45, 4);
  roof(g, main, x + w / 2 - 16, y + 2, 32, 18);
  // 측탑 (티어 2/3)
  for (let t = 2; t <= tier; t++) {
    const tx = t === 2 ? x + 4 : x + w - 24;
    g.fillStyle(main, 1);
    g.fillRoundedRect(tx, y + h * 0.18, 20, h * 0.4, 4);
    g.strokeRoundedRect(tx, y + h * 0.18, 20, h * 0.4, 4);
    roof(g, sub, tx, y + h * 0.18, 20, 12);
  }
  door(g, x + w / 2, y + h);
  flag(g, accent, x + w / 2, y - 14);
}

function drawFarm(g: G, main: number, x: number, y: number, w: number, h: number): void {
  // 밭 이랑 + 오두막
  g.fillStyle(COL.dirt, 1);
  g.fillRoundedRect(x, y + h * 0.35, w, h * 0.65, 5);
  g.strokeRoundedRect(x, y + h * 0.35, w, h * 0.65, 5);
  g.lineStyle(2, COL.dirtDark, 1);
  for (let i = 1; i <= 3; i++) g.lineBetween(x + 4, y + h * 0.35 + (h * 0.65 * i) / 4, x + w - 4, y + h * 0.35 + (h * 0.65 * i) / 4);
  g.lineStyle(3, COL.outline, 1);
  g.fillStyle(main, 1);
  g.fillRoundedRect(x + 2, y + 6, w * 0.45, h * 0.45, 4);
  g.strokeRoundedRect(x + 2, y + 6, w * 0.45, h * 0.45, 4);
  roof(g, COL.wood, x + 2, y + 6, w * 0.45, 12);
}

function drawHall(g: G, main: number, sub: number, x: number, y: number, w: number, h: number, isHall: boolean): void {
  base(g, sub, x, y, w, h);
  g.fillStyle(main, 1);
  g.fillRoundedRect(x + 6, y + 8, w - 12, h * 0.5, 5);
  g.strokeRoundedRect(x + 6, y + 8, w - 12, h * 0.5, 5);
  roof(g, main, x + 6, y + 8, w - 12, 16);
  door(g, x + w / 2, y + h * 0.95);
  if (isHall) {
    // 전당: 편자 문양
    g.lineStyle(3, sub, 1);
    g.strokeCircle(x + w / 2, y + h * 0.3, 7);
    g.lineStyle(3, COL.outline, 1);
  }
  flag(g, sub, x + w - 12, y - 4);
}

function drawTower(g: G, main: number, sub: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(main, 1);
  g.fillRoundedRect(x + w * 0.25, y + 6, w * 0.5, h - 6, 4);
  g.strokeRoundedRect(x + w * 0.25, y + 6, w * 0.5, h - 6, 4);
  // 총안 (battlement)
  g.fillStyle(sub, 1);
  for (let i = 0; i < 3; i++) g.fillRect(x + w * 0.25 + 2 + i * (w * 0.5 - 8) / 2, y, 6, 10);
  // 감시경 (디텍터 상징)
  g.fillStyle(COL.gold, 1);
  g.fillCircle(x + w / 2, y + h * 0.4, 5);
  g.strokeCircle(x + w / 2, y + h * 0.4, 5);
  g.fillStyle(COL.outline, 1);
  g.fillCircle(x + w / 2, y + h * 0.4, 2);
}

function drawMageTower(g: G, main: number, accent: number, x: number, y: number, w: number, h: number): void {
  g.fillStyle(main, 1);
  g.fillRoundedRect(x + w * 0.2, y + 10, w * 0.6, h - 10, 5);
  g.strokeRoundedRect(x + w * 0.2, y + 10, w * 0.6, h - 10, 5);
  roof(g, main, x + w * 0.2, y + 10, w * 0.6, 20);
  // 부유 보주
  g.fillStyle(accent, 1);
  g.fillCircle(x + w / 2, y - 6, 6);
  g.strokeCircle(x + w / 2, y - 6, 6);
}

function drawForge(g: G, main: number, x: number, y: number, w: number, h: number): void {
  base(g, COL.rockDark, x, y, w, h);
  g.fillStyle(main, 1);
  g.fillRoundedRect(x + 4, y + 12, w - 8, h * 0.45, 4);
  g.strokeRoundedRect(x + 4, y + 12, w - 8, h * 0.45, 4);
  // 굴뚝 + 모루
  g.fillStyle(COL.rockDark, 1);
  g.fillRect(x + w - 18, y - 2, 10, 18);
  g.strokeRect(x + w - 18, y - 2, 10, 18);
  g.fillStyle(COL.steelDark, 1);
  g.fillRoundedRect(x + 10, y + h * 0.62, 16, 8, 2);
  g.strokeRoundedRect(x + 10, y + h * 0.62, 16, 8, 2);
}

/** 건설중 비계 */
export function drawConstructionSite(g: G, w: number, h: number): void {
  const px = BUILDING_PAD;
  const py = BUILDING_PAD + 10;
  const W = w * TILE;
  const H = h * TILE;
  g.lineStyle(3, COL.outline, 1);
  g.fillStyle(COL.dirt, 1);
  g.fillRoundedRect(px, py + H * 0.5, W, H * 0.5, 5);
  g.strokeRoundedRect(px, py + H * 0.5, W, H * 0.5, 5);
  g.lineStyle(3, COL.wood, 1);
  // 비계 골조
  g.strokeRect(px + 6, py + 6, W - 12, H - 12);
  g.lineBetween(px + 6, py + 6, px + W - 6, py + H - 6);
  g.lineBetween(px + W - 6, py + 6, px + 6, py + H - 6);
}

/** 금광 (중립) */
export function drawGoldMine(g: G, w: number, h: number, collapsed: boolean): void {
  const px = BUILDING_PAD;
  const py = BUILDING_PAD + 10;
  const W = w * TILE;
  const H = h * TILE;
  g.lineStyle(3, COL.outline, 1);
  g.fillStyle(collapsed ? COL.rockDark : COL.rock, 1);
  // 바위 더미
  g.fillRoundedRect(px, py + H * 0.25, W, H * 0.75, 10);
  g.strokeRoundedRect(px, py + H * 0.25, W, H * 0.75, 10);
  g.fillCircle(px + W * 0.3, py + H * 0.3, 12);
  g.strokeCircle(px + W * 0.3, py + H * 0.3, 12);
  // 입구
  g.fillStyle(COL.outline, 1);
  g.fillRoundedRect(px + W / 2 - 8, py + H - 18, 16, 18, { tl: 8, tr: 8, bl: 0, br: 0 });
  if (!collapsed) {
    g.fillStyle(COL.gold, 1);
    g.fillCircle(px + W * 0.25, py + H * 0.55, 4);
    g.fillCircle(px + W * 0.7, py + H * 0.4, 3);
    g.strokeCircle(px + W * 0.25, py + H * 0.55, 4);
  }
}
