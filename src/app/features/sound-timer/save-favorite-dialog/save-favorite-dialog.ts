import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, validate } from '@angular/forms/signals';
import { I18n } from '../../../core/i18n/i18n';

const NAME_MAX_LENGTH = 40;

/** Modal asking for a favorite's name. Emits the trimmed name on save. */
@Component({
  selector: 'app-save-favorite-dialog',
  imports: [FormField, FormRoot],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="save-favorite-title">
      <form class="dialog-body" [formRoot]="nameForm">
        <h2 id="save-favorite-title" class="section-heading">{{ t().presets.saveTitle }}</h2>
        <label class="field">
          <span>{{ t().presets.nameLabel }}</span>
          <input
            class="text-input"
            type="text"
            autocomplete="off"
            enterkeyhint="done"
            [formField]="nameForm.name"
            [attr.aria-invalid]="showError()"
            [attr.aria-describedby]="showError() ? 'save-favorite-error' : null"
          />
        </label>
        @if (showError()) {
          <p id="save-favorite-error" class="error-text">{{ t().presets.nameRequired }}</p>
        }
        <div class="dialog-actions">
          <button type="button" class="button button--secondary" (click)="close()">
            {{ t().common.cancel }}
          </button>
          <button type="submit" class="button button--primary">{{ t().common.save }}</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    .dialog {
      width: min(100% - 2rem, 24rem);
      padding: 0;
      border: 0;
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text);

      &::backdrop {
        background: rgb(0 0 0 / 0.5);
      }
    }
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.25rem;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
      font-weight: 600;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
  `,
})
export class SaveFavoriteDialog {
  readonly saved = output<string>();

  protected readonly t = inject(I18n).t;
  private readonly model = signal({ name: '' });
  protected readonly nameForm = form(
    this.model,
    (path) => {
      maxLength(path.name, NAME_MAX_LENGTH);
      validate(path.name, ({ value }) =>
        value().trim() === '' ? { kind: 'required' } : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          this.saved.emit(field.name().value().trim());
          this.close();
        },
      },
    },
  );
  protected readonly showError = computed(
    () => this.nameForm.name().touched() && this.nameForm.name().invalid(),
  );

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(suggestedName: string): void {
    this.nameForm().reset({ name: suggestedName });
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
