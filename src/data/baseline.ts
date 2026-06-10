// 공통 골격(미러) 수치 SSOT — 전 종족 동일 비용 곡선 (플랜 §2.2)
// 밸런스 튜닝은 이 파일만 수정. 시간 단위=틱(50ms), 거리=타일.

import type { BuildingKind, UnitRole } from '../core/types';

export interface UnitStats {
  cost: { gold: number; wood: number };
  hp: number;
  damage: number;
  armor: number;
  range: number; // 사거리 (타일)
  attackCooldown: number; // 틱
  windup: number; // 타격 선딜 틱
  speed: number; // 타일/틱
  supply: number;
  trainTicks: number;
  vision: number;
  aggroRange: number; // 자동 교전 탐지
  splash: number; // 0 = 단일, >0 = 반경
  bonusVsBuilding: number; // 배수
  requiresTier: 1 | 2 | 3;
}

export const UNIT_STATS: Record<UnitRole, UnitStats> = {
  worker: {
    cost: { gold: 50, wood: 0 }, hp: 35, damage: 4, armor: 0, range: 1.0,
    attackCooldown: 20, windup: 5, speed: 0.10, supply: 1, trainTicks: 120,
    vision: 4, aggroRange: 0, splash: 0, bonusVsBuilding: 1, requiresTier: 1,
  },
  melee: {
    cost: { gold: 80, wood: 0 }, hp: 75, damage: 9, armor: 1, range: 1.1,
    attackCooldown: 18, windup: 6, speed: 0.11, supply: 1, trainTicks: 160,
    vision: 4, aggroRange: 4.5, splash: 0, bonusVsBuilding: 1, requiresTier: 1,
  },
  ranged: {
    cost: { gold: 70, wood: 30 }, hp: 45, damage: 7, armor: 0, range: 4.5,
    attackCooldown: 24, windup: 6, speed: 0.10, supply: 1, trainTicks: 180,
    vision: 5, aggroRange: 5.0, splash: 0, bonusVsBuilding: 1, requiresTier: 1,
  },
  cavalry: {
    cost: { gold: 130, wood: 20 }, hp: 115, damage: 13, armor: 2, range: 1.2,
    attackCooldown: 20, windup: 6, speed: 0.15, supply: 2, trainTicks: 240,
    vision: 5, aggroRange: 5.0, splash: 0, bonusVsBuilding: 1, requiresTier: 2,
  },
  siege: {
    cost: { gold: 150, wood: 80 }, hp: 65, damage: 28, armor: 0, range: 6.0,
    attackCooldown: 60, windup: 12, speed: 0.07, supply: 2, trainTicks: 300,
    vision: 4, aggroRange: 6.0, splash: 1.2, bonusVsBuilding: 2, requiresTier: 2,
  },
  caster: {
    cost: { gold: 120, wood: 60 }, hp: 50, damage: 5, armor: 0, range: 4.0,
    attackCooldown: 30, windup: 8, speed: 0.10, supply: 2, trainTicks: 280,
    vision: 5, aggroRange: 4.0, splash: 0, bonusVsBuilding: 1, requiresTier: 2,
  },
  // elite = cavalry 전환형 (연구 후 cavalry 슬롯이 elite로 생산) — 수치는 cavalry 강화판
  elite: {
    cost: { gold: 180, wood: 50 }, hp: 150, damage: 17, armor: 3, range: 1.2,
    attackCooldown: 20, windup: 6, speed: 0.15, supply: 3, trainTicks: 300,
    vision: 6, aggroRange: 5.5, splash: 0, bonusVsBuilding: 1, requiresTier: 3,
  },
};

export interface BuildingStats {
  cost: { gold: number; wood: number };
  hp: number;
  w: number;
  h: number;
  buildTicks: number;
  vision: number;
  supplyProvided: number;
  requiresTier: 1 | 2 | 3;
  /** 생산 가능 유닛 */
  trains: UnitRole[];
  attack?: { damage: number; range: number; cooldown: number };
  isProduction: boolean; // 승패 판정 대상 (생산 건물)
}

export const BUILDING_STATS: Record<BuildingKind, BuildingStats> = {
  hq: {
    cost: { gold: 400, wood: 200 }, hp: 1200, w: 3, h: 3, buildTicks: 600,
    vision: 6, supplyProvided: 10, requiresTier: 1, trains: ['worker'], isProduction: true,
  },
  farm: {
    cost: { gold: 80, wood: 40 }, hp: 400, w: 2, h: 2, buildTicks: 160,
    vision: 2, supplyProvided: 4, requiresTier: 1, trains: [], isProduction: false,
  },
  barracks: {
    cost: { gold: 160, wood: 80 }, hp: 800, w: 3, h: 3, buildTicks: 300,
    vision: 4, supplyProvided: 0, requiresTier: 1, trains: ['melee', 'ranged'], isProduction: true,
  },
  hall: {
    cost: { gold: 200, wood: 120 }, hp: 750, w: 3, h: 3, buildTicks: 300,
    vision: 4, supplyProvided: 0, requiresTier: 2, trains: ['cavalry', 'siege'], isProduction: true,
  },
  magetower: {
    cost: { gold: 180, wood: 150 }, hp: 600, w: 2, h: 2, buildTicks: 280,
    vision: 5, supplyProvided: 0, requiresTier: 2, trains: ['caster'], isProduction: true,
  },
  forge: {
    cost: { gold: 140, wood: 100 }, hp: 650, w: 2, h: 2, buildTicks: 240,
    vision: 3, supplyProvided: 0, requiresTier: 1, trains: [], isProduction: false,
  },
  tower: {
    cost: { gold: 100, wood: 80 }, hp: 500, w: 2, h: 2, buildTicks: 200,
    vision: 7, supplyProvided: 0, requiresTier: 1, trains: [],
    attack: { damage: 12, range: 5.5, cooldown: 20 }, isProduction: false,
  },
};

export const TIER_UP = {
  2: { cost: { gold: 600, wood: 300 }, ticks: 400 },
  3: { cost: { gold: 900, wood: 500 }, ticks: 500 },
} as const;

export const UPGRADES: Record<string, { cost: { gold: number; wood: number }; ticks: number; maxLevel: number }> = {
  weapon: { cost: { gold: 150, wood: 100 }, ticks: 300, maxLevel: 2 }, // 공격 +2/레벨
  armor: { cost: { gold: 150, wood: 100 }, ticks: 300, maxLevel: 2 }, // 방어 +1/레벨
  elite: { cost: { gold: 300, wood: 200 }, ticks: 400, maxLevel: 1 }, // 기동→정예 전환 해금
};

// 경제 수치
export const ECON = {
  goldPerTrip: 10,
  miningTicks: 40,
  woodPerTrip: 8,
  chopTicks: 60,
  startGold: 600,
  startWood: 300,
  startWorkers: 5,
  mineGold: 10_000,
  buildRate: 1, // 일꾼 1기당 틱당 건설 진행량 (buildTicks 대비)
  repairCostper: 0.25,
};

export const WEAPON_DMG_PER_LV = 2;
export const ARMOR_PER_LV = 1;
