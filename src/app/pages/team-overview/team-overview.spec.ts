import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { DataLoaderService, type DataLoadStatus } from '@app/store/services/hydrate-store-json';
import { of } from 'rxjs';
import { TeamOverview } from './team-overview';

jest.mock('echarts/charts', () => ({ LineChart: {} }));
jest.mock('echarts/components', () => ({
  GridComponent: {},
  MarkAreaComponent: {},
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

describe('TeamOverview', () => {
  let component: TeamOverview;
  let fixture: ComponentFixture<TeamOverview>;
  let loadStatus: WritableSignal<DataLoadStatus>;
  let showLoadingState: WritableSignal<boolean>;
  let loadDataSpy: jest.Mock;

  beforeEach(async () => {
    loadStatus = signal<DataLoadStatus>('idle');
    showLoadingState = signal(false);
    loadDataSpy = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [TeamOverview],
      providers: [
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
            loadStatus,
            loadError: signal(null),
            showLoadingState,
            loadData: loadDataSpy,
          },
        },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('does not show a profile loading banner until the loader discloses slow loading', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.loading')).toBeNull();

    loadStatus.set('loading');
    showLoadingState.set(true);
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Loading club profile...'
    );
  });

  it('shows a retryable error state when profile data fails to load', () => {
    loadStatus.set('error');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Club profile data could not load.'
    );

    element.querySelector<HTMLButtonElement>('button')?.click();

    expect(loadDataSpy).toHaveBeenCalledTimes(1);
  });

  it('builds a teams back link query param from hidden navigation state', () => {
    component.teamsReturnLetter.set('A');
    component.teamsReturnFilter.set('top-flight');

    expect(component.backToTeamsQueryParams()).toEqual({ letter: 'A', filter: 'top-flight' });
  });

  it('labels identity periods ending in the latest tracked season as current', () => {
    component.latestDataSeason = (() => 2025) as typeof component.latestDataSeason;

    expect(
      component.identityPeriodRangeLabel({
        name: 'Alpha FC',
        startSeason: 2024,
        endSeason: 2025,
        omittedRanges: [],
      })
    ).toBe('2024-current (2025)');
  });

  it('builds historical status copy from metadata sources', () => {
    component.statusLabel = (() => 'historical') as typeof component.statusLabel;
    component.relationshipRows = (() => []) as unknown as typeof component.relationshipRows;
    component.club = (() => ({
      clubId: 'example fc',
      canonicalName: 'Example FC',
      derived: {
        source: 'football-data-output',
        aliases: ['Example FC'],
        identitySources: [
          {
            type: 'former-clubs-list',
            sourceUrl: 'https://example.com/former-clubs',
            notes: 'Former clubs list distinguishes this historical record.',
          },
        ],
        observedNames: [],
        observedNamePeriods: [],
        firstSeenSeason: 1890,
        lastSeenSeason: 1900,
        seasonsSeen: [],
        totalSeasonsSeen: 1,
        tiersSeen: [],
        tierSeasons: [],
      },
    })) as unknown as typeof component.club;

    expect(component.historicalStatusSummary()).toEqual({
      label: 'historical',
      summary: 'Historical in this archive after 1900.',
      detail: 'No explicit fold, merger, or exit reason is recorded in metadata yet.',
      sourceUrl: 'https://example.com/former-clubs',
      sourceLabel: 'Metadata source',
      sourceNote: 'Former clubs list distinguishes this historical record.',
    });
  });

  it('labels the tracked season range as current when it reaches the latest season', () => {
    component.latestDataSeason = (() => 2025) as typeof component.latestDataSeason;
    component.club = (() => ({
      clubId: 'example fc',
      canonicalName: 'Example FC',
      derived: {
        source: 'football-data-output',
        aliases: ['Example FC'],
        observedNames: [],
        observedNamePeriods: [],
        firstSeenSeason: 2020,
        lastSeenSeason: 2025,
        seasonsSeen: [],
        totalSeasonsSeen: 6,
        tiersSeen: [],
        tierSeasons: [],
      },
    })) as unknown as typeof component.club;

    expect(component.trackedSeasonRangeLabel()).toBe('2020 to current (2025)');
  });
});
