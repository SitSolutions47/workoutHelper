import {
  NO_SOUND,
  ROUND_END_SOUND,
  ROUND_START_SOUND,
  SPOKEN_COUNTDOWN,
} from '../sounds/sound-catalog';
import {
  CALLOUT_MARGIN_SECONDS,
  TimerCue,
  buildTimerPlan,
  intervalAt,
  phaseAt,
} from './timer-plan';
import { DEFAULT_SIGNALS, TimerSettings } from './timer-settings';

const BASE: TimerSettings = {
  prepSeconds: 10,
  rounds: 3,
  workSeconds: 180,
  breakSeconds: 60,
  intervalSeconds: 0,
  countdownSeconds: 0,
  calloutsEnabled: true,
  minGapSeconds: 5,
  maxGapSeconds: 10,
  soundIds: ['numbers.1', 'numbers.2', 'numbers.3'],
  signals: DEFAULT_SIGNALS,
};

/** Deterministic stand-in for Math.random. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

const times = (cues: readonly TimerCue[], kind: TimerCue['kind']) =>
  cues.filter((cue) => cue.kind === kind).map((cue) => cue.at);

describe('buildTimerPlan', () => {
  it('lays out prep, work and rest phases with the example settings', () => {
    const plan = buildTimerPlan(BASE, () => 0.5);

    expect(plan.rounds).toBe(3);
    // 10s prep + 3x180s work + 2x60s break
    expect(plan.duration).toBe(670);
    expect(plan.phases.map((phase) => phase.kind)).toEqual([
      'prep',
      'work',
      'rest',
      'work',
      'rest',
      'work',
    ]);
    expect(plan.phases[1]).toEqual({ kind: 'work', round: 1, start: 10, end: 190 });
    expect(plan.phases[2]).toEqual({ kind: 'rest', round: 1, start: 190, end: 250 });
  });

  it('omits the prep phase when preparation is zero', () => {
    const plan = buildTimerPlan({ ...BASE, prepSeconds: 0 }, () => 0.5);

    expect(plan.phases[0]).toEqual({ kind: 'work', round: 1, start: 0, end: 180 });
  });

  it('omits rest phases when the break is zero, including after the last round', () => {
    const plan = buildTimerPlan({ ...BASE, breakSeconds: 0, prepSeconds: 0 }, () => 0.5);

    expect(plan.phases.every((phase) => phase.kind === 'work')).toBe(true);
    expect(plan.duration).toBe(540);
  });

  it('rings a bell at the start and end of every round, with the finish signal last', () => {
    const plan = buildTimerPlan(
      { ...BASE, signals: { ...DEFAULT_SIGNALS, finish: 'signals.whistle' } },
      () => 0.5,
    );

    const starts = plan.cues.filter((cue) => cue.kind === 'round-start');
    const ends = plan.cues.filter((cue) => cue.kind === 'round-end');
    expect(starts.map((cue) => cue.at)).toEqual([10, 250, 490]);
    expect(ends.map((cue) => cue.at)).toEqual([190, 430]);
    expect(starts.every((cue) => cue.soundId === ROUND_START_SOUND.id)).toBe(true);
    expect(ends.every((cue) => cue.soundId === ROUND_END_SOUND.id)).toBe(true);
    expect(plan.cues.at(-1)).toEqual({ kind: 'finish', at: 670, soundId: 'signals.whistle' });
  });

  it('uses the configured signal sounds and leaves out silenced ones', () => {
    const plan = buildTimerPlan(
      {
        ...BASE,
        signals: { ...DEFAULT_SIGNALS, roundStart: 'signals.clap', roundEnd: NO_SOUND },
      },
      () => 0.5,
    );

    expect(plan.cues.filter((cue) => cue.kind === 'round-start').map((c) => c.soundId)).toEqual([
      'signals.clap',
      'signals.clap',
      'signals.clap',
    ]);
    expect(times(plan.cues, 'round-end')).toEqual([]);
  });

  it('keeps callouts inside the work phase and clear of the end bell', () => {
    const plan = buildTimerPlan(BASE, sequence([0, 0.25, 0.5, 0.75, 1]));

    const workPhases = plan.phases.filter((phase) => phase.kind === 'work');
    for (const cue of plan.cues.filter((cue) => cue.kind === 'callout')) {
      const phase = workPhases.find((p) => cue.at >= p.start && cue.at <= p.end);
      expect(phase).toBeDefined();
      expect(cue.at).toBeGreaterThan(phase!.start);
      expect(cue.at).toBeLessThanOrEqual(phase!.end - CALLOUT_MARGIN_SECONDS);
    }
  });

  it('spaces callouts by a gap inside the configured range', () => {
    const plan = buildTimerPlan(BASE, sequence([0, 0.5, 1]));

    const firstRound = plan.cues.filter((cue) => cue.kind === 'callout' && cue.at < 190);
    expect(firstRound.length).toBeGreaterThan(1);
    expect(firstRound[0].at - 10).toBeGreaterThanOrEqual(BASE.minGapSeconds);
    for (let i = 1; i < firstRound.length; i++) {
      const gap = firstRound[i].at - firstRound[i - 1].at;
      expect(gap).toBeGreaterThanOrEqual(BASE.minGapSeconds);
      expect(gap).toBeLessThanOrEqual(BASE.maxGapSeconds);
    }
  });

  it('never calls the same sound twice in a row', () => {
    const plan = buildTimerPlan({ ...BASE, minGapSeconds: 1, maxGapSeconds: 1 }, Math.random);

    const callouts = plan.cues.filter((cue) => cue.kind === 'callout');
    expect(callouts.length).toBeGreaterThan(20);
    for (let i = 1; i < callouts.length; i++) {
      expect(callouts[i].soundId).not.toBe(callouts[i - 1].soundId);
    }
  });

  it('repeats the only selected sound rather than falling silent', () => {
    const plan = buildTimerPlan({ ...BASE, soundIds: ['colors.red'] }, () => 0.5);

    const callouts = plan.cues.filter((cue) => cue.kind === 'callout');
    expect(callouts.length).toBeGreaterThan(0);
    expect(callouts.every((cue) => cue.soundId === 'colors.red')).toBe(true);
  });

  it('still rings the round bells when no callout sound is selected', () => {
    const plan = buildTimerPlan({ ...BASE, soundIds: [] }, () => 0.5);

    expect(times(plan.cues, 'callout')).toEqual([]);
    expect(plan.cues.length).toBe(6);
  });

  it('plays no callouts when they are turned off, whatever sounds are selected', () => {
    const plan = buildTimerPlan({ ...BASE, calloutsEnabled: false }, () => 0.5);

    expect(times(plan.cues, 'callout')).toEqual([]);
    expect(plan.cues.length).toBe(6);
  });

  it('keeps cues in chronological order', () => {
    const plan = buildTimerPlan(
      { ...BASE, intervalSeconds: 30, countdownSeconds: 3 },
      sequence([0.1, 0.9, 0.4]),
    );

    const cueTimes = plan.cues.map((cue) => cue.at);
    expect([...cueTimes].sort((a, b) => a - b)).toEqual(cueTimes);
  });

  describe('intervals', () => {
    const settings: TimerSettings = { ...BASE, prepSeconds: 0, rounds: 2, intervalSeconds: 30 };

    it('signals every switch inside a round, but not at its start or end', () => {
      const plan = buildTimerPlan({ ...settings, calloutsEnabled: false }, () => 0.5);

      // Round 1 runs 0–180, round 2 runs 240–420.
      expect(times(plan.cues, 'interval')).toEqual([30, 60, 90, 120, 150, 270, 300, 330, 360, 390]);
      expect(
        plan.cues
          .filter((c) => c.kind === 'interval')
          .every((c) => c.soundId === DEFAULT_SIGNALS.interval),
      ).toBe(true);
    });

    it('keeps callouts clear of the switches', () => {
      const plan = buildTimerPlan(
        { ...settings, minGapSeconds: 1, maxGapSeconds: 1.5 },
        Math.random,
      );

      const switches = times(plan.cues, 'interval');
      for (const at of times(plan.cues, 'callout')) {
        for (const switchAt of switches) {
          expect(Math.abs(at - switchAt)).toBeGreaterThanOrEqual(CALLOUT_MARGIN_SECONDS);
        }
      }
    });

    it('stays silent when the interval signal is off', () => {
      const plan = buildTimerPlan(
        { ...settings, signals: { ...DEFAULT_SIGNALS, interval: NO_SOUND } },
        () => 0.5,
      );

      expect(times(plan.cues, 'interval')).toEqual([]);
      expect(plan.intervalSeconds).toBe(30);
    });
  });

  describe('countdown', () => {
    const settings: TimerSettings = {
      ...BASE,
      rounds: 2,
      countdownSeconds: 3,
      calloutsEnabled: false,
    };

    it('counts down the end of the preparation, every round and every break', () => {
      const plan = buildTimerPlan(settings, () => 0.5);

      // Prep 0–10, round 10–190, break 190–250, round 250–430.
      expect(times(plan.cues, 'countdown')).toEqual([
        7, 8, 9, 187, 188, 189, 247, 248, 249, 427, 428, 429,
      ]);
    });

    it('speaks the remaining seconds when set to spoken numbers', () => {
      const plan = buildTimerPlan(
        { ...settings, signals: { ...DEFAULT_SIGNALS, countdown: SPOKEN_COUNTDOWN } },
        () => 0.5,
      );

      const prep = plan.cues.filter((cue) => cue.kind === 'countdown' && cue.at < 10);
      expect(prep.map((cue) => cue.soundId)).toEqual(['numbers.3', 'numbers.2', 'numbers.1']);
    });

    it('only counts seconds that lie inside the phase', () => {
      const plan = buildTimerPlan({ ...settings, prepSeconds: 5, countdownSeconds: 10 }, () => 0.5);

      expect(times(plan.cues, 'countdown').filter((at) => at < 5)).toEqual([1, 2, 3, 4]);
    });

    it('lets an interval switch replace the countdown tick at the same time', () => {
      const plan = buildTimerPlan(
        {
          ...settings,
          prepSeconds: 0,
          rounds: 1,
          workSeconds: 20,
          intervalSeconds: 5,
          countdownSeconds: 6,
        },
        () => 0.5,
      );

      expect(times(plan.cues, 'interval')).toEqual([5, 10, 15]);
      expect(times(plan.cues, 'countdown')).toEqual([14, 16, 17, 18, 19]);
    });

    it('ends the callouts before the countdown begins', () => {
      const plan = buildTimerPlan(
        {
          ...settings,
          calloutsEnabled: true,
          countdownSeconds: 5,
          minGapSeconds: 1,
          maxGapSeconds: 1,
        },
        () => 0.5,
      );

      const firstRoundCallouts = times(plan.cues, 'callout').filter((at) => at < 190);
      expect(Math.max(...firstRoundCallouts)).toBeLessThanOrEqual(190 - 5 - CALLOUT_MARGIN_SECONDS);
    });
  });
});

describe('phaseAt', () => {
  const plan = buildTimerPlan(BASE, () => 0.5);

  it('resolves the phase containing the elapsed time', () => {
    expect(phaseAt(plan, 0)?.kind).toBe('prep');
    expect(phaseAt(plan, 9.9)?.kind).toBe('prep');
    expect(phaseAt(plan, 10)?.kind).toBe('work');
    expect(phaseAt(plan, 200)?.kind).toBe('rest');
  });

  it('has no phase once the workout is over', () => {
    expect(phaseAt(plan, plan.duration)).toBeUndefined();
  });
});

describe('intervalAt', () => {
  const plan = buildTimerPlan({ ...BASE, intervalSeconds: 60 }, () => 0.5);

  it('tracks the current interval of a round and the time to the next switch', () => {
    const work = phaseAt(plan, 10)!;

    expect(intervalAt(plan, work, 10)).toEqual({ index: 1, count: 3, remaining: 60 });
    expect(intervalAt(plan, work, 75)).toEqual({ index: 2, count: 3, remaining: 55 });
    expect(intervalAt(plan, work, 189.5)).toEqual({ index: 3, count: 3, remaining: 0.5 });
  });

  it('is undefined outside rounds and without intervals', () => {
    expect(intervalAt(plan, phaseAt(plan, 0)!, 0)).toBeUndefined();
    const plain = buildTimerPlan(BASE, () => 0.5);
    expect(intervalAt(plain, phaseAt(plain, 10)!, 10)).toBeUndefined();
  });
});
