// 월드 맵 — ASCII 레이아웃 기반 (결정적, 가독성, 테스트 용이)
// 기호: '.'잔디 ','흙 'F'숲 '~'물 '#'바위 'G'금광(2x2 앵커) '1'/'2' 시작 위치

import type { GoldMine } from './types';

export const T_GRASS = 0;
export const T_DIRT = 1;
export const T_FOREST = 2;
export const T_WATER = 3;
export const T_ROCK = 4;

export type PassClass = 'ground' | 'forest'; // forest = 요괴(숲 통과)

export interface StartPos {
  x: number;
  y: number;
}

export interface WorldMap {
  width: number;
  height: number;
  terrain: Uint8Array;
  wood: Uint16Array; // 숲 타일 잔여 목재
  occupancy: Int32Array; // 건물/금광 점유 엔티티 id (0=빈칸)
  terrainVersion: number; // 벌목 등 통행 변화 시 증가 (FlowField 무효화 키)
  starts: [StartPos, StartPos];
  mineSpots: { tileX: number; tileY: number }[]; // 금광 앵커 (엔티티는 state에서 생성)
}

export const WOOD_PER_TILE = 200;

export function parseMap(ascii: string): WorldMap {
  const rows = ascii.trim().split('\n').map((r) => r.trim());
  const height = rows.length;
  const width = rows[0].length;
  const terrain = new Uint8Array(width * height);
  const wood = new Uint16Array(width * height);
  const starts: StartPos[] = [{ x: 4, y: 4 }, { x: width - 5, y: height - 5 }];
  const mineSpots: { tileX: number; tileY: number }[] = [];

  for (let y = 0; y < height; y++) {
    if (rows[y].length !== width) throw new Error(`맵 행 ${y} 길이 불일치`);
    for (let x = 0; x < width; x++) {
      const ch = rows[y][x];
      const i = y * width + x;
      if (ch === 'F') {
        terrain[i] = T_FOREST;
        wood[i] = WOOD_PER_TILE;
      } else if (ch === '~') terrain[i] = T_WATER;
      else if (ch === '#') terrain[i] = T_ROCK;
      else if (ch === ',') terrain[i] = T_DIRT;
      else terrain[i] = T_GRASS;
      if (ch === '1') starts[0] = { x, y };
      if (ch === '2') starts[1] = { x, y };
      if (ch === 'G') mineSpots.push({ tileX: x, tileY: y });
    }
  }
  return {
    width,
    height,
    terrain,
    wood,
    occupancy: new Int32Array(width * height),
    terrainVersion: 0,
    starts: [starts[0], starts[1]],
    mineSpots,
  };
}

export function inBounds(map: WorldMap, tx: number, ty: number): boolean {
  return tx >= 0 && ty >= 0 && tx < map.width && ty < map.height;
}

export function tileIndex(map: WorldMap, tx: number, ty: number): number {
  return ty * map.width + tx;
}

/** 통행 가능 여부 (유닛 이동/건물 배치 공용) */
export function passable(map: WorldMap, tx: number, ty: number, cls: PassClass): boolean {
  if (!inBounds(map, tx, ty)) return false;
  const t = map.terrain[tileIndex(map, tx, ty)];
  if (t === T_WATER || t === T_ROCK) return false;
  if (t === T_FOREST && cls !== 'forest') return false;
  return map.occupancy[tileIndex(map, tx, ty)] === 0;
}

/** 벌목 진행: 목재 감소, 고갈 시 잔디로 전환 + terrainVersion 증가 */
export function chopForest(map: WorldMap, tx: number, ty: number, amount: number): number {
  const i = tileIndex(map, tx, ty);
  if (map.terrain[i] !== T_FOREST) return 0;
  const got = Math.min(amount, map.wood[i]);
  map.wood[i] -= got;
  if (map.wood[i] === 0) {
    map.terrain[i] = T_GRASS;
    map.terrainVersion++;
  }
  return got;
}

export function occupyRect(map: WorldMap, id: number, tx: number, ty: number, w: number, h: number): void {
  for (let y = ty; y < ty + h; y++)
    for (let x = tx; x < tx + w; x++) map.occupancy[tileIndex(map, x, y)] = id;
  map.terrainVersion++;
}

export function freeRect(map: WorldMap, tx: number, ty: number, w: number, h: number): void {
  for (let y = ty; y < ty + h; y++)
    for (let x = tx; x < tx + w; x++) map.occupancy[tileIndex(map, x, y)] = 0;
  map.terrainVersion++;
}

/** 금광 엔티티 점유 등록 헬퍼 */
export function placeMine(map: WorldMap, mine: GoldMine): void {
  occupyRect(map, mine.id, mine.tileX, mine.tileY, mine.w, mine.h);
}
