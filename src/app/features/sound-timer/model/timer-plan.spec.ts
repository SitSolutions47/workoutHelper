import { ROUND_END_SOUND, ROUND_START_SOUND } from '../sounds/sound-catalog';
import { CALLOUT_END_MARGIN_SECONDS, buildTimerPlan, phaseAt } from './timer-plan';
import { TimerSettings } from './timer-settings';

const BASE: TimerSettings = {
  prepSeconds: 10,
  rounds: 3,
  workSeconds: 180,
  breakSeconds: 60,
  minGapSeconds: 5,
  maxGapSeconds: 10,
  soundIds: ['numbers.1', 'numbers.2', 'numbers.3'],
};

/** Deterministic stand-in for Math.random. */
function sequence(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

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

  it('rings a bell at the start and end of every round', () => {
    const plan = buildTimerPlan(BASE, () => 0.5);

    const starts = plan.cues.filter((cue) => cue.kind === 'round-start');
    const ends = plan.cues.filter((cue) => cue.kind === 'round-end');
    expect(starts.map((cue) => cue.at)).toEqual([10, 250, 490]);
    expect(ends.map((cue) => cue.at)).toEqual([190, 430, 670]);
    expect(starts.every((cue) => cue.soundId === ROUND_START_SOUND.id)).toBe(true);
    expect(ends.every((cue) => cue.soundId === ROUND_END_SOUND.id)).toBe(true);
  });

  it('keeps callouts inside the work phase and clear of the end bell', () => {
    const plan = buildTimerPlan(BASE, sequence([0, 0.25, 0.5, 0.75, 1]));

    const workPhases = plan.phases.filter((phase) => phase.kind === 'work');
    for (const cue of plan.cues.filter((cue) => cue.kind === 'callout')) {
      const phase = workPhases.find((p) => cue.at >= p.start && cue.at <= p.end);
      expect(phase).toBeDefined();
      expect(cue.at).toBeGreaterThan(phase!.start);
      expect(cue.at).toBeLessThanOrEqual(phase!.end - CALLOUT_END_MARGIN_SECONDS);
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

    expect(plan.cues.filter((cue) => cue.kind === 'callout')).toEqual([]);
    expect(plan.cues.length).toBe(6);
  });

  it('keeps cues in chronological order', () => {
    const plan = buildTimerPlan(BASE, sequence([0.1, 0.9, 0.4]));

    const times = plan.cues.map((cue) => cue.at);
    expect([...times].sort((a, b) => a - b)).toEqual(times);
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
