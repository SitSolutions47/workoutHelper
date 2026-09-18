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

  it('stores a favorite with its description and group', () => {
    const group = presets.addGroup('Boxen');
    const favorite = presets.addFavorite('Sparring', settings(12), {
      description: 'Harte Runden',
      groupId: group.id,
    });

    expect(presets.favorites()[0]).toEqual(favorite);
    expect(favorite).toMatchObject({ description: 'Harte Runden', groupId: group.id });
  });

  it('updates a favorite without touching its settings', () => {
    const favorite = presets.addFavorite('Sparring', settings(12));
    presets.updateFavorite(favorite.id, { name: 'Technik', description: 'Locker' });

    expect(presets.favorites()[0]).toMatchObject({
      name: 'Technik',
      description: 'Locker',
      settings: settings(12),
    });
  });

  it('creates a new group only when the dialog asks for one', () => {
    const existing = presets.addGroup('Boxen');

    expect(presets.resolveGroup({ kind: 'none' })).toBeUndefined();
    expect(presets.resolveGroup({ kind: 'existing', id: existing.id })).toBe(existing.id);
    const created = presets.resolveGroup({ kind: 'new', name: 'Kraft' });
    expect(presets.groups().map((group) => group.name)).toEqual(['Boxen', 'Kraft']);
    expect(presets.groups()[1].id).toBe(created);
  });

  it('keeps the favorites of a deleted group and regroups them on undo', () => {
    const boxing = presets.addGroup('Boxen');
    const strength = presets.addGroup('Kraft');
    const sparring = presets.addFavorite('Sparring', settings(12), {
      description: '',
      groupId: boxing.id,
    });
    const squats = presets.addFavorite('Kniebeugen', settings(5), {
      description: '',
      groupId: strength.id,
    });

    const removed = presets.removeGroup(boxing.id)!;
    expect(presets.groups()).toEqual([strength]);
    expect(presets.favorites().find((f) => f.id === sparring.id)?.groupId).toBeUndefined();
    expect(presets.favorites().find((f) => f.id === squats.id)?.groupId).toBe(strength.id);

    presets.restoreGroup(removed);
    expect(presets.groups()).toEqual([boxing, strength]);
    expect(presets.favorites().find((f) => f.id === sparring.id)?.groupId).toBe(boxing.id);
  });

  it('reads favorites saved before descriptions and groups existed', () => {
    localStorage.setItem(
      'workout-helper.sound-timer.favorites.v1',
      JSON.stringify([{ id: 'a', name: 'Sparring', settings: DEFAULT_TIMER_SETTINGS }]),
    );

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(TimerPresets);

    expect(restored.favorites()[0]).toMatchObject({ name: 'Sparring', description: '' });
    expect(restored.favorites()[0].groupId).toBeUndefined();
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
    presets.addGroup('Boxen');
    // Persisting runs in effects, which only flush on a tick.
    TestBed.tick();

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const restored = TestBed.inject(TimerPresets);

    expect(restored.draft().rounds).toBe(9);
    expect(restored.history()).toHaveLength(1);
    expect(restored.favorites().map((favorite) => favorite.name)).toEqual(['Pratzen']);
    expect(restored.groups().map((group) => group.name)).toEqual(['Boxen']);
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
