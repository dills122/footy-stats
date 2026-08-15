import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { of } from 'rxjs';
import { MovementExplorer } from './movement-explorer';

jest.mock('echarts/charts', () => ({ LineChart: {} }));
jest.mock('echarts/components', () => ({
  AriaComponent: {},
  DataZoomComponent: {},
  GridComponent: {},
  LegendComponent: {},
  MarkAreaComponent: {},
  MarkPointComponent: {},
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

describe('MovementExplorer chart presentation', () => {
  let component: MovementExplorer;
  let fixture: ComponentFixture<MovementExplorer>;

  beforeEach(async () => {
    document.documentElement.dataset['theme'] = 'terrace';
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });

    await TestBed.configureTestingModule({
      imports: [MovementExplorer],
      providers: [
        LeagueStore,
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({})),
            snapshot: { queryParamMap: convertToParamMap({}) },
          },
        },
      ],
    }).compileComponents();

    const leagueStore = TestBed.inject(LeagueStore);
    leagueStore.hydrate(movementFixture());

    fixture = TestBed.createComponent(MovementExplorer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    document.documentElement.removeAttribute('data-theme');
  });

  it('keeps dense Terrace comparisons legible and makes inactive clubs distinct', () => {
    component.selectedTeamIds.set([1, 2, 3, 4, 5, 6]);
    component.selectedStartSeason.set(2024);
    component.selectedEndSeason.set(2025);

    const options = component.chartOptions() as {
      aria: { enabled: boolean; description: string };
      legend: {
        inactiveColor: string;
        inactiveBorderColor: string;
        textStyle: { color: string; fontWeight: number };
      };
      xAxis: { axisLabel: { color: string } };
      yAxis: { axisLabel: { color: string } };
      dataZoom: { backgroundColor: string; bottom: number; textStyle: { color: string } }[];
      series: { lineStyle: { opacity: number; width: number } }[];
    };

    expect(options.aria.enabled).toBe(true);
    expect(options.aria.description).toBe(
      'Club movement by tier from 2024 to 2025 for Arsenal, Chelsea, Liverpool, Manchester City, Manchester United, and Tottenham Hotspur.'
    );
    expect(options.legend).toMatchObject({
      inactiveColor: '#68766e',
      inactiveBorderColor: '#68766e',
      textStyle: {
        color: '#17362b',
        fontWeight: 700,
      },
    });
    expect(options.xAxis.axisLabel.color).toBe('#3b554a');
    expect(options.yAxis.axisLabel.color).toBe('#17362b');
    expect(options.dataZoom[0]).toMatchObject({
      backgroundColor: '#e8dfc7',
      bottom: 12,
      textStyle: { color: '#3b554a' },
    });
    expect(options.series).toHaveLength(6);
    expect(options.series.every((series) => series.lineStyle.opacity >= 0.88)).toBe(true);
    expect(options.series.every((series) => series.lineStyle.width >= 2.4)).toBe(true);
  });
});

function movementFixture() {
  const teams = [
    'Arsenal',
    'Chelsea',
    'Liverpool',
    'Manchester City',
    'Manchester United',
    'Tottenham Hotspur',
  ];

  return {
    seasons: {
      2024: {
        tier1: teams.map((team, index) => row(team, index + 1)),
      },
      2025: {
        tier1: teams.map((team, index) => row(team, index + 1)),
      },
    },
  };
}

function row(team: string, pos: number) {
  return {
    team,
    pos,
    played: 38,
    won: 20,
    drawn: 8,
    lost: 10,
    goalsFor: 60,
    goalsAgainst: 40,
    goalDifference: 20,
    goalAverage: null,
    points: 68,
    notes: null,
    wasRelegated: false,
    wasPromoted: false,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
  };
}
