// 정적 건물 이미지를 보유한 종족 목록 (SSOT) — 생성·통합 스크립트가 갱신.
// 미보유 종족은 절차 드로잉으로 폴백.

import type { FactionId } from '../core/types';

export const BUILDING_IMAGE_FACTIONS: FactionId[] = [];

export function hasBuildingImages(faction: FactionId): boolean {
  return BUILDING_IMAGE_FACTIONS.includes(faction);
}
