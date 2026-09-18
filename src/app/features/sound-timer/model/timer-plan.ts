import { NO_SOUND, countdownSoundId } from '../sounds/sound-catalog';
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

export type CueKind = 'round-start' | 'interval' | 'countdown' | 'callout' | 'round-end' | 'finish';

export interface TimerCue {
  readonly kind: CueKind;
  /** Seconds from workout start. */
  readonly at: number;
  readonly soundId: string;
}

export interface TimerPlan {
  readonly rounds: number;
  readonly duration: number;
  /** Length of the parts every round is split into; 0 when rounds aren't split. */
  readonly intervalSeconds: number;
  /** How many final seconds of each phase are counted down; 0 when off. */
  readonly countdownSeconds: number;
  readonly phases: readonly TimerPhase[];
  /** Sorted by time. */
  readonly cues: readonly TimerCue[];
}

/** Where a work phase with intervals currently is. */
export interface IntervalPosition {
  /** 1-based. */
  readonly index: number;
  readonly count: number;
  /** Seconds until the next switch, or until the round ends in the last interval. */
  readonly remaining: number;
}

/** Callouts keep this distance to other signals in a round, so sounds don't overlap. */
export const CALLOUT_MARGIN_SECONDS = 1;

/**
 * Lays out a whole workout upfront, including every randomized callout. Keeping this pure makes
 * the timing testable and lets the running session simply play cues as their time comes.
 */
export function buildTimerPlan(
  settings: TimerSettings,
  random: () => number = Math.random,
): TimerPlan {
  const phases: TimerPhase[] = [];
  const cues: TimerCue[] = [];
  const { signals } = settings;
  let time = 0;
  let previousCalloutId: string | undefined;

  const cue = (kind: CueKind, at: number, soundId: string) => {
    if (soundId !== NO_SOUND) {
      cues.push({ kind, at, soundId });
    }
  };

  /** Counts down the last seconds of a phase, leaving out ticks that fall on an interval switch. */
  const countdown = (phase: TimerPhase, switches: readonly number[] = []) => {
    for (let secondsLeft = settings.countdownSeconds; secondsLeft >= 1; secondsLeft--) {
      const at = phase.end - secondsLeft;
      if (at > phase.start && !switches.includes(at)) {
        cue('countdown', at, countdownSoundId(signals.countdown, secondsLeft));
      }
    }
  };

  if (settings.prepSeconds > 0) {
    const prep: TimerPhase = { kind: 'prep', round: 1, start: 0, end: settings.prepSeconds };
    phases.push(prep);
    countdown(prep);
    time = prep.end;
  }

  for (let round = 1; round <= settings.rounds; round++) {
    const work: TimerPhase = { kind: 'work', round, start: time, end: time + settings.workSeconds };
    phases.push(work);
    cue('round-start', work.start, signals.roundStart);

    const switches = intervalSwitches(work, settings.intervalSeconds);
    for (const at of switches) {
      cue('interval', at, signals.interval);
    }
    countdown(work, switches);

    if (settings.calloutsEnabled && settings.soundIds.length > 0) {
      const gap = () =>
        settings.minGapSeconds + random() * (settings.maxGapSeconds - settings.minGapSeconds);
      const last = work.end - settings.countdownSeconds - CALLOUT_MARGIN_SECONDS;
      for (let at = work.start + gap(); at <= last; at += gap()) {
        if (switches.some((switchAt) => Math.abs(at - switchAt) < CALLOUT_MARGIN_SECONDS)) {
          continue;
        }
        const soundId = pickSound(settings.soundIds, previousCalloutId, random);
        cue('callout', at, soundId);
        previousCalloutId = soundId;
      }
    }

    const isLast = round === settings.rounds;
    cue(isLast ? 'finish' : 'round-end', work.end, isLast ? signals.finish : signals.roundEnd);
    time = work.end;

    if (!isLast && settings.breakSeconds > 0) {
      const rest: TimerPhase = {
        kind: 'rest',
        round,
        start: time,
        end: time + settings.breakSeconds,
      };
      phases.push(rest);
      countdown(rest);
      time = rest.end;
    }
  }

  // Stable sort: cues at the same time keep their order, e.g. a round end before the next start.
  cues.sort((a, b) => a.at - b.at);

  return {
    rounds: settings.rounds,
    duration: time,
    intervalSeconds: settings.intervalSeconds,
    countdownSeconds: settings.countdownSeconds,
    phases,
    cues,
  };
}

/** Times inside a work phase where one interval ends and the next begins. */
function intervalSwitches(work: TimerPhase, intervalSeconds: number): number[] {
  if (intervalSeconds <= 0) {
    return [];
  }
  const count = Math.round((work.end - work.start) / intervalSeconds);
  return Array.from({ length: count - 1 }, (_, i) => work.start + (i + 1) * intervalSeconds);
}

/** Random pick that avoids calling the same sound twice in a row when there's a choice. */
function pickSound(
  ids: readonly string[],
  previous: string | undefined,
  random: () => number,
): string {
  const candidates = ids.length > 1 ? ids.filter((id) => id !== previous) : ids;
  return candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
}

export function phaseAt(plan: TimerPlan, elapsed: number): TimerPhase | undefined {
  return plan.phases.find((phase) => elapsed >= phase.start && elapsed < phase.end);
}

export function intervalAt(
  plan: TimerPlan,
  phase: TimerPhase,
  elapsed: number,
): IntervalPosition | undefined {
  if (phase.kind !== 'work' || plan.intervalSeconds <= 0) {
    return undefined;
  }
  const count = Math.round((phase.end - phase.start) / plan.intervalSeconds);
  const index = Math.min(count, Math.floor((elapsed - phase.start) / plan.intervalSeconds) + 1);
  return {
    index,
    count,
    remaining: phase.start + index * plan.intervalSeconds - elapsed,
  };
}
