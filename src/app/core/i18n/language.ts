export const LANGUAGES = ['de', 'en'] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'de';

/** BCP 47 locale per language, used for number/date formatting and speech synthesis. */
export const LOCALES: Readonly<Record<Language, string>> = {
  de: 'de-DE',
  en: 'en-US',
};

/** Each language is named in its own language so it stays recognizable whatever the UI language. */
export const LANGUAGE_NAMES: Readonly<Record<Language, string>> = {
  de: 'Deutsch',
  en: 'English',
};

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}
