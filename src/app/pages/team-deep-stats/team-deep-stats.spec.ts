import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { of } from 'rxjs';
import { TeamDeepStats } from './team-deep-stats';

describe('TeamDeepStats', () => {
  let fixture: ComponentFixture<TeamDeepStats>;
  let leagueStore: InstanceType<typeof LeagueStore>;
  let clubMetadataStore: InstanceType<typeof ClubMetadataStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamDeepStats],
      providers: [
        LeagueStore,
        ClubMetadataStore,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ clubId: 'alpha fc' })),
            snapshot: {
              paramMap: convertToParamMap({ clubId: 'alpha fc' }),
            },
          },
        },
        {
          provide: DataLoaderService,
          useValue: {
            loadStatus: signal('loaded'),
            loadError: signal(null),
            showLoadingState: signal(false),
            loadData: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    leagueStore = TestBed.inject(LeagueStore);
    clubMetadataStore = TestBed.inject(ClubMetadataStore);
    clubMetadataStore.hydrate(clubMetadataFixture());
    leagueStore.hydrate(teamStatsFixture(), (teamName: string) =>
      teamName === 'Alpha FC' ? 'alpha fc' : null
    );
    fixture = TestBed.createComponent(TeamDeepStats);
    fixture.detectChanges();
  });

  it('renders dense club sections with season table links', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Alpha FC');
    expect(element.textContent).toContain('Record Marks');
    expect(element.textContent).toContain('Tier Breakdown');
    expect(element.textContent).toContain('Season Rows');

    const tableLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((link) =>
      link.textContent?.includes('2021')
    );
    expect(tableLink?.getAttribute('href')).toContain('/tables?season=2021&tier=tier1');
  });
});

function clubMetadataFixture() {
  return {
    metadata: {
      schemaVersion: 1,
      generator: 'test',
      generatedAt: '2026-06-18T00:00:00.000Z',
      gitSha: 'test',
    },
    clubs: {
      'alpha fc': {
        canonicalName: 'Alpha FC',
        derived: {
          source: 'test',
          aliases: ['Alpha FC'],
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
}

function teamStatsFixture() {
  return {
    seasons: {
      2020: {
        tier1: [row('Alpha FC', 2, 80, 70, 30, false, false)],
      },
      2021: {
        tier1: [row('Alpha FC', 1, 91, 86, 28, false, false)],
      },
    },
  };
}

function row(
  team: string,
  pos: number,
  points: number,
  goalsFor: number,
  goalsAgainst: number,
  wasRelegated: boolean,
  wasPromoted: boolean
) {
  return {
    team,
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
