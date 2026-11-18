#!/usr/bin/env python3
"""Synthesizes sounds/purr.flac: a short, contented purr (two breaths: out, in, out).

    python3 tools/make_purr.py && flac -f --best -o sounds/purr.flac sounds/purr.wav

A real purr is mostly 25 Hz rumble, which the BOX-3 speaker can't play (nothing below ~170 Hz). So this
is the purr's texture moved up: throaty noise, pulsed ~26 times a second, louder on the out-breath.
Replace sounds/purr.flac with any recording you like better (FLAC, mono, 48 kHz).
"""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(11)


def bandpass(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def wander(n, rate_hz, depth):
    k = max(2, int(n / SR * rate_hz) + 2)
    pts = rng.normal(0, 1, k)
    return 1 + depth * np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)


def breath(dur, rate, level, tone):
    """One breath of purring: pulses at `rate` Hz with a soft rise and fall."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    phase = np.cumsum(rate * wander(n, 5, 0.04)) / SR
    # sharp-ish pulses: the vocal folds snapping open 25 times a second
    pulse = np.maximum(0, np.sin(2 * np.pi * phase)) ** 4
    src = rng.normal(0, 1, n) * (0.15 + pulse) * wander(n, 10, 0.2)
    body = 1.0 * bandpass(src, 180, 420) + 0.55 * bandpass(src, 480, 900) + 0.12 * bandpass(src, 1200, 2400)
    body *= tone
    shape = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 0.6  # swell and fade
    return body * shape * level


parts = [
    breath(0.95, 26.0, 1.0, 1.0),  # out
    np.zeros(int(0.05 * SR)),
    breath(0.75, 23.5, 0.55, 0.8),  # in: softer, a little lower
    np.zeros(int(0.05 * SR)),
    breath(0.95, 26.0, 0.9, 1.0),  # out
]
out = np.concatenate(parts)
fade = int(0.25 * SR)
out[-fade:] *= np.linspace(1, 0, fade)
out = out / np.max(np.abs(out)) * 0.6  # a purr is gentle: well below the growl
out = np.concatenate([np.zeros(int(0.02 * SR)), out, np.zeros(int(0.05 * SR))])

dst = Path(__file__).resolve().parent.parent / "sounds" / "purr.wav"
dst.parent.mkdir(exist_ok=True)
wavfile.write(dst, SR, (out * 32767).astype(np.int16))
print(f"wrote {dst} ({len(out) / SR:.2f} s)")
