import { ROUND_END_SOUND, ROUND_START_SOUND } from '../sounds/sound-catalog';
import { TimerSettings } from './timer-settings';

export type PhaseKind = 'prep' | 'work' | 'rest';

export interface TimerPhase {
  readonly kind: PhaseKind;
  /** The round this phase belongs to; a rest phase belongs to the round before it. */
  readonly round: number;
  /** Seconds from workout start. */
  readonly start: number;
  readonly end: number;
}

export type CueKind = 'round-start' | 'round-end' | 'callout';

export interface TimerCue {
  readonly kind: CueKind;
  /** Seconds from workout start. */
  readonly at: number;
  readonly soundId: string;
}

export interface TimerPlan {
  readonly rounds: number;
  readonly duration: number;
  readonly phases: readonly TimerPhase[];
  /** Sorted by time. */
  readonly cues: readonly TimerCue[];
}

/** No callout is placed this close to the end bell, so the two don't overlap. */
export const CALLOUT_END_MARGIN_SECONDS = 1;

/**
 * Lays out a whole workout upfront, including every randomized callout. Keeping this pure makes
 * the timing testable and lets the running session simply play cues as their time comes.
 */
export function buildTimerPlan(settings: TimerSettings, random: () => number = Math.random): TimerPlan {
  const phases: TimerPhase[] = [];
  const cues: TimerCue[] = [];
  let time = 0;
  let previousSoundId: string | undefined;

  if (settings.prepSeconds > 0) {
    phases.push({ kind: 'prep', round: 1, start: 0, end: settings.prepSeconds });
    time = settings.prepSeconds;
  }

  for (let round = 1; round <= settings.rounds; round++) {
    const start = time;
    const end = start + settings.workSeconds;
    phases.push({ kind: 'work', round, start, end });
    cues.push({ kind: 'round-start', at: start, soundId: ROUND_START_SOUND.id });

    if (settings.soundIds.length > 0) {
      const gap = () =>
        settings.minGapSeconds + random() * (settings.maxGapSeconds - settings.minGapSeconds);
      for (let at = start + gap(); at <= end - CALLOUT_END_MARGIN_SECONDS; at += gap()) {
        const soundId = pickSound(settings.soundIds, previousSoundId, random);
        cues.push({ kind: 'callout', at, soundId });
        previousSoundId = soundId;
      }
    }

    cues.push({ kind: 'round-end', at: end, soundId: ROUND_END_SOUND.id });
    time = end;

    if (round < settings.rounds && settings.breakSeconds > 0) {
      phases.push({ kind: 'rest', round, start: time, end: time + settings.breakSeconds });
      time += settings.breakSeconds;
    }
  }

  return { rounds: settings.rounds, duration: time, phases, cues };
}

/** Random pick that avoids calling the same sound twice in a row when there's a choice. */
function pickSound(ids: readonly string[], previous: string | undefined, random: () => number): string {
  const candidates = ids.length > 1 ? ids.filter((id) => id !== previous) : ids;
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}

export function phaseAt(plan: TimerPlan, elapsed: number): TimerPhase | undefined {
  return plan.phases.find((phase) => elapsed >= phase.start && elapsed < phase.end);
}
