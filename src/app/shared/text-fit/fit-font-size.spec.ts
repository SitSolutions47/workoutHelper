import { fitFontSize } from './fit-font-size';

describe('fitFontSize', () => {
  const range = { max: 1, min: 0.8, fitsChars: 10 };

  it('keeps the full size for texts that fit', () => {
    expect(fitFontSize('', range)).toBe(1);
    expect(fitFontSize('0123456789', range)).toBe(1);
  });

  it('shrinks longer texts, but not below the minimum', () => {
    expect(fitFontSize('0123456789ab', range)).toBeCloseTo(10 / 12, 3);
    expect(fitFontSize('x'.repeat(100), range)).toBe(0.8);
  });
});
