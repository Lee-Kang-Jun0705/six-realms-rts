#!/bin/bash
# 6종족 × 6역할 정적 치비 유닛 생성 (A스타일, 시드 고정). psion은 시범에서 완료됨.
set -e
cd "$(dirname "$0")/../.."
OUT=art-src/units
mkdir -p "$OUT"
STYLE="single cute chibi character, hand-painted cartoon warcraft 3 style, thick dark outlines, painterly soft shading, tiny round body big round head, side view facing right, full body standing, centered, solid bright magenta background, no text no ground shadow, game unit"

gen() { # faction role themedesc
  local key="$1-$2"
  [ -f "$OUT/$key.png" ] && { echo "  skip $key"; return; }
  mflux-generate-z-image-turbo --prompt "$STYLE, $3" --steps 8 --width 768 --height 768 --seed 42 --output "$OUT/$key.png" 2>/dev/null
  echo "  $key"
}

# 무림 (청록/한지, 무협 문파)
M="teal and jade green color theme, martial arts wuxia"
gen murim worker "$M peasant disciple holding a hoe, hanbok"
gen murim melee "$M sword fighter with a curved jian blade, light robe"
gen murim ranged "$M archer with a traditional bow"
gen murim cavalry "$M rider on a small horse"
gen murim siege "$M operating a small catapult"
gen murim caster "$M monk casting chi energy, beads"

# 판타지 (파랑/금, 검과마법 왕국)
F="royal blue and gold color theme, fantasy kingdom knight"
gen fantasy worker "$F peasant builder with a hammer"
gen fantasy melee "$F knight with sword and shield, plate armor"
gen fantasy ranged "$F crossbow soldier"
gen fantasy cavalry "$F knight on an armored horse"
gen fantasy siege "$F operating a ballista"
gen fantasy caster "$F wizard with a staff and pointed hat"

# 요괴 (적자/등불, 백귀)
Y="crimson purple and lantern orange color theme, japanese yokai spirit, fox ears"
gen yokai worker "$Y small imp worker with a pickaxe"
gen yokai melee "$Y oni warrior with a kanabo club"
gen yokai ranged "$Y spirit archer with a spectral bow"
gen yokai cavalry "$Y rider on a nine-tail fox beast"
gen yokai siege "$Y operating a cursed cannon"
gen yokai caster "$Y kitsune sorcerer with floating talismans"

# 마계 (진홍/흑요석, 마계군단)
D="crimson red and obsidian black color theme, demon legion, small horns"
gen demon worker "$D imp worker with a pickaxe"
gen demon melee "$D demon grunt with a jagged blade"
gen demon ranged "$D demon with a bone bow"
gen demon cavalry "$D demon rider on a hellhound"
gen demon siege "$D operating a demonic mortar"
gen demon caster "$D warlock with a skull staff"

# 천계 (백금/빛, 천상)
C="platinum white and golden light color theme, celestial angel, small halo"
gen celestial worker "$C cherub worker with a glowing tool"
gen celestial melee "$C angel warrior with a radiant sword"
gen celestial ranged "$C angel archer with a light bow"
gen celestial cavalry "$C angel on a winged steed"
gen celestial siege "$C operating a holy light cannon"
gen celestial caster "$C priest with a glowing scepter, wings"

echo "전체 유닛 생성 완료"
