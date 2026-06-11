// 맵 데이터 — 정식 5종 (180도 회전 대칭, 수싸움 요소: 초크/앞마당/러시거리/우회로, 플랜 §2.3)

import { MapBuilder } from './mapBuilder';

export interface MapDef {
  id: string;
  ko: string;
  desc: string;
  ascii: string;
}

// 대형 맵 (스타크래프트 빅맵급) — 빌더 점대칭이라 절반만 그리면 대칭 보장

/** ① 표준: 본진 초크 + 앞마당 멀티 + 중앙 개활지 (밸런스 기준맵) */
function twinCanyon(): string {
  const b = new MapBuilder(96, 72);
  b.start(13, 13);
  b.mine(18, 6); // 본진 금광
  b.mine(32, 26); // 앞마당 멀티
  // 본진 초크: 가로 능선 + 세로 능선 (입구 폭 유지)
  b.rect(1, 26, 12, 3, '#');
  b.rect(19, 26, 12, 3, '#');
  b.rect(27, 1, 3, 14, '#');
  b.rect(27, 22, 3, 8, '#');
  // 측면 숲 (벌목 우회로 + 요괴 통로)
  b.blob(8, 38, 7, 5, 'F');
  b.blob(42, 8, 7, 5, 'F');
  // 중앙 숲섬 (시야 차단)
  b.blob(48, 36, 7, 5, 'F');
  b.mirror();
  return b.build();
}

/** ② 단거리 러시: 짧은 개활지 — 공격적 메타 */
function bloodPlain(): string {
  const b = new MapBuilder(84, 58);
  b.start(14, 29);
  b.mine(19, 19);
  b.blob(13, 8, 7, 5, 'F');
  b.blob(38, 48, 6, 4, 'F');
  b.blob(32, 21, 3, 2, '#');
  b.mirror();
  return b.build();
}

/** ③ 우회로 다중: 3갈래 회랑 + 벌목 샛길 — 견제/매복 극대화 */
function mazeCorridor(): string {
  const b = new MapBuilder(96, 72);
  b.start(13, 36);
  b.mine(8, 24);
  b.mine(46, 10); // 윗길 멀티 (쟁탈)
  // 가로 회랑 벽 2겹 (중앙 갭)
  b.rect(18, 22, 26, 3, '#');
  b.rect(56, 22, 26, 3, '#');
  b.rect(30, 44, 38, 3, '#');
  // 벌목 샛길 (숲 뚫으면 새 경로 = 동적 지형)
  b.rect(44, 22, 12, 3, 'F');
  b.blob(22, 52, 7, 5, 'F');
  b.mirror();
  return b.build();
}

/** ④ 중앙 쟁탈: 고수익 중앙 금광 + 분지 입구 2개 */
function goldenBasin(): string {
  const b = new MapBuilder(92, 68);
  b.start(13, 13);
  b.mine(18, 6);
  // 중앙 분지: 바위 링 (입구 상/하)
  b.blob(46, 34, 17, 12, '#');
  b.blob(46, 34, 12, 8, '.'); // 내부 파내기
  b.rect(44, 22, 4, 4, '.'); // 북 입구 (mirror가 남 입구)
  b.mine(40, 30); // 중앙 금광 쌍
  // 외곽 숲
  b.blob(12, 48, 7, 5, 'F');
  b.blob(72, 12, 7, 5, 'F');
  b.mirror();
  return b.build();
}

/** ⑤ 장거리 운영: 대각 최장 러시거리 + 멀티 다수 + 중앙 십자 차단 */
function fourFortress(): string {
  const b = new MapBuilder(112, 88);
  b.start(15, 15);
  b.mine(21, 7); // 본진
  b.mine(9, 32); // 앞마당
  b.mine(48, 15); // 제3 멀티 (쟁탈)
  // 중앙 십자 바위 (직선 러시 차단 → 우회 강제)
  b.rect(53, 28, 6, 32, '#');
  b.rect(40, 40, 32, 8, '#');
  // 숲 회랑
  b.blob(34, 24, 6, 4, 'F');
  b.blob(76, 52, 6, 4, 'F');
  b.blob(17, 54, 7, 5, 'F');
  b.mirror();
  return b.build();
}

/** 디펜스 모드 전용 맵 — 비대칭 PvE (대칭 테스트 대상 아님): 상단 스폰 → 깔때기 → 하단 본진 */
function defenseValley(): string {
  const b = new MapBuilder(72, 56);
  // start() 헬퍼는 점대칭 쌍을 만들므로 미사용 — 마커 직접 배치
  b.set(36, 46, '1'); // P0 본진 (하단 중앙)
  b.set(36, 6, '2'); // 웨이브 스폰 앵커 (상단 중앙)
  // 깔때기 바위 (중앙 통로)
  b.blob(13, 22, 11, 7, '#');
  b.blob(59, 22, 11, 7, '#');
  b.blob(21, 34, 8, 5, '#');
  b.blob(51, 34, 8, 5, '#');
  // 본진 금광 2개 + 측면 숲
  b.set(25, 47, 'G');
  b.set(45, 47, 'G');
  b.blob(8, 47, 6, 4, 'F');
  b.blob(63, 47, 6, 4, 'F');
  b.blob(36, 19, 5, 3, 'F'); // 통로 중앙 숲 (벌목 시 추가 사선)
  return b.build();
}

export const MAPS: MapDef[] = [
  { id: 'twin-canyon', ko: '쌍둥이 협곡', desc: '표준 — 본진 초크와 앞마당, 중앙 개활지', ascii: twinCanyon() },
  { id: 'blood-plain', ko: '혈투 평원', desc: '단거리 개활지 — 러시 메타', ascii: bloodPlain() },
  { id: 'maze-corridor', ko: '미로 회랑', desc: '3갈래 회랑과 벌목 샛길 — 견제와 매복', ascii: mazeCorridor() },
  { id: 'golden-basin', ko: '황금 분지', desc: '중앙 고수익 금광 쟁탈전', ascii: goldenBasin() },
  { id: 'four-fortress', ko: '사방 요새', desc: '최장 러시거리 — 장기 운영', ascii: fourFortress() },
];

export const DEFENSE_MAP: MapDef = {
  id: 'defense-valley',
  ko: '수호의 계곡',
  desc: '디펜스 — 상단에서 몰려오는 10웨이브 생존',
  ascii: defenseValley(),
};

export function mapById(id: string): MapDef {
  if (id === DEFENSE_MAP.id) return DEFENSE_MAP;
  return MAPS.find((m) => m.id === id) ?? MAPS[0];
}

/** 테스트 전용 맵 (Phase 1 PoC — 초크/숲/금광 고정 배치) */
export function buildTestMap(): string {
  const W = 48;
  const H = 32;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) {
    g.push(new Array<string>(W).fill('.'));
  }
  for (let x = 0; x < W; x++) {
    g[0][x] = '#';
    g[H - 1][x] = '#';
  }
  for (let y = 0; y < H; y++) {
    g[y][0] = '#';
    g[y][W - 1] = '#';
  }
  for (let y = 1; y < H - 1; y++) {
    if (y >= 14 && y <= 17) continue;
    g[y][23] = '#';
    g[y][24] = '#';
  }
  for (let y = 20; y <= 25; y++) for (let x = 3; x <= 7; x++) g[y][x] = 'F';
  for (let y = 6; y <= 11; y++) for (let x = 40; x <= 44; x++) g[y][x] = 'F';
  g[5][6] = '1';
  g[26][41] = '2';
  g[3][10] = 'G';
  g[27][35] = 'G';
  return g.map((row) => row.join('')).join('\n');
}
