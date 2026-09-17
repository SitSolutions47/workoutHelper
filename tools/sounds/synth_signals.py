"""Synthesizes the 8 signal sounds as 24 kHz mono WAV, matching the in-app fallback tones."""

import os
import struct
import sys
import wave

import numpy as np

RATE = 24000
OUT = sys.argv[1] if len(sys.argv) > 1 else "signals_synth"


def envelope(length, attack=0.005, decay=None):
    """Exponential decay with a short attack, so nothing clicks."""
    samples = np.arange(length) / RATE
    attack_samples = max(1, int(attack * RATE))
    env = np.exp(-samples / (decay if decay else 0.15))
    ramp = np.minimum(1.0, np.arange(length) / attack_samples)
    return env * ramp


def square(frequency, duration, decay=None):
    t = np.arange(int(duration * RATE)) / RATE
    wave_data = np.sign(np.sin(2 * np.pi * frequency * t))
    # Soften the square edges a little so it carries without being harsh.
    wave_data = 0.7 * wave_data + 0.3 * np.sin(2 * np.pi * frequency * t)
    return wave_data * envelope(len(t), decay=decay or duration * 0.6)


def silence(duration):
    return np.zeros(int(duration * RATE))


def whistle(duration=0.45):
    t = np.arange(int(duration * RATE)) / RATE
    vibrato = 120 * np.sin(2 * np.pi * 30 * t)
    phase = 2 * np.pi * np.cumsum(2600 + vibrato) / RATE
    body = np.sin(phase) + 0.25 * np.sin(2 * phase)
    return body * envelope(len(t), attack=0.02, decay=duration * 0.9)


def clap(duration=0.12):
    length = int(duration * RATE)
    noise = np.random.default_rng(7).normal(0, 1, length)
    # Crude band-pass around 1.2 kHz: difference of two one-pole smoothings.
    def one_pole(signal, cutoff):
        alpha = np.exp(-2 * np.pi * cutoff / RATE)
        out = np.zeros_like(signal)
        previous = 0.0
        for i, value in enumerate(signal):
            previous = alpha * previous + (1 - alpha) * value
            out[i] = previous
        return out

    band = one_pole(noise, 2600) - one_pole(noise, 600)
    return band * envelope(length, attack=0.001, decay=0.035)


def bell(strikes=1, spacing=0.35, duration=1.3):
    """Inharmonic partials give the metallic ring of a boxing bell."""
    total = int((duration + spacing * (strikes - 1)) * RATE)
    out = np.zeros(total)
    partials = [(1.0, 0.55, 1.15), (2.76, 0.30, 0.75), (5.40, 0.14, 0.45), (8.93, 0.06, 0.25)]
    fundamental = 780.0
    for strike in range(strikes):
        offset = int(strike * spacing * RATE)
        length = min(int(duration * RATE), total - offset)
        t = np.arange(length) / RATE
        strike_wave = np.zeros(length)
        for ratio, level, decay in partials:
            strike_wave += level * np.sin(2 * np.pi * fundamental * ratio * t) * np.exp(-t / decay)
        # Strike transient.
        strike_wave[: int(0.004 * RATE)] += 0.4 * np.random.default_rng(3).normal(
            0, 1, int(0.004 * RATE)
        )
        strike_wave *= np.minimum(1.0, np.arange(length) / max(1, int(0.002 * RATE)))
        out[offset : offset + length] += strike_wave
    return out


def normalize(signal, peak=0.89):  # about -1 dBFS
    signal = np.asarray(signal, dtype=np.float64)
    tail = np.concatenate([signal, np.zeros(int(0.02 * RATE))])
    highest = np.max(np.abs(tail))
    return tail * (peak / highest) if highest > 0 else tail


def write_wav(path, signal):
    data = (normalize(signal) * 32767).astype(np.int16)
    with wave.open(path, "wb") as handle:
        handle.setnchannels(1)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        handle.writeframes(struct.pack(f"<{len(data)}h", *data))
    print(f"  {os.path.basename(path)}: {len(data) / RATE:.2f}s")


SOUNDS = {
    "signals/beep": lambda: square(880, 0.15),
    "signals/beep-high": lambda: square(1320, 0.15),
    "signals/beep-low": lambda: square(440, 0.25),
    "signals/double-beep": lambda: np.concatenate(
        [square(880, 0.1), silence(0.08), square(880, 0.1)]
    ),
    "signals/whistle": whistle,
    "signals/clap": clap,
    "bells/round-start": lambda: bell(strikes=1),
    "bells/round-end": lambda: bell(strikes=3),
}

for name, make in SOUNDS.items():
    path = os.path.join(OUT, name + ".wav")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    write_wav(path, make())
print(f"Wrote {len(SOUNDS)} signal sounds to {OUT}")
