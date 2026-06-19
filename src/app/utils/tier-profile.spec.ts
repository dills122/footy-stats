import type { LeagueTableEntry, Team } from '@app/store/league.models';
import { buildTierProfileData } from './tier-profile';

describe('buildTierProfileData', () => {
  const teams: Record<number, Team> = {
    1: { id: 1, name: 'Alpha FC', clubIds: ['alpha fc'] },
    2: { id: 2, name: 'Bravo Town', clubIds: ['bravo town'] },
    3: { id: 3, name: 'Charlie City', clubIds: ['charlie city'] },
    4: { id: 4, name: 'Delta United', clubIds: ['delta united'] },
    5: { id: 5, name: 'Echo Rovers', clubIds: ['echo rovers'] },
  };

  it('counts promotions into the target tier from the tier below', () => {
    const profile = buildTierProfileData(fixtureEntries(), 'tier1', (teamId) => teams[teamId]);

    expect(profile.promotionInCount).toBe(3);
    expect(profile.relegationOutCount).toBe(1);
    expect(profile.mostPromotionsIn.map((row) => [row.name, row.count])).toEqual([
      ['Charlie City', 2],
      ['Delta United', 1],
    ]);
    expect(profile.mostRelegationsOut.map((row) => [row.name, row.count])).toEqual([
      ['Echo Rovers', 1],
    ]);
  });

  it('builds close title, survival, and promotion races for table links', () => {
    const profile = buildTierProfileData(fixtureEntries(), 'tier1', (teamId) => teams[teamId]);

    expect(profile.closeTitleRaces.find((race) => race.season === 2020)).toMatchObject({
      season: 2020,
      gap: 0,
      tieBreakerGap: 8,
      primaryName: 'Alpha FC',
      secondaryName: 'Bravo Town',
      detail: 'level on points and GD / +8 goals scored',
    });
    expect(profile.closeTitleRaces.find((race) => race.season === 1975)).toMatchObject({
      season: 1975,
      gap: 0,
      tieBreakerGap: 0.25,
      primaryName: 'Alpha FC',
      secondaryName: 'Bravo Town',
      detail: 'level on points / +0.25 goal average',
    });
    expect(profile.closeTitleRaces.find((race) => race.season === 2022)).toMatchObject({
      season: 2022,
      gap: 0,
      tieBreakerGap: null,
      primaryName: 'Alpha FC',
      secondaryName: 'Bravo Town',
      detail: 'level on points, GD, and goals scored / head-to-head or playoff',
    });
    expect(profile.closeSurvivalRaces[0]).toMatchObject({
      season: 2020,
      gap: 0,
      tieBreakerGap: 11,
      primaryName: 'Delta United',
      secondaryName: 'Echo Rovers',
      detail: 'level on points / +11 GD',
    });
    expect(profile.closePromotionRaces[0]).toMatchObject({
      season: 2020,
      gap: 0,
      tieBreakerGap: 6,
      primaryName: 'Delta United',
      secondaryName: 'Echo Rovers',
      detail: 'level on points / +6 GD',
    });
  });

  it('builds dominance leaders for titles, top-three finishes, and continuous stays', () => {
    const profile = buildTierProfileData(fixtureEntries(), 'tier1', (teamId) => teams[teamId]);

    expect(profile.mostTitles.map((row) => [row.name, row.count, row.detail])).toEqual([
      ['Alpha FC', 3, '3 titles'],
      ['Bravo Town', 1, '1 title'],
    ]);
    expect(profile.mostTopThreeFinishes.slice(0, 3).map((row) => [row.name, row.detail])).toEqual([
      ['Alpha FC', '4 top-three finishes'],
      ['Bravo Town', '4 top-three finishes'],
      ['Charlie City', '1 top-three finish'],
    ]);
    expect(profile.longestStays[0]).toMatchObject({
      name: 'Alpha FC',
      count: 3,
      startSeason: 2020,
      endSeason: 2022,
      detail: '3 seasons (2020-2022)',
    });
    expect(profile.longestActiveStays[0]).toMatchObject({
      name: 'Alpha FC',
      count: 3,
      startSeason: 2020,
      endSeason: 2022,
    });
  });

  it('builds season competitiveness gaps in chronological order', () => {
    const profile = buildTierProfileData(fixtureEntries(), 'tier1', (teamId) => teams[teamId]);

    expect(
      profile.seasonCompetitiveness.map((row) => ({
        season: row.season,
        championName: row.championName,
        runnerUpName: row.runnerUpName,
        titleGap: row.titleGap,
        midTableGap: row.midTableGap,
        fullTableSpread: row.fullTableSpread,
      }))
    ).toEqual([
      {
        season: 1975,
        championName: 'Alpha FC',
        runnerUpName: 'Bravo Town',
        titleGap: 0,
        midTableGap: 0,
        fullTableSpread: 0,
      },
      {
        season: 2020,
        championName: 'Alpha FC',
        runnerUpName: 'Bravo Town',
        titleGap: 0,
        midTableGap: 44,
        fullTableSpread: 44,
      },
      {
        season: 2021,
        championName: 'Bravo Town',
        runnerUpName: 'Alpha FC',
        titleGap: 7,
        midTableGap: 7,
        fullTableSpread: 46,
      },
      {
        season: 2022,
        championName: 'Alpha FC',
        runnerUpName: 'Bravo Town',
        titleGap: 0,
        midTableGap: 0,
        fullTableSpread: 0,
      },
    ]);
  });

  it('counts unique clubs by decade in the selected tier', () => {
    const profile = buildTierProfileData(fixtureEntries(), 'tier1', (teamId) => teams[teamId]);

    expect(profile.uniqueClubsByDecade).toEqual([
      {
        decade: 1970,
        label: '1970s',
        uniqueClubCount: 2,
        seasons: 1,
      },
      {
        decade: 2020,
        label: '2020s',
        uniqueClubCount: 5,
        seasons: 3,
      },
    ]);
  });
});

function fixtureEntries(): LeagueTableEntry[] {
  return [
    row(1975, 'tier1', 1, 1, 50, 60, 30, false, false),
    row(1975, 'tier1', 2, 2, 50, 70, 40, false, false),
    row(2020, 'tier1', 1, 1, 82, 76, 34, false, false),
    row(2020, 'tier1', 2, 2, 82, 68, 26, false, false),
    row(2020, 'tier1', 4, 3, 38, 42, 55, false, false),
    row(2020, 'tier1', 5, 4, 38, 36, 60, true, false),
    row(2020, 'tier2', 3, 1, 84, 74, 35, false, true),
    row(2020, 'tier2', 4, 2, 82, 68, 40, false, true),
    row(2020, 'tier2', 5, 3, 82, 64, 42, false, false),
    row(2021, 'tier1', 2, 1, 90, 88, 25, false, false),
    row(2021, 'tier1', 1, 2, 83, 70, 30, false, false),
    row(2021, 'tier1', 3, 3, 44, 52, 49, false, false),
    row(2021, 'tier2', 3, 1, 86, 79, 30, false, true),
    row(2022, 'tier1', 1, 1, 86, 75, 35, false, false),
    row(2022, 'tier1', 2, 2, 86, 75, 35, false, false),
  ];
}

function row(
  season: number,
  tier: string,
  teamId: number,
  pos: number,
  points: number,
  goalsFor: number,
  goalsAgainst: number,
  wasRelegated: boolean,
  wasPromoted: boolean
): LeagueTableEntry {
  return {
    season,
    tier,
    teamId,
    clubId: `${teamsForFixture[teamId]} id`,
    pos,
    played: 38,
    won: 20,
    drawn: 8,
    lost: 10,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    goalAverage: null,
    points,
    notes: null,
    wasRelegated,
    wasPromoted,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
  };
}

const teamsForFixture: Record<number, string> = {
  1: 'alpha',
  2: 'bravo',
  3: 'charlie',
  4: 'delta',
  5: 'echo',
};
