# 진행 핸드오프 — 육계대전 RTS (2026-06-12)

## 이번 세션 완료 (2026-06-12)
- **#44 포지션 편향 근본 해결** (46eff51): 마커 스왑 실험으로 위치 편향 확정(B진영 65~81%) →
  점대칭 미러 디프로 비대칭 8곳 수정. 핵심 도구 `orientationOf(map,player)` (src/core/map.ts).
  🔴 최종 보스는 정수 경계 floor(금광 중심=정수 좌표): movement `destTile()` σ-안정 규칙.
  검증: BO 페어링 90판 A진영 52.9%, gauntlet P0 46.5%, vitest 70(+금광 풋프린트 가드 5), 골든 재생성.
  3v3 팀1 전승도 해소(동일 시드 2:1 혼합). 디버그 도구: scripts/debug/{bias_*,flow_probe,sym_probe2}.ts (미커밋 관례)
- ⚠️ 교훈: BO 고정 시 게임이 사실상 결정적 → 맵당 유효 표본 = BO 페어링 9종. 32판 승률은 노이즈 ±17%p,
  편향 측정은 페어링 전수 균형 or 미러 디프로. IEEE `(W−a)−b ≠ W−(a+b)`라 비트 미러는 t~100 한계(카오스).

## 이전 세션 완료 (2026-06-11, 배포됨)
1. **카메라 자동이동 양보**(#40): 관전 중 WASD/엣지/휠 조작 시 4초 액션캠 양보. `cameraControls.recentlyManual()` + `GameScene.updateActionCam`. 커밋 06e9dcf, 배포 success
2. **AI 유닛/전략 다양화**(#41): 빌드오더 전면 개편(모든 오더 T2 도달+4역할 믹스) + `reservedForBuildings`(캐스터 악순환 차단). gauntlet 72게임: caster 76/cavalry 100/siege 3 + 스펠 24종 전부. 커밋 06e9dcf
3. **포지션 편향 부분 개선**(#44): ai-delay 스트림 player별 독립화(`name#player`). golden-basin 3:9→6:6 균형화. 커밋 acd85a9
- 라이브 HTTP 200 확인 (무림 캐시 갱신 = "진행 안 됨" 해결)

## 3:3 (#42) — ✅ 전 단계(1~8) 완료 + push 배포됨 (2026-06-11)
- **1단계** (e519908): 코어 N-player 타입. `PlayerId=number`, `TeamId`, players/fog 배열, `createState(factions[], teams?)`, `state.teams[]`. 회귀 0
- **2단계** (f692e57): `sameTeam(state,a,b)` SSOT. victory 팀 전멸. combat 적판정 5곳 팀화. 골든 불변
- **3단계** (460cd27): intel `nearestEnemyStart`+sameTeam, autoCast countEnemies/nearestEnemy 팀, game.ts updateFog/스폰 `state.players.length` 순회, GameConfig factions가변+teams
- **4단계** (7ed80ea): parseMap 마커 '1'~'9'+starts 배열, mapBuilder.spawnPair(점대칭 팀쌍), trinity-fields 144x108 6스폰(점대칭 0위반 검증)
- **5단계** (84f82e0): sim_3v3.ts 6인 헤드리스(크래시0/불변식0/생산310~529), victory 틱상한 판정승(무승부 방지)
- **6~8단계** (7663e52, 722f360): palette.teamColor(player,teams) 6색, hud [T1]/[T2], MenuScene 1v1/3v3 토글, GameScene 6인 AI, **terrainLayer batchDraw 베이크 7567ms→70ms(108배), HUD등장 9.5초→0.55초**
- **성능 실측**: 동시최대 103~120기(캡250내), 최대틱 41~46ms(50ms예산내)
- **브라우저 검증**: 3v3 관전 팀색 정상·terrain 정상·에러0, 1v1 회귀 정상
- ⚠️ **잔존**: 3v3 AI끼리는 팀1(우측) 편향 3/3 — #44 연장(AI 팀협동 부재). 사용자 직접 플레이 시 결판 가능
- ⚠️ **case 주의**: 실파일 `terrainLayer.ts`(소문자), git add 시 대문자 쓰면 macOS서 누락됨(722f360서 복구)

## 핵심 사실
- 라이브: https://lee-kang-jun0705.github.io/six-realms-rts/ , repo Lee-Kang-Jun0705/six-realms-rts
- 배포: push to main → `.github/workflows/deploy-pages.yml` 자동
- 검증: `npm run typecheck && npm test`(65) + `npx vite build` (= `npm run ship`에 lint 포함)
- 밸런스 변경 시: `./node_modules/.bin/tsx scripts/sim_determinism.ts --update` (골든 재생성)
- 편향/다양성 측정: `scripts/debug/` (map_probe=맵별 미러, bo_probe=빌드오더, sym_probe=맵대칭). 임시 디버그라 커밋 제외
- 커밋 규칙: 내가 수정한 파일만 git add (git add -A 금지)
- 최근 커밋: 722f360 (3:3 8단계 terrainLayer 복구) — origin push 완료
- 3v3 검증: `npm run sim:3v3` (6인 헤드리스, 동시최대/최대틱 계측)

## 남은 사용자 요청
- ✅ #42 3:3 대형맵 — 완료/배포됨
- ✅ #44 포지션 편향 근본 — 완료 (46eff51, 2026-06-12)
- #43 게임 시작 BGM + 사운드: 일레븐랩스 API 키 미확보 → 키 위치 사용자 확인 + 유료 API 승인 필요. 음악(BGM)은 Gemini Lyria deprecated(2026-05-24), 무료 대안 pyfxr는 SFX만
- 3v3 AI 팀 협동(#44에서 분리): 각자 최근접 적만 타게팅 → 교착 경향. 포커싱/합류 로직 후속 과제
