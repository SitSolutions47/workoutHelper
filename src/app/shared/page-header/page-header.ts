import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n/i18n';
import { Icon } from '../icon/icon';

/** Sticky page header. Projected content is rendered as trailing actions. */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink, Icon],
  template: `
    <header class="bar">
      @if (backLink(); as link) {
        <a class="icon-button" [routerLink]="link" [attr.aria-label]="t().common.back">
          <app-icon name="arrow-back" />
        </a>
      }
      <!-- Focused after navigation so screen readers announce the new page. -->
      <h1 class="title" tabindex="-1" [class.title--inset]="!backLink()">{{ heading() }}</h1>
      <div class="actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    :host {
      display: block;
      position: sticky;
      top: 0;
      z-index: 10;
      padding-top: env(safe-area-inset-top, 0px);
      background: var(--color-bg);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      max-width: 40rem;
      min-height: 3.5rem;
      margin: 0 auto;
      padding: 0 0.5rem;
    }
    .title {
      flex: 1;
      min-width: 0;
      font-size: 1.25rem;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .title--inset {
      padding-left: 0.5rem;
    }
    .actions {
      display: flex;
    }
  `,
})
export class PageHeader {
  readonly heading = input.required<string>();
  readonly backLink = input<string>();

  protected readonly t = inject(I18n).t;
}
