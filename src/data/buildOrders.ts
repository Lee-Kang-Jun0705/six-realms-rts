// 빌드오더 라이브러리 — 종족당 3종 (러시/확장/테크) (플랜 §2.4)
// 미러 골격이므로 단계 템플릿 공유 + 종족별 조합/공격 타이밍만 차별화

import type { FactionId, UnitRole } from '../core/types';
import type { BuildOrder, BuildStep } from '../core/ai/types';

// 러시: 초반 압박 → 중반 테크 전환 (Liquipedia "좋은 러시는 올인이 아니다" — 실패 시 운영 전환 경로 내장)
const RUSH_STEPS: BuildStep[] = [
  { atSupply: 5, action: { kind: 'workersTarget', n: 10 } },
  { atSupply: 6, action: { kind: 'build', building: 'barracks' } },
  { atSupply: 8, action: { kind: 'build', building: 'farm' } },
  { atSupply: 11, action: { kind: 'build', building: 'farm' } },
  { atSupply: 14, action: { kind: 'tierUp' } }, // 압박 후 테크 전환
  { atSupply: 16, action: { kind: 'build', building: 'hall' } }, // 기동/공성(카운터)
  { atSupply: 19, action: { kind: 'build', building: 'farm' } },
  { atSupply: 21, action: { kind: 'build', building: 'magetower' } }, // 캐스터
  { atSupply: 24, action: { kind: 'build', building: 'forge' } },
];
// 확장: 경제 우선 → 풀조합 물량 (T2 건물 전부 + 업그레이드)
const ECO_STEPS: BuildStep[] = [
  { atSupply: 5, action: { kind: 'workersTarget', n: 16 } },
  { atSupply: 7, action: { kind: 'build', building: 'farm' } },
  { atSupply: 9, action: { kind: 'build', building: 'barracks' } },
  { atSupply: 12, action: { kind: 'build', building: 'farm' } },
  { atSupply: 14, action: { kind: 'tierUp' } },
  { atSupply: 16, action: { kind: 'build', building: 'hall' } },
  { atSupply: 17, action: { kind: 'build', building: 'forge' } },
  { atSupply: 18, action: { kind: 'build', building: 'magetower' } },
  { atSupply: 19, action: { kind: 'upgrade', id: 'weapon' } },
  { atSupply: 22, action: { kind: 'build', building: 'farm' } },
  { atSupply: 25, action: { kind: 'build', building: 'farm' } },
];
// 테크: 빠른 고급 조합 (조기 T2 + 전 생산건물)
const TECH_STEPS: BuildStep[] = [
  { atSupply: 5, action: { kind: 'workersTarget', n: 12 } },
  { atSupply: 7, action: { kind: 'build', building: 'barracks' } },
  { atSupply: 9, action: { kind: 'build', building: 'farm' } },
  { atSupply: 11, action: { kind: 'tierUp' } },
  { atSupply: 13, action: { kind: 'build', building: 'hall' } },
  { atSupply: 15, action: { kind: 'build', building: 'magetower' } },
  { atSupply: 16, action: { kind: 'build', building: 'farm' } },
  { atSupply: 18, action: { kind: 'build', building: 'forge' } },
  { atSupply: 20, action: { kind: 'upgrade', id: 'weapon' } },
  { atSupply: 22, action: { kind: 'build', building: 'farm' } },
];

interface FactionFlavor {
  ko: string;
  rushKo: string;
  ecoKo: string;
  techKo: string;
  rush: Partial<Record<UnitRole, number>>;
  eco: Partial<Record<UnitRole, number>>;
  tech: Partial<Record<UnitRole, number>>;
  /** 공격 개시 가치 보정 (1 = 표준) */
  tempo: number;
}

// 조합 = 역할 믹스(전열/딜러/캐스터/카운터) + 종족 특색(차별화 레이어).
// 모든 빌드오더가 caster 포함, eco/tech는 cavalry/siege도 — "근접/원거리만" 차단 (리서치 §1 역할 템플릿)
const FLAVORS: Record<Exclude<FactionId, 'dummy'>, FactionFlavor> = {
  psion: {
    ko: '초능력자', rushKo: '사이킥 러시', ecoKo: '확장 운영', techKo: '폭풍 테크',
    rush: { melee: 3, ranged: 4, caster: 1 }, eco: { melee: 2, ranged: 4, cavalry: 1, caster: 2 },
    tech: { melee: 2, ranged: 3, cavalry: 1, siege: 1, caster: 2 }, tempo: 1.0, // 원거리·캐스터 특화
  },
  murim: {
    ko: '무림', rushKo: '쾌검 러시', ecoKo: '문파 운영', techKo: '기공 테크',
    rush: { melee: 4, ranged: 1, cavalry: 1, caster: 1 }, eco: { melee: 4, ranged: 2, cavalry: 2, caster: 1 },
    tech: { melee: 3, ranged: 1, cavalry: 3, caster: 2 }, tempo: 0.92, // 근접·기동 특화 (이속 패시브)
  },
  fantasy: {
    ko: '판타지', rushKo: '검방 러시', ecoKo: '왕국 운영', techKo: '마법 테크',
    rush: { melee: 4, ranged: 3, caster: 1 }, eco: { melee: 3, ranged: 3, cavalry: 1, caster: 2 },
    tech: { melee: 3, ranged: 2, cavalry: 1, siege: 2, caster: 2 }, tempo: 1.05, // 균형·공성 (방어 패시브)
  },
  yokai: {
    ko: '요괴', rushKo: '백귀 러시', ecoKo: '둔갑 운영', techKo: '매혹 테크',
    rush: { melee: 4, ranged: 2, cavalry: 2 }, eco: { melee: 3, ranged: 3, cavalry: 2, caster: 1 },
    tech: { melee: 2, ranged: 2, cavalry: 3, caster: 2 }, tempo: 0.95, // 기동·기습 (숲 통과)
  },
  demon: {
    ko: '마계', rushKo: '군단 러시', ecoKo: '마기 회수 운영', techKo: '소환 테크',
    rush: { melee: 5, ranged: 2, caster: 1 }, eco: { melee: 4, ranged: 2, cavalry: 1, caster: 2 },
    tech: { melee: 3, ranged: 2, cavalry: 2, siege: 1, caster: 2 }, tempo: 0.93, // 물량·소환 (환급)
  },
  celestial: {
    ko: '천계', rushKo: '심판 러시', ecoKo: '성역 운영', techKo: '부활 테크',
    rush: { melee: 3, ranged: 3, caster: 1 }, eco: { melee: 3, ranged: 3, cavalry: 1, caster: 2 },
    tech: { melee: 2, ranged: 3, cavalry: 2, siege: 1, caster: 2 }, tempo: 1.1, // 고급·후반 지향
  },
};

function make(faction: Exclude<FactionId, 'dummy'>): BuildOrder[] {
  const f = FLAVORS[faction];
  return [
    {
      id: `${faction}-rush`, ko: `${f.ko} ${f.rushKo}`, faction, style: 'rush',
      steps: RUSH_STEPS, composition: f.rush, workersTarget: 9,
      attackArmyValue: Math.round(440 * f.tempo),
    },
    {
      id: `${faction}-eco`, ko: `${f.ko} ${f.ecoKo}`, faction, style: 'eco',
      steps: ECO_STEPS, composition: f.eco, workersTarget: 14,
      attackArmyValue: Math.round(950 * f.tempo),
    },
    {
      id: `${faction}-tech`, ko: `${f.ko} ${f.techKo}`, faction, style: 'tech',
      steps: TECH_STEPS, composition: f.tech, workersTarget: 12,
      attackArmyValue: Math.round(860 * f.tempo),
    },
  ];
}

export const BUILD_ORDERS: BuildOrder[] = (Object.keys(FLAVORS) as Exclude<FactionId, 'dummy'>[]).flatMap(make);

export function buildOrdersOf(faction: string): BuildOrder[] {
  const list = BUILD_ORDERS.filter((b) => b.faction === faction);
  // 더미(테스트) 종족은 초능력자 골격 재사용
  return list.length > 0 ? list : BUILD_ORDERS.filter((b) => b.faction === 'psion');
}
