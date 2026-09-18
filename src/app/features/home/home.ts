import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { I18n } from '../../core/i18n/i18n';
import { Icon } from '../../shared/icon/icon';
import { PageHeader } from '../../shared/page-header/page-header';
import { DESCRIPTION_FIT, TITLE_FIT, fitFontSize } from '../../shared/text-fit/fit-font-size';
import { groupFavorites } from '../sound-timer/model/favorite';
import {
  DEFAULT_TIMER_SETTINGS,
  TimerSettings,
  sameTimerSettings,
} from '../sound-timer/model/timer-settings';
import { settingsTitle, summarizeSettings } from '../sound-timer/model/timer-summary';
import { TimerPresets } from '../sound-timer/services/timer-presets';

@Component({
  selector: 'app-home',
  imports: [RouterLink, Icon, PageHeader],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly presets = inject(TimerPresets);
  private readonly router = inject(Router);

  protected readonly t = inject(I18n).t;

  /** Favorites by group; groups without favorites are left out. */
  protected readonly favoriteSections = computed(() => {
    const sections = groupFavorites(this.presets.favorites(), this.presets.groups());
    const hasGroups = sections.some((section) => section.group);
    return sections.map((section) => ({
      id: section.group?.id ?? '',
      // Ungrouped favorites only need a heading to set them apart from groups.
      heading: section.group?.name ?? (hasGroups ? this.t().presets.ungrouped : undefined),
      favorites: section.favorites.map((favorite) => ({
        id: favorite.id,
        title: favorite.name,
        titleSize: fitFontSize(favorite.name, TITLE_FIT),
        description: favorite.description,
        descriptionSize: fitFontSize(favorite.description, DESCRIPTION_FIT),
        summary: summarizeSettings(favorite.settings, this.t()),
        settings: favorite.settings,
      })),
    }));
  });

  /** Recently used configurations, without the ones already listed as a favorite. */
  protected readonly recent = computed(() => {
    const favorites = this.presets.favorites();
    return this.presets
      .history()
      .filter((entry) => !favorites.some((f) => sameTimerSettings(f.settings, entry.settings)))
      .map((entry) => ({
        id: entry.id,
        title: settingsTitle(entry.settings, this.t()),
        summary: summarizeSettings(entry.settings, this.t()),
        settings: entry.settings,
      }));
  });

  protected readonly isEmpty = computed(
    () => this.favoriteSections().length === 0 && this.recent().length === 0,
  );

  /** Opens the setup screen with this configuration, so it can be reviewed before starting. */
  protected open(settings: TimerSettings): void {
    this.presets.load(settings);
    void this.router.navigateByUrl('/timer');
  }

  protected createTimer(): void {
    this.presets.load(DEFAULT_TIMER_SETTINGS);
    void this.router.navigateByUrl('/timer');
  }
}
