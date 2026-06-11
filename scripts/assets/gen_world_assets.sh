#!/bin/bash
# A스타일(손그림 카툰 워크3풍) 월드 에셋 배치 생성 — 지형/나무/건물 42종/금광/초상/배경
# 전부 로컬 Z-Image-Turbo, 시드 고정 (재현 가능)
set -u
OUT=art-src/raw
mkdir -p "$OUT"
STYLE="hand-painted cartoon, warcraft 3 style, thick dark outlines, warm saturated colors, painterly soft shading, fantasy RTS game asset"

gen() { # path prompt w h seed
  [ -f "$OUT/$1.png" ] && echo "[skip] $1" && return
  echo "[gen] $1"
  mflux-generate-z-image-turbo --prompt "$2" --steps 6 --width "${3:-512}" --height "${4:-512}" --seed "${5:-7}" --output "$OUT/$1.png" 2>/dev/null || echo "[FAIL] $1"
}

# ── 지형 시멀리스 텍스처 (탑다운) ──
gen t-grass "$STYLE, seamless tileable top-down lush grassland texture, subtle clover and wildflowers, no objects, even lighting" 512 512 21
gen t-dirt "$STYLE, seamless tileable top-down packed dirt path texture with small pebbles, no objects" 512 512 22
gen t-water "$STYLE, seamless tileable top-down deep blue lake water texture with soft painterly ripples" 512 512 23
gen t-rock "$STYLE, seamless tileable top-down rocky cliff stone texture, grey boulders tightly packed" 512 512 24
gen t-forestfloor "$STYLE, seamless tileable top-down dark forest floor texture with roots and fallen leaves" 512 512 25

# ── 나무/장식 (단일 오브젝트, 흰 배경 → rembg) ──
gen obj-tree1 "$STYLE, single large leafy green tree, top-down 3/4 view game object, isolated on plain white background" 512 512 31
gen obj-tree2 "$STYLE, single tall pine tree, top-down 3/4 view game object, isolated on plain white background" 512 512 32
gen obj-mine "$STYLE, gold mine rocky cave entrance with glittering gold nuggets, top-down 3/4 view, isolated on plain white background" 512 512 33
gen obj-mine-empty "$STYLE, collapsed depleted rocky cave entrance, grey rubble, top-down 3/4 view, isolated on plain white background" 512 512 34

# ── 건물 7종 × 6종족 ──
faction_desc() {
  case "$1" in
    psion) echo "psychic order theme, purple and violet colors with glowing cyan crystal accents" ;;
    murim) echo "korean martial arts sect theme, teal wooden hanok architecture with paper lanterns" ;;
    fantasy) echo "medieval human kingdom theme, blue and gold stone architecture with banners" ;;
    yokai) echo "japanese yokai theme, dark red shrine architecture with paper lanterns and fox motifs" ;;
    demon) echo "demonic legion theme, crimson and obsidian spiky architecture with lava glow" ;;
    celestial) echo "heavenly host theme, white marble and gold architecture with soft light rays" ;;
  esac
}
kind_desc() {
  case "$1" in
    hq) echo "majestic main castle keep stronghold, large" ;;
    farm) echo "small farm hut with crop field rows" ;;
    barracks) echo "military barracks training hall with weapon racks" ;;
    hall) echo "war hall with stable and siege workshop" ;;
    magetower) echo "tall mystical mage tower with floating orb" ;;
    forge) echo "blacksmith forge with chimney and anvil" ;;
    tower) echo "tall defensive watchtower with battlements" ;;
  esac
}
SEED=50
for f in psion murim fantasy yokai demon celestial; do
  for k in hq farm barracks hall magetower forge tower; do
    SEED=$((SEED + 1))
    gen "b-$f-$k" "$STYLE, $(kind_desc $k), $(faction_desc $f), top-down 3/4 view RTS building, isolated on plain white background" 512 512 $SEED
  done
done

# ── 종족 초상화 + 메뉴 배경 ──
gen p-psion "$STYLE, portrait of a psychic esper warrior with glowing violet eyes and cyan crystal halo, bust shot" 512 512 91
gen p-murim "$STYLE, portr