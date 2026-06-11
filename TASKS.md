# TASKS — 육계대전 (Six Realms RTS)

> 워크래프트 2 풍 카툰 RTS · 6종족 · 1v1/3v3 · AI 대전 + 관전 · 헤드리스 시뮬 검증
> 최종 업데이트: 2026-06-11

## 프로젝트 개요

| 항목 | 값 |
|------|-----|
| 현재 폴더 | `~/Desktop/six-realms-rts` (원래 `~/Developer/six-realms-rts`에서 이동됨) |
| 라이브 | https://lee-kang-jun0705.github.io/six-realms-rts/ |
| 저장소 | Lee-Kang-Jun0705/six-realms-rts |
| 배포 | `git push origin main` → `.github/workflows/deploy-pages.yml` 자동 |
| 시작일 | 2026-06-11 00:20 (29커밋, 하루 완성) |
| 플랜 | `~/.claude/plans/2-rts-binary-pixel.md` |

### 기술 스택
- Vite 7 + TypeScript(strict) + Phaser 3.90 + Vitest + Playwright + ESLint
- `src/core/` 순수 시뮬(렌더 import 0, 결정성 강제) ↔ `src/render/` Phaser
- 고정 틱 50ms(20Hz) + accumulator + 렌더 보간, 캐치업 상한 5
- 결정성: Mulberry32 시드 RNG(시스템별 독립 스트림), 초월함수 금지, id 정렬 순회
- 절차 카툰 아트 + AI 생성 에셋(유닛/건물/지형/초상화) 베이킹

### 검증 명령
```bash
npm run ship              # typecheck + lint + test(65) + build (배포 전 필수)
npm run sim:determinism   # 골든 해시 회귀 (밸런스 변경 시 --update로 재생성)
npm run sim:gauntlet      # 매치업×맵 대량 시뮬 (밸런스/크래시)
npm run sim:3v3           # 6인 헤드리스 (동시최대/최대틱 계측)
npm test                  # vitest 65개
```

---

## Phase 0~6 — 본 게임 제작 (플랜 §6, 전부 완료)

- [x] **Phase 0 스캐폴드** (dedab6e): Vite+TS+Phaser+Vitest, 결정성 코어(시드RNG/해시/벡터), ESLint 결정성 가드
- [x] **Phase 1 시뮬 코어** (530292e): 맵/안개/FlowField/이동/경제/건설/생산/전투/승패 — 더미 종족 미러 골격
- [x] **Phase 2 렌더/입력** (dcf298d): 카툰 아트 팩토리, GameScene, 셀렉션/우클릭/어택땅/컨트롤그룹/엣지스크롤/줌/미니맵, HUD, 안개
- [x] **Phase 3 수직 슬라이스** (65f4670): 종족 스펠 6종 + AI 모듈 5종(Economy/Build/Production/Scout/Squad) + 헤드리스 건틀릿
- [x] **Phase 4 6종족 완성** (513383e): 무림/판타지/요괴/천계 스펠 12종(누적 18) + 빌드오더(러시/확장/테크)
- [x] **Phase 5 맵 5종** (c6ab6ff): 180도 회전 대칭 빌더 + 맵 검증 테스트 (쌍둥이협곡/혈투평원/미로회랑/황금분지/사방요새)
- [x] **Phase 6 풀 건틀릿** (9675d11): 포지션/밸런스/교착 결함 4건 수정, 승률 수렴

### 후속 폴리싱 (Phase 6 이후)
- [x] 디펜스 모드(10웨이브 생존) + 난이도 선택 UI + pyfxr 사운드 (974584c)
- [x] 사망 유닛 선택 잔존 버그 수정 (8ead0fe)
- [x] AI 에셋 통합: 6종족 36유닛 스프라이트(307a742), 건물 42장(806c6ca), 지형 6종(68fef0e), 초상화/메뉴배경(3e1fc3b)
- [x] 절차적 BGM 엔진 + SFX + 동적 믹스 (5524935)
- [x] 유닛 고퀄화 + 금광/숲/바위 에셋 + 일꾼 자원운반 표시 (370bce3)
- [x] 카메라 기본 줌 1.4 + 유닛 52px 가시성 개선 (7181673)

---

## 세션 작업 (2026-06-11 오후, #40~#44)

### [x] #40 카메라 수동조작 시 자동이동 중단 (06e9dcf)
- 관전 중 WASD/엣지/휠 조작 시 4초 액션캠 양보
- `cameraControls.recentlyManual()` + `GameScene.updateActionCam`

### [x] #41 AI 유닛/전략 다양화 (06e9dcf)
- 빌드오더 전면 개편(모든 오더 T2 도달 + 4역할 믹스) + `reservedForBuildings`(캐스터 악순환 차단)
- gauntlet 72게임: caster 76 / cavalry 100 / siege 3 + 스펠 24종 전부 사용

### [x] #42 3:3 대결 + 대형 맵 + 렉 방지 (8단계, e519908~722f360) ✅ 배포됨

| 단계 | 커밋 | 내용 | 검증 |
|------|------|------|------|
| 1 코어 N인 타입 | e519908 | `PlayerId=number`, `TeamId`, players/fog 배열, `createState(factions[], teams?)`, `state.teams[]` | 골든 불변 |
| 2 전투 팀 판정 | f692e57 | `sameTeam(state,a,b)` SSOT, victory 팀 전멸, combat 적판정 5곳 팀화 | 골든 불변 |
| 3 AI 팀 인텔 | 460cd27 | intel `nearestEnemyStart`+sameTeam, autoCast 팀, game.ts updateFog/스폰 `players.length` 순회 | 회귀 0 |
| 4 6스폰 맵 | 7ed80ea | parseMap 마커 '1'~'9'+starts 배열, `mapBuilder.spawnPair`, trinity-fields 144×108 | 점대칭 0위반 |
| 5 6인 헤드리스 | 84f82e0 | `sim_3v3.ts`(크래시0/불변식0/생산310~529), victory 틱상한 판정승 | 3/3 정상 |
| 6~8 렌더/UI/성능 | 7663e52, 722f360 | 팀색 6색·HUD [T1]/[T2], 메뉴 1v1/3v3 토글, 6인 AI, **terrainLayer batchDraw** | 브라우저 정상 |

- **렉 해결 (핵심)**: terrain 베이크 7567ms → **70ms** (108배), HUD 등장 9.5초 → **0.55초**
  - 원인: 타일마다 `rt.draw()` = GPU 플러시 폭발 → `beginDraw/batchDraw/endDraw` 청크당 1패스
- **성능 실측**: 동시 최대 103~120기(캡 250 내), 최대 틱 41~46ms(50ms 예산 내)
- **검증**: 3v3 관전 팀색·terrain 정상·에러 0, 1v1 회귀 0, ship PASS, 라이브 HTTP 200 + 번들 반영 확인

### [x] #44 포지션 편향 부분 개선 (acd85a9)
- AI 시드 스트림 player별 독립화(`name#player`) → golden-basin 3:9 → 6:6 균형화

---

## 세션 작업 (2026-06-12)

### [x] #44 포지션 편향 근본 해결 (46eff51)
- **판별**: 마커 '1'↔'2' 스왑 실험 → 승률이 자리를 따라감 = 위치 고정 편향 확정 (B진영 65~81%)
- **근본 원인**: 점대칭 맵에서 σ-불변이 아닌 고정 방향 스캔/오프셋 8곳
  1. 일꾼 초기 스폰 `start+(2,2.5)` 양쪽 동일 방향 (maze 채굴거리 15.3 vs 9.7 격차)
  2. 타일 코너를 연속 좌표 기준점으로 사용 ((1,1) 어긋남) → 타일 중심(+0.5)으로 교정
  3. `findSpawnSpot`/`findSpot` 링 스캔 좌상단 우선 (건물 배치는 앵커 `-(w-1,h-1)` 보정 필요)
  4. `nearestForest`/`retargetForest` 좌상단 타이브레이크 (벌목 왕복 2배 격차)
  5. 기본 랠리 '건물 아래 고정' + 분대 고정 오프셋(수비/후퇴/정찰)
  6. 🔴 **정수 경계 floor**: 금광 중심(앵커+1,1)=정수 → `floor(W−x)`가 미러 타일이 아닌 한 칸 옆 선택 → t1부터 채굴 경로 분기. movement `destTile()` σ-안정 규칙으로 해결
- **도구**: `orientationOf(map,player)` (map.ts) — 진영 부호 +1/−1, N인 일반화
- **검증**: 점대칭 미러 디프 t1→t118(IEEE 카오스 한계), BO 페어링 균형 90판 A진영 52.9%,
  gauntlet P0 46.5% PASS, FlowField σ-동변성 0위반(수정 불필요 판명), vitest 70, 골든 재생성
- **3v3**: sim:3v3 동일 시드에서 팀1 전승 3/3 → 팀0 2승/팀1 1승 혼합 (위치 편향 해소)
- ⚠️ 잔존: AI 팀 협동 부재(각자 최근접 적 타게팅)는 별개 게임플레이 과제 — 편향 아님

## 잔존 과제 (미완)

### [ ] #43 게임 시작 BGM + 사운드 (일레븐랩스)
- **블로커**: 일레븐랩스 API 키 미확보 → 키 위치 사용자 확인 필요 (+유료 API 사용 승인 필요)
- 음악(BGM): Gemini Lyria 3 deprecated(2026-05-24), 무료 대안 pyfxr는 SFX만
- 현재 절차적 BGM 엔진(5524935)은 작동 중

### [ ] 3v3 AI 팀 협동 (#44에서 분리)
- 각자 최근접 적 1명만 타게팅 → 1:1 6쌍 교착 경향. 포커싱/합류 로직 필요
- 사용자 직접 플레이 시에는 결판 가능 (AI만의 한계)

---

## 핵심 주의사항

- **커밋 규칙**: 내가 수정한 파일만 `git add` (git add -A 금지) — 다른 세션 미커밋 충돌 방지
- **case 주의**: 실파일 `src/render/terrainLayer.ts`(소문자). 대문자로 `git add` 시 macOS(case-insensitive)에서 누락됨 (722f360에서 복구 사례)
- **밸런스 변경 시**: `npm run sim:determinism --update`로 골든 재생성 (로직 변경과 데이터 변경 분리)
- **게임 HUD 검증**: e2e/스크린샷 직접 확인 필수 (design-check로는 게임 화면 캡처 불가)
- **폴더 이동됨**: `~/Developer` → `~/Desktop/six-realms-rts` (맥북 발열 대비 추정). 홈(`~/`)의 `TASKS.md`/`src/`는 `name:"kangjunlee"`인 별개 프로젝트
