"""맵 오브젝트(금광)+지형 타일(숲/바위) 정규화. uv run --with pillow python3 scripts/assets/normalize_objects.py"""
import os
from PIL import Image


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


def main():
    os.makedirs("public/objects", exist_ok=True)
    # 금광 — 투명 오브젝트(중앙 정렬)
    for name in ["mine", "rock-deco"]:
        src = f"art-src/objects/{name}.png"
        if not os.path.exists(src):
            continue
        im = auto_chroma(Image.open(src)); bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        c = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        t = im.copy(); t.thumbnail((248, 248))
        c.paste(t, ((256 - t.width) // 2, (256 - t.height) // 2), t)
        c.save(f"public/objects/{name}.png")
    # 지형 타일 — 꽉 찬 텍스처(128px, 투명화 없음, 기존 덮어쓰기)
    for name in ["forest", "rock"]:
        src = f"art-src/tiles_hq/{name}.png"
        if not os.path.exists(src):
            continue
        Image.open(src).convert("RGB").resize((128, 128), Image.LANCZOS).save(f"public/tiles/{name}.png")
    print("맵 오브젝트/타일 정규화 완료")


if __name__ == "__main__":
    main()
