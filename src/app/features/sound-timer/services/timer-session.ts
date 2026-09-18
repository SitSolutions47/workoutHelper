import { Service, computed, inject, signal } from '@angular/core';
import { SoundPlayer } from '../../../core/audio/sound-player';
import { I18n } from '../../../core/i18n/i18n';
import { ScreenWakeLock } from '../../../core/wake-lock/screen-wake-lock';
import { TimerCue, TimerPlan, buildTimerPlan, intervalAt, phaseAt } from '../model/timer-plan';
import { TimerSettings } from '../model/timer-settings';
import { SOUNDS_BY_ID, toPlayableSound } from '../sounds/sound-catalog';

const TICK_MS = 50;
/** Cues overdue by more than this (e.g. after the browser throttled the page) are skipped. */
const LATE_TOLERANCE_SECONDS = 1.5;

export type SessionStatus = 'idle' | 'loading' | 'running' | 'paused' | 'finished';

/** Runs a workout: tracks elapsed time against a {@link TimerPlan} and plays its cues. */
@Service()
export class TimerSession {
  private readonly player = inject(SoundPlayer);
  private readonly wakeLock = inject(ScreenWakeLock);
  private readonly i18n = inject(I18n);

  private readonly _status = signal<SessionStatus>('idle');
  private readonly _plan = signal<TimerPlan | undefined>(undefined);
  private readonly _elapsed = signal(0);
  private readonly _lastCallout = signal<TimerCue | undefined>(undefined);

  readonly status = this._status.asReadonly();
  readonly plan = this._plan.asReadonly();
  /** The most recent callout of the current round, for on-screen display. */
  readonly lastCallout = this._lastCallout.asReadonly();
  readonly phase = computed(() => {
    const plan = this._plan();
    return plan && phaseAt(plan, this._elapsed());
  });
  readonly phaseRemaining = computed(() => {
    const phase = this.phase();
    return phase ? phase.end - this._elapsed() : 0;
  });
  /** 0 at phase start, 1 at phase end. */
  readonly phaseProgress = computed(() => {
    const phase = this.phase();
    return phase ? (this._elapsed() - phase.start) / (phase.end - phase.start) : 1;
  });
  readonly totalRemaining = computed(() => (this._plan()?.duration ?? 0) - this._elapsed());
  /** Position within the round's intervals, while a round with intervals is running. */
  readonly interval = computed(() => {
    const plan = this._plan();
    const phase = this.phase();
    return plan && phase ? intervalAt(plan, phase, this._elapsed()) : undefined;
  });
  /** Whole seconds left while the end of the current phase is being counted down. */
  readonly countdown = computed(() => {
    const countdownSeconds = this._plan()?.countdownSeconds ?? 0;
    // Rounded up like the clock, so the value changes exactly when a countdown cue plays.
    const secondsLeft = Math.ceil(this.phaseRemaining() - 0.001);
    return this.phase() && secondsLeft >= 1 && secondsLeft <= countdownSeconds
      ? secondsLeft
      : undefined;
  });

  private settings: TimerSettings | undefined;
  private elapsedBeforeResume = 0;
  private resumedAt = 0;
  private nextCueIndex = 0;
  private tickHandle: ReturnType<typeof setInterval> | undefined;
  /** Incremented on stop, so a start still waiting for sounds to load is abandoned. */
  private runId = 0;

  /**
   * Starts a new workout. Call this directly from a tap handler: mobile browsers only allow audio
   * that was unlocked by a user gesture.
   */
  async start(settings: TimerSettings): Promise<void> {
    this.stop();
    this.player.unlock();
    const runId = this.runId;
    const plan = buildTimerPlan(settings);
    this.settings = settings;
    this._plan.set(plan);
    this._status.set('loading');

    await this.player.preload(this.soundsFor(plan));
    if (runId === this.runId) {
      this.resume();
    }
  }

  restart(): void {
    if (this.settings) {
      void this.start(this.settings);
    }
  }

  pause(): void {
    if (this._status() !== 'running') {
      return;
    }
    this.elapsedBeforeResume = this.currentElapsed();
    this.clearTick();
    this._status.set('paused');
  }

  resume(): void {
    const status = this._status();
    if (status !== 'paused' && status !== 'loading') {
      return;
    }
    this.resumedAt = performance.now();
    this._status.set('running');
    this.tickHandle = setInterval(() => this.tick(), TICK_MS);
    void this.wakeLock.request();
    this.tick();
  }

  togglePause(): void {
    if (this._status() === 'running') {
      this.pause();
    } else {
      this.resume();
    }
  }

  /** Jumps to the next phase. Callouts in the skipped part stay silent; bells at the boundary play. */
  skipPhase(): void {
    const plan = this._plan();
    const phase = this.phase();
    const status = this._status();
    if (!plan || !phase || (status !== 'running' && status !== 'paused')) {
      return;
    }
    this.elapsedBeforeResume = phase.end;
    this.resumedAt = performance.now();
    this._elapsed.set(phase.end);
    this._lastCallout.set(undefined);
    while (this.nextCueIndex < plan.cues.length && plan.cues[this.nextCueIndex].at < phase.end) {
      this.nextCueIndex++;
    }
    if (status === 'running' || phase.end >= plan.duration) {
      this.tick();
    }
  }

  stop(): void {
    this.runId++;
    this.clearTick();
    this.elapsedBeforeResume = 0;
    this.nextCueIndex = 0;
    this._elapsed.set(0);
    this._lastCallout.set(undefined);
    this._plan.set(undefined);
    this._status.set('idle');
    void this.wakeLock.release();
  }

  private tick(): void {
    const plan = this._plan();
    if (!plan) {
      return;
    }
    const elapsed = Math.min(this.currentElapsed(), plan.duration);
    this._elapsed.set(elapsed);
    this.playDueCues(plan, elapsed);
    if (elapsed >= plan.duration) {
      this.finish(plan);
    }
  }

  private playDueCues(plan: TimerPlan, elapsed: number): void {
    const language = this.i18n.language();
    while (this.nextCueIndex < plan.cues.length && plan.cues[this.nextCueIndex].at <= elapsed) {
      const cue = plan.cues[this.nextCueIndex++];
      const sound = SOUNDS_BY_ID.get(cue.soundId);
      if (!sound || elapsed - cue.at > LATE_TOLERANCE_SECONDS) {
        continue;
      }
      this.player.play(toPlayableSound(sound, language));
      this._lastCallout.set(cue.kind === 'callout' ? cue : undefined);
    }
  }

  private finish(plan: TimerPlan): void {
    this.clearTick();
    this.elapsedBeforeResume = plan.duration;
    this._status.set('finished');
    void this.wakeLock.release();
  }

  private currentElapsed(): number {
    return this._status() === 'running'
      ? this.elapsedBeforeResume + (performance.now() - this.resumedAt) / 1000
      : this.elapsedBeforeResume;
  }

  private clearTick(): void {
    clearInterval(this.tickHandle);
    this.tickHandle = undefined;
  }

  private soundsFor(plan: TimerPlan) {
    const language = this.i18n.language();
    const ids = new Set(plan.cues.map((cue) => cue.soundId));
    return [...ids]
      .map((id) => SOUNDS_BY_ID.get(id))
      .filter((sound) => sound !== undefined)
      .map((sound) => toPlayableSound(sound, language));
  }
}
