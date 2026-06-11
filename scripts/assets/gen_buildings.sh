#!/bin/bash
# 건물 7종 × 6종족 = 42 정적 AI 에셋 (top-down 3/4, A스타일, 매젠타 크로마키)
set -e
cd "$(dirname "$0")/../.."
OUT=art-src/buildings
mkdir -p "$OUT"
STYLE="hand-painted cartoon warcraft 3 style building, top-down 3/4 isometric view, thick dark outlines, painterly shading, centered, solid bright magenta background, no text no ground, RTS game building asset, cute stylized"

gen() { # faction kind themedesc
  local key="$1-$2"
  [ -f "$OUT/$key.png" ] && { echo "  skip $key"; return; }
  mflux-generate-z-image-turbo --prompt "$STYLE, $3" --steps 8 --width 768 --height 768 --seed 42 --output "$OUT/$key.png" 2>/dev/null
  echo "  $key"
}

build_faction() { # faction theme hq barracks
  local f="$1" t="$2"
  gen "$f" hq "$t, grand main castle keep with banner, large imposing"
  gen "$f" farm "$t, small farm cottage with fields"
  gen "$f" barracks "$t, military barracks training hall"
  gen "$f" hall "$t, war hall with stables"
  gen "$f" magetower "$t, tall magic spire tower with glowing orb"
  gen "$f" forge "$t, blacksmith forge with chimney and anvil"
  gen "$f" tower "$t, defensive watchtower with battlements"
}

build_faction psion     "purple and neon-cyan psychic esper theme, futuristic crystalline"
build_faction murim     "teal jade martial arts wuxia theme, oriental pavilion with curved roofs"
build_faction fantasy   "royal blue and gold fantasy kingdom theme, classic medieval stone"
build_faction yokai     "crimson purple lantern-orange yokai spirit theme, japanese haunted shrine"
build_faction demon     "crimson red obsidian black demon legion theme, spiky hellish architecture"
build_faction celestial "platinum white golden-light celestial theme, holy marble temple"

echo "전체 건물 생성 완료"
