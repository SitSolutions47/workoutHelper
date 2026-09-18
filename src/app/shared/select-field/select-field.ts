import { Component, input, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { Icon } from '../icon/icon';

export interface SelectOption<T> {
  readonly value: T;
  readonly label: string;
}

let nextId = 0;

/**
 * Labeled native select for values of any type. Options are addressed by index, so numbers and
 * strings work alike, and the selection stays correct when the option list changes.
 */
@Component({
  selector: 'app-select-field',
  imports: [Icon],
  template: `
    <label class="label" [for]="id">{{ label() }}</label>
    <span class="control">
      <select
        class="select"
        [id]="id"
        [disabled]="disabled()"
        [attr.aria-invalid]="invalid() || null"
        [attr.aria-describedby]="describedBy() || null"
        (change)="select($event)"
        (blur)="touch.emit()"
      >
        @for (option of options(); track $index) {
          <option [value]="$index" [selected]="option.value === value()">{{ option.label }}</option>
        }
      </select>
      <app-icon class="chevron" name="expand-more" />
    </span>
  `,
  host: { '[class.stacked]': 'stacked()' },
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      min-height: 3.5rem;
    }
    :host(.stacked) {
      flex-direction: column;
      align-items: stretch;
      gap: 0.375rem;
      min-height: 0;
      font-weight: 600;
    }
    .label {
      flex: 1;
      min-width: 0;
    }
    .control {
      position: relative;
      display: flex;
      min-width: 0;
      max-width: 60%;

      :host(.stacked) & {
        max-width: none;
      }
    }
    .select {
      width: 100%;
      min-height: 2.75rem;
      padding: 0 2.5rem 0 0.875rem;
      overflow: hidden;
      border: 2px solid var(--color-control-border);
      border-radius: var(--radius-small);
      background: var(--color-surface);
      // 16px minimum keeps iOS from zooming in on focus.
      font-size: 1rem;
      font-weight: 600;
      text-overflow: ellipsis;
      cursor: pointer;
      appearance: none;

      &[aria-invalid='true'] {
        border-color: var(--color-danger);
      }
      &:disabled {
        border-color: var(--color-border);
        color: var(--color-text-disabled);
        cursor: default;
      }
    }
    .chevron {
      position: absolute;
      top: 50%;
      right: 0.625rem;
      transform: translateY(-50%);
      pointer-events: none;
    }
  `,
})
export class SelectField<T> implements FormValueControl<T> {
  readonly value = model.required<T>();
  readonly disabled = input(false);
  readonly invalid = input(false);
  readonly touch = output<void>();

  readonly label = input.required<string>();
  readonly options = input.required<readonly SelectOption<T>[]>();
  /** Label above the select instead of beside it. */
  readonly stacked = input(false);
  /** Id of an element that describes the select, such as an error message. */
  readonly describedBy = input<string>();

  protected readonly id = `select-field-${nextId++}`;

  protected select(event: Event): void {
    const option = this.options()[Number((event.target as HTMLSelectElement).value)];
    if (option) {
      this.value.set(option.value);
    }
    this.touch.emit();
  }
}
