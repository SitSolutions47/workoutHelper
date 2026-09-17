import { max, min, schema, validate } from '@angular/forms/signals';
import { sortCalloutIds } from '../sounds/sound-catalog';

export interface TimerSettings {
  prepSeconds: number;
  rounds: number;
  workSeconds: number;
  breakSeconds: number;
  /** Random time between the starts of two callouts is drawn from this range. */
  minGapSeconds: number;
  maxGapSeconds: number;
  /** Callout sound ids, in catalog order. */
  soundIds: string[];
}

interface Limit {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

export const TIMER_LIMITS = {
  prepSeconds: { min: 0, max: 120, step: 5 },
  rounds: { min: 1, max: 30, step: 1 },
  workSeconds: { min: 5, max: 3600, step: 5 },
  breakSeconds: { min: 0, max: 900, step: 5 },
  gapSeconds: { min: 1, max: 60, step: 0.5 },
} as const satisfies Record<string, Limit>;

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  prepSeconds: 10,
  rounds: 3,
  workSeconds: 180,
  breakSeconds: 60,
  minGapSeconds: 5,
  maxGapSeconds: 10,
  // Punch numbers 1–6 are the most common boxing callouts.
  soundIds: ['numbers.1', 'numbers.2', 'numbers.3', 'numbers.4', 'numbers.5', 'numbers.6'],
};

export const timerSettingsSchema = schema<TimerSettings>((path) => {
  min(path.prepSeconds, TIMER_LIMITS.prepSeconds.min);
  max(path.prepSeconds, TIMER_LIMITS.prepSeconds.max);
  min(path.rounds, TIMER_LIMITS.rounds.min);
  max(path.rounds, TIMER_LIMITS.rounds.max);
  min(path.workSeconds, TIMER_LIMITS.workSeconds.min);
  max(path.workSeconds, TIMER_LIMITS.workSeconds.max);
  min(path.breakSeconds, TIMER_LIMITS.breakSeconds.min);
  max(path.breakSeconds, TIMER_LIMITS.breakSeconds.max);
  // The gap bounds constrain each other, so the range can never be inverted.
  min(path.minGapSeconds, TIMER_LIMITS.gapSeconds.min);
  max(path.minGapSeconds, ({ valueOf }) => valueOf(path.maxGapSeconds));
  min(path.maxGapSeconds, ({ valueOf }) => valueOf(path.minGapSeconds));
  max(path.maxGapSeconds, TIMER_LIMITS.gapSeconds.max);
  validate(path.soundIds, ({ value }) => (value().length === 0 ? { kind: 'noSounds' } : undefined));
});

/** Total workout length including preparation, in seconds. */
export function workoutDuration(settings: TimerSettings): number {
  return (
    settings.prepSeconds +
    settings.rounds * settings.workSeconds +
    (settings.rounds - 1) * settings.breakSeconds
  );
}

export function sameTimerSettings(a: TimerSettings, b: TimerSettings): boolean {
  return (
    a.prepSeconds === b.prepSeconds &&
    a.rounds === b.rounds &&
    a.workSeconds === b.workSeconds &&
    a.breakSeconds === b.breakSeconds &&
    a.minGapSeconds === b.minGapSeconds &&
    a.maxGapSeconds === b.maxGapSeconds &&
    a.soundIds.length === b.soundIds.length &&
    a.soundIds.every((id, index) => id === b.soundIds[index])
  );
}

/**
 * Validates settings read from storage. Values are clamped into the current limits and unknown
 * sound ids are dropped, so data saved by older app versions stays usable.
 */
export function parseTimerSettings(value: unknown): TimerSettings | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const number = (key: keyof TimerSettings, limit: Limit) => {
    const raw = record[key];
    return typeof raw === 'number' && Number.isFinite(raw)
      ? Math.min(limit.max, Math.max(limit.min, raw))
      : undefined;
  };

  const prepSeconds = number('prepSeconds', TIMER_LIMITS.prepSeconds);
  const rounds = number('rounds', TIMER_LIMITS.rounds);
  const workSeconds = number('workSeconds', TIMER_LIMITS.workSeconds);
  const breakSeconds = number('breakSeconds', TIMER_LIMITS.breakSeconds);
  const minGapSeconds = number('minGapSeconds', TIMER_LIMITS.gapSeconds);
  const maxGapSeconds = number('maxGapSeconds', TIMER_LIMITS.gapSeconds);
  const rawSoundIds = record['soundIds'];
  if (
    prepSeconds === undefined ||
    rounds === undefined ||
    workSeconds === undefined ||
    breakSeconds === undefined ||
    minGapSeconds === undefined ||
    maxGapSeconds === undefined ||
    !Array.isArray(rawSoundIds)
  ) {
    return undefined;
  }

  return {
    prepSeconds,
    rounds: Math.round(rounds),
    workSeconds,
    breakSeconds,
    minGapSeconds: Math.min(minGapSeconds, maxGapSeconds),
    maxGapSeconds: Math.max(minGapSeconds, maxGapSeconds),
    soundIds: sortCalloutIds(rawSoundIds.filter((id): id is string => typeof id === 'string')),
  };
}
