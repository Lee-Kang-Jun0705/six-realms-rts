// 맵 데이터 — Phase 1: 테스트 맵 생성기 / Phase 5: 정식 5종 추가 예정

/** 중앙 세로 바위벽 + 초크(폭 4) 테스트 맵 48x32 — PoC/건틀릿 공용 */
export function buildTestMap(): string {
  const W = 48;
  const H = 32;
  const g: string[][] = [];
  for (let y = 0; y < H; y++) {
    g.push(new Array<string>(W).fill('.'));
  }
  // 외곽 바위 테두리
  for (let x = 0; x < W; x++) {
    g[0][x] = '#';
    g[H - 1][x] = '#';
  }
  for (let y = 0; y < H; y++) {
    g[y][0] = '#';
    g[y][W - 1] = '#';
  }
  // 중앙 세로 벽 (x=23,24) + 초크 갭 (y=14..17)
  for (let y = 1; y < H - 1; y++) {
    if (y >= 14 && y <= 17) continue;
    g[y][23] = '#';
    g[y][24] = '#';
  }
  // 숲 패치 (각 진영 측면)
  for (let y = 20; y <= 25; y++) for (let x = 3; x <= 7; x++) g[y][x] = 'F';
  for (let y = 6; y <= 11; y++) for (let x = 40; x <= 44; x++) g[y][x] = 'F';
  // 시작 위치 + 금광 (본진 인근)
  g[5][6] = '1';
  g[26][41] = '2';
  g[3][10] = 'G'; // 2x2 앵커 → (10,3)
  g[27][35] = 'G';
  return g.map((row) => row.join('')).join('\n');
}
