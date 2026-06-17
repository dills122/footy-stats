import type { LeagueTableEntry } from '@app/store/league.models';
import { buildClubPerformanceMilestones } from './club-performance-milestones';

describe('buildClubPerformanceMilestones', () => {
  it('keeps top-flight runs continuous across official wartime suspensions', () => {
    const milestones = buildClubPerformanceMilestones([
      tableEntry({ season: 1914, tier: 'tier1', pos: 3 }),
      tableEntry({ season: 1919, tier: 'tier1', pos: 2 }),
      tableEntry({ season: 1920, tier: 'tier1', pos: 1 }),
    ]);

    expect(milestones.longestTopFlightRun).toEqual({
      startSeason: 1914,
      endSeason: 1920,
      seasons: [1914, 1919, 1920],
      rowCount: 3,
    });
    expect(milestones.longestNonWartimeGap).toBeNull();
  });

  it('reports ordinary missing spans as non-wartime gaps', () => {
    const milestones = buildClubPerformanceMilestones([
      tableEntry({ season: 2001, tier: 'tier2', pos: 4 }),
      tableEntry({ season: 2005, tier: 'tier2', pos: 1, wasPromoted: true }),
      tableEntry({ season: 2006, tier: 'tier1', pos: 20, wasRelegated: true }),
    ]);

    expect(milestones.longestTrackedRun).toEqual({
      startSeason: 2005,
      endSeason: 2006,
      seasons: [2005, 2006],
      rowCount: 2,
    });
    expect(milestones.longestNonWartimeGap).toEqual({
      fromSeason: 2002,
      toSeason: 2004,
      seasons: 3,
    });
    expect(milestones.promotionSeasons).toEqual([2005]);
    expect(milestones.relegationSeasons).toEqual([2006]);
  });
});

function tableEntry(overrides: Partial<LeagueTableEntry>): LeagueTableEntry {
  return {
    season: 2025,
    tier: 'tier1',
    teamId: 1,
    clubId: 'alpha fc',
    pos: 1,
    played: 38,
    won: 20,
    drawn: 10,
    lost: 8,
    goalsFor: 60,
    goalsAgainst: 40,
    goalDifference: 20,
    goalAverage: null,
    points: 70,
    notes: null,
    wasRelegated: false,
    wasPromoted: false,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
    ...overrides,
  };
}
