// 스펠 수치 SSOT — 종족별 3종 (Phase 3: psion/demon, Phase 4: 나머지 4종족 추가)

import type { FactionId } from '../core/types';

export interface SpellDef {
  id: string;
  ko: string;
  faction: FactionId;
  cooldown: number; // 틱
  range: number; // 시전 사거리 (타일)
  /** AI 오토캐스트 조건: 반경 내 적 N명 이상 (0 = 수동/특수) */
  autoCastEnemies: number;
  params: Record<string, number>;
}

export const SPELLS: Record<string, SpellDef> = {
  // 초능력자
  'psi-blast': {
    id: 'psi-blast', ko: '염동 충격파', faction: 'psion', cooldown: 160, range: 5,
    autoCastEnemies: 2,
    params: { radius: 1.6, damage: 18, knockback: 1.6 },
  },
  'psi-storm': {
    id: 'psi-storm', ko: '사이오닉 폭풍', faction: 'psion', cooldown: 420, range: 5.5,
    autoCastEnemies: 4,
    params: { radius: 2.5, damage: 34 },
  },
  clairvoyance: {
    id: 'clairvoyance', ko: '투시', faction: 'psion', cooldown: 360, range: 999,
    autoCastEnemies: 0,
    params: { radius: 6, duration: 240 },
  },
  // 마계
  'imp-summon': {
    id: 'imp-summon', ko: '임프 소환', faction: 'demon', cooldown: 300, range: 2,
    autoCastEnemies: 1,
    params: { count: 2, hp: 30, lifespan: 700 },
  },
  'blood-aura': {
    id: 'blood-aura', ko: '흡혈 오라', faction: 'demon', cooldown: 480, range: 0,
    autoCastEnemies: 3,
    params: { radius: 3.2, lifesteal: 0.25, duration: 320 },
  },
  sacrifice: {
    id: 'sacrifice', ko: '제물', faction: 'demon', cooldown: 240, range: 4,
    autoCastEnemies: 0, // 수동/AI 특수 로직
    params: { damage: 40, radius: 2.0 },
  },
};

export const SUMMON_CAP = 8; // 플레이어당 소환수 총량 캡 (악용 차단 규칙 ⑤)

export function spellsOf(faction: FactionId): SpellDef[] {
  return Object.values(SPELLS).filter((s) => s.faction === faction);
}
