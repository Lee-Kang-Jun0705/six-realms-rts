"""유닛 AI 이미지 투명화+정규화 → public/units. uv run --with pillow python3 scripts/assets/normalize_units.py"""
import os
from PIL import Image

FACTIONS = ["psion", "murim", "fantasy", "yokai", "demon", "celestial"]
ROLES = ["worker", "melee", "ranged", "cavalry", "siege", "caster"]
SRC = "art-src/units_hq"


def auto_chroma(im):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    cs = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    kr = sum(c[0] for c in cs) // 4; kg = sum(c[1] for c in cs) // 4; kb = sum(c[2] for c in cs) // 4
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5 < 110:
                px[x, y] = (r, g, b, 0)
    return im


def normalize(src):
    im = auto_chroma(Image.open(src))
    bb = im.getbbox()
    if bb:
        im = im.crop(bb)
    c = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    t = im.copy(); t.thumbnail((240, 240))
    c.paste(t, ((256 - t.width) // 2, 254 - t.height), t)  # 발 baseline 하단정렬
    return c


def main():
    os.makedirs("public/units", exist_ok=True)
    n = 0
    for f in FACTIONS:
        for r in ROLES:
            src = f"{SRC}/{f}-{r}.png"
            if not os.path.exists(src):
                continue
            normalize(src).save(f"public/units/{f}-{r}.png")
            n += 1
    print(f"유닛 정규화 {n}개 → public/units")


if __name__ == "__main__":
    main()
