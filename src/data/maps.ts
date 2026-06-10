// 맵 데이터 — 정식 5종 (180도 회전 대칭, 수싸움 요소: 초크/앞마당/러시거리/우회로, 플랜 §2.3)

import { MapBuilder } from './mapBuilder';

export interface MapDef {
  id: string;
  ko: string;
  desc: string;
  ascii: string;
}

/** ① 표준: 본진 초크 + 앞마당 멀티 + 중앙 개활지 (밸런스 기준맵) */
function twinCanyon(): string {
  const b = new MapBuilder(52, 36);
  b.start(7, 7);
  b.mine(10, 3); // 본진 금광
  b.mine(17, 13); // 앞마당 멀티
  // 본진 초크: 가로 능선 (입구 폭 3) + 세로 능선 (입구 폭 3)
  b.rect(1, 13, 6, 2, '#');
  b.rect(10, 13, 6, 2, '#');
  b.rect(14, 1, 2, 7, '#');
  b.rect(14, 11, 2, 4, '#');
  // 측면 숲 (벌목 우회로 + 요괴 통로)
  b.blob(4, 19, 3.5, 2.5, 'F');
  b.blob(22, 4, 4, 2.5, 'F');
  // 중앙 숲섬 (시야 차단)
  b.blob(26, 18, 4, 2.5, 'F');
  b.mirror();
  return b.build();
}

/** ② 단거리 러시: 짧은 개활지 — 공격적 메타 */
function bloodPlain(): string {
  const b = new MapBuilder(44, 30);
  b.start(8, 15);
  b.mine(10, 10);
  // 모서리 숲만 (몸 숨길 곳 최소)
  b.blob(7, 4, 4, 2.5, 'F');
  b.blob(20, 25, 3, 2, 'F');
  // 중앙 바위 소도 2개 (미세한 어그로 분리)
  b.blob(17, 11, 1.5, 1.2, '#');
  b.mirror();
  return b.build();
}

/** ③ 우회로 다중: 3갈래 회랑 + 벌목 샛길 — 견제/매복 극대화 */
function mazeCorridor(): string {
  const b = new MapBuilder(52, 36);
  b.start(7, 18);
  b.mine(4, 12);
  b.mine(24, 5); // 윗길 멀티 (쟁탈)
  // 가로 회랑 벽 2겹 (위/아래는 mirror가 만듦)
  b.rect(10, 11, 14, 2, '#');
  b.rect(30, 11, 14, 2, '#'); // 중앙 갭 x24~29
  b.rect(16, 22, 20, 2, '#'); // 아래 벽 (mirror로 위쪽 대응 생성)
  // 벌목 샛길 (숲을 뚫으면 새 경로 = 동적 지형 수싸움)
  b.rect(24, 11, 6, 2, 'F');
  b.blob(12, 27, 4, 2.5, 'F');
  b.mirror();
  return b.build();
}

/** ④ 중앙 쟁탈: 고수익 중앙 금광 + 분지 입구 2개 */
function goldenBasin(): string {
  const b = new MapBuilder(48, 34);
  b.start(7, 7);
  b.mine(10, 3);
  // 중앙 분지: 바위 링 (입구 상/하 — mirror로 대칭)
  b.blob(24, 17, 9, 6, '#');
  b.blob(24, 17, 6.5, 4, '.'); // 내부 파내기
  b.rect(23, 11, 3, 2, '.'); // 북 입구 (mirror가 남 입구)
  // 중앙 금광 쌍 (분지 내부)
  b.mine(21, 15);
  // 외곽 숲
  b.blob(6, 25, 4, 3, 'F');
  b.blob(38, 6, 4, 3, 'F');
  b.mirror();
  return b.build();
}

/** ⑤ 장거리 운영: 대각 최장 러시거리 + 멀티 다수 + 중앙 십자 차단 */
function fourFortress(): string {
  const b = new MapBuilder(56, 40);
  b.start(8, 8);
  b.mine(11, 4); // 본진
  b.mine(5, 17); // 앞마당
  b.mine(26, 8); // 제3 멀티 (쟁탈)
  // 중앙 십자 바위 (직선 러시 차단 → 우회 강제)
  b.rect(26, 14, 4, 12, '#');
  b.rect(20, 18, 16, 4, '#');
  // 숲 회랑
  b.blob(18, 13, 3, 2, 'F');
  b.blob(40, 27, 3, 2, 'F');
  b.blob(9, 28, 3.5, 2.5, 'F');
  b.mirror();
  return b.build();
}

export const MAPS: MapDef[] = [
  { id: 'twin-canyon', ko: '쌍둥이 협곡', desc: '표준 — 본진 초크와 앞마당, 중앙 개활지', ascii: twinCanyon() },
  { id: 'blood-plain', ko: '혈투 평원', desc: '단거리 개활지 — 러시 메타', ascii: bloodPlain() },
  { id: 'maze-corridor', ko: '미로 회랑', desc: '3갈래 회랑과 벌목 샛길 — 견제와 매복', ascii: mazeCorridor() },
  { id: 'golden-basin', ko: '황금 분지', desc: '중앙 고수익 금광 쟁탈전', ascii: goldenBasin() },
  { id: 'four-fortress', ko: '사방 요새', desc: '최장 러시거리 — 장기 운영', ascii: fourFortress() },
];

export function mapById(id: string): MapDef {
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
