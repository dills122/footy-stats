import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { ClubMetadataDocument } from '../club-metadata.models';
import { LeagueStore } from '../league.store';
import { DataLoaderService } from './hydrate-store-json';

describe('DataLoaderService', () => {
  let service: DataLoaderService;
  let http: HttpTestingController;
  let store: InstanceType<typeof LeagueStore>;

  beforeEach(() => {
    jest.useFakeTimers();

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), LeagueStore],
    });

    service = TestBed.inject(DataLoaderService);
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(LeagueStore);
  });

  afterEach(() => {
    http.verify();
    jest.useRealTimers();
  });

  it('delays visible loading state and hydrates archive data', async () => {
    const loadPromise = service.loadData();

    expect(service.loadStatus()).toBe('loading');
    expect(service.showLoadingState()).toBe(false);

    jest.advanceTimersByTime(399);

    expect(service.showLoadingState()).toBe(false);

    jest.advanceTimersByTime(1);

    expect(service.showLoadingState()).toBe(true);

    http.expectOne('assets/seasons.json').flush(seasonsDocument());
    http.expectOne('assets/club-metadata.json').flush(clubMetadataDocument());

    await loadPromise;

    expect(service.loadStatus()).toBe('loaded');
    expect(service.showLoadingState()).toBe(false);
    expect(service.loadError()).toBeNull();
    expect(store.getSeasons()).toEqual([2024]);
    expect(store.getTeams().map((team) => team.name)).toEqual(['Alpha FC']);
  });

  it('records load failures without leaving loading visible', async () => {
    const loadPromise = service.loadData();

    http.expectOne('assets/seasons.json').flush('not found', {
      status: 404,
      statusText: 'Not Found',
    });
    http.expectOne('assets/club-metadata.json').flush(clubMetadataDocument());

    await loadPromise;

    expect(service.loadStatus()).toBe('error');
    expect(service.loadError()).toBeTruthy();
    expect(service.showLoadingState()).toBe(false);
  });
});

function seasonsDocument() {
  return {
    seasons: {
      2024: {
        tier1: [
          {
            team: 'Alpha FC',
            pos: 1,
            played: 38,
            won: 24,
            drawn: 8,
            lost: 6,
            goalsFor: 70,
            goalsAgainst: 35,
            goalDifference: 35,
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
      },
    },
  };
}

function clubMetadataDocument(): ClubMetadataDocument {
  return {
    metadata: {
      schemaVersion: 1,
      generator: 'test',
      generatedAt: '2026-01-01T00:00:00.000Z',
      gitSha: 'test',
    },
    clubs: {
      'alpha-fc': {
        canonicalName: 'Alpha FC',
        derived: {
          source: 'test',
          aliases: ['Alpha FC'],
          observedNames: [
            {
              rawName: 'Alpha FC',
              normalizedName: 'alpha fc',
              firstSeenSeason: 2024,
              lastSeenSeason: 2024,
              seasonsSeen: [2024],
              tiersSeen: ['tier1'],
            },
          ],
          observedNamePeriods: [{ name: 'Alpha FC', startSeason: 2024, endSeason: 2024 }],
          firstSeenSeason: 2024,
          lastSeenSeason: 2024,
          seasonsSeen: [2024],
          totalSeasonsSeen: 1,
          tiersSeen: ['tier1'],
          tierSeasons: [{ tierKey: 'tier1', seasons: [2024] }],
        },
      },
    },
  };
}
