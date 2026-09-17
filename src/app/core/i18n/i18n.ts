import { DOCUMENT, Service, computed, effect, inject, signal } from '@angular/core';
import { LocalStorage } from '../storage/local-storage';
import { Translations, de } from './de';
import { en } from './en';
import { DEFAULT_LANGUAGE, LOCALES, Language, isLanguage } from './language';

export const LANGUAGE_STORAGE_KEY = 'language';

const TRANSLATIONS: Readonly<Record<Language, Translations>> = { de, en };

/**
 * Runtime language switching. Templates read `t()` so every text re-renders when the language
 * changes, and keys are checked at compile time.
 */
@Service()
export class I18n {
  private readonly storage = inject(LocalStorage);
  private readonly document = inject(DOCUMENT);

  private readonly _language = signal(this.readStoredLanguage());

  readonly language = this._language.asReadonly();
  readonly locale = computed(() => LOCALES[this._language()]);
  readonly t = computed(() => TRANSLATIONS[this._language()]);

  constructor() {
    effect(() => {
      const language = this._language();
      this.document.documentElement.lang = language;
      this.storage.write(LANGUAGE_STORAGE_KEY, language);
    });
  }

  setLanguage(language: Language): void {
    this._language.set(language);
  }

  private readStoredLanguage(): Language {
    const stored = this.storage.read(LANGUAGE_STORAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  }
}
