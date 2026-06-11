#!/bin/bash
# 맵 오브젝트 고퀄 재생성 — 금광(투명 오브젝트) + 숲/바위 타일(꽉 찬 텍스처)
set -e
cd "$(dirname "$0")/../.."
OBJ=art-src/objects
TIL=art-src/tiles_hq
mkdir -p "$OBJ" "$TIL"

# 금광: 위에서 비스듬히 본 오브젝트 → 매젠타 배경(투명화)
genobj() { [ -f "$OBJ/$1.png" ] && { echo "  skip $1"; return; }
  mflux-generate-z-image-turbo --prompt "$2" --steps 10 --width 768 --height 768 --seed 33 --output "$OBJ/$1.png" 2>/dev/null; echo "  obj $1"; }

# 타일: 위에서 수직으로 본 꽉 찬 지형 텍스처 (배경 없음)
gentile() { [ -f "$TIL/$1.png" ] && { echo "  skip $1"; return; }
  mflux-generate-z-image-turbo --prompt "$2" --steps 10 --width 512 --height 512 --seed 44 --output "$TIL/$1.png" 2>/dev/null; echo "  tile $1"; }

OBJSTYLE="hand-painted cartoon warcraft 3 style, highly detailed, painterly, thick clean outlines, premium game art, 3/4 top-down view, solid bright magenta background, no text"
genobj mine "$OBJSTYLE, fantasy gold mine entrance, glowing golden ore veins and gold nuggets in a rocky cave mouth, wooden support beams, sparkling treasure"
genobj rock-deco "$OBJSTYLE, cluster of large mossy boulders and grey rocks, natural stone formation"

TILESTYLE="hand-painted cartoon warcraft 3 style, top-down vertical aerial view, seamless tileable game terrain texture, highly detailed, painterly, vibrant, no text, fills entire frame edge to edge"
gentile forest "$TILESTYLE, dense lush green forest canopy seen from directly above, rounded tree tops, varied foliage"
gentile rock "$TILESTYLE, rocky grey mountain terrain with cracks and pebbles and moss patches"
echo "맵 오브젝트/타일 생성 완료"
