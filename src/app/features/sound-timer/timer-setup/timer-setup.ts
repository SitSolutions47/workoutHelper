import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { formatClock } from '../../../core/format/format-clock';
import { I18n } from '../../../core/i18n/i18n';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';
import { SelectField, SelectOption } from '../../../shared/select-field/select-field';
import { Stepper } from '../../../shared/stepper/stepper';
import { FavoriteDialog, FavoriteDialogResult } from '../favorite-dialog/favorite-dialog';
import {
  TIMER_LIMITS,
  intervalOptions,
  timerSettingsSchema,
  workoutDuration,
} from '../model/timer-settings';
import { settingsTitle, summarizeSettings } from '../model/timer-summary';
import { TimerPresets } from '../services/timer-presets';
import { TimerSession } from '../services/timer-session';
import { SignalSelect } from '../signal-select/signal-select';
import { SoundPicker } from '../sound-picker/sound-picker';
import { WorkoutTimeline } from '../workout-timeline/workout-timeline';

const STATUS_MESSAGE_MS = 4000;

@Component({
  selector: 'app-timer-setup',
  imports: [
    FormField,
    RouterLink,
    Icon,
    PageHeader,
    SelectField,
    Stepper,
    SoundPicker,
    SignalSelect,
    WorkoutTimeline,
    FavoriteDialog,
  ],
  templateUrl: './timer-setup.html',
  styleUrl: './timer-setup.scss',
})
export class TimerSetup {
  private readonly presets = inject(TimerPresets);
  private readonly session = inject(TimerSession);
  private readonly router = inject(Router);

  protected readonly t = inject(I18n).t;
  protected readonly limits = TIMER_LIMITS;
  protected readonly formatClock = formatClock;
  protected readonly draft = this.presets.draft;
  protected readonly settingsForm = form(this.presets.draft, timerSettingsSchema);
  protected readonly totalDuration = computed(() => formatClock(workoutDuration(this.draft())));
  protected readonly timelineLabel = computed(() =>
    this.t().timer.timeline(summarizeSettings(this.draft(), this.t()), this.totalDuration()),
  );
  protected readonly statusMessage = signal('');

  /** Every interval that splits the round evenly; an unfitting current value stays visible. */
  protected readonly intervalOptions = computed<SelectOption<number>[]>(() => {
    const t = this.t().timer;
    const { workSeconds, intervalSeconds } = this.draft();
    const options: SelectOption<number>[] = [
      { value: 0, label: t.off },
      ...intervalOptions(workSeconds).map((seconds) => ({
        value: seconds,
        label: t.intervalOption(formatClock(seconds), workSeconds / seconds),
      })),
    ];
    if (!options.some((option) => option.value === intervalSeconds)) {
      options.push({
        value: intervalSeconds,
        label: t.intervalUnfit(formatClock(intervalSeconds)),
      });
    }
    return options;
  });
  protected readonly intervalInvalid = computed(() =>
    this.settingsForm.intervalSeconds().invalid(),
  );

  private readonly favoriteDialog = viewChild.required(FavoriteDialog);
  private statusTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.statusTimeout));
  }

  protected start(): void {
    if (this.settingsForm().invalid()) {
      return;
    }
    const settings = this.draft();
    this.presets.recordUsage(settings);
    // Must run inside the tap handler so the browser allows audio playback.
    void this.session.start(settings);
    void this.router.navigateByUrl('/timer/run');
  }

  protected openSaveDialog(): void {
    this.favoriteDialog().open(
      { name: settingsTitle(this.draft(), this.t()), description: '' },
      'create',
    );
  }

  protected saveFavorite(result: FavoriteDialogResult): void {
    this.presets.addFavorite(result.name, this.draft(), {
      description: result.description,
      groupId: this.presets.resolveGroup(result.group),
    });
    this.statusMessage.set(this.t().timer.favoriteSaved(result.name));
    clearTimeout(this.statusTimeout);
    this.statusTimeout = setTimeout(() => this.statusMessage.set(''), STATUS_MESSAGE_MS);
  }
}
