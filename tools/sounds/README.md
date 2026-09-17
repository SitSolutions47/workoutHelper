# Sound generation

Everything in `public/sounds/` was generated with these scripts through a local
[ComfyUI](https://github.com/comfyanonymous/ComfyUI) instance. Re-run them when you want a
different voice, another language, or new signal sounds.

## Layout the app expects

The file names are derived from `src/app/features/sound-timer/sounds/sound-catalog.ts` — a sound is
looked up by its id, so renaming a file means renaming it there too.

```
public/sounds/
  de/numbers/1.mp3 … 30.mp3     spoken callouts, one recording per language
  de/colors/red.mp3 …           red blue green yellow orange purple black white
  de/directions/left.mp3 …      left right up down forward back
  en/…                          same three folders in English
  signals/beep.mp3 …            beep beep-high beep-low double-beep whistle clap
  bells/round-start.mp3         rings at the start of every round
  bells/round-end.mp3           rings when a round is over
```

If a file is missing the app does not break: it speaks the word with the Web Speech API and
synthesizes the signal tones with the Web Audio API instead (see `core/audio/`).

## Prerequisites

- ComfyUI running on `http://127.0.0.1:8188`
- `ffmpeg` and `ffprobe` on `PATH`
- For the spoken files: the [ComfyUI-EdgeTTS](https://github.com/1038lab/ComfyUI-EdgeTTS) custom
  node, plus `pip install edge-tts` in ComfyUI's environment. Edge TTS sends the words to
  Microsoft's speech service, so this step needs an internet connection.
- For the Stable Audio signal sounds: `stable_audio_3_medium_base.safetensors` in
  `models/checkpoints/` and `t5gemma_b_b_ul2.safetensors` in `models/text_encoders/`.

> **Patch required on ComfyUI-EdgeTTS.** The node decodes Edge TTS's mp3 with `torchaudio.load()`,
> which has no mp3 backend from torchaudio 2.7 on (it needs `torchcodec`, which in turn wants a
> newer torch). Without a fix the node silently returns **one second of silence** instead of
> failing. The local install was patched to decode via ffmpeg — see `_load_tts_audio` in
> `ailab_edgeTTS.py`. After a node update, re-apply it or install a matching `torchcodec`.

## Regenerating

```bash
# 1. All 88 spoken callouts (German + English) -> ComfyUI's output folder
python generate_speech.py --speed 1.1
#    other voices: --de-voice "[German] de-DE Killian" --en-voice "[English] en-US Christopher"
#    listen first:  python generate_speech.py --samples

# 2. Signal sounds, variant A: synthesized locally (crisp, tiny, deterministic)
python synth_signals.py signals_synth

# 3. Signal sounds, variant B: Stable Audio in ComfyUI, two seeds each
python generate_signals_sa.py

# 4. Trim, level-match and encode into public/sounds/
#    jobs.json is a list of [source, destination] pairs.
python process_audio.py --jobs jobs.json --rate 24000 --bitrate 32k          # speech
python process_audio.py --jobs jobs.json --rate 32000 --bitrate 48k --tail=-38dB  # signals
```

`process_audio.py` trims silence from the head and tail only — never from inside a clip, so the gap
in a double beep survives — then gain-matches every clip to the same RMS with a limiter and encodes
mono mp3. Speech lands around 2–4 kB per word.

## What is currently shipped

- **Voices:** German `de-DE-ConradNeural`, English `en-US-GuyNeural`, both at 1.1× speed.
- **Signals:** synthesized, except `signals/beep`, `bells/round-start` and `bells/round-end`, which
  are Stable Audio takes (seeds 22, 22 and 11).
- **Total:** 96 files, ~296 kB.
