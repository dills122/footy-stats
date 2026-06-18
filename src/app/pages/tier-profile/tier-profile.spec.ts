import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { of } from 'rxjs';
import { TierProfile } from './tier-profile';

describe('TierProfile', () => {
  let fixture: ComponentFixture<TierProfile>;
  let component: TierProfile;
  let store: InstanceType<typeof LeagueStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TierProfile],
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
    store.hydrate(tierProfileFixture(), (teamName: string) => `${teamName.toLowerCase()} id`);
    fixture = TestBed.createComponent(TierProfile);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders tier movement and close season context', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(component.tierLabel()).toBe('Premier League');
    expect(element.querySelector('h1')?.textContent).toContain('Premier League');
    expect(element.textContent).toContain('Most promoted into Premier League');
    expect(element.textContent).toContain('Most relegated from Premier League');
    expect(element.textContent).toContain('Close Seasons');
  });

  it('links close races to the selected table archive season', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll<HTMLAnchorElement>('a'));
    const tableLink = links.find((link) => link.textContent?.includes('2020'));

    expect(tableLink?.getAttribute('href')).toContain('/tables?season=2020&tier=tier1');
  });
});

function tierProfileFixture() {
  return {
    seasons: {
      2020: {
        tier1: [
          row('Alpha FC', 1, 82, 80, 30, false, false),
          row('Bravo Town', 2, 81, 76, 35, false, false),
          row('Delta United', 3, 39, 42, 55, false, false),
          row('Echo Rovers', 4, 38, 36, 60, true, false),
        ],
        tier2: [
          row('Charlie City', 1, 84, 74, 35, false, true),
          row('Delta United', 2, 83, 68, 40, false, true),
          row('Echo Rovers', 3, 82, 64, 42, false, false),
        ],
      },
      2021: {
        tier1: [
          row('Bravo Town', 1, 90, 88, 25, false, false),
          row('Alpha FC', 2, 83, 70, 30, false, false),
          row('Charlie City', 3, 44, 52, 49, false, false),
        ],
        tier2: [row('Charlie City', 1, 86, 79, 30, false, true)],
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
