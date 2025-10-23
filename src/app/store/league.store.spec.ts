import { TestBed } from '@angular/core/testing';
import { LeagueStore } from './league.store';

describe('LeagueStore', () => {
  let store: any;
  const getTeam = (name: string) => store.getTeams().find((team: any) => team.name === name);

  const rawData = {
    seasons: {
      2020: {
        tier1: [
          {
            team: 'Alpha FC',
            pos: 1,
            played: 38,
            won: 26,
            drawn: 9,
            lost: 3,
            goalsFor: 82,
            goalsAgainst: 30,
            goalDifference: 52,
            goalAverage: null,
            points: 87,
            notes: 'Champions',
            wasRelegated: false,
            wasPromoted: false,
            isExpansionTeam: false,
            wasReElected: false,
            wasReprieved: false,
          },
          {
            team: 'Bravo United',
            pos: 2,
            played: 38,
            won: 24,
            drawn: 8,
            lost: 6,
            goalsFor: 68,
            goalsAgainst: 35,
            goalDifference: 33,
            goalAverage: null,
            points: 80,
            notes: null,
            wasRelegated: false,
            wasPromoted: false,
            isExpansionTeam: false,
            wasReElected: false,
            wasReprieved: false,
          },
        ],
        tier2: {
          table: [
            {
              team: 'Charlie Town',
              pos: 1,
              played: 38,
              won: 24,
              drawn: 8,
              lost: 6,
              goalsFor: 70,
              goalsAgainst: 40,
              goalDifference: null,
              goalAverage: null,
              points: 80,
              notes: 'Promoted',
              wasRelegated: false,
              wasPromoted: true,
              isExpansionTeam: false,
              wasReElected: false,
              wasReprieved: false,
            },
            {
              team: 'Delta City',
              pos: 22,
              played: 38,
              won: 8,
              drawn: 10,
              lost: 20,
              goalsFor: 35,
              goalsAgainst: 60,
              goalDifference: -25,
              goalAverage: null,
              points: 34,
              notes: 'Relegated',
              wasRelegated: true,
              wasPromoted: false,
              isExpansionTeam: false,
              wasReElected: false,
              wasReprieved: false,
            },
          ],
        },
      },
      2021: {
        tier1: [
          {
            team: 'Alpha FC',
            pos: 2,
            played: 38,
            won: 25,
            drawn: 6,
            lost: 7,
            goalsFor: 78,
            goalsAgainst: 38,
            goalDifference: 40,
            goalAverage: null,
            points: 81,
            notes: null,
            wasRelegated: false,
            wasPromoted: false,
            isExpansionTeam: false,
            wasReElected: false,
            wasReprieved: false,
          },
          {
            team: 'Charlie Town',
            pos: 6,
            played: 38,
            won: 18,
            drawn: 9,
            lost: 11,
            goalsFor: 58,
            goalsAgainst: 46,
            goalDifference: 12,
            goalAverage: null,
            points: 63,
            notes: null,
            wasRelegated: false,
            wasPromoted: false,
            isExpansionTeam: false,
            wasReElected: false,
            wasReprieved: false,
          },
        ],
        tier2: [
          {
            team: 'Echo Rovers',
            pos: 1,
            played: 38,
            won: 23,
            drawn: 9,
            lost: 6,
            goalsFor: 64,
            goalsAgainst: 39,
            goalDifference: 25,
            goalAverage: null,
            points: 78,
            notes: 'Promoted',
            wasRelegated: false,
            wasPromoted: true,
            isExpansionTeam: false,
            wasReElected: false,
            wasReprieved: false,
          },
          {
            team: 'Foxtrot FC',
            pos: 22,
            played: 38,
            won: 7,
            drawn: 12,
            lost: 19,
            goalsFor: 32,
            goalsAgainst: 58,
            goalDifference: -26,
            goalAverage: null,
            points: 33,
            notes: 'Relegated',
            wasRelegated: true,
            wasPromoted: false,
            isExpansionTeam: false,
            wasReElected: false,
            wasReprieved: false,
          },
        ],
      },
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LeagueStore],
    });

    store = TestBed.inject(LeagueStore);
    store.hydrate(rawData);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hydrates state with normalized tables, teams, and seasons', () => {
    expect(store.getSeasons()).toEqual([2020, 2021]);

    const teams = store.getTeams().map((team: any) => team.name);
    expect(teams).toEqual(
      expect.arrayContaining([
        'Alpha FC',
        'Bravo United',
        'Charlie Town',
        'Delta City',
        'Echo Rovers',
        'Foxtrot FC',
      ])
    );

    const charlieTeam = getTeam('Charlie Town');
    expect(charlieTeam).toBeDefined();

    const charlieEntry = store
      .getFullTable(2020, 'tier2')
      .find((entry: any) => entry.teamId === charlieTeam.id);
    expect(charlieEntry).toBeDefined();

    expect(charlieEntry.goalDifference).toBe(30);
    expect(store.getFullTable()).toHaveLength(8);
  });

  it('filters table entries by season and tier', () => {
    expect(store.getFullTable(2020)).toHaveLength(4);
    expect(store.getFullTable(2020, 'tier1')).toHaveLength(2);

    const tier2Names = store.getFullTable(2021, 'tier2').map((entry: any) => entry.teamId);
    const tier2Teams = tier2Names.map((id: number) => store.getTeamById(id).name).sort();
    expect(tier2Teams).toEqual(['Echo Rovers', 'Foxtrot FC']);
  });

  it('returns sorted tiers grouped by season', () => {
    expect(store.getSeasonTiers()).toEqual([
      { season: 2020, tiers: ['tier1', 'tier2'] },
      { season: 2021, tiers: ['tier1', 'tier2'] },
    ]);
  });

  it('provides team lookup helpers', () => {
    const alpha = getTeam('Alpha FC');
    expect(alpha).toBeDefined();

    expect(store.getTeamById(alpha.id)).toEqual(alpha);
    expect(store.getTeamNameById(alpha.id)).toBe('Alpha FC');
    expect(store.getTeamNameById(9999)).toBe('Unknown');
  });

  it('returns each team season history', () => {
    const charlie = getTeam('Charlie Town');
    expect(charlie).toBeDefined();

    const history = store.getSeasonsAndTiersForTeam(charlie.id);

    expect(history).toEqual([
      { season: 2020, tier: 'tier2' },
      { season: 2021, tier: 'tier1' },
    ]);
  });

  it('builds a team overview with positional data', () => {
    const alpha = getTeam('Alpha FC');
    expect(alpha).toBeDefined();

    const overview = store.getTeamOverview(alpha.id);

    expect(overview.team).toEqual(alpha);
    expect(overview.seasons).toEqual([
      { season: 2020, tier: 'tier1', pos: 1 },
      { season: 2021, tier: 'tier1', pos: 2 },
    ]);
  });

  it('maps promotion and relegation teams for a tier', () => {
    const info = store.getPromotionRelegationInfo(2020, 'tier2');

    expect(info.promoted.map((team: any) => team.name)).toEqual(['Charlie Town']);
    expect(info.relegated.map((team: any) => team.name)).toEqual(['Delta City']);

    const topTier = store.getPromotionRelegationInfo(2020, 'tier1');
    expect(topTier.promoted).toEqual([]);
    expect(topTier.relegated).toEqual([]);
  });

  it('returns empty promotion and relegation info when there is no data', () => {
    expect(store.getPromotionRelegationInfo(2035, 'tier1')).toEqual({
      promoted: [],
      relegated: [],
    });
  });
});
