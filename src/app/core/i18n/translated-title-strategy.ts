import { Injectable, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { Translations } from './de';
import { I18n } from './i18n';

export type PageTitleKey = keyof Translations['pageTitles'];

/**
 * Routes declare a {@link PageTitleKey} as `title`; the document title shows its translation and
 * follows language changes.
 */
@Injectable()
export class TranslatedTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly i18n = inject(I18n);
  private readonly pageKey = signal<PageTitleKey | undefined>(undefined);

  constructor() {
    super();
    effect(() => {
      const t = this.i18n.t();
      const key = this.pageKey();
      this.title.setTitle(key ? `${t.pageTitles[key]} · ${t.app.name}` : t.app.name);
    });
  }

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    this.pageKey.set(key && this.isPageTitleKey(key) ? key : undefined);
  }

  private isPageTitleKey(key: string): key is PageTitleKey {
    return key in this.i18n.t().pageTitles;
  }
}
