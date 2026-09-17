import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n/i18n';
import { Icon } from '../../shared/icon/icon';
import { PageHeader } from '../../shared/page-header/page-header';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon, PageHeader],
  template: `
    <app-page-header [heading]="t().app.name">
      <a class="icon-button" routerLink="/settings" [attr.aria-label]="t().settings.heading">
        <app-icon name="settings" />
      </a>
    </app-page-header>

    <main class="page">
      <h2 class="section-heading">{{ t().home.toolsHeading }}</h2>
      <ul class="tools" role="list">
        <li>
          <a class="tool card" routerLink="/timer">
            <span class="tool-icon"><app-icon name="timer" /></span>
            <span class="tool-text">
              <span class="tool-name">{{ t().home.timerName }}</span>
              <span class="tool-description">{{ t().home.timerDescription }}</span>
            </span>
            <app-icon name="chevron-right" />
          </a>
        </li>
      </ul>
    </main>
  `,
  styles: `
    .tools {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .tool {
      display: flex;
      align-items: center;
      gap: 1rem;
      color: inherit;
      text-decoration: none;
    }
    .tool-icon {
      display: inline-flex;
      padding: 0.75rem;
      border-radius: 50%;
      background: var(--color-accent);
      color: var(--color-on-accent);
    }
    .tool-text {
      display: flex;
      flex: 1;
      flex-direction: column;
      gap: 0.25rem;
    }
    .tool-name {
      font-size: 1.125rem;
      font-weight: 700;
    }
    .tool-description {
      color: var(--color-text-muted);
      font-size: 0.9375rem;
    }
  `,
})
export class Home {
  protected readonly t = inject(I18n).t;
}
