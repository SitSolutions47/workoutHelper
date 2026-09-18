import { Component, inject } from '@angular/core';
import { I18n } from '../../core/i18n/i18n';
import { LANGUAGES, LANGUAGE_NAMES } from '../../core/i18n/language';
import { THEME_ACCENTS, THEME_PREFERENCES, Theme } from '../../core/theme/theme';
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

      <fieldset class="card options">
        <legend class="section-heading">{{ t().settings.accent }}</legend>
        <div class="accents">
          @for (accent of themeAccents; track accent) {
            <!-- data-accent scopes that scheme's colors to the option, as a preview. -->
            <label class="accent" [attr.data-accent]="accent">
              <input
                type="radio"
                name="accent"
                class="visually-hidden"
                [value]="accent"
                [checked]="theme.accent() === accent"
                (change)="theme.setAccent(accent)"
              />
              <span class="swatches" aria-hidden="true">
                <span class="swatch swatch--work"></span>
                <span class="swatch swatch--rest"></span>
                <span class="swatch swatch--prep"></span>
              </span>
              <span class="accent-name">{{ t().settings.accentOptions[accent] }}</span>
            </label>
          }
        </div>
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
    .accents {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
      gap: 0.5rem;
    }
    .accent {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.75rem;
      border: 2px solid var(--color-control-border);
      border-radius: var(--radius-small);
      cursor: pointer;

      &:has(input:checked) {
        border-color: var(--color-accent);
        background: var(--color-accent-soft);
        font-weight: 700;
      }
      &:has(input:focus-visible) {
        outline: 3px solid var(--color-focus);
        outline-offset: 2px;
      }
    }
    .swatches {
      display: flex;
      height: 1.5rem;
      overflow: hidden;
      border-radius: 999px;
    }
    .swatch {
      flex: 1;
    }
    .swatch--work {
      flex: 2;
      background: var(--phase-work-bg);
    }
    .swatch--rest {
      background: var(--phase-rest-bg);
    }
    .swatch--prep {
      background: var(--phase-prep-bg);
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
  protected readonly themeAccents = THEME_ACCENTS;
}
