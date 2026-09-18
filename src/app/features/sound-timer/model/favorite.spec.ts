import { DEFAULT_TIMER_SETTINGS } from './timer-settings';
import { Favorite, groupFavorites } from './favorite';

function favorite(id: string, groupId?: string): Favorite {
  return { id, name: id, description: '', groupId, settings: DEFAULT_TIMER_SETTINGS };
}

describe('groupFavorites', () => {
  const boxing = { id: 'g1', name: 'Boxen' };
  const strength = { id: 'g2', name: 'Kraft' };

  it('lists groups in their order, followed by ungrouped favorites', () => {
    const sections = groupFavorites(
      [favorite('a'), favorite('b', strength.id), favorite('c', boxing.id)],
      [boxing, strength],
    );

    expect(sections.map((s) => [s.group?.name, s.favorites.map((f) => f.id)])).toEqual([
      ['Boxen', ['c']],
      ['Kraft', ['b']],
      [undefined, ['a']],
    ]);
  });

  it('treats favorites of a missing group as ungrouped', () => {
    const sections = groupFavorites([favorite('a', 'deleted')], [boxing]);

    expect(sections).toEqual([{ group: undefined, favorites: [favorite('a', 'deleted')] }]);
  });

  it('leaves out empty groups unless asked to include them', () => {
    expect(groupFavorites([], [boxing])).toEqual([]);
    expect(groupFavorites([], [boxing], true)).toEqual([{ group: boxing, favorites: [] }]);
  });
});
