import {
  getWartimeSuspensionLabelForSpan,
  getWartimeSuspensionRanges,
  isWartimeSuspensionSpan,
} from './wartime-suspensions';

describe('wartime suspensions', () => {
  it('returns no ranges when the selected seasons avoid wartime gaps', () => {
    expect(getWartimeSuspensionRanges([2020, 2021, 2022])).toEqual([]);
  });

  it('returns complete wartime ranges when all suspended seasons are selected', () => {
    expect(getWartimeSuspensionRanges([1914, 1915, 1916, 1917, 1918, 1919])).toEqual([
      expect.objectContaining({
        startSeason: 1915,
        endSeason: 1918,
        label: 'First World War',
      }),
    ]);

    expect(
      getWartimeSuspensionRanges([1938, 1939, 1940, 1941, 1942, 1943, 1944, 1945, 1946])
    ).toEqual([
      expect.objectContaining({
        startSeason: 1939,
        endSeason: 1945,
        label: 'Second World War',
      }),
    ]);
  });

  it('clips wartime ranges to the selected season window', () => {
    expect(getWartimeSuspensionRanges([1917, 1918, 1919])).toEqual([
      expect.objectContaining({
        startSeason: 1917,
        endSeason: 1918,
      }),
    ]);
  });

  it('classifies spans fully covered by official wartime suspensions', () => {
    expect(isWartimeSuspensionSpan(1939, 1945)).toBe(true);
    expect(isWartimeSuspensionSpan(1938, 1945)).toBe(false);
    expect(getWartimeSuspensionLabelForSpan(1939, 1945)).toBe('Second World War');
  });
});
