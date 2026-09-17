import { formatClock } from '../../../core/format/format-clock';
import { Translations } from '../../../core/i18n/de';
import { TimerSettings } from './timer-settings';

/** One line describing a configuration, e.g. `3 × 3:00 · Break 1:00 · 5–10 s · 6 sounds`. */
export function summarizeSettings(settings: TimerSettings, t: Translations): string {
  return t.presets.summary({
    rounds: settings.rounds,
    work: formatClock(settings.workSeconds),
    rest: formatClock(settings.breakSeconds),
    minGap: settings.minGapSeconds,
    maxGap: settings.maxGapSeconds,
    sounds: settings.soundIds.length,
  });
}

/** Short title for a configuration the user hasn't named, e.g. `3 × 3:00`. */
export function settingsTitle(settings: TimerSettings, t: Translations): string {
  return t.presets.defaultName(settings.rounds, formatClock(settings.workSeconds));
}
