import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { BehaviorSubject } from 'rxjs';
import { RivalryComparison } from './rivalry-comparison';

jest.mock('echarts/charts', () => ({ LineChart: {} }));
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

describe('RivalryComparison', () => {
  let component: RivalryComparison;
  let fixture: ComponentFixture<RivalryComparison>;
  let store: InstanceType<typeof LeagueStore>;
  let params: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    params = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [RivalryComparison],
      providers: [
        LeagueStore,
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: params, snapshot: { queryParamMap: params.value } },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(LeagueStore);
    store.hydrate(rivalryFixture(), (teamName: string) => `${teamName.toLowerCase()} id`);
    fixture = TestBed.createComponent(RivalryComparison);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the rivalry workbench with shared season rows', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Rivalry Comparison');
    expect(element.textContent).toContain('Known Rivalries');
    expect(component.availablePresets().map((preset) => preset.id)).toContain('north-london');
    expect(component.activePresetId()).toBe('north-london');
    const pickers = element.querySelectorAll<HTMLInputElement>('app-club-picker input');
    expect(pickers[0].value).toBe('Arsenal');
    expect(pickers[1].value).toBe('Tottenham Hotspur');
    expect(element.textContent).toContain('Shared Season Rows');
    expect(component.scorecard()).toMatchObject({
      sharedSeasons: 3,
      firstHigher: 1,
      secondHigher: 2,
      sameTier: 2,
    });

    const tableLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((link) =>
      link.textContent?.includes('2022')
    );
    expect(tableLink?.getAttribute('href')).toBe('/tables?season=2022&tier=tier1');
    expect(element.querySelector('.rivalry-chart')?.getAttribute('aria-label')).toBe(
      'Relative standing by shared season'
    );
  });

  it('builds relative standing, same-tier points gap, and tier path charts', () => {
    expect(component.chartRows().map((row) => row.season)).toEqual([2020, 2021, 2022]);
    expect(component.relativeStandingChartOptions()).toMatchObject({
      xAxis: {
        data: ['2020', '2021', '2022'],
      },
      series: [
        {
          name: 'Relative standing',
          type: 'line',
          data: [1, -98, -1],
        },
      ],
    });
    expect(component.pointsGapChartOptions()).toMatchObject({
      xAxis: {
        data: ['2020', '2022'],
      },
      series: [
        {
          name: 'Points gap',
          type: 'line',
          data: [2, -4],
        },
      ],
    });
    expect(component.tierPathChartOptions()).toMatchObject({
      series: [
        {
          name: 'Arsenal',
          type: 'line',
          data: [1, 2, 1],
        },
        {
          name: 'Tottenham Hotspur',
          type: 'line',
          data: [1, 1, 1],
        },
      ],
    });
  });

  it('writes club names to the URL and restores differently linked pairs', () => {
    const charlie = store.getTeams().find((team) => team.name === 'Charlie City')!;
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.selectSecondClub(charlie);
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { first: 'Arsenal', second: 'Charlie City' },
        queryParamsHandling: 'merge',
      })
    );

    params.next(convertToParamMap({ first: 'Arsenal', second: 'Charlie City' }));
    fixture.detectChanges();
    expect(component.selectedTeams().second?.name).toBe('Charlie City');
    expect(component.comparisonRows().map((row) => row.season)).toEqual([2021]);

    params.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(component.selectedTeams().second?.name).toBe('Tottenham Hotspur');
    expect(component.activePresetId()).toBe('north-london');
  });
});

function rivalryFixture() {
  return {
    seasons: {
      2020: {
        tier1: [row('Arsenal', 1, 82), row('Tottenham Hotspur', 2, 80)],
      },
      2021: {
        tier1: [row('Tottenham Hotspur', 3, 66), row('Charlie City', 4, 61)],
        tier2: [row('Arsenal', 1, 91)],
      },
      2022: {
        tier1: [row('Tottenham Hotspur', 1, 88), row('Arsenal', 2, 84)],
      },
    },
  };
}

function row(team: string, pos: number, points: number) {
  return {
    team,
    pos,
    played: 38,
    won: 20,
    drawn: 8,
    lost: 10,
    goalsFor: 70,
    goalsAgainst: 35,
    goalDifference: 35,
    goalAverage: null,
    points,
    notes: null,
    wasRelegated: false,
    wasPromoted: false,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
  };
}
