#!/usr/bin/env python3
"""Synthesizes sounds/growl.flac: a short hiss (the snap) followed by a rough cat growl.

    python3 tools/make_growl.py && flac -f --best -o sounds/growl.flac sounds/growl.wav

Replace sounds/growl.flac with any recording you like better (FLAC, mono, 48 kHz).
"""

from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
rng = np.random.default_rng(7)


def bandpass(x, lo, hi, order=4):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x)


def envelope(n, attack, release):
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a) ** 0.5
    e[n - r :] = np.linspace(1, 0, r) ** 1.5
    return e


def smooth_noise(n, rate_hz, depth):
    """Slowly wandering random curve around 1 (for jitter / shimmer)."""
    k = max(2, int(n / SR * rate_hz) + 2)
    pts = rng.normal(0, 1, k)
    curve = np.interp(np.linspace(0, k - 1, n), np.arange(k), pts)
    return 1 + depth * curve


# --- the snap: a sharp hiss -------------------------------------------------------------------------
hiss_n = int(0.32 * SR)
hiss = bandpass(rng.normal(0, 1, hiss_n), 2500, 9000)
hiss *= envelope(hiss_n, 0.008, 0.22) * 0.55

# --- the growl: an irregular low pulse train through a throaty filter ------------------------------
growl_n = int(1.35 * SR)
t = np.arange(growl_n) / SR
f0 = 72 * smooth_noise(growl_n, 9, 0.12) * (1 + 0.15 * np.exp(-t * 3))  # starts a bit higher
phase = np.cumsum(f0 / SR)
saw = 2 * (phase % 1.0) - 1
pulses = np.sign(saw) * np.abs(saw) ** 3  # buzzy, glottal-ish
# roughness: the "rrrr" flutter, irregular
flutter = 0.55 + 0.45 * np.sin(2 * np.pi * np.cumsum(24 * smooth_noise(growl_n, 6, 0.25)) / SR)
src = pulses * flutter * smooth_noise(growl_n, 14, 0.25)
src += 0.25 * rng.normal(0, 1, growl_n) * flutter  # breath in the throat
throat = 0.9 * bandpass(src, 90, 520, 2) + 0.45 * bandpass(src, 650, 1300, 2) + 0.12 * bandpass(src, 1800, 3200, 2)
# pre-emphasize a little: the BOX-3 speaker has no bass below ~170 Hz, so let the overtones carry it
b, a = butter(1, 160, btype="high", fs=SR)
throat = lfilter(b, a, throat)
throat *= envelope(growl_n, 0.06, 0.35)

# --- mix: hiss, then growl overlapping its tail ----------------------------------------------------
gap = int(0.22 * SR)
out = np.zeros(gap + growl_n)
out[:hiss_n] += hiss
out[gap:] += throat / np.max(np.abs(throat)) * 0.9
out = np.tanh(out * 1.4) / np.tanh(1.4)  # gentle saturation
out = out / np.max(np.abs(out)) * 0.89  # ~ -1 dBFS
out = np.concatenate([np.zeros(int(0.02 * SR)), out, np.zeros(int(0.05 * SR))])

dst = Path(__file__).resolve().parent.parent / "sounds" / "growl.wav"
dst.parent.mkdir(exist_ok=True)
wavfile.write(dst, SR, (out * 32767).astype(np.int16))
print(f"wrote {dst} ({len(out) / SR:.2f} s)")
