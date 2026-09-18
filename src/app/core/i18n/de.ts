const decimal = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 });

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
    timer: 'Advanced Timer',
    presets: 'Favoriten & Verlauf',
    run: 'Training',
  },
  home: {
    newTimer: 'Neuer Timer',
    empty: 'Noch keine Timer. Leg mit „Neuer Timer“ deinen ersten an.',
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
    accent: 'Farbschema',
    accentOptions: {
      red: 'Boxring',
      ocean: 'Ozean',
      forest: 'Wald',
      violet: 'Violett',
      ember: 'Glut',
      graphite: 'Graphit',
    },
  },
  timer: {
    heading: 'Advanced Timer',
    presetsLink: 'Favoriten & Verlauf',
    roundsSection: 'Runden',
    rounds: 'Anzahl Runden',
    roundsText: (rounds: number) => (rounds === 1 ? '1 Runde' : `${rounds} Runden`),
    work: 'Rundendauer',
    rest: 'Pause',
    prep: 'Vorbereitung',
    timeline: (summary: string, total: string) => `Ablauf: ${summary}. Gesamt ${total}.`,
    structureSection: 'Intervalle & Countdown',
    interval: 'Intervall in der Runde',
    intervalHint:
      'Teilt jede Runde in gleich lange Abschnitte, mit einem Signal bei jedem Wechsel.',
    intervalOption: (time: string, count: number) => `${time} (${count} Abschnitte)`,
    intervalUnfit: (time: string) => `${time} (passt nicht)`,
    intervalFit: 'Das Intervall muss die Rundendauer glatt teilen. Wähle ein anderes Intervall.',
    countdown: 'Countdown',
    countdownHint: 'Zählt die letzten Sekunden jeder Runde, Pause und der Vorbereitung herunter.',
    countdownValue: (seconds: number) => (seconds === 0 ? 'Aus' : `${seconds} s`),
    countdownText: (seconds: number) =>
      seconds === 0 ? 'Aus' : seconds === 1 ? '1 Sekunde' : `${seconds} Sekunden`,
    off: 'Aus',
    calloutsSection: 'Ansagen',
    calloutsToggle: 'Ansagen abspielen',
    calloutsHint: 'Der Abstand zwischen zwei Sounds wird zufällig aus diesem Bereich gewählt.',
    calloutsOffHint: 'Es erklingen nur die Signale für Runden, Intervalle und Countdown.',
    minGap: 'Mindestabstand',
    maxGap: 'Höchstabstand',
    soundsSection: 'Sounds',
    noSounds: 'Wähle mindestens einen Sound aus.',
    signalsSection: 'Signale',
    signals: {
      roundStart: 'Rundenstart',
      interval: 'Intervallwechsel',
      countdown: 'Countdown',
      roundEnd: 'Rundenende',
      finish: 'Trainingsende',
    },
    previewSignal: (label: string) => `${label} anhören`,
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
    none: 'Kein Ton',
    spokenCountdown: 'Gesprochene Zahlen',
  },
  run: {
    prep: 'Mach dich bereit',
    work: 'Runde',
    rest: 'Pause',
    roundOf: (round: number, total: number) => `Runde ${round} von ${total}`,
    nextRound: (round: number, total: number) => `Gleich: Runde ${round} von ${total}`,
    intervalOf: (interval: number, total: number) => `Intervall ${interval} von ${total}`,
    nextSwitch: (time: string) => `Wechsel in ${time}`,
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
    summary: {
      rest: (time: string) => `Pause ${time}`,
      interval: (time: string) => `alle ${time}`,
      callouts: (minGap: number, maxGap: number, sounds: number) =>
        `${decimal(minGap)}–${decimal(maxGap)} s · ${sounds === 1 ? '1 Sound' : `${sounds} Sounds`}`,
      noCallouts: 'ohne Ansagen',
    },
    edit: (name: string) => `„${name}“ bearbeiten`,
    delete: (name: string) => `„${name}“ löschen`,
    deleted: (name: string) => `„${name}“ gelöscht.`,
    saveTitle: 'Als Favorit speichern',
    editTitle: 'Favorit bearbeiten',
    nameLabel: 'Name',
    nameRequired: 'Bitte gib einen Namen ein.',
    descriptionLabel: 'Beschreibung (optional)',
    characterCount: (count: number, max: number) => `${count} von ${max} Zeichen`,
    groupLabel: 'Gruppe',
    noGroup: 'Keine Gruppe',
    newGroupOption: 'Neue Gruppe …',
    newGroupNameLabel: 'Name der neuen Gruppe',
    groupNameLabel: 'Gruppenname',
    groupNameRequired: 'Bitte gib einen Gruppennamen ein.',
    ungrouped: 'Ohne Gruppe',
    emptyGroup: 'Noch keine Favoriten in dieser Gruppe.',
    addGroup: 'Neue Gruppe',
    createGroupTitle: 'Neue Gruppe anlegen',
    renameGroupTitle: 'Gruppe umbenennen',
    renameGroup: (name: string) => `Gruppe „${name}“ umbenennen`,
    deleteGroup: (name: string) => `Gruppe „${name}“ löschen`,
    groupDeleted: (name: string) => `Gruppe „${name}“ gelöscht, ihre Favoriten bleiben erhalten.`,
    defaultName: (rounds: number, work: string) => `${rounds} × ${work}`,
  },
};

export type Translations = typeof de;
