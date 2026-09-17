import { Service, effect, inject, signal } from '@angular/core';
import { LocalStorage } from '../../../core/storage/local-storage';
import {
  DEFAULT_TIMER_SETTINGS,
  TimerSettings,
  parseTimerSettings,
  sameTimerSettings,
} from '../model/timer-settings';

export const HISTORY_LIMIT = 10;

const DRAFT_KEY = 'sound-timer.draft.v1';
const HISTORY_KEY = 'sound-timer.history.v1';
const FAVORITES_KEY = 'sound-timer.favorites.v1';

export interface HistoryEntry {
  readonly id: string;
  readonly settings: TimerSettings;
  /** Epoch milliseconds. */
  readonly usedAt: number;
}

export interface Favorite {
  readonly id: string;
  readonly name: string;
  readonly settings: TimerSettings;
}

/** Stores the timer configuration being edited, recently used configurations and favorites. */
@Service()
export class TimerPresets {
  private readonly storage = inject(LocalStorage);

  private readonly _history = signal(this.readList(HISTORY_KEY, parseHistoryEntry));
  private readonly _favorites = signal(this.readList(FAVORITES_KEY, parseFavorite));

  readonly history = this._history.asReadonly();
  readonly favorites = this._favorites.asReadonly();

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

  addFavorite(name: string, settings: TimerSettings): void {
    this._favorites.update((favorites) => [{ id: createId(), name, settings }, ...favorites]);
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

  load(settings: TimerSettings): void {
    this.draft.set({ ...settings, soundIds: [...settings.soundIds] });
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

function parseFavorite(value: unknown): Favorite | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const record = value as Record<string, unknown>;
  const settings = parseTimerSettings(record['settings']);
  const id = record['id'];
  const name = record['name'];
  return settings && typeof id === 'string' && typeof name === 'string'
    ? { id, name, settings }
    : undefined;
}
