import { Component, computed, inject, input } from '@angular/core';
import { I18n } from '../../../core/i18n/i18n';
import { PhaseKind } from '../model/timer-plan';
import { TimerSettings } from '../model/timer-settings';

interface Segment {
  readonly kind: PhaseKind;
  readonly seconds: number;
  /** Interval parts within a round; 1 when rounds aren't split. */
  readonly parts: number;
}

/** Proportional bar of the workout's phases. Purely visual; `label` describes it for assistive tech. */
@Component({
  selector: 'app-workout-timeline',
  template: `
    <div class="bar">
      @for (segment of segments(); track $index) {
        <span
          class="segment segment--{{ segment.kind }}"
          [class.segment--split]="segment.parts > 1 && segment.parts <= maxVisibleParts"
          [style.flex-grow]="segment.seconds"
          [style.--parts]="segment.parts"
        ></span>
      }
    </div>
    <div class="legend" aria-hidden="true">
      @for (kind of kinds(); track kind) {
        <span class="legend-item">
          <span class="dot segment--{{ kind }}"></span>
          {{ legendLabels()[kind] }}
        </span>
      }
    </div>
  `,
  host: { role: 'img', '[attr.aria-label]': 'label()' },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .bar {
      display: flex;
      gap: 2px;
      height: 1.5rem;
      overflow: hidden;
      border-radius: var(--radius-small);
    }
    .segment {
      flex-basis: 0;
      min-width: 3px;
    }
    .segment--prep {
      background-color: var(--phase-prep-bg);
    }
    .segment--work {
      background-color: var(--phase-work-bg);
    }
    .segment--rest {
      background-color: var(--phase-rest-bg);
    }
    // A thin line at the end of every interval part.
    .segment--split {
      background-image: linear-gradient(
        to left,
        color-mix(in srgb, var(--phase-work-fg) 70%, transparent) 2px,
        transparent 2px
      );
      background-size: calc(100% / var(--parts)) 100%;
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 1rem;
      color: var(--color-text-muted);
      font-size: 0.875rem;
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
    }
    .dot {
      width: 0.75rem;
      height: 0.75rem;
      border-radius: 50%;
    }
  `,
})
export class WorkoutTimeline {
  readonly settings = input.required<TimerSettings>();
  readonly label = input.required<string>();

  private readonly t = inject(I18n).t;
  /** More interval lines than this would blur into stripes. */
  protected readonly maxVisibleParts = 20;

  protected readonly segments = computed(() => {
    const settings = this.settings();
    const segments: Segment[] = [];
    if (settings.prepSeconds > 0) {
      segments.push({ kind: 'prep', seconds: settings.prepSeconds, parts: 1 });
    }
    const parts =
      settings.intervalSeconds > 0 ? settings.workSeconds / settings.intervalSeconds : 1;
    for (let round = 1; round <= settings.rounds; round++) {
      segments.push({ kind: 'work', seconds: settings.workSeconds, parts: Math.round(parts) });
      if (round < settings.rounds && settings.breakSeconds > 0) {
        segments.push({ kind: 'rest', seconds: settings.breakSeconds, parts: 1 });
      }
    }
    return segments;
  });

  protected readonly kinds = computed(() => [
    ...new Set(this.segments().map((segment) => segment.kind)),
  ]);

  protected readonly legendLabels = computed(() => {
    const t = this.t();
    return { prep: t.timer.prep, work: t.run.work, rest: t.timer.rest } as const;
  });
}
