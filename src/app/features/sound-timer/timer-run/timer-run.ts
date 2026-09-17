import {
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  viewChild,
} from '@angular/core';
import { formatClock } from '../../../core/format/format-clock';
import { I18n } from '../../../core/i18n/i18n';
import { BackNavigation } from '../../../core/navigation/back-navigation';
import { Icon } from '../../../shared/icon/icon';
import { TimerSession } from '../services/timer-session';
import { SOUNDS_BY_ID } from '../sounds/sound-catalog';

/** Full-screen workout view. Leaving the page ends the workout. */
@Component({
  selector: 'app-timer-run',
  imports: [Icon],
  templateUrl: './timer-run.html',
  styleUrl: './timer-run.scss',
  host: { '[class]': `'phase-' + phaseKind()` },
})
export class TimerRun {
  private readonly i18n = inject(I18n);
  private readonly backNavigation = inject(BackNavigation);
  protected readonly session = inject(TimerSession);
  protected readonly t = this.i18n.t;

  protected readonly status = this.session.status;
  protected readonly phaseKind = computed(() =>
    this.status() === 'finished' ? 'done' : (this.session.phase()?.kind ?? 'prep'),
  );

  protected readonly heading = computed(() => {
    const t = this.t().run;
    switch (this.phaseKind()) {
      case 'done':
        return t.finished;
      case 'work':
        return t.work;
      case 'rest':
        return t.rest;
      default:
        return t.prep;
    }
  });

  protected readonly detail = computed(() => {
    const t = this.t().run;
    const rounds = this.session.plan()?.rounds ?? 0;
    const phase = this.session.phase();
    if (this.status() === 'finished') {
      return t.finishedDetail(rounds);
    }
    if (!phase) {
      return '';
    }
    return phase.kind === 'work'
      ? t.roundOf(phase.round, rounds)
      : t.nextRound(phase.kind === 'rest' ? phase.round + 1 : 1, rounds);
  });

  /** Spoken on phase changes only; the ticking clock itself is not announced. */
  protected readonly announcement = computed(() => {
    switch (this.status()) {
      case 'loading':
        return this.t().run.loading;
      case 'paused':
        return this.t().run.paused;
      default:
        return `${this.heading()}. ${this.detail()}`;
    }
  });

  protected readonly clock = computed(() =>
    // Rounded up so a phase shows 3:00 at its start and 0:00 only when it's over.
    formatClock(Math.ceil(this.session.phaseRemaining() - 0.001)),
  );
  protected readonly totalRemaining = computed(() =>
    formatClock(Math.ceil(this.session.totalRemaining() - 0.001)),
  );
  protected readonly progressTransform = computed(
    () => `scaleX(${Math.min(1, Math.max(0, this.session.phaseProgress()))})`,
  );

  protected readonly callout = computed(() => {
    const cue = this.session.lastCallout();
    const sound = cue && SOUNDS_BY_ID.get(cue.soundId);
    return cue && sound
      ? { at: cue.at, label: sound.label[this.i18n.language()], swatch: sound.swatch }
      : undefined;
  });

  private readonly againButton = viewChild<ElementRef<HTMLButtonElement>>('againButton');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.session.stop());
    // Once finished, the pause button is gone; move focus to the next likely action.
    afterRenderEffect(() => this.againButton()?.nativeElement.focus());
  }

  protected leave(): void {
    this.backNavigation.back('/timer');
  }
}
