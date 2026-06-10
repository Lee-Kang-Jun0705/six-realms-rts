// AI 타입 — 성향(AoE2 strategic numbers 방식) + 난이도 + 정찰 인텔 (플랜 §2.4)

import type { BuildingKind, FactionId, UnitRole } from '../types';

export interface Personality {
  aggression: number; // 0~1: 공격 임계 병력가치 낮춤
  expandDesire: number; // 0~1: (차기: 멀티 확장)
  techDesire: number; // 0~1: 티어업/연구 우선
  harass: number; // 0~1: 견제 분대 빈도
}

export interface Difficulty {
  name: '쉬움' | '보통' | '어려움';
  decisionInterval: number; // 의사결정 주기 (틱)
  reactionMin: number; // 반응 지연 (틱, 시드 스트림 추출 범위)
  reactionMax: number;
  apmCap: number; // 의사결정당 명령 수 상한
  scoutInterval: number; // 재정찰 주기 (틱)
}

export const DIFFICULTIES: Record<string, Difficulty> = {
  easy: { name: '쉬움', decisionInterval: 16, reactionMin: 12, reactionMax: 24, apmCap: 2, scoutInterval: 2400 },
  normal: { name: '보통', decisionInterval: 8, reactionMin: 6, reactionMax: 16, apmCap: 3, scoutInterval: 1600 },
  hard: { name: '어려움', decisionInterval: 4, reactionMin: 4, reactionMax: 8, apmCap: 5, scoutInterval: 1000 },
};

/** 빌드오더 항목: supply 도달 시 1회 실행 (Liquipedia 빌드오더 패턴) */
export interface BuildStep {
  atSupply: number;
  action:
    | { kind: 'build'; building: BuildingKind }
    | { kind: 'tierUp' }
    | { kind: 'upgrade'; id: string }
    | { kind: 'workersTarget'; n: number };
}

export interface BuildOrder {
  id: string;
  ko: string;
  faction: FactionId | 'any';
  style: 'rush' | 'eco' | 'tech';
  steps: BuildStep[];
  /** 빌드 완료 후 지속 생산 가중치 */
  composition: Partial<Record<UnitRole, number>>;
  workersTarget: number;
  /** 공격 개시 병력 가치 (골드 환산) — aggression으로 보정 */
  attackArmyValue: number;
}

/** 정찰 인텔 — AI는 이 정보(자기 안개 기준)만 사용. 치팅 금지 (플랜 §2.4 ①③) */
export interface Intel {
  enemyBasePos: { x: number; y: number } | null;
  enemySeenBarracks: number;
  enemySeenTowers: number;
  enemySeenTier: number;
  enemyArmyValueSeen: number; // 최근 목격 병력 가치 (감쇠)
  lastSeenTick: number;
  threatNearBase: number; // 본진 근처 적 병력 가치
}

export type SquadState = 'gather' | 'attack' | 'defend' | 'harass' | 'retreat';
