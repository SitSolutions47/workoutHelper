import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';
import { LocalStorage } from '../storage/local-storage';

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Color schemes; each has a light and a dark palette in `styles.scss`. */
export const THEME_ACCENTS = ['red', 'ocean', 'forest', 'violet', 'ember', 'graphite'] as const;

export type ThemeAccent = (typeof THEME_ACCENTS)[number];

/** Keep in sync with the pre-paint script in `index.html`. */
export const THEME_STORAGE_KEY = 'theme';
export const ACCENT_STORAGE_KEY = 'accent';

/** Browser UI color per theme; matches `--color-bg` in `styles.scss`. */
const THEME_COLORS = { light: '#f4f3f1', dark: '#121212' } as const;

function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === 'string' && (THEME_PREFERENCES as readonly string[]).includes(value);
}

function isThemeAccent(value: unknown): value is ThemeAccent {
  return typeof value === 'string' && (THEME_ACCENTS as readonly string[]).includes(value);
}

@Service()
export class Theme {
  private readonly storage = inject(LocalStorage);
  private readonly document = inject(DOCUMENT);

  private readonly _preference = signal(this.readStoredPreference());
  private readonly _accent = signal(this.readStoredAccent());
  private readonly systemPrefersDark = signal(false);

  readonly preference = this._preference.asReadonly();
  readonly accent = this._accent.asReadonly();
  readonly resolved = computed(() => {
    const preference = this._preference();
    if (preference !== 'system') {
      return preference;
    }
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    const query = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    if (query) {
      this.systemPrefersDark.set(query.matches);
      query.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));
    }

    effect(() => {
      const theme = this.resolved();
      this.document.documentElement.dataset['theme'] = theme;
      this.document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', THEME_COLORS[theme]);
    });

    effect(() => {
      const accent = this._accent();
      this.document.documentElement.dataset['accent'] = accent;
      this.storage.write(ACCENT_STORAGE_KEY, accent);
    });

    effect(() => this.storage.write(THEME_STORAGE_KEY, this._preference()));
  }

  setPreference(preference: ThemePreference): void {
    this._preference.set(preference);
  }

  setAccent(accent: ThemeAccent): void {
    this._accent.set(accent);
  }

  private readStoredPreference(): ThemePreference {
    const stored = this.storage.read(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : 'system';
  }

  private readStoredAccent(): ThemeAccent {
    const stored = this.storage.read(ACCENT_STORAGE_KEY);
    return isThemeAccent(stored) ? stored : 'red';
  }
}
