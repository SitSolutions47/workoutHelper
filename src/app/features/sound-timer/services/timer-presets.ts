import { Service, effect, inject, signal } from '@angular/core';
import { LocalStorage } from '../../../core/storage/local-storage';
import {
  Favorite,
  FavoriteDetails,
  FavoriteGroup,
  parseFavorite,
  parseFavoriteGroup,
} from '../model/favorite';
import {
  DEFAULT_TIMER_SETTINGS,
  TimerSettings,
  copyTimerSettings,
  parseTimerSettings,
  sameTimerSettings,
} from '../model/timer-settings';

export const HISTORY_LIMIT = 10;

const DRAFT_KEY = 'sound-timer.draft.v1';
const HISTORY_KEY = 'sound-timer.history.v1';
const FAVORITES_KEY = 'sound-timer.favorites.v1';
const GROUPS_KEY = 'sound-timer.favorite-groups.v1';

export interface HistoryEntry {
  readonly id: string;
  readonly settings: TimerSettings;
  /** Epoch milliseconds. */
  readonly usedAt: number;
}

/** What {@link TimerPresets.removeGroup} changed, so it can be undone. */
export interface RemovedGroup {
  readonly group: FavoriteGroup;
  readonly index: number;
  /** Favorites that were in the group and are ungrouped now. */
  readonly favoriteIds: readonly string[];
}

/** Which group a favorite goes into; a new group is created on save. */
export type GroupChoice =
  | { readonly kind: 'none' }
  | { readonly kind: 'existing'; readonly id: string }
  | { readonly kind: 'new'; readonly name: string };

/** Stores the timer configuration being edited, recently used configurations and favorites. */
@Service()
export class TimerPresets {
  private readonly storage = inject(LocalStorage);

  private readonly _history = signal(this.readList(HISTORY_KEY, parseHistoryEntry));
  private readonly _favorites = signal(this.readList(FAVORITES_KEY, parseFavorite));
  private readonly _groups = signal(this.readList(GROUPS_KEY, parseFavoriteGroup));

  readonly history = this._history.asReadonly();
  readonly favorites = this._favorites.asReadonly();
  readonly groups = this._groups.asReadonly();

  /** The setup form edits this directly, so changes are saved automatically. */
  readonly draft = signal<TimerSettings>(
    parseTimerSettings(this.storage.read(DRAFT_KEY)) ??
      this._history()[0]?.settings ??
      DEFAULT_TIMER_SETTINGS,
  );

  constructor() {
    effect(() => this.storage.write(DRAFT_KEY, this.draft()));
    effect(() => this.storage.write(HISTORY_KEY, this._history()));
    effect(() => this.storage.write(FAVORITES_KEY, this._favorites()));
    effect(() => this.storage.write(GROUPS_KEY, this._groups()));
  }

  /** Moves the settings to the top of the history; identical earlier entries are replaced. */
  recordUsage(settings: TimerSettings): void {
    this._history.update((entries) =>
      [
        { id: createId(), settings, usedAt: Date.now() },
        ...entries.filter((entry) => !sameTimerSettings(entry.settings, settings)),
      ].slice(0, HISTORY_LIMIT),
    );
  }

  addFavorite(
    name: string,
    settings: TimerSettings,
    details: Omit<FavoriteDetails, 'name'> = { description: '' },
  ): Favorite {
    const favorite: Favorite = { id: createId(), ...details, name, settings };
    this._favorites.update((favorites) => [favorite, ...favorites]);
    return favorite;
  }

  updateFavorite(id: string, details: FavoriteDetails): void {
    this._favorites.update((favorites) =>
      favorites.map((favorite) => (favorite.id === id ? { ...favorite, ...details } : favorite)),
    );
  }

  /** Returns the removed favorite's index for {@link restoreFavorite}, or -1 if not found. */
  removeFavorite(id: string): number {
    const index = this._favorites().findIndex((favorite) => favorite.id === id);
    if (index >= 0) {
      this._favorites.update((favorites) => favorites.filter((favorite) => favorite.id !== id));
    }
    return index;
  }

  restoreFavorite(favorite: Favorite, index: number): void {
    this._favorites.update((favorites) => [
      ...favorites.slice(0, index),
      favorite,
      ...favorites.slice(index),
    ]);
  }

  addGroup(name: string): FavoriteGroup {
    const group: FavoriteGroup = { id: createId(), name };
    this._groups.update((groups) => [...groups, group]);
    return group;
  }

  renameGroup(id: string, name: string): void {
    this._groups.update((groups) =>
      groups.map((group) => (group.id === id ? { ...group, name } : group)),
    );
  }

  /** Deletes a group; its favorites are kept without a group. */
  removeGroup(id: string): RemovedGroup | undefined {
    const index = this._groups().findIndex((group) => group.id === id);
    if (index < 0) {
      return undefined;
    }
    const group = this._groups()[index];
    const favoriteIds = this._favorites()
      .filter((favorite) => favorite.groupId === id)
      .map((favorite) => favorite.id);
    this._groups.update((groups) => groups.filter((g) => g.id !== id));
    this._favorites.update((favorites) =>
      favorites.map((favorite) =>
        favorite.groupId === id ? { ...favorite, groupId: undefined } : favorite,
      ),
    );
    return { group, index, favoriteIds };
  }

  restoreGroup(removed: RemovedGroup): void {
    const { group, index, favoriteIds } = removed;
    this._groups.update((groups) => [...groups.slice(0, index), group, ...groups.slice(index)]);
    this._favorites.update((favorites) =>
      favorites.map((favorite) =>
        favoriteIds.includes(favorite.id) ? { ...favorite, groupId: group.id } : favorite,
      ),
    );
  }

  /** The group id for a choice made in the favorite dialog, creating the group if it's new. */
  resolveGroup(choice: GroupChoice): string | undefined {
    switch (choice.kind) {
      case 'none':
        return undefined;
      case 'existing':
        return choice.id;
      case 'new':
        return this.addGroup(choice.name).id;
    }
  }

  load(settings: TimerSettings): void {
    this.draft.set(copyTimerSettings(settings));
  }

  private readList<T>(key: string, parse: (item: unknown) => T | undefined): T[] {
    const stored = this.storage.read(key);
    if (!Array.isArray(stored)) {
      return [];
    }
    return stored.map(parse).filter((item): item is T => item !== undefined);
  }
}

/** Not `crypto.randomUUID()`: that's missing on plain-http LAN addresses used for phone testing. */
function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseHistoryEntry(value: unknown): HistoryEntry | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const settings = parseTimerSettings(record['settings']);
  const id = record['id'];
  const usedAt = record['usedAt'];
  return settings && typeof id === 'string' && typeof usedAt === 'number'
    ? { id, settings, usedAt }
    : undefined;
}
