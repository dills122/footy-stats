import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, ParamMap, provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { BehaviorSubject, of } from 'rxjs';
import { TierProfile } from './tier-profile';

describe('TierProfile', () => {
  let fixture: ComponentFixture<TierProfile>;
  let component: TierProfile;
  let store: InstanceType<typeof LeagueStore>;
  let paramMap$: BehaviorSubject<ParamMap>;
  let queryParamMap$: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    paramMap$ = new BehaviorSubject(convertToParamMap({ tier: 'tier1' }));
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [TierProfile],
      providers: [
        LeagueStore,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: paramMap$.asObservable(),
            queryParamMap: queryParamMap$.asObservable(),
            snapshot: {
              paramMap: convertToParamMap({ tier: 'tier1' }),
              queryParamMap: convertToParamMap({}),
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
    expect(element.textContent).toContain('Era View');
    expect(element.textContent).toContain('Dominance');
    expect(element.textContent).toContain('Most titles');
    expect(element.textContent).toContain('Top-three finishes');
    expect(element.textContent).toContain('2 titles');
    expect(element.textContent).toContain('2 seasons (2020-2021)');
    expect(element.textContent).not.toContain('Regional Third Division data');
  });

  it('links close races to the selected table archive season', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll<HTMLAnchorElement>('a'));
    const tableLink = links.find((link) => link.textContent?.includes('2020'));

    expect(tableLink?.getAttribute('href')).toContain('/tables?season=2020&tier=tier1');
  });

  it('links the action row to the latest table in the selected view', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll<HTMLAnchorElement>('a'));
    const latestTableLink = links.find((link) => link.textContent?.includes('View latest table'));

    expect(latestTableLink?.getAttribute('href')).toContain('/tables?season=2021&tier=tier1');
  });

  it('links to the deep stats route for the selected tier', () => {
    const links = Array.from(fixture.nativeElement.querySelectorAll<HTMLAnchorElement>('a'));
    const deepStatsLink = links.find((link) => link.textContent?.includes('Deep stats'));

    expect(deepStatsLink?.getAttribute('href')).toBe('/leagues/tier1/deep-stats');
  });

  it('collapses secondary close season sections by default', () => {
    const element: HTMLElement = fixture.nativeElement;
    const survivalToggle = Array.from(element.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.includes('Survival races')
    );
    const survivalList = element.querySelector<HTMLElement>('#survival-race-list');

    expect(component.isRaceSectionExpanded('title')).toBe(true);
    expect(component.isRaceSectionExpanded('survival')).toBe(false);
    expect(survivalToggle?.getAttribute('aria-expanded')).toBe('false');
    expect(survivalList?.hidden).toBe(true);

    survivalToggle?.click();
    fixture.detectChanges();

    expect(component.isRaceSectionExpanded('survival')).toBe(true);
    expect(survivalToggle?.getAttribute('aria-expanded')).toBe('true');
    expect(survivalList?.hidden).toBe(false);
  });

  it('filters profile data by the selected era query param', () => {
    queryParamMap$.next(convertToParamMap({ era: 'goal-average' }));
    fixture.detectChanges();

    expect(component.profile()?.seasons).toEqual([1975]);
    expect(fixture.nativeElement.textContent).toContain('Showing 1975');
  });

  it('shows a targeted data note for regional Third Division seasons', () => {
    paramMap$.next(convertToParamMap({ tier: 'tier4' }));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Regional Third Division data');
    expect(text).toContain('both represent pyramid level 3');
    expect(text).toContain('Affected seasons: 1921');
  });
});

function tierProfileFixture() {
  return {
    seasons: {
      1975: {
        tier1: [
          row('Alpha FC', 1, 50, 60, 30, false, false),
          row('Bravo Town', 2, 49, 70, 40, false, false),
        ],
      },
      1921: {
        tier4: [
          row('Charlie City', 1, 40, 60, 30, false, false),
          row('Delta United', 2, 39, 58, 31, false, false),
        ],
      },
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
