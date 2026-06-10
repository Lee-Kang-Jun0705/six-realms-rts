// 지형 타일 절차 드로잉 — 시드 변형 + 물 2프레임 (움직이는 배경, 플랜 §2.6)

import Phaser from 'phaser';
import { COL } from './palette';
import { TILE } from '../core/const';
import { mulberry32 } from '../core/rng';

type G = Phaser.GameObjects.Graphics;

export function drawGrass(g: G, variant: number): void {
  g.fillStyle(variant === 0 ? COL.grass : COL.grassDark, 1);
  g.fillRect(0, 0, TILE, TILE);
  // 풀잎 점 (시드 변형)
  const rng = mulberry32(100 + variant);
  g.fillStyle(variant === 0 ? COL.grassDark : COL.grass, 1);
  for (let i = 0; i < 5; i++) {
    const x = 3 + rng() * (TILE - 6);
    const y = 3 + rng() * (TILE - 6);
    g.fillRect(x, y, 2, 4);
  }
}

export function drawDirt(g: G): void {
  g.fillStyle(COL.dirt, 1);
  g.fillRect(0, 0, TILE, TILE);
  const rng = mulberry32(7);
  g.fillStyle(COL.dirtDark, 1);
  for (let i = 0; i < 4; i++) {
    g.fillCircle(4 + rng() * (TILE - 8), 4 + rng() * (TILE - 8), 2);
  }
}

export function drawForestTile(g: G, variant: number): void {
  // 잔디 바닥 + 카툰 나무
  drawGrass(g, variant);
  const sway = variant === 0 ? 0 : 1.5; // 바람 웨이브용 2변형
  g.lineStyle(2, COL.outline, 1);
  g.fillStyle(COL.woodDark, 1);
  g.fillRect(TILE / 2 - 2, TILE / 2 + 4, 4, 9);
  g.fillStyle(COL.forest, 1);
  g.fillCircle(TILE / 2 + sway, TILE / 2 - 4, 10);
  g.strokeCircle(TILE / 2 + sway, TILE / 2 - 4, 10);
  g.fillStyle(COL.forestDark, 1);
  g.fillCircle(TILE / 2 - 5 + sway, TILE / 2, 6);
}

export function drawWater(g: G, frame: number): void {
  g.fillStyle(COL.water, 1);
  g.fillRect(0, 0, TILE, TILE);
  // 물결 하이라이트 (2프레임 교차 = 일렁임)
  g.lineStyle(2, COL.waterLight, 1);
  const off = frame === 0 ? 0 : 4;
  for (let i = 0; i < 2; i++) {
    const y = 8 + i * 14 + off;
    g.beginPath();
    g.moveTo(4, y);
    g.lineTo(12, y - 3);
    g.lineTo(20, y);
    g.lineTo(28, y - 3);
    g.strokePath();
  }
}

export function drawRock(g: G): void {
  g.fillStyle(COL.rockDark, 1);
  g.fillRect(0, 0, TILE, TILE);
  g.lineStyle(2, COL.outline, 1);
  g.fillStyle(COL.rock, 1);
  g.fillRoundedRect(3, 5, 26, 22, 8);
  g.strokeRoundedRect(3, 5, 26, 22, 8);
  g.fillStyle(COL.rockDark, 1);
  g.fillCircle(10, 14, 3);
  g.fillCircle(22, 18, 2.5);
}
