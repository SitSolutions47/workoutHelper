import { Component, DestroyRef, computed, inject, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { I18n } from '../../core/i18n/i18n';
import { Icon } from '../icon/icon';

const HOLD_DELAY_MS = 400;
const REPEAT_INTERVAL_MS = 70;
const PAGE_STEPS = 10;

let nextId = 0;

/**
 * Number input built for touch: large −/+ buttons that auto-repeat while held.
 * Follows the ARIA spinbutton pattern (arrow keys, Page Up/Down, Home/End) for keyboard and
 * screen reader users. `min` and `max` are bound from the form schema by `[formField]`.
 */
@Component({
  selector: 'app-stepper',
  imports: [Icon],
  template: `
    <span class="label" [id]="labelId">{{ label() }}</span>
    <div class="control">
      <button
        type="button"
        class="step"
        tabindex="-1"
        [attr.aria-label]="t().common.decrease(label())"
        [disabled]="!canDecrease()"
        (click)="onClick(-1)"
        (pointerdown)="startHold(-1, $event)"
        (pointerup)="stopHold()"
        (pointerleave)="stopHold()"
        (pointercancel)="stopHold()"
        (contextmenu)="$event.preventDefault()"
      >
        <app-icon name="remove" />
      </button>
      <span
        class="value"
        role="spinbutton"
        tabindex="0"
        [attr.aria-labelledby]="labelId"
        [attr.aria-valuenow]="value()"
        [attr.aria-valuemin]="min()"
        [attr.aria-valuemax]="max()"
        [attr.aria-valuetext]="valueText()(value())"
        (keydown)="onKeydown($event)"
        (blur)="touch.emit()"
        >{{ format()(value()) }}</span
      >
      <button
        type="button"
        class="step"
        tabindex="-1"
        [attr.aria-label]="t().common.increase(label())"
        [disabled]="!canIncrease()"
        (click)="onClick(1)"
        (pointerdown)="startHold(1, $event)"
        (pointerup)="stopHold()"
        (pointerleave)="stopHold()"
        (pointercancel)="stopHold()"
        (contextmenu)="$event.preventDefault()"
      >
        <app-icon name="add" />
      </button>
    </div>
  `,
  styleUrl: './stepper.scss',
})
export class Stepper implements FormValueControl<number> {
  readonly value = model(0);
  readonly min = input<number>();
  readonly max = input<number>();
  readonly touch = output<void>();

  readonly label = input.required<string>();
  readonly step = input(1);
  /** Visible value, e.g. `3:00`. */
  readonly format = input<(value: number) => string>(String);
  /** Spoken value, e.g. `3 Minuten`. */
  readonly valueText = input<(value: number) => string>(String);

  protected readonly t = inject(I18n).t;
  protected readonly labelId = `stepper-label-${nextId++}`;
  protected readonly canDecrease = computed(() => this.value() > (this.min() ?? -Infinity));
  protected readonly canIncrease = computed(() => this.value() < (this.max() ?? Infinity));

  private holdTimeout: ReturnType<typeof setTimeout> | undefined;
  private repeatInterval: ReturnType<typeof setInterval> | undefined;
  /** Set once a hold auto-repeats, so the click that ends the hold doesn't add another step. */
  private held = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopHold());
  }

  protected onClick(direction: 1 | -1): void {
    if (this.held) {
      this.held = false;
      return;
    }
    this.stepBy(direction);
    this.touch.emit();
  }

  protected startHold(direction: 1 | -1, event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }
    this.stopHold();
    this.held = false;
    this.holdTimeout = setTimeout(() => {
      this.held = true;
      this.repeatInterval = setInterval(() => {
        if (!this.stepBy(direction)) {
          this.stopHold();
        }
      }, REPEAT_INTERVAL_MS);
    }, HOLD_DELAY_MS);
  }

  protected stopHold(): void {
    clearTimeout(this.holdTimeout);
    clearInterval(this.repeatInterval);
    this.holdTimeout = undefined;
    this.repeatInterval = undefined;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const handled = this.handleKey(event.key);
    if (handled) {
      event.preventDefault();
    }
  }

  private handleKey(key: string): boolean {
    switch (key) {
      case 'ArrowUp':
      case 'ArrowRight':
        this.stepBy(1);
        return true;
      case 'ArrowDown':
      case 'ArrowLeft':
        this.stepBy(-1);
        return true;
      case 'PageUp':
        this.stepBy(PAGE_STEPS);
        return true;
      case 'PageDown':
        this.stepBy(-PAGE_STEPS);
        return true;
      case 'Home':
        this.setClamped(this.min());
        return true;
      case 'End':
        this.setClamped(this.max());
        return true;
      default:
        return false;
    }
  }

  /** Returns whether the value changed. */
  private stepBy(steps: number): boolean {
    return this.setClamped(this.value() + steps * this.step());
  }

  private setClamped(target: number | undefined): boolean {
    if (target === undefined) {
      return false;
    }
    const lower = this.min() ?? -Infinity;
    const upper = this.max() ?? Infinity;
    // Rounding avoids float drift such as 0.1 + 0.2 when stepping by fractions.
    const next = Math.round(Math.min(upper, Math.max(lower, target)) * 1000) / 1000;
    if (next === this.value()) {
      return false;
    }
    this.value.set(next);
    return true;
  }
}
