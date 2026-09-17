"""Generate all spoken callout files for Workout Helper via ComfyUI's EdgeTTS node.

Queues one EdgeTTS -> SaveAudio (FLAC) graph per word, waits for the queue to drain and
reports where each lossless file landed. Encoding to small mp3 happens afterwards in ffmpeg.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

SERVER = "http://127.0.0.1:8188"
CLIENT_ID = "workout-helper-generator"

GERMAN_NUMBERS = [
    "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn",
    "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn",
    "neunzehn", "zwanzig", "einundzwanzig", "zweiundzwanzig", "dreiundzwanzig",
    "vierundzwanzig", "fünfundzwanzig", "sechsundzwanzig", "siebenundzwanzig",
    "achtundzwanzig", "neunundzwanzig", "dreißig",
]
ENGLISH_NUMBERS = [
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen",
    "nineteen", "twenty", "twenty-one", "twenty-two", "twenty-three", "twenty-four",
    "twenty-five", "twenty-six", "twenty-seven", "twenty-eight", "twenty-nine", "thirty",
]
# (file name, German word, English word) - file names must match sound-catalog.ts
COLORS = [
    ("red", "Rot", "Red"),
    ("blue", "Blau", "Blue"),
    ("green", "Grün", "Green"),
    ("yellow", "Gelb", "Yellow"),
    ("orange", "Orange", "Orange"),
    ("purple", "Lila", "Purple"),
    ("black", "Schwarz", "Black"),
    ("white", "Weiß", "White"),
]
DIRECTIONS = [
    ("left", "Links", "Left"),
    ("right", "Rechts", "Right"),
    ("up", "Hoch", "Up"),
    ("down", "Runter", "Down"),
    ("forward", "Vor", "Forward"),
    ("back", "Zurück", "Back"),
]

VOICES = {"de": "[German] de-DE Conrad", "en": "[English] en-US Guy"}


def jobs(voices):
    """Yields (language, category, file name, text, voice)."""
    for language, numbers in (("de", GERMAN_NUMBERS), ("en", ENGLISH_NUMBERS)):
        for index, word in enumerate(numbers, start=1):
            yield language, "numbers", str(index), word, voices[language]
    for category, entries in (("colors", COLORS), ("directions", DIRECTIONS)):
        for name, german, english in entries:
            yield "de", category, name, german, voices["de"]
            yield "en", category, name, english, voices["en"]


def post(path, payload):
    request = urllib.request.Request(
        f"{SERVER}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def get(path):
    with urllib.request.urlopen(f"{SERVER}{path}", timeout=60) as response:
        return json.load(response)


def queue(text, voice, speed, prefix):
    graph = {
        "1": {
            "class_type": "EdgeTTS",
            "inputs": {"text": text, "voice": voice, "speed": speed, "pitch": 0},
        },
        "2": {
            "class_type": "SaveAudio",
            "inputs": {"audio": ["1", 0], "filename_prefix": prefix},
        },
    }
    return post("/prompt", {"prompt": graph, "client_id": CLIENT_ID})["prompt_id"]


def await_results(prompt_ids, timeout=900):
    """Returns {prompt_id: output filename}, waiting until every prompt finished."""
    done = {}
    deadline = time.time() + timeout
    pending = dict(prompt_ids)
    while pending and time.time() < deadline:
        for prompt_id, label in list(pending.items()):
            try:
                history = get(f"/history/{prompt_id}")
            except urllib.error.URLError:
                continue
            entry = history.get(prompt_id)
            if not entry:
                continue
            status = entry.get("status", {})
            if status.get("status_str") == "error" or (
                status.get("completed") is False and status.get("status_str") == "error"
            ):
                print(f"  ERROR {label}: {json.dumps(status)[:300]}", flush=True)
                pending.pop(prompt_id)
                continue
            audio = entry.get("outputs", {}).get("2", {}).get("audio")
            if audio:
                done[label] = audio[0]["filename"]
                pending.pop(prompt_id)
        if pending:
            time.sleep(0.5)
    for label in pending.values():
        print(f"  TIMEOUT {label}", flush=True)
    return done


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--speed", type=float, default=1.1)
    parser.add_argument("--de-voice", default=VOICES["de"])
    parser.add_argument("--en-voice", default=VOICES["en"])
    parser.add_argument("--samples", action="store_true", help="only a few words per candidate voice")
    parser.add_argument("--out", default="manifest.json")
    args = parser.parse_args()

    if args.samples:
        candidates = [
            ("de", "[German] de-DE Conrad"),
            ("de", "[German] de-DE Killian"),
            ("de", "[German] de-DE Florian"),
            ("de", "[German] de-DE Katja"),
            ("en", "[English] en-US Guy"),
            ("en", "[English] en-US Christopher"),
            ("en", "[English] en-US Andrew"),
            ("en", "[English] en-US Aria"),
        ]
        words = {"de": ["eins", "zwei", "Links", "Rot"], "en": ["one", "two", "Left", "Red"]}
        items = []
        for language, voice in candidates:
            short = voice.split()[-1].lower()
            for word in words[language]:
                items.append((f"{language}_{short}_{word.lower()}", word, voice))
    else:
        items = [
            (f"{language}/{category}/{name}", text, voice)
            for language, category, name, text, voice in jobs(
                {"de": args.de_voice, "en": args.en_voice}
            )
        ]

    print(f"Queueing {len(items)} clips at speed {args.speed}", flush=True)
    prompt_ids = {}
    for label, text, voice in items:
        prefix = "workouthelper/" + label.replace("/", "_")
        try:
            prompt_ids[queue(text, voice, args.speed, prefix)] = label
        except urllib.error.HTTPError as error:
            print(f"  REJECTED {label}: {error.read().decode()[:300]}", flush=True)

    print(f"Queued {len(prompt_ids)}; waiting…", flush=True)
    results = await_results(prompt_ids)
    print(f"Completed {len(results)}/{len(items)}", flush=True)
    with open(args.out, "w", encoding="utf-8") as handle:
        json.dump(results, handle, indent=1, ensure_ascii=False)
    print(f"Manifest: {args.out}")
    return 0 if len(results) == len(items) else 1


if __name__ == "__main__":
    sys.exit(main())
