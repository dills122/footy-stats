import type { LeagueTableEntry } from '@app/store/league.models';
import { buildTeamDeepStatsData } from './team-deep-stats';

describe('buildTeamDeepStatsData', () => {
  it('builds dense totals, tier rows, movement rows, and record marks', () => {
    const data = buildTeamDeepStatsData(
      [
        entry(2020, 'tier1', 2, 80, 70, 35, false, false),
        entry(2021, 'tier1', 1, 91, 86, 30, false, false),
        entry(2022, 'tier2', 3, 74, 68, 42, false, true),
      ],
      () => 'Alpha FC',
      (tier) => (tier === 'tier1' ? 'Premier League' : 'Championship')
    );

    expect(data.totals.seasons).toBe(3);
    expect(data.totals.points).toBe(245);
    expect(data.totals.averagePosition).toBe(2);
    expect(data.recordMarks.map((mark) => mark.label)).toContain('Best points per game');
    expect(data.tierRows).toEqual([
      expect.objectContaining({
        tier: 'tier1',
        seasons: 2,
        bestPosition: 1,
        points: 171,
      }),
      expect.objectContaining({
        tier: 'tier2',
        seasons: 1,
        movementEvents: 1,
      }),
    ]);
    expect(data.movementRows).toHaveLength(1);
    expect(data.movementRows[0]).toMatchObject({
      season: 2022,
      movementLabel: 'Promoted',
    });
  });
});

function entry(
  season: number,
  tier: string,
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
    teamId: 1,
    clubId: 'alpha fc',
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
