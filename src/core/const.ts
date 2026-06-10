// 시뮬 전역 상수 (플랜 §1, §2.1)

export const TICK_MS = 50; // 20Hz 고정 틱
export const TICKS_PER_SEC = 1000 / TICK_MS;
export const MAX_GAME_TICKS = 36_000; // 30분 — 초과 시 무승부 (교착 가드)
export const MAX_CATCHUP_TICKS = 5; // 렌더 accumulator 데스 스파이럴 방지
export const SUPPLY_CAP = 100; // 플레이어당 보급 상한
export const ENTITY_HARD_CAP = 250; // 맵 동시 엔티티(유닛+소환수) 하드캡
export const TILE = 32; // 타일 픽셀 크기 (렌더 기준)
