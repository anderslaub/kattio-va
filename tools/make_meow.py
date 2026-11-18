#!/usr/bin/env python3
"""Synthesizes the waiting sounds: sounds/meow_wait.flac (a low, patient "meow-meow") and sounds/meow_1.flac,
sounds/meow_2.flac (single meows the cat drops now and then while it waits for the answer).

    python3 tools/make_meow.py && for f in meow_wait meow_1 meow_2; do flac -f --best -o sounds/$f.flac sounds/$f.wav; done

A meow is a voiced "m-i-a-o-w": the pitch rises and falls while the mouth opens (formants move from an "ee"
to an "ah" and close to an "oo"). Additive synthesis: every harmonic of the pitch gets the loudness of the
vocal tract filter at its frequency. Replace the files with recordings you like better (FLAC, mono, 48 kHz).
"""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(3)


def curve(t, points):
    """Piecewise-linear curve through (time fraction, value) points, smoothed."""
    xs, ys = zip(*points)
    y = np.interp(t, xs, ys)
    k = max(1, int(0.015 * SR))
    return np.convolve(np.pad(y, k, mode="edge"), np.ones(k) / k, mode="same")[k:-k]


def meow(dur, f0_points, level=1.0, breath=0.05):
    n = int(dur * SR)
    u = np.linspace(0, 1, n)
    f0 = curve(u, f0_points) * (1 + 0.012 * np.sin(2 * np.pi * 5.5 * u * dur))  # a little vibrato
    # formants (Hz) and bandwidths over the meow: m -> i -> a -> o -> w
    f1 = curve(u, [(0, 280), (0.12, 330), (0.35, 820), (0.7, 650), (1, 380)])
    f2 = curve(u, [(0, 1600), (0.12, 2300), (0.35, 1500), (0.7, 1000), (1, 750)])
    f3 = curve(u, [(0, 2600), (0.3, 3000), (1, 2500)])
    out = np.zeros(n)
    phase = 2 * np.pi * np.cumsum(f0) / SR
    for h in range(1, 40):
        fh = h * f0
        if np.min(fh) > 6000:
            break
        gain = (
            1.0 * np.exp(-0.5 * ((fh - f1) / 110) ** 2)
            + 0.6 * np.exp(-0.5 * ((fh - f2) / 160) ** 2)
            + 0.25 * np.exp(-0.5 * ((fh - f3) / 220) ** 2)
            + 0.02
        ) / h**0.6
        out += gain * np.sin(h * phase + rng.uniform(0, 2 * np.pi))
    # breathiness
    noise = sosfilt(butter(2, [900, 5000], btype="band", fs=SR, output="sos"), rng.normal(0, 1, n))
    out = out / np.max(np.abs(out)) + breath * noise
    # loudness: the "m" is soft, the mouth opens, then it fades
    env = curve(u, [(0, 0), (0.06, 0.35), (0.25, 1.0), (0.75, 0.85), (1, 0)])
    out *= env * level
    # the BOX-3 speaker has nothing below ~170 Hz
    return sosfilt(butter(2, 180, btype="high", fs=SR, output="sos"), out)


def write(name, parts, peak):
    out = np.concatenate([np.zeros(int(0.02 * SR)), *parts, np.zeros(int(0.05 * SR))])
    out = out / np.max(np.abs(out)) * peak
    dst = Path(__file__).resolve().parent.parent / "sounds" / f"{name}.wav"
    dst.parent.mkdir(exist_ok=True)
    wavfile.write(dst, SR, (out * 32767).astype(np.int16))
    print(f"wrote {dst} ({len(out) / SR:.2f} s)")


gap = np.zeros(int(0.12 * SR))
# "meow-meow": low and patient, the second one a bit lower and shorter. Quiet: it's a hint, not a reply.
write(
    "meow_wait",
    [
        meow(0.62, [(0, 330), (0.35, 470), (1, 300)]),
        gap,
        meow(0.5, [(0, 310), (0.35, 420), (1, 280)], level=0.85),
    ],
    peak=0.45,
)
# single meows for the longer waits
write("meow_1", [meow(0.7, [(0, 380), (0.4, 560), (1, 340)])], peak=0.42)
write("meow_2", [meow(0.55, [(0, 430), (0.3, 520), (0.6, 470), (1, 360)], breath=0.08)], peak=0.4)
