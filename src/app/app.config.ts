import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { TitleStrategy, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { I18n } from './core/i18n/i18n';
import { TranslatedTitleStrategy } from './core/i18n/translated-title-strategy';
import { Theme } from './core/theme/theme';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
    // Apply the stored language and theme to the document before the first page renders.
    provideAppInitializer(() => {
      inject(I18n);
      inject(Theme);
    }),
  ],
};
