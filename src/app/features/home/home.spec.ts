import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { DEFAULT_TIMER_SETTINGS, TimerSettings } from '../sound-timer/model/timer-settings';
import { TimerPresets } from '../sound-timer/services/timer-presets';
import { Home } from './home';

function settings(rounds: number): TimerSettings {
  return { ...DEFAULT_TIMER_SETTINGS, rounds, soundIds: [...DEFAULT_TIMER_SETTINGS.soundIds] };
}

function titles(element: HTMLElement): string[] {
  return [...element.querySelectorAll('.item-title')].map((node) => node.textContent?.trim() ?? '');
}

describe('Home', () => {
  let presets: TimerPresets;

  beforeEach(() => {
    localStorage.clear();
    // Stub for the setup screen the home page navigates to.
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'timer', children: [] }])],
    });
    presets = TestBed.inject(TimerPresets);
  });

  it('points to the new timer button while nothing is saved', async () => {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    expect(titles(fixture.nativeElement)).toEqual([]);
    expect(fixture.nativeElement.querySelector('.fab')).toBeTruthy();
  });

  it('lists favorites and recently used timers', async () => {
    presets.recordUsage(settings(5));
    presets.addFavorite('Sparring', settings(12));
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    expect(titles(fixture.nativeElement)).toEqual(['Sparring', '5 × 3:00']);
  });

  it('shows favorites under their group, ungrouped ones last', async () => {
    const group = presets.addGroup('Boxen');
    presets.addFavorite('Technik', settings(4));
    presets.addFavorite('Sparring', settings(12), {
      description: 'Harte Runden',
      groupId: group.id,
    });
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    const groupTitles = [...element.querySelectorAll('.group-title')].map((node) =>
      node.textContent?.trim(),
    );
    expect(groupTitles).toEqual(['Boxen', 'Ohne Gruppe']);
    expect(titles(element)).toEqual(['Sparring', 'Technik']);
    expect(element.querySelector('.item-description')?.textContent?.trim()).toBe('Harte Runden');
  });

  it('leaves out recently used timers that are already a favorite', async () => {
    presets.recordUsage(settings(12));
    presets.addFavorite('Sparring', settings(12));
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    expect(titles(fixture.nativeElement)).toEqual(['Sparring']);
  });

  it('loads a timer into the draft before opening its settings', async () => {
    presets.addFavorite('Sparring', settings(12));
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.item')?.click();
    await fixture.whenStable();

    expect(presets.draft().rounds).toBe(12);
  });

  it('starts a new timer from the default settings', async () => {
    presets.load(settings(12));
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.fab')?.click();
    await fixture.whenStable();

    expect(presets.draft()).toEqual(DEFAULT_TIMER_SETTINGS);
  });
});
