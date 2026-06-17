import { buildClubDerivedGaps, buildClubDisplayNamePeriods } from './club-identity-ranges';

describe('club identity ranges', () => {
  it('merges identical observed name periods separated only by wartime suspension years', () => {
    expect(
      buildClubDisplayNamePeriods([
        { name: 'Leeds United', startSeason: 1920, endSeason: 1938 },
        { name: 'Leeds United', startSeason: 1946, endSeason: 2025 },
      ])
    ).toEqual([
      {
        name: 'Leeds United',
        startSeason: 1920,
        endSeason: 2025,
        omittedRanges: [
          {
            fromSeason: 1939,
            toSeason: 1945,
            reason: 'Second World War',
            isOfficialSuspension: true,
          },
        ],
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
