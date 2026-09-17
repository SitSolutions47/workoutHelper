import { Component, computed, inject, model, output } from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { I18n } from '../../../core/i18n/i18n';
import { Icon } from '../../../shared/icon/icon';
import { CALLOUT_SOUND_GROUPS, SoundGroup, sortCalloutIds } from '../sounds/sound-catalog';

/** Multi-select of callout sounds, grouped by category. The value holds sound ids. */
@Component({
  selector: 'app-sound-picker',
  imports: [Icon],
  templateUrl: './sound-picker.html',
  styleUrl: './sound-picker.scss',
})
export class SoundPicker implements FormValueControl<string[]> {
  readonly value = model<string[]>([]);
  readonly touch = output<void>();

  private readonly i18n = inject(I18n);
  protected readonly t = this.i18n.t;
  protected readonly language = this.i18n.language;
  protected readonly groups = CALLOUT_SOUND_GROUPS;

  protected readonly selected = computed(() => new Set(this.value()));
  protected readonly selectedCounts = computed(() => {
    const selected = this.selected();
    return new Map(
      this.groups.map((group) => [
        group.category,
        group.sounds.filter((sound) => selected.has(sound.id)).length,
      ]),
    );
  });

  protected toggle(id: string, checked: boolean): void {
    this.value.update((ids) => sortCalloutIds(checked ? [...ids, id] : ids.filter((x) => x !== id)));
    this.touch.emit();
  }

  protected selectAll(group: SoundGroup): void {
    this.value.update((ids) => sortCalloutIds([...ids, ...group.sounds.map((sound) => sound.id)]));
    this.touch.emit();
  }

  protected selectNone(group: SoundGroup): void {
    const groupIds = new Set(group.sounds.map((sound) => sound.id));
    this.value.update((ids) => ids.filter((id) => !groupIds.has(id)));
    this.touch.emit();
  }
}
