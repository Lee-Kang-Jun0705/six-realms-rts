"""건물 AI 이미지 투명화+정규화 → public/buildings. uv run --with pillow python3 scripts/assets/normalize_buildings.py"""
import glob, os
from PIL import Image

FACTIONS = ["psion", "murim", "fantasy", "yokai", "demon", "celestial"]
KINDS = ["hq", "farm", "barracks", "hall", "magetower", "forge", "tower"]


def auto_chroma(im):
    im = im.convert("RGBA"); px = im.load(); w, h = im.size
    cs = [px[2, 2], px[w - 3, 2], px[2, h - 3], px[w - 3, h - 3]]
    kr = sum(c[0] for c in cs) // 4; kg = sum(c[1] for c in cs) // 4; kb = sum(c[2] for c in cs) // 4
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5 < 100:
                px[x, y] = (r, g, b, 0)
    return im


def main():
    os.makedirs("public/buildings", exist_ok=True)
    n = 0
    done = set()
    for f in FACTIONS:
        for k in KINDS:
            src = f"art-src/buildings/{f}-{k}.png"
            if not os.path.exists(src):
                continue
            im = auto_chroma(Image.open(src))
            bb = im.getbbox()
            if bb:
                im = im.crop(bb)
            c = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            t = im.copy(); t.thumbnail((248, 248))
            c.paste(t, ((256 - t.width) // 2, 254 - t.height), t)  # 하단 정렬
            c.save(f"public/buildings/{f}-{k}.png")
            n += 1
        done.add(f)
    # 매니페스트 갱신 (전 종족 7종 완비된 종족만)
    complete = [f for f in FACTIONS if all(os.path.exists(f"public/buildings/{f}-{k}.png") for k in KINDS)]
    manifest = "src/data/buildingManifest.ts"
    txt = open(manifest).read()
    arr = ", ".join(f"'{f}'" for f in complete)
    import re
    txt = re.sub(r"export const BUILDING_IMAGE_FACTIONS: FactionId\[\] = \[[^\]]*\];",
                 f"export const BUILDING_IMAGE_FACTIONS: FactionId[] = [{arr}];", txt)
    open(manifest, "w").write(txt)
    print(f"정규화 {n}개 → public/buildings, 완비 종족: {complete}")


if __name__ == "__main__":
    main()
