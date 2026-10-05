"""Synthesises the IntroPlay soundtrack (no samples, no downloads).

Writes public/intro-music.wav and public/intro-sfx.wav, both 6 s stereo, 44.1 kHz.
Every event is placed from a *frame number* (30 fps) so it stays in sync with
src/intro/IntroPlay.tsx. If you retime the animation, move the matching frames here.

    pip install numpy scipy && python3 audio/make_intro_audio.py
"""
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, lfilter

SR = 44100
DUR = 6.0
N = int(SR * DUR)
FPS = 30
rng = np.random.default_rng(7)
OUT = Path(__file__).resolve().parent.parent / "public"


def fr(frame):
    return frame / FPS


def tt(n):
    return np.arange(n) / SR


def place(buf, sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i < 0:
        sig, i = sig[-i:], 0
    if i >= N or len(sig) == 0:
        return
    seg = sig[: N - i]
    a = (pan + 1) * np.pi / 4
    buf[i : i + len(seg), 0] += seg * gain * np.cos(a)
    buf[i : i + len(seg), 1] += seg * gain * np.sin(a)


def bandpass(x, lo, hi):
    b, a = butter(2, [max(lo, 20) / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], btype="band")
    return lfilter(b, a, x)


def lowpass(x, fc, order=2):
    b, a = butter(order, fc / (SR / 2), btype="low")
    return lfilter(b, a, x)


def noise(n):
    return rng.standard_normal(n)


# ---------------------------------------------------------------- SFX
def blip(freq, dur=0.05):
    t = tt(int(SR * dur))
    return np.sin(2 * np.pi * freq * t) * np.exp(-t / 0.011) + 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t / 0.006)


def thud(dur=0.35):
    t = tt(int(SR * dur))
    f = 42 + 60 * np.exp(-t / 0.05)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t / 0.12)


def sweep(f0, f1, dur, curve=1.0, decay=None):
    n = int(SR * dur)
    t = tt(n)
    x = (t / dur) ** curve
    f = f0 + (f1 - f0) * x
    s = np.sin(2 * np.pi * np.cumsum(f) / SR)
    if decay:
        s *= np.exp(-t / decay)
    return s


def bell(f, dur=1.4):
    t = tt(int(SR * dur))
    out = np.zeros_like(t)
    for ratio, g, tau in [(1, 1, 0.55), (2.76, 0.35, 0.3), (5.4, 0.15, 0.18), (8.93, 0.07, 0.1)]:
        out += g * np.sin(2 * np.pi * f * ratio * t) * np.exp(-t / tau)
    out *= np.minimum(1, t / 0.002)
    return out


def whoosh(dur, fc0, fc1, peak=0.5):
    """Noise whose band centre glides fc0 -> fc1, with a smooth swell."""
    n = int(SR * dur)
    out = np.zeros(n)
    chunks = 24
    size = n // chunks * 2
    hop = n // chunks
    win = np.hanning(size)
    base = noise(n + size)
    for k in range(chunks):
        c = fc0 * (fc1 / fc0) ** (k / (chunks - 1))
        seg = bandpass(base[k * hop : k * hop + size], c * 0.6, c * 1.5) * win
        out[k * hop : k * hop + size if k * hop + size <= n else n] += seg[: min(size, n - k * hop)]
    swell = np.sin(np.pi * np.clip(np.arange(n) / n, 0, 1) ** peak) ** 2
    out *= swell
    return out / (np.max(np.abs(out)) + 1e-9)


def click(down=True):
    n = int(SR * 0.05)
    t = tt(n)
    nz = bandpass(noise(n), 1500, 7000) * np.exp(-t / 0.004)
    body = np.sin(2 * np.pi * (1900 if down else 1500) * t) * np.exp(-t / 0.006)
    thump = np.sin(2 * np.pi * 140 * t) * np.exp(-t / 0.012)
    return 0.7 * nz + 0.5 * body + 0.5 * thump * (1 if down else 0.4)


def build_sfx():
    buf = np.zeros((N, 2))
    prog_frames = [
        (12, 30),   # first burst
        (37, 52),   # after 1st stall
        (60, 76),   # after 2nd stall
        (76, 84),   # final sprint
    ]
    # progress(frame) mirrors IntroPlay.tsx keyframes
    pk_f = [12, 30, 37, 52, 60, 76, 84]
    pk_v = [0, 0.37, 0.37, 0.79, 0.79, 0.97, 1.0]
    for a, b in prog_frames:
        step = 1 if a >= 76 else 2
        for f in range(a, b, step):
            p = np.interp(f, pk_f, pk_v)
            place(buf, blip(520 + 1500 * p), fr(f), gain=0.16 + 0.1 * p, pan=-0.25 + 0.5 * p)

    # stalls: a sinking thud, then a quick zip when the bar resumes
    for f in (30, 52):
        place(buf, thud(), fr(f), gain=0.55)
        place(buf, sweep(900, 300, 0.22, decay=0.12), fr(f), gain=0.1)
    for f in (37, 60):
        place(buf, sweep(350, 1500, 0.1, curve=1.4, decay=0.08), fr(f - 0.5), gain=0.22)

    # 100 %: chime + soft low boom
    place(buf, bell(1318.5), fr(84), gain=0.34, pan=-0.1)
    place(buf, bell(1975.5, 1.0), fr(84.6), gain=0.18, pan=0.15)
    place(buf, thud(0.6) * 0.8, fr(84), gain=0.45)

    # loader collapses
    place(buf, whoosh(0.5, 5200, 700, 0.8), fr(96), gain=0.3)

    # play appears: sparkle arpeggio
    for k, f in enumerate([1318.5, 1568.0, 1975.5, 2637.0]):
        place(buf, bell(f, 0.8) * 0.8, fr(104) + k * 0.055, gain=0.13, pan=-0.3 + 0.2 * k)

    # cursor glides in, tiny hover tick
    place(buf, whoosh(1.0, 900, 2600, 1.4), fr(110), gain=0.16, pan=0.35)
    place(buf, blip(2600, 0.03), fr(141), gain=0.12)

    # the click: press + release
    place(buf, click(True), fr(146), gain=0.85)
    place(buf, click(False), fr(152), gain=0.4)

    # ripples and the final lift-off
    place(buf, whoosh(0.8, 3000, 8000, 1.0), fr(147), gain=0.1)
    place(buf, sweep(180, 2200, 0.95, curve=2.2) * np.linspace(0, 1, int(SR * 0.95)) ** 1.5, fr(150), gain=0.2)
    place(buf, whoosh(0.9, 400, 6000, 2.2), fr(150), gain=0.4)
    place(buf, thud(0.9) * 0.9, fr(152), gain=0.5)

    peak = np.max(np.abs(buf))
    return buf / peak * 0.85


# -------------------------------------------------------------- MUSIC
def saw_pad(freq, dur, rel=0.7, att=0.55):
    n = int(SR * (dur + rel))
    t = tt(n)
    out = np.zeros(n)
    for cents in (-7, 0, 7):
        f = freq * 2 ** (cents / 1200)
        ph = rng.uniform(0, 2 * np.pi)
        for k in range(1, 9):
            out += np.sin(2 * np.pi * f * k * t + ph * k) / k
    env = np.minimum(1, t / att) * np.where(t > dur, np.clip(1 - (t - dur) / rel, 0, 1), 1)
    return out * env ** 1.5 / 3


def piano(freq, dur=1.6):
    t = tt(int(SR * dur))
    out = np.zeros_like(t)
    for k, g in enumerate([1, 0.55, 0.28, 0.14, 0.08, 0.04], start=1):
        out += g * np.sin(2 * np.pi * freq * k * t * (1 + 0.0003 * k * k)) * np.exp(-t / (0.9 / k ** 0.55))
    hammer = lowpass(noise(len(t)), 3500) * np.exp(-t / 0.01) * 0.15
    return (out + hammer) * np.minimum(1, t / 0.004)


def reverb(x, wet=0.3, size=1.0):
    outs = []
    for ch, delays in enumerate([(0.0297, 0.0371, 0.0411, 0.0437), (0.0313, 0.0359, 0.0423, 0.0451)]):
        mono = x[:, ch]
        acc = np.zeros_like(mono)
        for d in delays:
            D = int(d * SR * size)
            a = np.zeros(D + 1)
            a[0] = 1
            a[D] = -0.8
            acc += lfilter([1], a, mono)
        for d, g in ((0.005, 0.7), (0.0017, 0.7)):
            D = int(d * SR)
            b = np.zeros(D + 1)
            b[0] = -g
            b[D] = 1
            a = np.zeros(D + 1)
            a[0] = 1
            a[D] = -g
            acc = lfilter(b, a, acc)
        outs.append(acc / 4)
    return x * (1 - wet * 0.5) + np.stack(outs, axis=1) * wet


NOTE = {"A": 0, "B": 2, "C": 3, "D": 5, "E": 7, "F": 8, "G": 10}


def hz(name):
    # name like "A2", "C#4"; A4 = 440
    letter, rest = name[0], name[1:]
    semis = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}[letter]
    if rest.startswith("#"):
        semis += 1
        rest = rest[1:]
    elif rest.startswith("b"):
        semis -= 1
        rest = rest[1:]
    octave = int(rest)
    return 440 * 2 ** ((semis + (octave - 4) * 12) / 12)


def build_music():
    # Am -> F -> G -> C : the unresolved climb lands on C exactly as the screen floods white
    chords = [
        (0.0, 1.5, "A2", ["A3", "C4", "E4", "B4"], ["A4", "C5", "E5", "B4"]),
        (1.5, 3.0, "F2", ["F3", "A3", "C4", "E4"], ["A4", "C5", "E5", "F5"]),
        (3.0, 4.5, "G2", ["G3", "B3", "D4", "F#4"], ["B4", "D5", "G5", "D5"]),
        (4.5, 6.0, "C3", ["C4", "E4", "G4", "C5"], ["E5", "G5", "C6", "G5"]),
    ]
    pad = np.zeros((N, 2))
    keys = np.zeros((N, 2))
    sub = np.zeros((N, 2))

    for start, end, root, tones, arp in chords:
        for j, name in enumerate(tones):
            place(pad, saw_pad(hz(name), end - start + 0.1), start - 0.05, gain=0.5, pan=-0.4 + 0.27 * j)
        place(pad, saw_pad(hz(root), end - start + 0.1) * 0.9, start - 0.05, gain=0.5)
        t = tt(int(SR * (end - start + 0.5)))
        env = np.minimum(1, t / 0.08) * np.where(t > end - start, np.clip(1 - (t - (end - start)) / 0.5, 0, 1), 1)
        place(sub, np.sin(2 * np.pi * hz(root) * t) * env, start, gain=0.5)

    # piano arpeggios, 16ths at 80 bpm, getting louder
    step = 0.1875
    t0 = 0.75
    k = 0
    while t0 < 5.85:
        chord = next(c for c in chords if c[0] <= t0 < c[1])
        notes = chord[4]
        name = notes[k % len(notes)]
        prog = t0 / DUR
        g = 0.1 + 0.42 * prog ** 1.1
        place(keys, piano(hz(name)), t0, gain=g, pan=-0.2 + 0.4 * ((k % 4) / 3))
        t0 += step
        k += 1
    # the "landing": full chord struck with the cut to white
    for name in ["C4", "E4", "G4", "C5", "E5", "C6"]:
        place(keys, piano(hz(name), 1.6), 4.5, gain=0.2)

    # pad brightens and swells over the piece
    pad = lowpass(pad, 2800)
    swell = 0.28 + 0.72 * (tt(N) / DUR) ** 1.4
    pad *= swell[:, None]
    mix = pad + keys + sub * 0.55
    mix = reverb(mix, wet=0.32)
    fade = np.ones(N)
    fade[-int(0.08 * SR):] = np.linspace(1, 0, int(0.08 * SR))
    fade[: int(0.05 * SR)] = np.linspace(0, 1, int(0.05 * SR))
    mix *= fade[:, None]
    return mix / np.max(np.abs(mix)) * 0.8


# ------------------------------------------------- MUSIC (cinematic)
def strings(freqs, start, dur, gain, att=0.7, rel=0.8, bright=6, vib=6.0, trem=False, pan=0.0):
    """Section of detuned saws with slow vibrato; `bright` = highest harmonic."""
    n = int(SR * (dur + rel))
    t = tt(n)
    out = np.zeros(n)
    for f in freqs:
        for cents in (-12, -4, 4, 12):
            ph = rng.uniform(0, 2 * np.pi)
            vibr = vib * np.sin(2 * np.pi * 5.4 * t + ph) * np.minimum(1, t / 1.2)
            fi = f * 2 ** ((cents + vibr) / 1200)
            phase = 2 * np.pi * np.cumsum(fi) / SR + ph
            for k in range(1, bright + 1):
                out += np.sin(k * phase) / k
    env = np.minimum(1, t / att) * np.where(t > dur, np.clip(1 - (t - dur) / rel, 0, 1), 1)
    sig = out * env ** 1.3 / (len(freqs) * 4)
    if trem:  # fast bowed tremolo, the classic suspense ostinato
        sig *= 0.55 + 0.45 * np.sin(2 * np.pi * 11 * t) ** 2
    return sig


def timpani(f=73.4, dur=1.6):
    t = tt(int(SR * dur))
    pitch = f * (1 + 0.28 * np.exp(-t / 0.05))
    body = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-t / 0.55)
    body += 0.4 * np.sin(2 * np.pi * np.cumsum(pitch * 1.5) / SR) * np.exp(-t / 0.25)
    skin = lowpass(noise(len(t)), 700) * np.exp(-t / 0.035) * 0.9
    return (body + skin) * np.minimum(1, t / 0.002)


def brass(freqs, start, dur, gain, pan=0.0):
    n = int(SR * (dur + 0.5))
    t = tt(n)
    raw = np.zeros(n)
    for f in freqs:
        for cents in (-5, 5):
            ph = rng.uniform(0, 2 * np.pi)
            for k in range(1, 15):
                raw += np.sin(2 * np.pi * f * 2 ** (cents / 1200) * k * t + ph * k) / k ** 0.9
    dark, light = lowpass(raw, 900), lowpass(raw, 5200, 1)
    mix = np.clip(t / 0.35, 0, 1)
    sig = dark * (1 - mix) + light * mix
    env = np.minimum(1, t / 0.05) * np.where(t > dur, np.clip(1 - (t - dur) / 0.5, 0, 1), 1)
    return sig * env / (len(freqs) * 2)


def choir(freqs, dur, att=1.2):
    n = int(SR * dur)
    t = tt(n)
    raw = np.zeros(n)
    for f in freqs:
        for cents in (-9, 0, 9):
            ph = rng.uniform(0, 2 * np.pi)
            vibr = 7 * np.sin(2 * np.pi * 5.8 * t + ph)
            phase = 2 * np.pi * np.cumsum(f * 2 ** ((cents + vibr) / 1200)) / SR
            for k in range(1, 12):
                raw += np.sin(k * phase + ph) / k
    voice = sum(bandpass(raw, lo, hi) * g for lo, hi, g in [(650, 950, 1.0), (1000, 1350, 0.55), (2500, 3200, 0.25)])
    env = np.minimum(1, t / att) ** 1.5 * np.clip((dur - t) / 0.3, 0, 1)
    return voice * env / (len(freqs) * 3)


def cymbal(dur, peak_at):
    n = int(SR * dur)
    t = tt(n)
    x = bandpass(noise(n), 5500, 15000)
    env = np.where(t < peak_at, (t / peak_at) ** 2.5, np.exp(-(t - peak_at) / 0.9))
    return x * env


def build_music_cine():
    D = lambda name: hz(name)
    str_bus = np.zeros((N, 2))
    low = np.zeros((N, 2))
    perc = np.zeros((N, 2))
    horns = np.zeros((N, 2))
    voices = np.zeros((N, 2))
    harp = np.zeros((N, 2))

    # --- 0.0-2.8 s  loading: D minor, low and ominous, tremolo strings creeping in
    place(low, strings([D("D2"), D("A2")], 0, 3.0, 1.0, att=1.0, rel=0.5, bright=5), 0.0, gain=0.9)
    place(str_bus, strings([D("D3"), D("F3"), D("A3")], 0, 2.9, 1.0, att=1.4, rel=0.4, bright=8, trem=True), 0.4, gain=0.55, pan=-0.3)
    place(str_bus, strings([D("A3"), D("D4")], 0, 2.4, 1.0, att=1.6, rel=0.4, bright=8, trem=True), 0.9, gain=0.4, pan=0.3)
    for i, tm in enumerate([0.0, 1.0, 1.73, 2.4]):  # soft pulse that ties to the two stalls
        place(perc, timpani(73.4 * (1.0 if i % 2 == 0 else 1.122)), tm, gain=0.25 + 0.06 * i)

    # --- 2.8-4.2  100 % and the play button: lifts to B-flat, harp and choir bloom
    place(low, strings([D("Bb1"), D("F2")], 0, 1.5, 1.0, att=0.5, rel=0.5, bright=5), 2.75, gain=0.9)
    place(str_bus, strings([D("Bb3"), D("D4"), D("F4"), D("Bb4")], 0, 1.7, 1.0, att=0.7, rel=0.5, bright=10, vib=7), 2.8, gain=0.85, pan=-0.2)
    place(voices, choir([D("D4"), D("F4"), D("Bb4")], 2.6), 3.45, gain=0.8)
    for k, name in enumerate(["D4", "F4", "A4", "D5", "F5", "A5", "D6"]):
        place(harp, piano(D(name), 1.8), 3.47 + k * 0.05, gain=0.2, pan=-0.5 + 0.17 * k)

    # --- 4.2-5.07  the cursor arrives and clicks: dominant (A major) tension + timpani roll
    place(low, strings([D("A1"), D("E2")], 0, 1.0, 1.0, att=0.3, rel=0.3, bright=5), 4.15, gain=0.95)
    place(str_bus, strings([D("A3"), D("C#4"), D("E4"), D("A4")], 0, 1.0, 1.0, att=0.5, rel=0.3, bright=10, vib=8, trem=True), 4.2, gain=0.9, pan=0.1)
    roll = np.linspace(4.2, 5.04, 22)
    for i, tm in enumerate(roll):
        place(perc, timpani(55.0 + 0.0 * i, 0.5), tm, gain=0.1 + 0.55 * (i / len(roll)) ** 1.6, pan=-0.2 if i % 2 else 0.2)

    # --- 5.07-6.0  the click opens the door: D MAJOR, full orchestra
    t_hit = 5.07
    place(perc, timpani(73.4, 1.4), t_hit, gain=1.15)
    place(perc, timpani(55.0, 1.4), t_hit, gain=0.85)
    place(perc, cymbal(1.8, 0.75) * 0.0, t_hit - 0.75, gain=0.0)
    place(perc, cymbal(2.5, 0.85), t_hit - 0.85, gain=0.55)
    place(low, strings([D("D1"), D("D2"), D("A2")], 0, 0.9, 1.0, att=0.05, rel=0.4, bright=6), t_hit, gain=1.15)
    place(str_bus, strings([D("D3"), D("A3"), D("D4"), D("F#4"), D("A4"), D("D5")], 0, 0.9, 1.0, att=0.12, rel=0.4, bright=12, vib=9), t_hit, gain=1.4)
    place(horns, brass([D("D3"), D("A3"), D("D4"), D("F#4")], 0, 0.9, 1.0), t_hit, gain=1.2, pan=-0.15)
    place(horns, brass([D("A4"), D("D5")], 0, 0.9, 1.0), t_hit + 0.02, gain=0.95, pan=0.2)
    place(voices, choir([D("D4"), D("F#4"), D("A4"), D("D5")], 1.2, att=0.2), t_hit, gain=1.0)

    # --- mix: big hall reverb on everything but the low end
    wet = str_bus * 1.0 + voices * 1.3 + horns * 1.0 + harp * 1.4 + perc * 0.9
    wet = reverb(wet, wet=0.42, size=1.9)
    mix = wet + low * 0.8
    fade = np.ones(N)
    fade[-int(0.08 * SR):] = np.linspace(1, 0, int(0.08 * SR))
    fade[: int(0.04 * SR)] = np.linspace(0, 1, int(0.04 * SR))
    mix *= fade[:, None]
    return mix / np.max(np.abs(mix)) * 0.85


def write(name, buf):
    pcm = (np.clip(buf, -1, 1) * 32767).astype("<i2")
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(name, f"{len(buf) / SR:.2f}s", f"peak={np.max(np.abs(buf)):.2f}")


if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    write("intro-sfx.wav", build_sfx())
    write("intro-music.wav", build_music())
    write("intro-music-cine.wav", build_music_cine())
