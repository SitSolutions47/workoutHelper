import { TimerSettings, parseTimerSettings } from './timer-settings';

export const FAVORITE_LIMITS = {
  name: 40,
  description: 120,
  groupName: 30,
} as const;

export interface FavoriteGroup {
  readonly id: string;
  readonly name: string;
}

export interface FavoriteDetails {
  readonly name: string;
  /** Empty when the user didn't add one. */
  readonly description: string;
  /** Ungrouped when undefined or when the group no longer exists. */
  readonly groupId?: string;
}

export interface Favorite extends FavoriteDetails {
  readonly id: string;
  readonly settings: TimerSettings;
}

export interface FavoriteSection {
  /** Undefined for the favorites without a group. */
  readonly group: FavoriteGroup | undefined;
  readonly favorites: readonly Favorite[];
}

/**
 * Sorts favorites into their groups, in group order, followed by the ungrouped ones. Empty
 * sections are left out unless `includeEmptyGroups` is set.
 */
export function groupFavorites(
  favorites: readonly Favorite[],
  groups: readonly FavoriteGroup[],
  includeEmptyGroups = false,
): FavoriteSection[] {
  const sections: FavoriteSection[] = groups.map((group) => ({
    group,
    favorites: favorites.filter((favorite) => favorite.groupId === group.id),
  }));
  const groupIds = new Set(groups.map((group) => group.id));
  sections.push({
    group: undefined,
    favorites: favorites.filter(
      (favorite) => favorite.groupId === undefined || !groupIds.has(favorite.groupId),
    ),
  });
  return sections.filter(
    (section) => section.favorites.length > 0 || (includeEmptyGroups && section.group),
  );
}

export function parseFavorite(value: unknown): Favorite | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const settings = parseTimerSettings(record['settings']);
  const { id, name, description, groupId } = record;
  if (!settings || typeof id !== 'string' || typeof name !== 'string') {
    return undefined;
  }
  return {
    id,
    name: name.slice(0, FAVORITE_LIMITS.name),
    description:
      typeof description === 'string' ? description.slice(0, FAVORITE_LIMITS.description) : '',
    groupId: typeof groupId === 'string' ? groupId : undefined,
    settings,
  };
}

export function parseFavoriteGroup(value: unknown): FavoriteGroup | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { id, name } = value as Record<string, unknown>;
  return typeof id === 'string' && typeof name === 'string'
    ? { id, name: name.slice(0, FAVORITE_LIMITS.groupName) }
    : undefined;
}
