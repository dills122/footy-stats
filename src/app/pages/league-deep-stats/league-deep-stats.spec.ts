import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { of } from 'rxjs';
import { LeagueDeepStats } from './league-deep-stats';

describe('LeagueDeepStats', () => {
  let fixture: ComponentFixture<LeagueDeepStats>;
  let store: InstanceType<typeof LeagueStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueDeepStats],
      providers: [
        LeagueStore,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ tier: 'tier1' })),
            snapshot: {
              paramMap: convertToParamMap({ tier: 'tier1' }),
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

    store = TestBed.inject(LeagueStore);
    store.hydrate(deepStatsFixture(), (teamName: string) => `${teamName.toLowerCase()} id`);
    fixture = TestBed.createComponent(LeagueDeepStats);
    fixture.detectChanges();
  });

  it('renders dense league sections with table links', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Deep Stats');
    expect(element.textContent).toContain('Club Leaderboards');
    expect(element.textContent).toContain('Close Seasons');
    expect(element.textContent).toContain('High-Churn Seasons');

    const tableLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((link) =>
      link.textContent?.includes('2021')
    );
    expect(tableLink?.getAttribute('href')).toContain('/tables?season=2021&tier=tier1');

    const clubLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find(
      (link) =>
        link.textContent?.trim() === 'Alpha FC' && link.getAttribute('href')?.includes('/teams/')
    );
    expect(clubLink?.getAttribute('href')).toBe('/teams/alpha%20fc%20id');
  });
});

function deepStatsFixture() {
  return {
    seasons: {
      2020: {
        tier1: [
          row('Alpha FC', 1, 80, 70, 30, false, false),
          row('Bravo Town', 2, 79, 68, 31, false, false),
          row('Echo Rovers', 3, 35, 42, 60, true, false),
        ],
        tier2: [
          row('Charlie City', 1, 84, 76, 35, false, true),
          row('Delta United', 2, 83, 68, 38, false, false),
        ],
      },
      2021: {
        tier1: [
          row('Alpha FC', 1, 85, 74, 28, false, false),
          row('Charlie City', 2, 82, 70, 35, false, false),
          row('Bravo Town', 3, 40, 46, 58, true, false),
        ],
        tier2: [row('Delta United', 1, 88, 78, 34, false, true)],
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
