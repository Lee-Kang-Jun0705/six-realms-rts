"""SFX 생성 — pyfxr (결정적 시드, 카툰 RTS 9종). 실행: uv run --with pyfxr python3 scripts/assets/gen_sfx.py"""
import random
import pyfxr

OUT = "public/sfx"

def save(name: str, buf) -> None:
    if isinstance(buf, pyfxr.SFX):
        buf = buf.build()
    buf.save(f"{OUT}/{name}.wav")
    print(f"  {name}.wav")

random.seed(62426)  # 시드 고정 → 재생성해도 동일 사운드
sq = pyfxr.Wavetable.square()
tri = pyfxr.Wavetable.triangle()
saw = pyfxr.Wavetable.saw()

save("hit", pyfxr.hurt())          # 타격
save("attack", pyfxr.laser())      # 원거리 발사
save("build", pyfxr.tone("C4", attack=0.01, decay=0.05, sustain=0.08, release=0.12, wavetable=sq))
save("train", pyfxr.pickup())      # 유닛 생산 완료
save("spell", pyfxr.powerup())     # 스펠 시전
save("select", pyfxr.select())     # 유닛 선택
save("victory", pyfxr.chord([
    pyfxr.tone("C4", attack=0.01, sustain=0.25, release=0.4, wavetable=tri),
    pyfxr.tone("E4", attack=0.01, sustain=0.25, release=0.4, wavetable=tri),
    pyfxr.tone("G4", attack=0.01, sustain=0.25, release=0.4, wavetable=tri),
    pyfxr.tone("C5", attack=0.01, sustain=0.3, release=0.5, wavetable=tri),
], stagger=0.09))
save("defeat", pyfxr.chord([
    pyfxr.tone("C3", attack=0.02, sustain=0.4, release=0.6, wavetable=saw),
    pyfxr.tone("Eb3", attack=0.02, sustain=0.4, release=0.6, wavetable=saw),
    pyfxr.tone("G3", attack=0.02, sustain=0.4, release=0.6, wavetable=saw),
], stagger=0.12))
save("explosion", pyfxr.explosion())
print("완료")
