const decimal = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 });

export interface SettingsSummary {
  readonly rounds: number;
  readonly work: string;
  readonly rest: string;
  readonly minGap: number;
  readonly maxGap: number;
  readonly sounds: number;
}

/** German is the source language: its shape defines the {@link Translations} type. */
export const de = {
  app: {
    name: 'Workout Helper',
  },
  common: {
    back: 'Zurück',
    cancel: 'Abbrechen',
    save: 'Speichern',
    undo: 'Rückgängig',
    dismiss: 'Schließen',
    decrease: (label: string) => `${label} verringern`,
    increase: (label: string) => `${label} erhöhen`,
  },
  units: {
    decimal,
    secondsShort: (value: number) => `${decimal(value)} s`,
    seconds: (value: number) => (value === 1 ? '1 Sekunde' : `${decimal(value)} Sekunden`),
    duration: (totalSeconds: number) => {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      const parts: string[] = [];
      if (minutes > 0) {
        parts.push(minutes === 1 ? '1 Minute' : `${minutes} Minuten`);
      }
      if (seconds > 0 || minutes === 0) {
        parts.push(seconds === 1 ? '1 Sekunde' : `${seconds} Sekunden`);
      }
      return parts.join(' ');
    },
  },
  pageTitles: {
    home: 'Übersicht',
    settings: 'Einstellungen',
    timer: 'Kommando-Timer',
    presets: 'Favoriten & Verlauf',
    run: 'Training',
  },
  home: {
    toolsHeading: 'Tools',
    timerName: 'Kommando-Timer',
    timerDescription:
      'Rundentimer mit zufälligen Ansagen – für Pratzen-, Sandsack- und Reaktionstraining.',
  },
  settings: {
    heading: 'Einstellungen',
    language: 'Sprache',
    languageHint: 'Ansagen im Timer werden in der gewählten Sprache abgespielt.',
    theme: 'Darstellung',
    themeOptions: {
      system: 'Wie Gerät',
      light: 'Hell',
      dark: 'Dunkel',
    },
  },
  timer: {
    heading: 'Kommando-Timer',
    presetsLink: 'Favoriten & Verlauf',
    roundsSection: 'Runden',
    rounds: 'Anzahl Runden',
    roundsText: (rounds: number) => (rounds === 1 ? '1 Runde' : `${rounds} Runden`),
    work: 'Rundendauer',
    rest: 'Pause',
    prep: 'Vorbereitung',
    calloutsSection: 'Ansagen',
    calloutsHint: 'Der Abstand zwischen zwei Sounds wird zufällig aus diesem Bereich gewählt.',
    minGap: 'Mindestabstand',
    maxGap: 'Höchstabstand',
    soundsSection: 'Sounds',
    noSounds: 'Wähle mindestens einen Sound aus.',
    total: (duration: string) => `Gesamt ${duration}`,
    saveFavorite: 'Favorit',
    start: 'Start',
    favoriteSaved: (name: string) => `„${name}“ als Favorit gespeichert.`,
  },
  sounds: {
    categories: {
      numbers: 'Zahlen',
      colors: 'Farben',
      directions: 'Richtungen',
      signals: 'Signaltöne',
    },
    selectedCount: (selected: number, total: number) => `${selected} von ${total}`,
    selectAll: 'Alle',
    selectAllLabel: (group: string) => `Alle ${group} auswählen`,
    selectNone: 'Keine',
    selectNoneLabel: (group: string) => `Keine ${group} auswählen`,
  },
  run: {
    prep: 'Mach dich bereit',
    work: 'Runde',
    rest: 'Pause',
    roundOf: (round: number, total: number) => `Runde ${round} von ${total}`,
    nextRound: (round: number, total: number) => `Gleich: Runde ${round} von ${total}`,
    totalRemaining: (time: string) => `Noch ${time} insgesamt`,
    loading: 'Sounds werden geladen …',
    pause: 'Anhalten',
    resume: 'Weiter',
    paused: 'Angehalten',
    skip: 'Überspringen',
    stop: 'Beenden',
    finished: 'Geschafft!',
    finishedDetail: (rounds: number) =>
      rounds === 1 ? '1 Runde absolviert.' : `${rounds} Runden absolviert.`,
    again: 'Nochmal',
    adjust: 'Timer anpassen',
  },
  presets: {
    heading: 'Favoriten & Verlauf',
    favorites: 'Favoriten',
    noFavorites: 'Noch keine Favoriten. Speichere eine Einstellung im Timer über „Favorit“.',
    history: 'Zuletzt verwendet',
    noHistory: 'Hier erscheinen deine letzten 10 gestarteten Trainings.',
    summary: (s: SettingsSummary) =>
      `${s.rounds} × ${s.work} · Pause ${s.rest} · ${decimal(s.minGap)}–${decimal(s.maxGap)} s · ${s.sounds} Sounds`,
    delete: (name: string) => `„${name}“ löschen`,
    deleted: (name: string) => `„${name}“ gelöscht.`,
    saveTitle: 'Als Favorit speichern',
    nameLabel: 'Name',
    nameRequired: 'Bitte gib einen Namen ein.',
    defaultName: (rounds: number, work: string) => `${rounds} × ${work}`,
  },
};

export type Translations = typeof de;
