import { TestBed } from '@angular/core/testing';
import { DEFAULT_TIMER_SETTINGS, TimerSettings } from '../model/timer-settings';
import { HISTORY_LIMIT, TimerPresets } from './timer-presets';

function settings(rounds: number): TimerSettings {
  return { ...DEFAULT_TIMER_SETTINGS, rounds, soundIds: [...DEFAULT_TIMER_SETTINGS.soundIds] };
}

describe('TimerPresets', () => {
  let presets: TimerPresets;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    presets = TestBed.inject(TimerPresets);
  });

  it('starts from the default settings', () => {
    expect(presets.draft()).toEqual(DEFAULT_TIMER_SETTINGS);
    expect(presets.history()).toEqual([]);
    expect(presets.favorites()).toEqual([]);
  });

  it('records used settings newest first', () => {
    presets.recordUsage(settings(3));
    presets.recordUsage(settings(5));

    expect(presets.history().map((entry) => entry.settings.rounds)).toEqual([5, 3]);
  });

  it('moves a repeated configuration back to the top instead of duplicating it', () => {
    presets.recordUsage(settings(3));
    presets.recordUsage(settings(5));
    presets.recordUsage(settings(3));

    expect(presets.history().map((entry) => entry.settings.rounds)).toEqual([3, 5]);
  });

  it(`keeps at most ${HISTORY_LIMIT} entries`, () => {
    for (let rounds = 1; rounds <= HISTORY_LIMIT + 4; rounds++) {
      presets.recordUsage(settings(rounds));
    }

    expect(presets.history()).toHaveLength(HISTORY_LIMIT);
    expect(presets.history()[0].settings.rounds).toBe(HISTORY_LIMIT + 4);
  });

  it('adds, removes and restores favorites at their original position', () => {
    presets.addFavorite('Sparring', settings(12));
    presets.addFavorite('Technik', settings(4));
    const [, middle] = [...presets.favorites()];

    const index = presets.removeFavorite(middle.id);
    expect(index).toBe(1);
    expect(presets.favorites().map((favorite) => favorite.name)).toEqual(['Technik']);

    presets.restoreFavorite(middle, index);
    expect(presets.favorites().map((favorite) => favorite.name)).toEqual(['Technik', 'Sparring']);
  });

  it('reports -1 when removing an unknown favorite', () => {
    expect(presets.removeFavorite('missing')).toBe(-1);
  });

  it('copies loaded settings so later edits do not change the preset', () => {
    const favorite = settings(7);
    presets.load(favorite);
    presets.draft().soundIds.push('colors.red');

    expect(favorite.soundIds).toEqual(DEFAULT_TIMER_SETTINGS.soundIds);
  });

  it('restores the draft, history and favorites from storage', () => {
    presets.load(settings(9));
    presets.recordUsage(settings(9));
    presets.addFavorite('Pratzen', settings(6));
    // Persisting runs in effects, which only flush on a tick.
    TestBed.tick();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(TimerPresets);

    expect(restored.draft().rounds).toBe(9);
    expect(restored.history()).toHaveLength(1);
    expect(restored.favorites().map((favorite) => favorite.name)).toEqual(['Pratzen']);
  });

  it('ignores corrupted stored data', () => {
    localStorage.setItem('workout-helper.sound-timer.history.v1', '{"not":"an array"}');
    localStorage.setItem('workout-helper.sound-timer.favorites.v1', 'not json');
    localStorage.setItem('workout-helper.sound-timer.draft.v1', '{"rounds":"many"}');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(TimerPresets);

    expect(restored.history()).toEqual([]);
    expect(restored.favorites()).toEqual([]);
    expect(restored.draft()).toEqual(DEFAULT_TIMER_SETTINGS);
  });
});
