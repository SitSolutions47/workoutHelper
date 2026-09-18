import { PlayableSound } from '../../../core/audio/sound-player';
import { ToneName } from '../../../core/audio/tone-synth';
import { LOCALES, Language } from '../../../core/i18n/language';

export type CalloutCategory = 'numbers' | 'colors' | 'directions' | 'signals';

interface SoundBase {
  /** `<category>.<name>`, stored in saved settings, so don't rename existing ids. */
  readonly id: string;
  readonly category: CalloutCategory | 'bells';
  readonly name: string;
  readonly label: Readonly<Record<Language, string>>;
  /** CSS color shown next to color callouts. */
  readonly swatch?: string;
}

/** A word with one recording per language: `sounds/<language>/<category>/<name>.mp3`. */
export interface SpokenSound extends SoundBase {
  readonly kind: 'spoken';
}

/** A language-neutral signal: `sounds/<category>/<name>.mp3`. */
export interface ToneSound extends SoundBase {
  readonly kind: 'tone';
  /** Synthesized stand-in until the file exists. */
  readonly tone: ToneName;
}

export type SoundDefinition = SpokenSound | ToneSound;

export interface SoundGroup {
  readonly category: CalloutCategory;
  readonly sounds: readonly SoundDefinition[];
}

function spoken(
  category: CalloutCategory,
  name: string,
  de: string,
  en: string,
  swatch?: string,
): SpokenSound {
  return { id: `${category}.${name}`, kind: 'spoken', category, name, label: { de, en }, swatch };
}

function tone(
  category: CalloutCategory | 'bells',
  name: string,
  toneName: ToneName,
  de: string,
  en: string,
): ToneSound {
  return {
    id: `${category}.${name}`,
    kind: 'tone',
    category,
    name,
    tone: toneName,
    label: { de, en },
  };
}

const NUMBERS = Array.from({ length: 30 }, (_, i) => {
  const digits = String(i + 1);
  return spoken('numbers', digits, digits, digits);
});

const COLORS = [
  spoken('colors', 'red', 'Rot', 'Red', '#d32f2f'),
  spoken('colors', 'blue', 'Blau', 'Blue', '#1e63d6'),
  spoken('colors', 'green', 'Grün', 'Green', '#2e9e44'),
  spoken('colors', 'yellow', 'Gelb', 'Yellow', '#f2c500'),
  spoken('colors', 'orange', 'Orange', 'Orange', '#f07c00'),
  spoken('colors', 'purple', 'Lila', 'Purple', '#8e3fc4'),
  spoken('colors', 'black', 'Schwarz', 'Black', '#111111'),
  spoken('colors', 'white', 'Weiß', 'White', '#ffffff'),
];

const DIRECTIONS = [
  spoken('directions', 'left', 'Links', 'Left'),
  spoken('directions', 'right', 'Rechts', 'Right'),
  spoken('directions', 'up', 'Hoch', 'Up'),
  spoken('directions', 'down', 'Runter', 'Down'),
  spoken('directions', 'forward', 'Vor', 'Forward'),
  spoken('directions', 'back', 'Zurück', 'Back'),
];

const SIGNALS = [
  tone('signals', 'beep', 'beep', 'Piepton', 'Beep'),
  tone('signals', 'beep-high', 'beep-high', 'Hoher Ton', 'High beep'),
  tone('signals', 'beep-low', 'beep-low', 'Tiefer Ton', 'Low beep'),
  tone('signals', 'double-beep', 'double-beep', 'Doppelton', 'Double beep'),
  tone('signals', 'whistle', 'whistle', 'Pfiff', 'Whistle'),
  tone('signals', 'clap', 'clap', 'Klatschen', 'Clap'),
];

/** Selectable callouts, in display order. */
export const CALLOUT_SOUND_GROUPS: readonly SoundGroup[] = [
  { category: 'numbers', sounds: NUMBERS },
  { category: 'colors', sounds: COLORS },
  { category: 'directions', sounds: DIRECTIONS },
  { category: 'signals', sounds: SIGNALS },
];

export const CALLOUT_SOUNDS: readonly SoundDefinition[] = CALLOUT_SOUND_GROUPS.flatMap(
  (group) => group.sounds,
);

export const ROUND_START_SOUND = tone('bells', 'round-start', 'bell', 'Glocke', 'Bell');
export const ROUND_END_SOUND = tone(
  'bells',
  'round-end',
  'triple-bell',
  'Dreifache Glocke',
  'Triple bell',
);

/** Sounds that can mark timer events such as a round start or an interval switch. */
export const SIGNAL_SOUNDS: readonly ToneSound[] = [ROUND_START_SOUND, ROUND_END_SOUND, ...SIGNALS];

/** Signal choice that plays nothing. */
export const NO_SOUND = 'none';
/** Countdown choice that speaks the remaining seconds, using the number callouts. */
export const SPOKEN_COUNTDOWN = 'spoken';

export const SOUNDS_BY_ID: ReadonlyMap<string, SoundDefinition> = new Map(
  [...CALLOUT_SOUNDS, ROUND_START_SOUND, ROUND_END_SOUND].map((sound) => [sound.id, sound]),
);

/** The sound id a countdown choice plays with `secondsLeft` remaining. */
export function countdownSoundId(choice: string, secondsLeft: number): string {
  return choice === SPOKEN_COUNTDOWN ? `numbers.${secondsLeft}` : choice;
}

/** Drops unknown and duplicate ids and orders the rest like the catalog. */
export function sortCalloutIds(ids: Iterable<string>): string[] {
  const wanted = new Set(ids);
  return CALLOUT_SOUNDS.filter((sound) => wanted.has(sound.id)).map((sound) => sound.id);
}

export function toPlayableSound(sound: SoundDefinition, language: Language): PlayableSound {
  if (sound.kind === 'spoken') {
    return {
      url: `sounds/${language}/${sound.category}/${sound.name}.mp3`,
      fallback: { kind: 'speech', text: sound.label[language], locale: LOCALES[language] },
    };
  }
  return {
    url: `sounds/${sound.category}/${sound.name}.mp3`,
    fallback: { kind: 'tone', tone: sound.tone },
  };
}
