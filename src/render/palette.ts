// 종족 팔레트 — 카툰 플랫 셰이딩 공유 색 세트 (플랜 §2.2/§2.6)
// 규칙: 그라디언트 금지, 굵은 외곽선(OUTLINE), 종족당 main/sub/accent 3색

import type { FactionId } from '../core/types';

export interface FactionPalette {
  main: number; // 의상/지붕 주색
  sub: number; // 보조(밝은 톤)
  accent: number; // 포인트(무기 이펙트/오라)
  name: string;
}

export const FACTION_PALETTES: Record<FactionId, FactionPalette> = {
  psion: { main: 0x7c4dcc, sub: 0xb18aff, accent: 0x35f0e0, name: '초능력자' },
  murim: { main: 0x2a9d8f, sub: 0x7fd4c9, accent: 0xe9f5a3, name: '무림' },
  fantasy: { main: 0x2f6bd8, sub: 0x8ab4f8, accent: 0xf2c14e, name: '판타지' },
  yokai: { main: 0xa6386e, sub: 0xe07ba8, accent: 0xff9d4d, name: '요괴' },
  demon: { main: 0xb3262e, sub: 0xe06a5a, accent: 0x40121f, name: '마계' },
  celestial: { main: 0xd9d2bf, sub: 0xfff6e0, accent: 0xf5d76e, name: '천계' },
  dummy: { main: 0x8a8f98, sub: 0xc3c8cf, accent: 0xdddddd, name: '더미' },
};

// 공통 색
export const COL = {
  outline: 0x20232b,
  skin: 0xf2c89b,
  skinShade: 0xd9a878,
  wood: 0x8a5a33,
  woodDark: 0x6b4423,
  steel: 0xc6ccd6,
  steelDark: 0x8d96a5,
  grass: 0x6dbf59,
  grassDark: 0x5cab4b,
  dirt: 0xb08d57,
  dirtDark: 0x977748,
  forest: 0x2e7d3a,
  forestDark: 0x205c2a,
  water: 0x3f7fd1,
  waterLight: 0x6fa8e8,
  rock: 0x7d7f87,
  rockDark: 0x62646c,
  gold: 0xf5c542,
  hpGreen: 0x4cd964,
  hpRed: 0xd9534f,
  shadow: 0x000000,
  team: [0x3aa0ff, 0xff5a52, 0x4cd964, 0xf5c542, 0xb18aff, 0xff9d4d] as const, // 파랑/빨강/초록/노랑/보라/주황
};

/** 팀 색 — teams 매핑 있으면 팀 인덱스 색(3v3 아군 동색), 없으면 player 색(1v1 호환) */
export function teamColor(player: number, teams?: number[]): number {
  const idx = teams ? (teams[player] ?? player) : player;
  return COL.team[idx % COL.team.length];
}
