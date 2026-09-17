import { Component, inject } from '@angular/core';
import { I18n } from '../../core/i18n/i18n';
import { LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n/language';
import { THEME_PREFERENCES, Theme } from '../../core/theme/theme';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'app-settings',
  imports: [PageHeader],
  template: `
    <app-page-header [heading]="t().settings.heading" backLink="/" />

    <main class="page">
      <fieldset class="card options">
        <legend class="section-heading">{{ t().settings.language }}</legend>
        @for (language of languages; track language) {
          <label class="option">
            <input
              type="radio"
              name="language"
              [value]="language"
              [checked]="i18n.language() === language"
              (change)="i18n.setLanguage(language)"
            />
            <span [lang]="language">{{ languageNames[language] }}</span>
          </label>
        }
        <p class="hint">{{ t().settings.languageHint }}</p>
      </fieldset>

      <fieldset class="card options">
        <legend class="section-heading">{{ t().settings.theme }}</legend>
        @for (preference of themePreferences; track preference) {
          <label class="option">
            <input
              type="radio"
              name="theme"
              [value]="preference"
              [checked]="theme.preference() === preference"
              (change)="theme.setPreference(preference)"
            />
            <span>{{ t().settings.themeOptions[preference] }}</span>
          </label>
        }
      </fieldset>
    </main>
  `,
  styles: `
    .options {
      margin: 0;
      border: 0;
      min-width: 0;
    }
    .options legend {
      float: left;
      width: 100%;
      margin-bottom: 0.5rem;
      padding: 0;

      & + * {
        clear: both;
      }
    }
    .option {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-height: 3rem;
      cursor: pointer;
    }
    .option input {
      width: 1.375rem;
      height: 1.375rem;
      margin: 0;
      accent-color: var(--color-accent);
    }
    .hint {
      margin-top: 0.5rem;
    }
  `,
})
export class Settings {
  protected readonly i18n = inject(I18n);
  protected readonly theme = inject(Theme);
  protected readonly t = this.i18n.t;
  protected readonly languages = LANGUAGES;
  protected readonly languageNames = LANGUAGE_NAMES;
  protected readonly themePreferences = THEME_PREFERENCES;
}
