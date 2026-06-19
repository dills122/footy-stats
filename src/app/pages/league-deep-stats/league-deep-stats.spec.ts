import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { of } from 'rxjs';
import { LeagueDeepStats } from './league-deep-stats';

jest.mock('echarts/charts', () => ({ BarChart: {}, LineChart: {} }));
jest.mock('echarts/components', () => ({
  DataZoomComponent: {},
  GridComponent: {},
  LegendComponent: {},
  TooltipComponent: {},
}));
jest.mock('echarts/core', () => ({ use: jest.fn() }));
jest.mock('echarts/renderers', () => ({ CanvasRenderer: {} }));
jest.mock('ngx-echarts', () => {
  const core = jest.requireActual('@angular/core');
  class MockNgxEchartsDirective {}
  core.Directive({ selector: '[echarts]' })(MockNgxEchartsDirective);
  core.Input()(MockNgxEchartsDirective.prototype, 'options');
  core.Input()(MockNgxEchartsDirective.prototype, 'autoResize');

  return {
    NgxEchartsDirective: MockNgxEchartsDirective,
    provideEchartsCore: () => [],
  };
});

describe('LeagueDeepStats', () => {
  let fixture: ComponentFixture<LeagueDeepStats>;
  let component: LeagueDeepStats;
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
    component = fixture.componentInstance;
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

    expect(element.textContent).toContain('Season Competitiveness');
    expect(element.querySelector('.competitiveness-chart')?.getAttribute('aria-label')).toBe(
      'Title gap and table compression by season'
    );
    expect(element.textContent).toContain('Unique Clubs by Decade');
    expect(element.querySelector('.decade-chart')?.getAttribute('aria-label')).toBe(
      'Unique clubs by decade'
    );
  });

  it('builds a season competitiveness chart from title and table gaps', () => {
    expect(component.competitivenessChartRows().map((row) => row.season)).toEqual([2020, 2021]);
    expect(component.competitivenessChartOptions()).toMatchObject({
      xAxis: {
        data: ['2020', '2021'],
      },
      series: [
        {
          name: 'Title gap',
          type: 'line',
          data: [1, 3],
        },
        {
          name: 'Champion to middle',
          type: 'line',
          data: [1, 3],
        },
        {
          name: 'Champion to last',
          type: 'line',
          data: [45, 45],
        },
      ],
    });
  });

  it('builds a unique clubs by decade chart', () => {
    expect(component.uniqueClubsChartRows().map((row) => row.label)).toEqual(['2020s']);
    expect(component.uniqueClubsChartOptions()).toMatchObject({
      xAxis: {
        data: ['2020s'],
      },
      series: [
        {
          name: 'Unique clubs',
          type: 'bar',
          data: [4],
        },
      ],
    });
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
