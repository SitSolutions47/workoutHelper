import { form } from '@angular/forms/signals';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  DEFAULT_SIGNALS,
  DEFAULT_TIMER_SETTINGS,
  TIMER_LIMITS,
  TimerSettings,
  copyTimerSettings,
  intervalFits,
  intervalOptions,
  parseTimerSettings,
  sameTimerSettings,
  timerSettingsSchema,
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
  it('compares values, selected sounds and signals', () => {
    const copy = copyTimerSettings(DEFAULT_TIMER_SETTINGS);
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, copy)).toBe(true);
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, { ...copy, rounds: 5 })).toBe(false);
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, { ...copy, soundIds: ['numbers.1'] })).toBe(
      false,
    );
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, { ...copy, intervalSeconds: 60 })).toBe(false);
    expect(sameTimerSettings(DEFAULT_TIMER_SETTINGS, { ...copy, calloutsEnabled: false })).toBe(
      false,
    );
    expect(
      sameTimerSettings(DEFAULT_TIMER_SETTINGS, {
        ...copy,
        signals: { ...copy.signals, finish: 'signals.whistle' },
      }),
    ).toBe(false);
  });
});

describe('intervals', () => {
  it('only fit when they split the round into whole parts', () => {
    expect(intervalFits(0, 180)).toBe(true);
    expect(intervalFits(30, 180)).toBe(true);
    expect(intervalFits(40, 180)).toBe(false);
    expect(intervalFits(180, 180)).toBe(false);
    expect(intervalFits(3, 180)).toBe(false);
  });

  it('offers every fitting interval from the minimum up to half the round', () => {
    expect(intervalOptions(60)).toEqual([5, 6, 10, 12, 15, 20, 30]);
    expect(intervalOptions(5)).toEqual([]);
  });
});

describe('timerSettingsSchema', () => {
  function validate(settings: TimerSettings) {
    return TestBed.runInInjectionContext(() => form(signal(settings), timerSettingsSchema));
  }

  it('rejects an interval that does not fit the round', () => {
    const settingsForm = validate({ ...DEFAULT_TIMER_SETTINGS, intervalSeconds: 40 });

    expect(settingsForm.intervalSeconds().invalid()).toBe(true);
  });

  it('only requires callout sounds while callouts are on', () => {
    const off = validate({ ...DEFAULT_TIMER_SETTINGS, calloutsEnabled: false, soundIds: [] });
    const on = validate({ ...DEFAULT_TIMER_SETTINGS, soundIds: [] });

    expect(off().invalid()).toBe(false);
    expect(on.soundIds().invalid()).toBe(true);
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
    expect(
      parseTimerSettings({ ...DEFAULT_TIMER_SETTINGS, soundIds: 'numbers.1' }),
    ).toBeUndefined();
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

  it('gives settings saved before intervals, countdowns and signals existed their old behavior', () => {
    const legacy = {
      prepSeconds: 10,
      rounds: 3,
      workSeconds: 180,
      breakSeconds: 60,
      minGapSeconds: 5,
      maxGapSeconds: 10,
      soundIds: ['numbers.1'],
    };

    expect(parseTimerSettings(legacy)).toEqual({
      ...legacy,
      intervalSeconds: 0,
      countdownSeconds: 0,
      calloutsEnabled: true,
      signals: DEFAULT_SIGNALS,
    });
  });

  it('drops an interval that no longer fits and unknown signal sounds', () => {
    const parsed = parseTimerSettings({
      ...DEFAULT_TIMER_SETTINGS,
      intervalSeconds: 40,
      signals: { ...DEFAULT_SIGNALS, roundStart: 'signals.gong', countdown: 'spoken' },
    });

    expect(parsed?.intervalSeconds).toBe(0);
    expect(parsed?.signals.roundStart).toBe(DEFAULT_SIGNALS.roundStart);
    expect(parsed?.signals.countdown).toBe('spoken');
  });

  it('drops sound ids that no longer exist in the catalog', () => {
    const parsed = parseTimerSettings({
      ...DEFAULT_TIMER_SETTINGS,
      soundIds: ['numbers.1', 'colors.turquoise', 'numbers.99', 42],
    });

    expect(parsed?.soundIds).toEqual(['numbers.1']);
  });
});
