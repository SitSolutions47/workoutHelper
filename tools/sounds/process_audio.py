"""Trims, level-matches and encodes generated clips into the app's mp3 layout.

Silence is trimmed only from the head and tail (never inside, so double-beeps keep their gap),
each clip is gain-matched to a common RMS with a limiter, then encoded as small mono mp3.
"""

import argparse
import json
import os
import re
import subprocess
import sys

TARGET_RMS_DB = -20.0
PEAK_LIMIT = 0.89  # about -1 dBFS
HEAD_THRESHOLD = "-40dB"
TAIL_THRESHOLD = "-45dB"


def trim_chain():
    return (
        f"silenceremove=start_periods=1:start_duration=0:start_threshold={HEAD_THRESHOLD}:detection=peak,"
        "areverse,"
        f"silenceremove=start_periods=1:start_duration=0:start_threshold={TAIL_THRESHOLD}:detection=peak,"
        "areverse"
    )


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def measure(path, rate):
    """Mean volume in dB of the trimmed signal."""
    result = run([
        "ffmpeg", "-i", path, "-af", f"{trim_chain()},aresample={rate},volumedetect",
        "-ac", "1", "-f", "null", "-",
    ])
    match = re.search(r"mean_volume:\s*(-?\d+(?:\.\d+)?) dB", result.stderr)
    return float(match.group(1)) if match else None


def encode(source, destination, rate, bitrate):
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    mean = measure(source, rate)
    gain = 0.0 if mean is None else TARGET_RMS_DB - mean
    chain = (
        f"{trim_chain()},"
        f"volume={gain:.2f}dB,"
        f"alimiter=limit={PEAK_LIMIT}:level=disabled,"
        "apad=pad_dur=0.03,"
        f"aresample={rate}"
    )
    result = run([
        "ffmpeg", "-y", "-i", source, "-af", chain, "-ac", "1", "-ar", str(rate),
        "-c:a", "libmp3lame", "-b:a", bitrate, "-write_xing", "1", destination,
    ])
    if result.returncode != 0:
        print(f"  FAILED {destination}: {result.stderr.strip()[-300:]}")
        return None
    duration = run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", destination,
    ]).stdout.strip()
    return os.path.getsize(destination), float(duration or 0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--jobs", required=True, help="JSON list of [source, destination]")
    parser.add_argument("--rate", type=int, default=24000)
    parser.add_argument("--bitrate", default="32k")
    parser.add_argument("--tail", help="trailing-silence threshold, e.g. -38dB")
    args = parser.parse_args()

    if args.tail:
        globals()["TAIL_THRESHOLD"] = args.tail
    jobs = json.load(open(args.jobs, encoding="utf-8"))
    total, longest = 0, (0.0, "")
    for source, destination in jobs:
        result = encode(source, destination, args.rate, args.bitrate)
        if not result:
            continue
        size, duration = result
        total += size
        if duration > longest[0]:
            longest = (duration, os.path.basename(destination))
    print(f"{len(jobs)} files, {total / 1024:.1f} KB total, "
          f"avg {total / max(1, len(jobs)):.0f} B, longest {longest[1]} {longest[0]:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
