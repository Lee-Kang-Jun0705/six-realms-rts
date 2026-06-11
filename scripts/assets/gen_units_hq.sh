#!/bin/bash
# 유닛 고퀄 재생성 — 치비 탈피, 초상화급 디테일 전신 RPG 캐릭터
set -e
cd "$(dirname "$0")/../.."
OUT=art-src/units_hq
mkdir -p "$OUT"
STYLE="full body fantasy RPG character, hand-painted cartoon warcraft 3 style, highly detailed, painterly rendering, dynamic confident pose, thick clean outlines, dramatic lighting, premium game unit art, 3/4 front view facing right, solid bright magenta background, no text no ground shadow"

gen() { local key="$1-$2"; [ -f "$OUT/$key.png" ] && { echo "  skip $key"; return; }
  mflux-generate-z-image-turbo --prompt "$STYLE, $3" --steps 10 --width 768 --height 768 --seed 21 --output "$OUT/$key.png" 2>/dev/null; echo "  $key"; }

uf() { local f="$1" t="$2"
  gen "$f" worker  "$t worker/peasant holding a tool, simple garb"
  gen "$f" melee   "$t elite melee warrior with sword, detailed armor"
  gen "$f" ranged  "$t skilled archer drawing a bow, quiver"
  gen "$f" cavalry "$t mounted knight on a war beast, lance"
  gen "$f" siege   "$t siege engineer beside a war machine cannon"
  gen "$f" caster  "$t powerful spellcaster mage with glowing magic, robe"
}
uf psion     "purple and neon-cyan psychic esper, futuristic"
uf murim     "teal jade martial arts wuxia hero, oriental"
uf fantasy   "royal blue and gold fantasy kingdom soldier"
uf yokai     "crimson purple lantern-orange japanese yokai spirit, fox motif"
uf demon     "crimson red obsidian black demon legion fiend, horns"
uf celestial "platinum white golden celestial angel, halo wings"
echo "고퀄 유닛 재생성 완료"
