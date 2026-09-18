import { Component, computed, inject, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { SoundPlayer } from '../../../core/audio/sound-player';
import { I18n } from '../../../core/i18n/i18n';
import { Icon } from '../../../shared/icon/icon';
import { SelectField, SelectOption } from '../../../shared/select-field/select-field';
import { SignalEvent, signalChoices } from '../model/timer-settings';
import {
  NO_SOUND,
  SOUNDS_BY_ID,
  SPOKEN_COUNTDOWN,
  countdownSoundId,
  toPlayableSound,
} from '../sounds/sound-catalog';

/** Picks the sound for one timer event, with a button to hear it first. */
@Component({
  selector: 'app-signal-select',
  imports: [SelectField, Icon],
  template: `
    <app-select-field
      class="signal-field"
      [label]="label()"
      [options]="options()"
      [(value)]="value"
      (touch)="touch.emit()"
    />
    <button
      type="button"
      class="icon-button preview"
      [attr.aria-label]="t().timer.previewSignal(label())"
      [disabled]="value() === none"
      (click)="preview()"
    >
      <app-icon name="volume-up" />
    </button>
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .signal-field {
      flex: 1;
      min-width: 0;
    }
    .preview {
      margin-right: -0.5rem;

      &:disabled {
        color: var(--color-text-disabled);
        cursor: default;
      }
    }
  `,
})
export class SignalSelect implements FormValueControl<string> {
  readonly value = model(NO_SOUND);
  readonly touch = output<void>();
  readonly event = input.required<SignalEvent>();

  private readonly i18n = inject(I18n);
  private readonly player = inject(SoundPlayer);
  protected readonly t = this.i18n.t;
  protected readonly none = NO_SOUND;

  protected readonly label = computed(() => this.t().timer.signals[this.event()]);
  protected readonly options = computed<SelectOption<string>[]>(() => {
    const t = this.t().sounds;
    const language = this.i18n.language();
    return signalChoices(this.event()).map((id) => ({
      value: id,
      label:
        id === NO_SOUND
          ? t.none
          : id === SPOKEN_COUNTDOWN
            ? t.spokenCountdown
            : (SOUNDS_BY_ID.get(id)?.label[language] ?? id),
    }));
  });

  protected preview(): void {
    // Spoken countdowns are previewed with the number heard first in a 3-second countdown.
    const sound = SOUNDS_BY_ID.get(countdownSoundId(this.value(), 3));
    if (!sound) {
      return;
    }
    // Unlocking must happen inside the tap handler, before anything async.
    this.player.unlock();
    const playable = toPlayableSound(sound, this.i18n.language());
    void this.player.preload([playable]).then(() => this.player.play(playable));
  }
}
