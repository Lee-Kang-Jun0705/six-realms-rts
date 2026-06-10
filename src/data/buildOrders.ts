// 빌드오더 라이브러리 — 종족당 3종 (러시/확장/테크), supply 트리거 시퀀스 (플랜 §2.4)

import type { BuildOrder } from '../core/ai/types';

export const BUILD_ORDERS: BuildOrder[] = [
  // ── 초능력자 ──────────────────────────────
  {
    id: 'psion-rush', ko: '초능력자 사이킥 러시', faction: 'psion', style: 'rush',
    steps: [
      { atSupply: 5, action: { kind: 'workersTarget', n: 9 } },
      { atSupply: 6, action: { kind: 'build', building: 'barracks' } },
      { atSupply: 8, action: { kind: 'build', building: 'farm' } },
      { atSupply: 12, action: { kind: 'build', building: 'farm' } },
    ],
    composition: { melee: 3, ranged: 4 },
    workersTarget: 9,
    attackArmyValue: 450,
  },
  {
    id: 'psion-eco', ko: '초능력자 확장 운영', faction: 'psion', style: 'eco',
    steps: [
      { atSupply: 5, action: { kind: 'workersTarget', n: 14 } },
      { atSupply: 7, action: { kind: 'build', building: 'farm' } },
      { atSupply: 9, action: { kind: 'build', building: 'barracks' } },
      { atSupply: 13, action: { kind: 'build', building: 'forge' } },
      { atSupply: 15, action: { kind: 'build', building: 'farm' } },
      { atSupply: 16, action: { kind: 'upgrade', id: 'weapon' } },
      { atSupply: 18, action: { kind: 'build', building: 'barracks' } },
    ],
    composition: { melee: 2, ranged: 5 },
    workersTarget: 14,
    attackArmyValue: 950,
  },
  {
    id: 'psion-tech', ko: '초능력자 폭풍 테크', faction: 'psion', style: 'tech',
    steps: [
      { atSupply: 5, action: { kind: 'workersTarget', n: 12 } },
      { atSupply: 7, action: { kind: 'build', building: 'barracks' } },
      { atSupply: 9, action: { kind: 'build', building: 'farm' } },
      { atSupply: 12, action: { kind: 'tierUp' } },
      { atSupply: 14, action: { kind: 'build', building: 'magetower' } },
      { atSupply: 15, action: { kind: 'build', building: 'farm' } },
      { atSupply: 16, action: { kind: 'build', building: 'hall' } },
    ],
    composition: { melee: 2, ranged: 3, cavalry: 2, caster: 1 },
    workersTarget: 12,
    attackArmyValue: 850,
  },
  // ── 마계 ──────────────────────────────
  {
    id: 'demon-rush', ko: '마계 군단 러시', faction: 'demon', style: 'rush',
    steps: [
      { atSupply: 5, action: { kind: 'workersTarget', n: 9 } },
      { atSupply: 6, action: { kind: 'build', building: 'barracks' } },
      { atSupply: 8, action: { kind: 'build', building: 'farm' } },
      { atSupply: 12, action: { kind: 'build', building: 'farm' } },
    ],
    composition: { melee: 5, ranged: 2 },
    workersTarget: 9,
    attackArmyValue: 420, // 환급 패시브로 물량전 유리 → 더 일찍 공격
  },
  {
    id: 'demon-eco', ko: '마계 마기 회수 운영', faction: 'demon', style: 'eco',
    steps: [
      { atSupply: 5, action: { kind: 'workersTarget', n: 14 } },
      { atSupply: 7, action: { kind: 'build', building: 'farm' } },
      { atSupply: 9, action: { kind: 'build', building: 'barracks' } },
      { atSupply: 13, action: { kind: 'build', building: 'forge' } },
      { atSupply: 15, action: { kind: 'build', building: 'farm' } },
      { atSupply: 16, action: { kind: 'upgrade', id: 'armor' } },
      { atSupply: 18, action: { kind: 'build', building: 'barracks' } },
    ],
    composition: { melee: 4, ranged: 3 },
    workersTarget: 14,
    attackArmyValue: 950,
  },
  {
    id: 'demon-tech', ko: '마계 소환 테크', faction: 'demon', style: 'tech',
    steps: [
      { atSupply: 5, action: { kind: 'workersTarget', n: 12 } },
      { atSupply: 7, action: { kind: 'build', building: 'barracks' } },
      { atSupply: 9, action: { kind: 'build', building: 'farm' } },
      { atSupply: 12, action: { kind: 'tierUp' } },
      { atSupply: 14, action: { kind: 'build', building: 'magetower' } },
      { atSupply: 15, action: { kind: 'build', building: 'farm' } },
      { atSupply: 16, action: { kind: 'build', building: 'hall' } },
    ],
    composition: { melee: 3, cavalry: 2, siege: 1, caster: 1 },
    workersTarget: 12,
    attackArmyValue: 880,
  },
];

export function buildOrdersOf(faction: string): BuildOrder[] {
  return BUILD_ORDERS.filter((b) => b.faction === faction);
}
