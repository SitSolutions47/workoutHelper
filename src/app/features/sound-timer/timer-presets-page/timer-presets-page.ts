import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { formatClock } from '../../../core/format/format-clock';
import { Translations } from '../../../core/i18n/de';
import { I18n } from '../../../core/i18n/i18n';
import { BackNavigation } from '../../../core/navigation/back-navigation';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';
import { TimerSettings } from '../model/timer-settings';
import { Favorite, TimerPresets } from '../services/timer-presets';

function summarize(settings: TimerSettings, t: Translations): string {
  return t.presets.summary({
    rounds: settings.rounds,
    work: formatClock(settings.workSeconds),
    rest: formatClock(settings.breakSeconds),
    minGap: settings.minGapSeconds,
    maxGap: settings.maxGapSeconds,
    sounds: settings.soundIds.length,
  });
}

@Component({
  selector: 'app-timer-presets-page',
  imports: [Icon, PageHeader],
  templateUrl: './timer-presets-page.html',
  styleUrl: './timer-presets-page.scss',
})
export class TimerPresetsPage {
  private readonly presets = inject(TimerPresets);
  private readonly i18n = inject(I18n);
  private readonly backNavigation = inject(BackNavigation);
  private readonly injector = inject(Injector);

  protected readonly t = this.i18n.t;

  protected readonly favorites = computed(() =>
    this.presets.favorites().map((favorite) => ({
      favorite,
      summary: summarize(favorite.settings, this.t()),
    })),
  );

  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.i18n.locale(), { dateStyle: 'medium', timeStyle: 'short' }),
  );
  protected readonly history = computed(() =>
    this.presets.history().map((entry) => ({
      entry,
      summary: summarize(entry.settings, this.t()),
      usedAt: this.dateFormat().format(entry.usedAt),
    })),
  );

  /** Last deleted favorite, offered for undo until dismissed. */
  protected readonly removed = signal<{ favorite: Favorite; index: number } | undefined>(undefined);

  private readonly undoButton = viewChild<ElementRef<HTMLButtonElement>>('undoButton');
  private readonly favoritesHeading = viewChild.required<ElementRef<HTMLElement>>('favoritesHeading');

  protected apply(settings: TimerSettings): void {
    this.presets.load(settings);
    this.backNavigation.back('/timer');
  }

  protected remove(favorite: Favorite): void {
    const index = this.presets.removeFavorite(favorite.id);
    if (index < 0) {
      return;
    }
    this.removed.set({ favorite, index });
    // The focused delete button is gone; continue from the undo action.
    afterNextRender(() => this.undoButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected undo(): void {
    const removed = this.removed();
    if (removed) {
      this.presets.restoreFavorite(removed.favorite, removed.index);
    }
    this.dismissUndo();
  }

  protected dismissUndo(): void {
    this.removed.set(undefined);
    afterNextRender(() => this.favoritesHeading().nativeElement.focus(), {
      injector: this.injector,
    });
  }
}
