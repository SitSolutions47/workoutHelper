import {
  DEFAULT_TIMER_SETTINGS,
  TIMER_LIMITS,
  TimerSettings,
  parseTimerSettings,
  sameTimerSettings,
  workoutDuration,
} from './timer-settings';

describe('workoutDuration', () => {
  it('counts prep, every round and the breaks between them', () => {
    expect(workoutDuration(DEFAULT_TIMER_SETTINGS)).toBe(10 + 3 * 180 + 2 * 60);
  });

  it('has no trailing break after the last round', () => {
    const single: TimerSettings = { ...DEFAULT_TIMER_SETTINGS, rounds: 1, prepSeconds: 0 };
    expect(workoutDuration(single)).toBe(180);
  });
});

describe('sameTimerSettings', () => {
  it('compares values and selected sounds', () => {
    const copy = { ...DEFAULT_TIMER_SETTINGS, soundIds: [...DEFAULT_TIMER_SETTINGS.soundIds] };
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, copy)).toBe(true);
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, { ...copy, rounds: 5 })).toBe(false);
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, { ...copy, soundIds: ['numbers.1'] })).toBe(
      false,
    );
  });
});

describe('parseTimerSettings', () => {
  it('accepts stored settings and orders sounds like the catalog', () => {
    const parsed = parseTimerSettings({
      ...DEFAULT_TIMER_SETTINGS,
      soundIds: ['colors.red', 'numbers.2', 'numbers.1'],
    });

    expect(parsed?.soundIds).toEqual(['numbers.1', 'numbers.2', 'colors.red']);
  });

  it('rejects values that are not settings', () => {
    expect(parseTimerSettings(undefined)).toBeUndefined();
    expect(parseTimerSettings('3 rounds')).toBeUndefined();
    expect(parseTimerSettings({ rounds: 3 })).toBeUndefined();
    expect(parseTimerSettings({ ...DEFAULT_TIMER_SETTINGS, workSeconds: 'long' })).toBeUndefined();
    expect(parseTimerSettings({ ...DEFAULT_TIMER_SETTINGS, soundIds: 'numbers.1' })).toBeUndefined();
  });

  it('clamps values into the supported range', () => {
    const parsed = parseTimerSettings({
      ...DEFAULT_TIMER_SETTINGS,
      rounds: 999,
      workSeconds: -5,
      prepSeconds: Number.MAX_SAFE_INTEGER,
    });

    expect(parsed?.rounds).toBe(TIMER_LIMITS.rounds.max);
    expect(parsed?.workSeconds).toBe(TIMER_LIMITS.workSeconds.min);
    expect(parsed?.prepSeconds).toBe(TIMER_LIMITS.prepSeconds.max);
  });

  it('repairs an inverted gap range', () => {
    const parsed = parseTimerSettings({
      ...DEFAULT_TIMER_SETTINGS,
      minGapSeconds: 12,
      maxGapSeconds: 4,
    });

    expect(parsed?.minGapSeconds).toBe(4);
    expect(parsed?.maxGapSeconds).toBe(12);
  });

  it('drops sound ids that no longer exist in the catalog', () => {
    const parsed = parseTimerSettings({
      ...DEFAULT_TIMER_SETTINGS,
      soundIds: ['numbers.1', 'colors.turquoise', 'numbers.99', 42],
    });

    expect(parsed?.soundIds).toEqual(['numbers.1']);
  });
});
