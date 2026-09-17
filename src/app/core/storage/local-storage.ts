import { Service } from '@angular/core';

const KEY_PREFIX = 'workout-helper.';

/**
 * JSON wrapper around `localStorage`. Storage can be unavailable (private mode, quota, disabled
 * cookies), so every access fails soft: reads return `undefined` and writes are dropped.
 * Callers must validate what they read, since stored data may come from an older app version.
 */
@Service()
export class LocalStorage {
  read(key: string): unknown {
    try {
      const raw = localStorage.getItem(KEY_PREFIX + key);
      return raw === null ? undefined : JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  write(key: string, value: unknown): void {
    try {
      localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
    } catch {
      // Persisting is best effort; the app keeps working with in-memory state.
    }
  }
}
