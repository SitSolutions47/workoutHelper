import { SettingsSummary, Translations } from './de';

const decimal = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 });

export const en: Translations = {
  app: {
    name: 'Workout Helper',
  },
  common: {
    back: 'Back',
    cancel: 'Cancel',
    save: 'Save',
    undo: 'Undo',
    dismiss: 'Dismiss',
    decrease: (label: string) => `Decrease ${label.toLowerCase()}`,
    increase: (label: string) => `Increase ${label.toLowerCase()}`,
  },
  units: {
    decimal,
    secondsShort: (value: number) => `${decimal(value)} s`,
    seconds: (value: number) => (value === 1 ? '1 second' : `${decimal(value)} seconds`),
    duration: (totalSeconds: number) => {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const parts: string[] = [];
      if (minutes > 0) {
        parts.push(minutes === 1 ? '1 minute' : `${minutes} minutes`);
      }
      if (seconds > 0 || minutes === 0) {
        parts.push(seconds === 1 ? '1 second' : `${seconds} seconds`);
      }
      return parts.join(' ');
    },
  },
  pageTitles: {
    home: 'Overview',
    settings: 'Settings',
    timer: 'Callout Timer',
    presets: 'Favorites & history',
    run: 'Workout',
  },
  home: {
    toolsHeading: 'Tools',
    timerName: 'Callout Timer',
    timerDescription: 'Round timer with random callouts – for pad work, heavy bag and reaction drills.',
  },
  settings: {
    heading: 'Settings',
    language: 'Language',
    languageHint: 'Timer callouts are played in the selected language.',
    theme: 'Appearance',
    themeOptions: {
      system: 'Match device',
      light: 'Light',
      dark: 'Dark',
    },
  },
  timer: {
    heading: 'Callout Timer',
    presetsLink: 'Favorites & history',
    roundsSection: 'Rounds',
    rounds: 'Number of rounds',
    roundsText: (rounds: number) => (rounds === 1 ? '1 round' : `${rounds} rounds`),
    work: 'Round duration',
    rest: 'Break',
    prep: 'Get ready',
    calloutsSection: 'Callouts',
    calloutsHint: 'The time between two sounds is picked randomly from this range.',
    minGap: 'Minimum gap',
    maxGap: 'Maximum gap',
    soundsSection: 'Sounds',
    noSounds: 'Select at least one sound.',
    total: (duration: string) => `Total ${duration}`,
    saveFavorite: 'Favorite',
    start: 'Start',
    favoriteSaved: (name: string) => `Saved “${name}” as a favorite.`,
  },
  sounds: {
    categories: {
      numbers: 'Numbers',
      colors: 'Colors',
      directions: 'Directions',
      signals: 'Signals',
    },
    selectedCount: (selected: number, total: number) => `${selected} of ${total}`,
    selectAll: 'All',
    selectAllLabel: (group: string) => `Select all ${group.toLowerCase()}`,
    selectNone: 'None',
    selectNoneLabel: (group: string) => `Select none of the ${group.toLowerCase()}`,
  },
  run: {
    prep: 'Get ready',
    work: 'Round',
    rest: 'Break',
    roundOf: (round: number, total: number) => `Round ${round} of ${total}`,
    nextRound: (round: number, total: number) => `Up next: round ${round} of ${total}`,
    totalRemaining: (time: string) => `${time} left in total`,
    loading: 'Loading sounds…',
    pause: 'Pause',
    resume: 'Resume',
    paused: 'Paused',
    skip: 'Skip',
    stop: 'Stop',
    finished: 'Done!',
    finishedDetail: (rounds: number) =>
      rounds === 1 ? '1 round completed.' : `${rounds} rounds completed.`,
    again: 'Again',
    adjust: 'Adjust timer',
  },
  presets: {
    heading: 'Favorites & history',
    favorites: 'Favorites',
    noFavorites: 'No favorites yet. Save a setup in the timer using “Favorite”.',
    history: 'Recently used',
    noHistory: 'Your last 10 started workouts will show up here.',
    summary: (s: SettingsSummary) =>
      `${s.rounds} × ${s.work} · Break ${s.rest} · ${decimal(s.minGap)}–${decimal(s.maxGap)} s · ${s.sounds} sounds`,
    delete: (name: string) => `Delete “${name}”`,
    deleted: (name: string) => `Deleted “${name}”.`,
    saveTitle: 'Save as favorite',
    nameLabel: 'Name',
    nameRequired: 'Please enter a name.',
    defaultName: (rounds: number, work: string) => `${rounds} × ${work}`,
  },
};
