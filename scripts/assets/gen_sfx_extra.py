"""추가 SFX (채집/업그레이드/웨이브경보/금광고갈/티어업/사망). uv run --with pyfxr python3 scripts/assets/gen_sfx_extra.py"""
import random, pyfxr
OUT="public/sfx"
def save(n,b):
    if isinstance(b,pyfxr.SFX): b=b.build()
    b.save(f"{OUT}/{n}.wav"); print(" ",n)
random.seed(913)
tri=pyfxr.Wavetable.triangle(); sq=pyfxr.Wavetable.square()
save("harvest", pyfxr.tone("G5",attack=0.005,decay=0.03,sustain=0.02,release=0.05,wavetable=tri))  # 채집 톡
save("upgrade", pyfxr.chord([pyfxr.tone("C5",sustain=0.12,release=0.2,wavetable=tri),pyfxr.tone("G5",sustain=0.12,release=0.25,wavetable=tri)],stagger=0.06))  # 업그레이드
save("tierup", pyfxr.chord([pyfxr.tone("C4",sustain=0.15,release=0.3,wavetable=tri),pyfxr.tone("E4",sustain=0.15,release=0.3,wavetable=tri),pyfxr.tone("G4",sustain=0.18,release=0.4,wavetable=tri),pyfxr.tone("C5",sustain=0.2,release=0.5,wavetable=tri)],stagger=0.08))  # 티어업 팡파레
save("wave-alert", pyfxr.chord([pyfxr.tone("A4",sustain=0.1,release=0.15,wavetable=sq),pyfxr.tone("A4",sustain=0.1,release=0.15,wavetable=sq)],stagger=0.18))  # 웨이브 경보(반복음)
save("mine-depleted", pyfxr.tone("C3",attack=0.01,decay=0.1,sustain=0.1,release=0.3,wavetable=sq))  # 금광 고갈
save("place", pyfxr.tone("E3",attack=0.005,decay=0.04,sustain=0.04,release=0.08,wavetable=sq))  # 건물 배치 확정
print("추가 SFX 완료")
