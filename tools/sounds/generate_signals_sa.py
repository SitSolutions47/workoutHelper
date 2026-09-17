"""Generates the 8 signal sounds with Stable Audio 3 in ComfyUI (variant B, for comparison)."""

import json
import sys
import time
import urllib.error
import urllib.request

SERVER = "http://127.0.0.1:8188"
CHECKPOINT = "stable_audio_3_medium_base.safetensors"
TEXT_ENCODER = "t5gemma_b_b_ul2.safetensors"
NEGATIVE = "music, melody, speech, talking, reverb, room ambience, noise, distortion"

# (name, prompt, seconds)
SOUNDS = [
    ("signals/beep", "single short electronic beep, clean pure tone, digital timer one-shot, dry, isolated, silence before and after", 2.0),
    ("signals/beep-high", "single short high pitched electronic beep, bright clean tone, digital alert one-shot, dry, isolated", 2.0),
    ("signals/beep-low", "single short low pitched electronic beep, deep clean tone, digital alert one-shot, dry, isolated", 2.0),
    ("signals/double-beep", "two short electronic beeps in quick succession, digital alert, dry, isolated one-shot", 2.0),
    ("signals/whistle", "single sharp referee whistle blast, loud pea whistle, sports whistle one-shot, dry, close, isolated", 2.0),
    ("signals/clap", "single loud hand clap, dry close mic, no reverb, one-shot percussion hit, isolated", 2.0),
    ("bells/round-start", "boxing ring bell, one single clear strike, bright metallic ring, boxing gym, one-shot", 3.0),
    ("bells/round-end", "boxing ring bell struck three times quickly, end of round signal, bright metallic ring, one-shot", 4.0),
]
SEEDS = [11, 22]


def post(path, payload):
    request = urllib.request.Request(
        f"{SERVER}{path}",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


def get(path):
    with urllib.request.urlopen(f"{SERVER}{path}", timeout=120) as response:
        return json.load(response)


def graph(prompt, seconds, seed, prefix):
    return {
        "ckpt": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CHECKPOINT}},
        "clip": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": TEXT_ENCODER, "type": "stable_audio", "device": "default"},
        },
        "pos": {"class_type": "CLIPTextEncode", "inputs": {"text": prompt, "clip": ["clip", 0]}},
        "neg": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["clip", 0]}},
        "lat": {"class_type": "EmptyLatentAudio", "inputs": {"seconds": seconds, "batch_size": 1}},
        "ks": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["ckpt", 0],
                "positive": ["pos", 0],
                "negative": ["neg", 0],
                "latent_image": ["lat", 0],
                "seed": seed,
                "steps": 50,
                "cfg": 7.0,
                "sampler_name": "lcm",
                "scheduler": "simple",
                "denoise": 1.0,
            },
        },
        "dec": {"class_type": "VAEDecodeAudio", "inputs": {"samples": ["ks", 0], "vae": ["ckpt", 2]}},
        "save": {
            "class_type": "SaveAudio",
            "inputs": {"audio": ["dec", 0], "filename_prefix": prefix},
        },
    }


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    jobs = {}
    for name, prompt, seconds in SOUNDS:
        if only and only not in name:
            continue
        for seed in SEEDS:
            label = f"{name}#{seed}"
            prefix = "workouthelper_sa/" + name.replace("/", "_") + f"_s{seed}"
            try:
                result = post(
                    "/prompt",
                    {"prompt": graph(prompt, seconds, seed, prefix), "client_id": "wh-signals"},
                )
                jobs[result["prompt_id"]] = label
            except urllib.error.HTTPError as error:
                print(f"REJECTED {label}: {error.read().decode()[:500]}", flush=True)
                return 1

    print(f"Queued {len(jobs)} clips", flush=True)
    done, started = {}, time.time()
    while jobs and time.time() - started < 3600:
        for prompt_id, label in list(jobs.items()):
            entry = get(f"/history/{prompt_id}").get(prompt_id)
            if not entry:
                continue
            status = entry.get("status", {})
            audio = entry.get("outputs", {}).get("save", {}).get("audio")
            if audio:
                done[label] = audio[0]["filename"]
                print(f"  [{len(done)}/{len(done) + len(jobs) - 1}] {label} -> {audio[0]['filename']}"
                      f" ({time.time() - started:.0f}s)", flush=True)
            elif status.get("status_str") == "error":
                print(f"  ERROR {label}: {json.dumps(status)[:400]}", flush=True)
            else:
                continue
            jobs.pop(prompt_id)
        time.sleep(2)

    with open("manifest_signals_sa.json", "w", encoding="utf-8") as handle:
        json.dump(done, handle, indent=1)
    print(f"Done: {len(done)} clips in {time.time() - started:.0f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
