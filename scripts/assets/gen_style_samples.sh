#!/bin/bash
# 스타일 시안 4종 × 소재 3종 생성 (Z-Image-Turbo, 시드 고정)
set -e
OUT=art-src/samples
mkdir -p "$OUT"

gen() { # name prompt
  echo "[gen] $1"
  mflux-generate-z-image-turbo --prompt "$2" --steps 6 --width 512 --height 512 --seed 7 --output "$OUT/$1.png" 2>/dev/null
}

# A. 손그림 카툰 (워크3풍)
A_STYLE="hand-painted cartoon, warcraft 3 reforged style, thick dark outlines, warm saturated colors, painterly soft shading, fantasy RTS game asset"
gen a-building "$A_STYLE, majestic castle keep with purple banners, top-down 3/4 view, isolated on plain grass background"
gen a-terrain "$A_STYLE, seamless top-down grassland terrain texture with dirt path and small bushes and wildflowers, RTS map tile"
gen a-unit "$A_STYLE, cute chibi martial artist swordsman character with teal robes and topknot, full body, standing pose, plain background"

# B. 고급 플랫 카툰 (클래시로얄풍)
B_STYLE="premium flat vector cartoon, clash royale supercell style, clean bold shapes, two-tone cel shading, vibrant colors, mobile game asset"
gen b-building "$B_STYLE, fantasy castle keep with purple banners, top-down 3/4 view, isolated on plain grass background"
gen b-terrain "$B_STYLE, seamless top-down stylized grassland terrain with dirt path and bushes, RTS map tile"
gen b-unit "$B_STYLE, cute chibi martial artist swordsman with teal robes and topknot, full body, plain background"

# C. 픽셀아트 (레트로 워크2풍)
C_STYLE="16-bit pixel art, retro 90s RTS game sprite, warcraft 2 aesthetic, limited palette, crisp pixels"
gen c-building "$C_STYLE, fantasy castle keep building sprite, top-down 3/4 view, on grass tile background"
gen c-terrain "$C_STYLE, top-down grassland tileset with dirt path forest and water edges, RTS terrain"
gen c-unit "$C_STYLE, martial artist swordsman unit sprite with teal robes, full body, plain background"

# D. 동양 수묵채색 카툰 (육계대전 고유 방향)
D_STYLE="korean ink wash painting with soft watercolor tint, oriental fantasy cartoon, elegant brush strokes, muted jade and gold palette, game art"
gen d-building "$D_STYLE, fantasy castle pavilion with curved roofs and purple banners, top-down 3/4 view, isolated on pale grass"
gen d-terrain "$D_STYLE, top-down grassland terrain with winding path pine trees and mist, RTS map view"
gen d-unit "$D_STYLE, chibi martial artist swordsman with teal hanbok robes and topknot, full body, plain background"

echo "전체 완료"
