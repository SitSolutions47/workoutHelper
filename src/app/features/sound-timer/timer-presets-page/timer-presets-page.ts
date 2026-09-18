import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { I18n } from '../../../core/i18n/i18n';
import { BackNavigation } from '../../../core/navigation/back-navigation';
import { Icon } from '../../../shared/icon/icon';
import { PageHeader } from '../../../shared/page-header/page-header';
import { DESCRIPTION_FIT, TITLE_FIT, fitFontSize } from '../../../shared/text-fit/fit-font-size';
import { FavoriteDialog, FavoriteDialogResult } from '../favorite-dialog/favorite-dialog';
import { GroupDialog } from '../group-dialog/group-dialog';
import { Favorite, FavoriteGroup, groupFavorites } from '../model/favorite';
import { TimerSettings } from '../model/timer-settings';
import { summarizeSettings } from '../model/timer-summary';
import { RemovedGroup, TimerPresets } from '../services/timer-presets';

/** The last deletion, offered for undo until dismissed. */
type Removal =
  | { readonly kind: 'favorite'; readonly favorite: Favorite; readonly index: number }
  | { readonly kind: 'group'; readonly removed: RemovedGroup };

@Component({
  selector: 'app-timer-presets-page',
  imports: [Icon, PageHeader, FavoriteDialog, GroupDialog],
  templateUrl: './timer-presets-page.html',
  styleUrl: './timer-presets-page.scss',
})
export class TimerPresetsPage {
  private readonly presets = inject(TimerPresets);
  private readonly i18n = inject(I18n);
  private readonly backNavigation = inject(BackNavigation);
  private readonly injector = inject(Injector);

  protected readonly t = this.i18n.t;

  protected readonly sections = computed(() => {
    const groups = this.presets.groups();
    return groupFavorites(this.presets.favorites(), groups, true).map((section) => ({
      group: section.group,
      // Ungrouped favorites only need a heading to set them apart from groups.
      heading: section.group?.name ?? (groups.length > 0 ? this.t().presets.ungrouped : undefined),
      favorites: section.favorites.map((favorite) => ({
        favorite,
        summary: summarizeSettings(favorite.settings, this.t()),
        titleSize: fitFontSize(favorite.name, TITLE_FIT),
        descriptionSize: fitFontSize(favorite.description, DESCRIPTION_FIT),
      })),
    }));
  });

  private readonly dateFormat = computed(
    () => new Intl.DateTimeFormat(this.i18n.locale(), { dateStyle: 'medium', timeStyle: 'short' }),
  );
  protected readonly history = computed(() =>
    this.presets.history().map((entry) => ({
      entry,
      summary: summarizeSettings(entry.settings, this.t()),
      usedAt: this.dateFormat().format(entry.usedAt),
    })),
  );

  protected readonly removal = signal<Removal | undefined>(undefined);
  protected readonly removalMessage = computed(() => {
    const removal = this.removal();
    if (!removal) {
      return '';
    }
    return removal.kind === 'favorite'
      ? this.t().presets.deleted(removal.favorite.name)
      : this.t().presets.groupDeleted(removal.removed.group.name);
  });

  private readonly undoButton = viewChild<ElementRef<HTMLButtonElement>>('undoButton');
  private readonly favoritesHeading =
    viewChild.required<ElementRef<HTMLElement>>('favoritesHeading');
  private readonly favoriteDialog = viewChild.required(FavoriteDialog);
  private readonly groupDialog = viewChild.required(GroupDialog);

  private editingFavoriteId: string | undefined;
  /** Undefined while the group dialog creates a new group. */
  private renamingGroupId: string | undefined;

  protected apply(settings: TimerSettings): void {
    this.presets.load(settings);
    this.backNavigation.back('/timer');
  }

  protected edit(favorite: Favorite): void {
    this.editingFavoriteId = favorite.id;
    this.favoriteDialog().open(favorite, 'edit');
  }

  protected saveFavorite(result: FavoriteDialogResult): void {
    if (this.editingFavoriteId) {
      this.presets.updateFavorite(this.editingFavoriteId, {
        name: result.name,
        description: result.description,
        groupId: this.presets.resolveGroup(result.group),
      });
    }
  }

  protected remove(favorite: Favorite): void {
    const index = this.presets.removeFavorite(favorite.id);
    if (index >= 0) {
      this.offerUndo({ kind: 'favorite', favorite, index });
    }
  }

  protected createGroup(): void {
    this.renamingGroupId = undefined;
    this.groupDialog().open(this.t().presets.createGroupTitle);
  }

  protected renameGroup(group: FavoriteGroup): void {
    this.renamingGroupId = group.id;
    this.groupDialog().open(this.t().presets.renameGroupTitle, group.name);
  }

  protected saveGroup(name: string): void {
    if (this.renamingGroupId) {
      this.presets.renameGroup(this.renamingGroupId, name);
    } else {
      this.presets.addGroup(name);
    }
  }

  protected removeGroup(group: FavoriteGroup): void {
    const removed = this.presets.removeGroup(group.id);
    if (removed) {
      this.offerUndo({ kind: 'group', removed });
    }
  }

  protected undo(): void {
    const removal = this.removal();
    if (removal?.kind === 'favorite') {
      this.presets.restoreFavorite(removal.favorite, removal.index);
    } else if (removal?.kind === 'group') {
      this.presets.restoreGroup(removal.removed);
    }
    this.dismissUndo();
  }

  protected dismissUndo(): void {
    this.removal.set(undefined);
    afterNextRender(() => this.favoritesHeading().nativeElement.focus(), {
      injector: this.injector,
    });
  }

  private offerUndo(removal: Removal): void {
    this.removal.set(removal);
    // The focused delete button is gone; continue from the undo action.
    afterNextRender(() => this.undoButton()?.nativeElement.focus(), { injector: this.injector });
  }
}
