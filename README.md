# Workout Helper

A mobile-first collection of small training tools, built for boxing workouts. German is the default
language, English is available at runtime; light and dark themes follow the device or an explicit
choice.

## Tools

### Kommando-Timer (callout timer)

A round timer that calls out random commands while the round runs — numbers, colors, directions or
signal tones — so you react instead of anticipating.

- Rounds, round duration, break, and a preparation countdown
- A random gap between callouts, drawn from a range you set (e.g. 5–10 s)
- A bell at the start and end of every round
- Pick the callout sounds: numbers 1–30, 8 colors, 6 directions, 6 signal tones
- The last 10 started configurations are kept automatically; any configuration can be saved as a
  named favorite
- The screen stays awake during a workout, and the current configuration is restored on the next
  visit

## Development

```bash
npm start     # dev server on http://localhost:4200
npm test      # unit tests (Vitest)
npm run build # production build
```

To try it on a phone on the same network, serve on all interfaces: `npx ng serve --host 0.0.0.0`,
then open `http://<your-ip>:4200`. Note that a plain-http origin is not a secure context, so the
screen wake lock stays off there.

## Structure

```
src/app/
  core/          i18n, theme, storage, audio playback, wake lock, navigation
  shared/        icon, page header, touch stepper (a Signal Forms control)
  features/
    home/        tool list
    settings/    language and theme
    sound-timer/ the callout timer
      model/       settings, validation schema, and the pure timer-plan builder
      services/    running session (clock + cues), presets (draft/history/favorites)
      timer-*/     setup, run and presets screens
      sounds/      the sound catalog
tools/sounds/    scripts that generate public/sounds via ComfyUI (see its README)
```

The whole workout — every phase and every randomized callout — is laid out upfront by
`buildTimerPlan()`, a pure function. The session then just plays cues as their time comes, which
keeps the timing logic testable and makes pause, resume and skip trivial.

## Sounds

`public/sounds/` holds 96 generated mp3 files (~296 kB): spoken callouts per language, plus signal
tones and the round bells. If a file is missing, the app falls back to the Web Speech API for words
and synthesized tones for signals, so it still runs. See `tools/sounds/README.md` for the file
layout and how to regenerate them with a different voice.

## Notes on mobile behavior

- Audio is unlocked by the tap on **Start**; browsers block sound that no gesture initiated.
- A screen wake lock is held while a workout runs, because browsers throttle timers on a locked
  screen. If the lock is denied, the workout still runs off the wall clock.
- Cues that come due while the page was throttled in the background are skipped rather than fired
  as a burst when the page comes back.
- On iPhones, the hardware silent switch mutes Web Audio. Ring mode must be on.
