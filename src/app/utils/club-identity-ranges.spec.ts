import { buildClubDerivedGaps, buildClubDisplayNamePeriods } from './club-identity-ranges';

describe('club identity ranges', () => {
  it('merges identical observed name periods across missing archive seasons', () => {
    expect(
      buildClubDisplayNamePeriods([
        { name: 'Leeds United', startSeason: 1905, endSeason: 1914 },
        { name: 'Leeds United', startSeason: 1920, endSeason: 1938 },
        { name: 'Leeds United', startSeason: 1946, endSeason: 2025 },
      ])
    ).toEqual([
      {
        name: 'Leeds United',
        startSeason: 1905,
        endSeason: 2025,
        omittedRanges: [],
      },
    ]);
  });

  it('keeps actual display name changes as separate identity periods', () => {
    expect(
      buildClubDisplayNamePeriods([
        { name: 'Newton Heath', startSeason: 1890, endSeason: 1901 },
        { name: 'Manchester United', startSeason: 1902, endSeason: 1938 },
        { name: 'Manchester United', startSeason: 1946, endSeason: 2025 },
      ])
    ).toEqual([
      {
        name: 'Newton Heath',
        startSeason: 1890,
        endSeason: 1901,
        omittedRanges: [],
      },
      {
        name: 'Manchester United',
        startSeason: 1902,
        endSeason: 2025,
        omittedRanges: [],
      },
    ]);
  });

  it('matches identical display names with small whitespace and case differences', () => {
    expect(
      buildClubDisplayNamePeriods([
        { name: 'Leamington', startSeason: 2021, endSeason: 2022 },
        { name: ' leamington ', startSeason: 2024, endSeason: 2025 },
      ])
    ).toEqual([
      {
        name: 'Leamington',
        startSeason: 2021,
        endSeason: 2025,
        omittedRanges: [],
      },
    ]);
  });

  it('keeps real metadata gaps separate from wartime suspension gaps', () => {
    expect(
      buildClubDerivedGaps([
        { name: 'Example FC', startSeason: 1910, endSeason: 1914 },
        { name: 'Example FC', startSeason: 1919, endSeason: 1925 },
        { name: 'Example FC', startSeason: 1930, endSeason: 1932 },
      ])
    ).toEqual([
      {
        fromSeason: 1915,
        toSeason: 1918,
        reason: 'First World War',
        isOfficialSuspension: true,
      },
      {
        fromSeason: 1926,
        toSeason: 1929,
        reason: 'No official league record in metadata',
        isOfficialSuspension: false,
      },
    ]);
  });
});
