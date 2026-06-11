// 정적 유닛 이미지를 보유한 종족 목록 (SSOT) — 생성·통합 스크립트가 갱신.
// preloadUnitImages는 이 목록의 종족만 로드 → 미보유 종족 loaderror(콘솔 오염) 방지.
// 미보유 종족은 절차 드로잉으로 폴백.

import type { FactionId } from '../core/types';

export const UNIT_IMAGE_FACTIONS: FactionId[] = ['psion'];

export function hasUnitImages(faction: FactionId): boolean {
  return UNIT_IMAGE_FACTIONS.includes(faction);
}
