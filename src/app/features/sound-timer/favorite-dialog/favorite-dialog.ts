import { Component, ElementRef, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormField, FormRoot, form, maxLength, validate } from '@angular/forms/signals';
import { I18n } from '../../../core/i18n/i18n';
import { SelectField, SelectOption } from '../../../shared/select-field/select-field';
import { FAVORITE_LIMITS, FavoriteDetails } from '../model/favorite';
import { GroupChoice, TimerPresets } from '../services/timer-presets';

/** Group select values that aren't group ids. */
const NO_GROUP = '';
const NEW_GROUP = '#new';

export interface FavoriteDialogResult {
  readonly name: string;
  readonly description: string;
  readonly group: GroupChoice;
}

/** Modal for a favorite's name, description and group, used to save a new favorite or edit one. */
@Component({
  selector: 'app-favorite-dialog',
  imports: [FormField, FormRoot, SelectField],
  template: `
    <dialog #dialog class="dialog" aria-labelledby="favorite-dialog-title">
      <form class="dialog-body" [formRoot]="favoriteForm">
        <h2 id="favorite-dialog-title" class="section-heading">
          {{ mode() === 'edit' ? t().presets.editTitle : t().presets.saveTitle }}
        </h2>

        <label class="field">
          <span>{{ t().presets.nameLabel }}</span>
          <input
            class="text-input"
            type="text"
            autocomplete="off"
            enterkeyhint="next"
            [formField]="favoriteForm.name"
            [attr.aria-invalid]="showNameError()"
            [attr.aria-describedby]="
              showNameError() ? 'favorite-name-error favorite-name-count' : 'favorite-name-count'
            "
          />
          <span class="field-meta">
            <span id="favorite-name-error" class="error-text">
              @if (showNameError()) {
                {{ t().presets.nameRequired }}
              }
            </span>
            <span id="favorite-name-count">{{ nameCount() }}</span>
          </span>
        </label>

        <label class="field">
          <span>{{ t().presets.descriptionLabel }}</span>
          <textarea
            class="text-input"
            rows="3"
            [formField]="favoriteForm.description"
            aria-describedby="favorite-description-count"
          ></textarea>
          <span class="field-meta">
            <span></span>
            <span id="favorite-description-count">{{ descriptionCount() }}</span>
          </span>
        </label>

        <app-select-field
          [stacked]="true"
          [label]="t().presets.groupLabel"
          [options]="groupOptions()"
          [formField]="favoriteForm.groupId"
        />

        @if (isNewGroup()) {
          <label class="field">
            <span>{{ t().presets.newGroupNameLabel }}</span>
            <input
              class="text-input"
              type="text"
              autocomplete="off"
              enterkeyhint="done"
              [formField]="favoriteForm.newGroupName"
              [attr.aria-invalid]="showGroupError()"
              [attr.aria-describedby]="showGroupError() ? 'favorite-group-error' : null"
            />
            @if (showGroupError()) {
              <span id="favorite-group-error" class="error-text">
                {{ t().presets.groupNameRequired }}
              </span>
            }
          </label>
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
      width: min(100% - 2rem, 28rem);
    }
    .field-meta .error-text {
      font-size: 0.875rem;
    }
  `,
})
export class FavoriteDialog {
  readonly saved = output<FavoriteDialogResult>();

  private readonly presets = inject(TimerPresets);
  protected readonly t = inject(I18n).t;
  protected readonly mode = signal<'create' | 'edit'>('create');

  private readonly model = signal({
    name: '',
    description: '',
    groupId: NO_GROUP,
    newGroupName: '',
  });
  protected readonly favoriteForm = form(
    this.model,
    (path) => {
      maxLength(path.name, FAVORITE_LIMITS.name);
      validate(path.name, ({ value }) =>
        value().trim() === '' ? { kind: 'required' } : undefined,
      );
      maxLength(path.description, FAVORITE_LIMITS.description);
      maxLength(path.newGroupName, FAVORITE_LIMITS.groupName);
      validate(path.newGroupName, ({ value, valueOf }) =>
        valueOf(path.groupId) === NEW_GROUP && value().trim() === ''
          ? { kind: 'required' }
          : undefined,
      );
    },
    {
      submission: {
        action: async (field) => {
          const { name, description, groupId, newGroupName } = field().value();
          this.saved.emit({
            name: name.trim(),
            description: description.trim(),
            group:
              groupId === NO_GROUP
                ? { kind: 'none' }
                : groupId === NEW_GROUP
                  ? { kind: 'new', name: newGroupName.trim() }
                  : { kind: 'existing', id: groupId },
          });
          this.close();
        },
      },
    },
  );

  protected readonly nameCount = computed(() =>
    this.t().presets.characterCount(this.model().name.length, FAVORITE_LIMITS.name),
  );
  protected readonly descriptionCount = computed(() =>
    this.t().presets.characterCount(this.model().description.length, FAVORITE_LIMITS.description),
  );
  protected readonly showNameError = computed(
    () => this.favoriteForm.name().touched() && this.favoriteForm.name().invalid(),
  );
  protected readonly isNewGroup = computed(() => this.model().groupId === NEW_GROUP);
  protected readonly showGroupError = computed(
    () => this.favoriteForm.newGroupName().touched() && this.favoriteForm.newGroupName().invalid(),
  );
  protected readonly groupOptions = computed<SelectOption<string>[]>(() => [
    { value: NO_GROUP, label: this.t().presets.noGroup },
    ...this.presets.groups().map((group) => ({ value: group.id, label: group.name })),
    { value: NEW_GROUP, label: this.t().presets.newGroupOption },
  ]);

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(initial: FavoriteDetails, mode: 'create' | 'edit'): void {
    const groupExists = this.presets.groups().some((group) => group.id === initial.groupId);
    this.mode.set(mode);
    this.favoriteForm().reset({
      name: initial.name.slice(0, FAVORITE_LIMITS.name),
      description: initial.description,
      groupId: groupExists && initial.groupId ? initial.groupId : NO_GROUP,
      newGroupName: '',
    });
    this.dialog().nativeElement.showModal();
  }

  close(): void {
    this.dialog().nativeElement.close();
  }
}
