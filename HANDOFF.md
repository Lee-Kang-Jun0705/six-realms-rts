# 진행 핸드오프 — 육계대전 그래픽 고퀄화 (2026-06-11)

## 지금 하던 일
사용자 지적: ① 유닛 치비 구림 → 초상화급 고퀄 재생성 ② 맵 오브젝트(금광/나무/바위) 아직 도형 ③ 건물은 AI 정상(확인됨, 캐시였음) ④ 일꾼 자원운반 표시 요청

## 완료 (커밋 대기 중 — 아직 미커밋)
1. **자원 운반 표시**: `src/render/unitsLayer.ts` drawOverlay에 `u.cargo`(gold/wood) 시 일꾼 어깨옆 금/목재 아이콘. 코어 무수정. typecheck/빌드/e2e 에러0.
2. **금광 이미지 우선 렌더**: `bake.ts` objectImageKey/preloadObjectImages 추가, `GameScene.ts` preload에 preloadObjectImages, `unitsLayer.ts` syncMines를 AI 이미지(objimg-mine) 우선 분기(풋프린트 중심배치+1.0x여유, 고갈=tint). typecheck PASS. **public/objects/mine.png 생성되면 자동 적용**

## 진행 중 (백그라운드)
- **P13 유닛 36 고퀄 재생성**: `scripts/assets/gen_units_hq.sh` → `art-src/units_hq/`. 18/36(yokai 진행중, demon·celestial 남음). 완료감지 백그라운드 `bh78xs9qq`(36개 시 "UNITS_DONE")

## 준비 완료된 스크립트 (유닛 완료 후 순차 실행)
- `normalize_units.py`: art-src/units_hq → public/units (코너키 투명화+bbox+발baseline 256px)
- `gen_objects.sh`: 금광(objects/mine.png 매젠타) + 숲/바위 타일(tiles_hq/ 512px 꽉참) 생성
- `normalize_objects.py`: 금광 투명화→public/objects, 숲/바위 타일 128px→public/tiles 덮어쓰기

## 남은 단계 (순서대로)
1. 유닛 완료 → `uv run --with pillow python3 scripts/assets/normalize_units.py` → public/units 덮어쓰기
2. `bash scripts/assets/gen_objects.sh` (유닛 끝난 후, MPS 단일점유) → `normalize_objects.py`
3. e2e 종합 검증(유닛 고퀄+금광 이미지+숲타일+자원운반 한 화면)
4. 유닛 표시 크기 40→52 검토(정규화 결과 보고 결정)
5. **수정 파일만 커밋 + push** → 라이브 검증 (curl 200: units/objects/tiles)

## 핵심 사실
- 라이브: https://lee-kang-jun0705.github.io/six-realms-rts/ , repo Lee-Kang-Jun0705/six-realms-rts
- 에셋 생성: `mflux-generate-z-image-turbo` (로컬 무료, 곡당 ~30초, 매젠타 배경)
- 매니페스트 패턴: `src/data/unitManifest.ts`/`buildingManifest.ts` (보유종족만 preload)
- 검증: `npm run typecheck && npm run lint && npm test`(65 passed) + `npx vite build`
- 커밋 규칙: 내가 수정한 파일만 git add (git add -A 금지)
- 최근 커밋: 3e1fc3b (P12 메뉴 고급화)
