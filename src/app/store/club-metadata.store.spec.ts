import { TestBed } from '@angular/core/testing';
import { ClubMetadataStore } from './club-metadata.store';

describe('ClubMetadataStore', () => {
  let store: any;

  const clubMetadataDocument = {
    metadata: {
      schemaVersion: 1,
      generator: 'club-metadata-seed',
      generatedAt: '2026-06-13T01:33:52.882Z',
      gitSha: 'b76157a',
      sourceFiles: ['all-seasons.json'],
      buildOptions: {},
    },
    clubs: {
      'alpha fc': {
        canonicalName: 'Alpha FC',
        status: {
          current: 'active',
          trackedFromSeason: 2020,
          trackedToSeason: null,
          hasUnexplainedGaps: false,
        },
        history: {
          nameHistory: [],
          lifecycleEvents: [],
          trackedMembership: [{ fromSeason: 2020, toSeason: null, tiers: ['tier1'] }],
          absenceExplanations: [],
        },
        derived: {
          source: 'football-data-output',
          aliases: ['Alpha FC', 'Alpha Football Club'],
          observedNames: [
            {
              rawName: 'Alpha FC',
              normalizedName: 'alpha fc',
              firstSeenSeason: 2020,
              lastSeenSeason: 2021,
              seasonsSeen: [2020, 2021],
              tiersSeen: ['tier1'],
            },
          ],
          observedNamePeriods: [{ name: 'Alpha FC', startSeason: 2020, endSeason: 2021 }],
          firstSeenSeason: 2020,
          lastSeenSeason: 2021,
          seasonsSeen: [2020, 2021],
          totalSeasonsSeen: 2,
          tiersSeen: ['tier1'],
          tierSeasons: [{ tierKey: 'tier1', seasons: [2020, 2021] }],
        },
      },
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClubMetadataStore],
    });

    store = TestBed.inject(ClubMetadataStore);
    store.hydrate(clubMetadataDocument);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('hydrates metadata and builds stable lookup indexes', () => {
    expect(store.getGeneratedAt()).toBe('2026-06-13T01:33:52.882Z');
    expect(store.getClubById('alpha fc')?.canonicalName).toBe('Alpha FC');
    expect(store.getClubByAlias('Alpha Football Club')?.clubId).toBe('alpha fc');
    expect(store.getClubIdForTeamSeason('Alpha FC', 2020)).toBe('alpha fc');
    expect(store.getClubIdForTeamSeason('Alpha FC', 2030)).toBeNull();
    expect(store.getClubByTeamSeason('Alpha FC', 2021)?.canonicalName).toBe('Alpha FC');
  });
});
