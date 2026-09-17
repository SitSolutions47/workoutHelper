import { Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { formatClock } from '../../../core/format/format-clock';
import { I18n } from '../../../core/i18n/i18n';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';
import { Stepper } from '../../../shared/stepper/stepper';
import { TIMER_LIMITS, timerSettingsSchema, workoutDuration } from '../model/timer-settings';
import { SaveFavoriteDialog } from '../save-favorite-dialog/save-favorite-dialog';
import { TimerPresets } from '../services/timer-presets';
import { TimerSession } from '../services/timer-session';
import { SoundPicker } from '../sound-picker/sound-picker';

const STATUS_MESSAGE_MS = 4000;

@Component({
  selector: 'app-timer-setup',
  imports: [FormField, RouterLink, Icon, PageHeader, Stepper, SoundPicker, SaveFavoriteDialog],
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
  protected readonly settingsForm = form(this.presets.draft, timerSettingsSchema);
  protected readonly totalDuration = computed(() =>
    formatClock(workoutDuration(this.presets.draft())),
  );
  protected readonly statusMessage = signal('');

  private readonly saveDialog = viewChild.required(SaveFavoriteDialog);
  private statusTimeout: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.statusTimeout));
  }

  protected start(): void {
    if (this.settingsForm().invalid()) {
      return;
    }
    const settings = this.presets.draft();
    this.presets.recordUsage(settings);
    // Must run inside the tap handler so the browser allows audio playback.
    void this.session.start(settings);
    void this.router.navigateByUrl('/timer/run');
  }

  protected openSaveDialog(): void {
    const settings = this.presets.draft();
    this.saveDialog().open(
      this.t().presets.defaultName(settings.rounds, formatClock(settings.workSeconds)),
    );
  }

  protected saveFavorite(name: string): void {
    this.presets.addFavorite(name, this.presets.draft());
    this.statusMessage.set(this.t().timer.favoriteSaved(name));
    clearTimeout(this.statusTimeout);
    this.statusTimeout = setTimeout(() => this.statusMessage.set(''), STATUS_MESSAGE_MS);
  }
}
