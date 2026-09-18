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
    if (phase.kind !== 'work') {
      return t.nextRound(phase.kind === 'rest' ? phase.round + 1 : 1, rounds);
    }
    const interval = this.session.interval();
    const round = t.roundOf(phase.round, rounds);
    return interval ? `${round} · ${t.intervalOf(interval.index, interval.count)}` : round;
  });

  /** Time to the next interval switch; not announced, like the clock. */
  protected readonly nextSwitch = computed(() => {
    const interval = this.session.interval();
    return interval && interval.index < interval.count && this.status() !== 'finished'
      ? this.t().run.nextSwitch(formatClock(Math.ceil(interval.remaining - 0.001)))
      : '';
  });

  protected readonly countdown = this.session.countdown;

  /** Changes on every interval switch after the first, to replay the switch flash. */
  protected readonly switchFlash = computed(() => {
    const interval = this.session.interval();
    return interval && interval.index > 1 ? [interval.index] : [];
  });

  /** Positions of interval switches on the progress bar, in percent. */
  protected readonly intervalMarks = computed(() => {
    const interval = this.session.interval();
    return interval
      ? Array.from({ length: interval.count - 1 }, (_, i) => ((i + 1) / interval.count) * 100)
      : [];
  });

  protected readonly roundDots = computed(() => {
    const rounds = this.session.plan()?.rounds ?? 0;
    const phase = this.session.phase();
    const finished = this.status() === 'finished';
    return Array.from({ length: rounds }, (_, i) => {
      const round = i + 1;
      if (
        finished ||
        (phase && (round < phase.round || (round === phase.round && phase.kind === 'rest')))
      ) {
        return 'done';
      }
      return phase?.kind === 'work' && round === phase.round ? 'current' : 'todo';
    });
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
