import { formatClock } from '../../../core/format/format-clock';
import { Translations } from '../../../core/i18n/de';
import { TimerSettings } from './timer-settings';

/** One line describing a configuration, e.g. `3 × 3:00 · Break 1:00 · Every 0:30 · 5–10 s · 6 sounds`. */
export function summarizeSettings(settings: TimerSettings, t: Translations): string {
  const s = t.presets.summary;
  const parts = [settingsTitle(settings, t), s.rest(formatClock(settings.breakSeconds))];
  if (settings.intervalSeconds > 0) {
    parts.push(s.interval(formatClock(settings.intervalSeconds)));
  }
  parts.push(
    settings.calloutsEnabled
      ? s.callouts(settings.minGapSeconds, settings.maxGapSeconds, settings.soundIds.length)
      : s.noCallouts,
  );
  return parts.join(' · ');
}

/** Short title for a configuration the user hasn't named, e.g. `3 × 3:00`. */
export function settingsTitle(settings: TimerSettings, t: Translations): string {
  return t.presets.defaultName(settings.rounds, formatClock(settings.workSeconds));
}
