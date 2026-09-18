import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, validate } from '@angular/forms/signals';
import { I18n } from '../../../core/i18n/i18n';
import { FAVORITE_LIMITS } from '../model/favorite';

/** Modal asking for a favorite group's name. Emits the trimmed name on save. */
@Component({
  selector: 'app-group-dialog',
  imports: [FormField, FormRoot],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="group-dialog-title">
      <form class="dialog-body" [formRoot]="groupForm">
        <h2 id="group-dialog-title" class="section-heading">{{ title() }}</h2>
        <label class="field">
          <span>{{ t().presets.groupNameLabel }}</span>
          <input
            class="text-input"
            type="text"
            autocomplete="off"
            enterkeyhint="done"
            [formField]="groupForm.name"
            [attr.aria-invalid]="showError()"
            [attr.aria-describedby]="showError() ? 'group-dialog-error' : null"
          />
        </label>
        @if (showError()) {
          <p id="group-dialog-error" class="error-text">{{ t().presets.groupNameRequired }}</p>
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
})
export class GroupDialog {
  readonly saved = output<string>();

  protected readonly t = inject(I18n).t;
  protected readonly title = signal('');
  private readonly model = signal({ name: '' });
  protected readonly groupForm = form(
    this.model,
    (path) => {
      maxLength(path.name, FAVORITE_LIMITS.groupName);
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
    () => this.groupForm.name().touched() && this.groupForm.name().invalid(),
  );

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(title: string, name = ''): void {
    this.title.set(title);
    this.groupForm().reset({ name });
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
