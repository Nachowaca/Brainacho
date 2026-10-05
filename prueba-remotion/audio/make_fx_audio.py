"""Sound-design-only track for IntroPlayFX (no melody, no music). 8 s, stereo.

Builds on the helpers and base effects of make_intro_audio.py, then layers a room-tone bed,
heartbeats, shimmer, a pre-impact reverse swell and a big hit with a long tail.
The animation floods to white at frame ~170 and holds white until frame 240, so the
tail rings out into that hold.

    python3 audio/make_fx_audio.py
"""
import numpy as np
from scipy.signal import lfilter

import make_intro_audio as m

SR = m.SR
DUR = 8.0
m.N = int(SR * DUR)  # the helpers read this global, so this lengthens every buffer
N = m.N
fr = m.fr


def bed():
    """Room tone: dark air + sub rumble, swelling to the click, ducked at each stall."""
    t = m.tt(N)
    air = m.lowpass(m.noise(N), 1400) * 0.5
    rumble = np.sin(2 * np.pi * 46 * t + 0.6 * np.sin(2 * np.pi * 0.35 * t)) + 0.5 * np.sin(2 * np.pi * 92 * t)
    shimmer = m.bandpass(m.noise(N), 5000, 9000) * (0.08 + 0.08 * np.sin(2 * np.pi * 0.5 * t) ** 2)
    sig = air + rumble * 0.6 + shimmer
    f = t * FPS
    swell = np.interp(f, [0, 12, 152, 172, 200, 240], [0.1, 0.18, 0.9, 1.0, 0.35, 0.0])
    duck = np.interp(f, [28, 30, 36, 38, 50, 52, 59, 61], [1, 0.15, 0.15, 1, 1, 0.1, 0.1, 1])
    duck = np.where((f > 28) & (f < 61), duck, 1.0)
    sig = sig * swell * duck
    return np.stack([sig, np.roll(sig, 40)], axis=1) * 0.5


FPS = m.FPS


def heartbeat(buf, start_f, gain):
    for off in (0.0, 0.17):
        m.place(buf, m.thud(0.35), fr(start_f) + off, gain=gain * (1.0 if off == 0 else 0.7))


def sparkles(buf, a, b, n=26):
    for i in range(n):
        f = a + (b - a) * (i / n) ** 0.8
        hz = 2500 + m.rng.random() * 5500
        m.place(buf, m.blip(hz, 0.12) * np.exp(-m.tt(int(SR * 0.12)) / 0.03), fr(f), gain=0.05 + 0.05 * m.rng.random(), pan=m.rng.uniform(-0.8, 0.8))


def reverse_swell(dur, lo, hi):
    x = m.whoosh(dur, lo, hi, 2.6)
    ramp = np.linspace(0, 1, len(x)) ** 2.4
    return x * ramp


def big_hit():
    n = int(SR * 4.0)
    t = m.tt(n)
    f = 28 + 70 * np.exp(-t / 0.14)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.4)
    crash = m.bandpass(m.noise(n), 250, 11000) * np.exp(-t / 0.7)
    metal = sum(np.sin(2 * np.pi * 180 * r * t) * g * np.exp(-t / tau)
                for r, g, tau in [(1, 1, 1.2), (2.43, 0.6, 0.8), (3.97, 0.4, 0.6), (6.1, 0.25, 0.4), (9.3, 0.15, 0.3)])
    return boom * 1.1 + crash * 0.5 + metal * 0.12


def build_fx():
    buf = m.build_sfx()  # loading ticks, stall thuds, chimes, click, whooshes, first riser (now 8 s long)
    buf *= 0.9
    m.place(buf, bed()[:, 0], 0, gain=1.0, pan=-0.2)
    m.place(buf, bed()[:, 1], 0, gain=1.0, pan=0.2)

    # tension while the play button waits: heartbeat that speeds up toward the click
    for f, g in [(112, 0.3), (124, 0.35), (134, 0.4), (141, 0.45)]:
        heartbeat(buf, f, g)
    sparkles(buf, 104, 140)

    # pre-impact: reverse swell + low drop, then the hit as the screen goes white
    m.place(buf, reverse_swell(0.85, 500, 9000), fr(172) - 0.85, gain=0.55)
    m.place(buf, m.sweep(900, 60, 0.7, curve=0.6) * np.linspace(0, 1, int(SR * 0.7)), fr(172) - 0.7, gain=0.18)

    hit = np.zeros((N, 2))
    m.place(hit, big_hit(), fr(172), gain=1.0)
    hit = m.reverb(hit, wet=0.55, size=2.2)
    buf += hit * 1.1

    # slow fade so the tail dies naturally and the end is clean for editing
    fade = np.ones(N)
    k = int(0.6 * SR)
    fade[-k:] = np.linspace(1, 0, k)
    buf *= fade[:, None]
    return buf / np.max(np.abs(buf)) * 0.9


if __name__ == "__main__":
    m.OUT.mkdir(exist_ok=True)
    m.write("intro-fx.wav", build_fx())
