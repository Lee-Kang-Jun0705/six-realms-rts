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
    autoCastEnemies: 1,
    params: { radius: 1.6, damage: 18, knockback: 1.6 },
  },
  'psi-storm': {
    id: 'psi-storm', ko: '사이오닉 폭풍', faction: 'psion', cooldown: 420, range: 5.5,
    autoCastEnemies: 3,
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
    autoCastEnemies: 2,
    params: { radius: 3.2, lifesteal: 0.25, duration: 320, autoRadius: 6 },
  },
  sacrifice: {
    id: 'sacrifice', ko: '제물', faction: 'demon', cooldown: 240, range: 4,
    autoCastEnemies: 0, // 수동/AI 특수 로직
    params: { damage: 40, radius: 2.0 },
  },
  // 무림
  'light-step': {
    id: 'light-step', ko: '경공', faction: 'murim', cooldown: 360, range: 0,
    autoCastEnemies: 2,
    params: { radius: 3.5, haste: 0.45, duration: 200, autoRadius: 6 },
  },
  'pressure-point': {
    id: 'pressure-point', ko: '점혈', faction: 'murim', cooldown: 200, range: 4.5,
    autoCastEnemies: 1,
    params: { stun: 70 },
  },
  'ki-wave': {
    id: 'ki-wave', ko: '기공파', faction: 'murim', cooldown: 300, range: 5,
    autoCastEnemies: 3,
    params: { length: 5.5, width: 0.9, damage: 26 },
  },
  // 판타지
  heal: {
    id: 'heal', ko: '치유', faction: 'fantasy', cooldown: 140, range: 4.5,
    autoCastEnemies: 0, // 특수: 다친 아군 자동
    params: { amount: 28 },
  },
  blessing: {
    id: 'blessing', ko: '축복', faction: 'fantasy', cooldown: 420, range: 0,
    autoCastEnemies: 1,
    params: { radius: 3.5, power: 0.3, duration: 240, autoRadius: 6 },
  },
  fireball: {
    id: 'fireball', ko: '화염구', faction: 'fantasy', cooldown: 220, range: 5.5,
    autoCastEnemies: 2,
    params: { radius: 1.5, damage: 24 },
  },
  // 요괴
  disguise: {
    id: 'disguise', ko: '둔갑', faction: 'yokai', cooldown: 480, range: 0,
    autoCastEnemies: 0, // 정찰용 — AI 정찰 루틴에서 사용
    params: { duration: 360 },
  },
  charm: {
    id: 'charm', ko: '매혹', faction: 'yokai', cooldown: 520, range: 4.5,
    autoCastEnemies: 0, // 특수: 가장 비싼 적 1기
    params: { duration: 200 },
  },
  'shadow-veil': {
    id: 'shadow-veil', ko: '그림자 은신', faction: 'yokai', cooldown: 320, range: 3,
    autoCastEnemies: 0, // 특수: 위험한 아군에게
    params: { duration: 260 },
  },
  // 천계
  revive: {
    id: 'revive', ko: '부활', faction: 'celestial', cooldown: 560, range: 0,
    autoCastEnemies: 0, // 특수: 사망 기록 있으면
    params: { hpRatio: 0.6 },
  },
  smite: {
    id: 'smite', ko: '천벌', faction: 'celestial', cooldown: 260, range: 5.5,
    autoCastEnemies: 1,
    params: { damage: 45 },
  },
  aegis: {
    id: 'aegis', ko: '가호', faction: 'celestial', cooldown: 440, range: 0,
    autoCastEnemies: 1,
    params: { radius: 3.5, reduce: 0.3, duration: 240, autoRadius: 6 },
  },
};

export const SUMMON_CAP = 8; // 플레이어당 소환수 총량 캡 (악용 차단 규칙 ⑤)

export function spellsOf(faction: FactionId): SpellDef[] {
  return Object.values(SPELLS).filter((s) => s.faction === faction);
}
