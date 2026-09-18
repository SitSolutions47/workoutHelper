import { max, min, schema, validate } from '@angular/forms/signals';
import {
  NO_SOUND,
  ROUND_END_SOUND,
  ROUND_START_SOUND,
  SIGNAL_SOUNDS,
  SPOKEN_COUNTDOWN,
  sortCalloutIds,
} from '../sounds/sound-catalog';

export const SIGNAL_EVENTS = ['roundStart', 'interval', 'countdown', 'roundEnd', 'finish'] as const;

export type SignalEvent = (typeof SIGNAL_EVENTS)[number];

/** Sound id per timer event, or {@link NO_SOUND}. The countdown may also be {@link SPOKEN_COUNTDOWN}. */
export type SignalSounds = Record<SignalEvent, string>;

export interface TimerSettings {
  prepSeconds: number;
  rounds: number;
  workSeconds: number;
  breakSeconds: number;
  /** Splits every round into equal parts with a signal between them; 0 is off. */
  intervalSeconds: number;
  /** Counts down the last seconds of every round, break and the preparation; 0 is off. */
  countdownSeconds: number;
  /** Whether random callouts play during rounds. */
  calloutsEnabled: boolean;
  /** Random time between the starts of two callouts is drawn from this range. */
  minGapSeconds: number;
  maxGapSeconds: number;
  /** Callout sound ids, in catalog order. */
  soundIds: string[];
  signals: SignalSounds;
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
  // An interval of at least 5 s leaves room for its signal; the step is unused (a list is offered).
  intervalSeconds: { min: 5, max: 1800, step: 1 },
  countdownSeconds: { min: 0, max: 10, step: 1 },
} as const satisfies Record<string, Limit>;

export const DEFAULT_SIGNALS: SignalSounds = {
  roundStart: ROUND_START_SOUND.id,
  interval: 'signals.double-beep',
  countdown: 'signals.beep',
  roundEnd: ROUND_END_SOUND.id,
  finish: ROUND_END_SOUND.id,
};

export const DEFAULT_TIMER_SETTINGS: TimerSettings = {
  prepSeconds: 10,
  rounds: 3,
  workSeconds: 180,
  breakSeconds: 60,
  intervalSeconds: 0,
  countdownSeconds: 3,
  calloutsEnabled: true,
  minGapSeconds: 5,
  maxGapSeconds: 10,
  // Punch numbers 1–6 are the most common boxing callouts.
  soundIds: ['numbers.1', 'numbers.2', 'numbers.3', 'numbers.4', 'numbers.5', 'numbers.6'],
  signals: DEFAULT_SIGNALS,
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
  min(path.countdownSeconds, TIMER_LIMITS.countdownSeconds.min);
  max(path.countdownSeconds, TIMER_LIMITS.countdownSeconds.max);
  validate(path.intervalSeconds, ({ value, valueOf }) =>
    intervalFits(value(), valueOf(path.workSeconds)) ? undefined : { kind: 'intervalFit' },
  );
  // The gap bounds constrain each other, so the range can never be inverted.
  min(path.minGapSeconds, TIMER_LIMITS.gapSeconds.min);
  max(path.minGapSeconds, ({ valueOf }) => valueOf(path.maxGapSeconds));
  min(path.maxGapSeconds, ({ valueOf }) => valueOf(path.minGapSeconds));
  max(path.maxGapSeconds, TIMER_LIMITS.gapSeconds.max);
  validate(path.soundIds, ({ value, valueOf }) =>
    valueOf(path.calloutsEnabled) && value().length === 0 ? { kind: 'noSounds' } : undefined,
  );
});

/** Whether a round of `workSeconds` splits into whole intervals of `intervalSeconds` (0 is off). */
export function intervalFits(intervalSeconds: number, workSeconds: number): boolean {
  return (
    intervalSeconds === 0 ||
    (intervalSeconds >= TIMER_LIMITS.intervalSeconds.min &&
      intervalSeconds < workSeconds &&
      Number.isInteger(workSeconds / intervalSeconds))
  );
}

/** Every interval length that splits a round of `workSeconds` into at least two equal parts. */
export function intervalOptions(workSeconds: number): number[] {
  const options: number[] = [];
  for (let seconds = TIMER_LIMITS.intervalSeconds.min; seconds <= workSeconds / 2; seconds++) {
    if (intervalFits(seconds, workSeconds)) {
      options.push(seconds);
    }
  }
  return options;
}

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
    a.intervalSeconds === b.intervalSeconds &&
    a.countdownSeconds === b.countdownSeconds &&
    a.calloutsEnabled === b.calloutsEnabled &&
    a.minGapSeconds === b.minGapSeconds &&
    a.maxGapSeconds === b.maxGapSeconds &&
    a.soundIds.length === b.soundIds.length &&
    a.soundIds.every((id, index) => id === b.soundIds[index]) &&
    SIGNAL_EVENTS.every((event) => a.signals[event] === b.signals[event])
  );
}

/** Deep copy, so editing the copy never changes a stored preset. */
export function copyTimerSettings(settings: TimerSettings): TimerSettings {
  return { ...settings, soundIds: [...settings.soundIds], signals: { ...settings.signals } };
}

/** Sounds each signal event may use. */
export function signalChoices(event: SignalEvent): string[] {
  const choices = [NO_SOUND, ...SIGNAL_SOUNDS.map((sound) => sound.id)];
  return event === 'countdown' ? [SPOKEN_COUNTDOWN, ...choices] : choices;
}

/**
 * Settings saved before a field existed get the value that matches how the timer behaved back
 * then, e.g. no countdown, rather than today's defaults.
 */
const LEGACY_SETTINGS = {
  intervalSeconds: 0,
  countdownSeconds: 0,
  calloutsEnabled: true,
  signals: DEFAULT_SIGNALS,
} as const;

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

  const rawInterval = record['intervalSeconds'];
  const intervalSeconds = typeof rawInterval === 'number' ? Math.round(rawInterval) : NaN;
  const countdownSeconds = number('countdownSeconds', TIMER_LIMITS.countdownSeconds);
  const calloutsEnabled = record['calloutsEnabled'];

  return {
    prepSeconds,
    rounds: Math.round(rounds),
    workSeconds,
    breakSeconds,
    intervalSeconds: intervalFits(intervalSeconds, workSeconds)
      ? intervalSeconds
      : LEGACY_SETTINGS.intervalSeconds,
    countdownSeconds:
      countdownSeconds === undefined
        ? LEGACY_SETTINGS.countdownSeconds
        : Math.round(countdownSeconds),
    calloutsEnabled:
      typeof calloutsEnabled === 'boolean' ? calloutsEnabled : LEGACY_SETTINGS.calloutsEnabled,
    minGapSeconds: Math.min(minGapSeconds, maxGapSeconds),
    maxGapSeconds: Math.max(minGapSeconds, maxGapSeconds),
    soundIds: sortCalloutIds(rawSoundIds.filter((id): id is string => typeof id === 'string')),
    signals: parseSignals(record['signals']),
  };
}

function parseSignals(value: unknown): SignalSounds {
  const record =
    typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const signals = { ...LEGACY_SETTINGS.signals };
  for (const event of SIGNAL_EVENTS) {
    const id = record[event];
    if (typeof id === 'string' && signalChoices(event).includes(id)) {
      signals[event] = id;
    }
  }
  return signals;
}
