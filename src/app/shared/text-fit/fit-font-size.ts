export interface FitRange {
  /** Font size in rem for texts up to {@link fitsChars} characters. */
  readonly max: number;
  /** Smallest font size in rem, reached by texts at their maximum length. */
  readonly min: number;
  readonly fitsChars: number;
}

/** Favorite names are at most 40 characters and should fit in about two lines on a phone. */
export const TITLE_FIT: FitRange = { max: 1.0625, min: 0.875, fitsChars: 24 };
/** Favorite descriptions are at most 120 characters and should fit in about three lines. */
export const DESCRIPTION_FIT: FitRange = { max: 0.9375, min: 0.8125, fitsChars: 70 };

/**
 * Font size in rem that shrinks longer texts, so a length-limited text always fits its box.
 * Pair it with `overflow-wrap: anywhere` so long words wrap instead of overflowing.
 */
export function fitFontSize(text: string, range: FitRange): number {
  const length = [...text].length;
  if (length <= range.fitsChars) {
    return range.max;
  }
  const scaled = (range.max * range.fitsChars) / length;
  return Math.round(Math.max(range.min, scaled) * 1000) / 1000;
}
