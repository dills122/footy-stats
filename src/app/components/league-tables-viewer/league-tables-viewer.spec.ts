import { OverlayContainer } from '@angular/cdk/overlay';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  convertToParamMap,
  ActivatedRoute,
  ParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { DataIssueReportDialogService } from '@app/components/data-issue-report-dialog/data-issue-report-dialog.service';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService, type DataLoadStatus } from '@app/store/services/hydrate-store-json';
import { BehaviorSubject } from 'rxjs';
import { LeagueTablesViewerComponent } from './league-tables-viewer';

describe('LeagueTablesViewer', () => {
  let component: LeagueTablesViewerComponent;
  let fixture: ComponentFixture<LeagueTablesViewerComponent>;
  let store: InstanceType<typeof LeagueStore>;
  let queryParamMap$: BehaviorSubject<ParamMap>;
  let loadStatus: ReturnType<typeof signal<DataLoadStatus>>;
  let loadData: jest.Mock;

  beforeEach(async () => {
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));
    loadStatus = signal<DataLoadStatus>('idle');
    loadData = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [LeagueTablesViewerComponent],
      providers: [
        LeagueStore,
        provideHttpClient(),
        provideRouter([]),
        { provide: DataLoaderService, useValue: { loadStatus, loadData } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(LeagueStore);
    fixture = TestBed.createComponent(LeagueTablesViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders a stable table result shell before archive data hydrates', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toContain('League Tables');
    expect(element.querySelectorAll('.field-placeholder')).toHaveLength(2);
    expect(element.querySelector('.report-action-placeholder')).toBeTruthy();
    expect(element.querySelector('.table-result-shell')).toBeTruthy();
    expect(element.querySelector('.table-result-placeholder')).toBeTruthy();
    expect(element.querySelector('.table-result')).toBeNull();
  });

  it('reveals the selected table in the reserved shell after data hydrates', () => {
    jest.useFakeTimers();

    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(component.selectedYear()).toBe(2025);
    expect(component.selectedLeague()).toBe('tier1');
    expect(component.tableControlsReady()).toBe(true);
    expect(component.tableResultKey()).toBe('2025:tier1');
    expect(element.querySelectorAll('.field-placeholder')).toHaveLength(0);
    expect(element.querySelector('.record-header-action button')?.textContent).toContain(
      'Table tools'
    );
    expect(element.querySelector('.table-result-placeholder')).toBeNull();
    expect(element.querySelector('.table-result')).toBeTruthy();
    expect(component.tableRevealActive()).toBe(false);

    jest.advanceTimersByTime(20);
    fixture.detectChanges();

    expect(component.tableRevealActive()).toBe(true);
    expect(element.querySelector('.table-result--revealed')).toBeTruthy();
  });

  it('opens a report from Table tools with the selected season and competition', () => {
    queryParamMap$.next(convertToParamMap({ season: '2025', tier: 'tier2' }));
    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    element.querySelector<HTMLButtonElement>('.record-header-action button')!.click();
    fixture.detectChanges();

    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    const actions = Array.from(overlay.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
    actions.find((action) => action.textContent?.includes('Report table issue'))!.click();

    const dialog = TestBed.inject(DataIssueReportDialogService);
    expect(dialog.openRequest()?.context).toMatchObject({
      season: 2025,
      competition: 'Championship',
    });
  });

  it('renders valid notable table presets and applies a selected preset', () => {
    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const presetLabels = Array.from(element.querySelectorAll('.preset-chip span')).map((item) =>
      item.textContent?.trim()
    );

    expect(presetLabels).toContain('Latest top flight');
    expect(presetLabels).toContain('Premier League launch');
    expect(component.tablePresets().some((preset) => preset.tier === 'seasonInfo')).toBe(false);

    const premierLeagueLaunch = component
      .tablePresets()
      .find((preset) => preset.id === 'premier-league-launch');

    expect(premierLeagueLaunch).toBeTruthy();

    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.applyPreset(premierLeagueLaunch!);
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { season: 1992, tier: 'tier1' },
        queryParamsHandling: 'merge',
      })
    );

    queryParamMap$.next(convertToParamMap({ season: '1992', tier: 'tier1' }));
    fixture.detectChanges();

    expect(component.selectedYear()).toBe(1992);
    expect(component.selectedLeague()).toBe('tier1');
    expect(component.activePresetId()).toBe('premier-league-launch');
  });

  it('selects a linked season table from route query params', () => {
    queryParamMap$.next(convertToParamMap({ season: '1992', tier: 'tier2' }));
    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    expect(component.selectedYear()).toBe(1992);
    expect(component.selectedLeague()).toBe('tier2');
  });

  it('retains an available competition when changing seasons and restores earlier URL state', () => {
    store.hydrate(tableArchiveFixture());
    queryParamMap$.next(convertToParamMap({ season: '2025', tier: 'tier2' }));
    fixture.detectChanges();
    const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.onYearChange(1992);
    expect(navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: { season: 1992, tier: 'tier2' },
      })
    );

    queryParamMap$.next(convertToParamMap({ season: '1992', tier: 'tier2' }));
    fixture.detectChanges();
    expect(component.selectedYear()).toBe(1992);

    queryParamMap$.next(convertToParamMap({}));
    fixture.detectChanges();
    expect(component.selectedYear()).toBe(2025);
    expect(component.selectedLeague()).toBe('tier1');
  });

  it('falls back to an available competition without losing a valid linked season', () => {
    store.hydrate(tableArchiveFixture());
    queryParamMap$.next(convertToParamMap({ season: '1992', tier: 'tier7' }));
    fixture.detectChanges();
    expect(component.selectedYear()).toBe(1992);
    expect(component.selectedLeague()).toBe('tier1');
  });

  it('uses the archived competition name for the displayed table, export and report', () => {
    queryParamMap$.next(convertToParamMap({ season: '1888', tier: 'tier1' }));
    store.hydrate({
      seasons: {
        1888: {
          tier1: {
            table: [tableRow('Preston North End')],
            metadata: { title: 'The Football League' },
          },
        },
      },
    });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.record-selection')?.textContent).toContain(
      '1888 The Football League'
    );
    expect(component.exportSummary()).toMatchObject({ competition: 'The Football League' });
    expect(component.exportRows()[0]).toMatchObject({ competition: 'The Football League' });
    expect(component.dataIssueContext()).toMatchObject({ competition: 'The Football League' });
  });

  it('replaces loading placeholders with a retry action after a failed download', () => {
    loadStatus.set('error');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('could not load');
    expect(element.querySelector('.table-result-placeholder')).toBeNull();
    element.querySelector<HTMLButtonElement>('app-archive-load-state button')?.click();
    expect(loadData).toHaveBeenCalledTimes(1);
  });

  it('shows a targeted data note for selected regional Third Division tables', () => {
    queryParamMap$.next(convertToParamMap({ season: '1921', tier: 'tier4' }));
    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    expect(component.tableDataNotices().map((notice) => notice.id)).toEqual([
      'third-division-regional',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Regional Third Division data');
    expect(fixture.nativeElement.textContent).toContain('both represent pyramid level 3');
  });

  it('shows a targeted data note for selected parallel National League tables', () => {
    queryParamMap$.next(convertToParamMap({ season: '2025', tier: 'tier7' }));
    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    expect(component.tableDataNotices().map((notice) => notice.id)).toEqual([
      'national-league-regional',
    ]);
    expect(fixture.nativeElement.textContent).toContain('Parallel level 6 divisions');
    expect(fixture.nativeElement.textContent).toContain(
      'Tier7 should not be read as a true level 7'
    );
  });

  it('collapses and expands the preset strip from the control row', () => {
    store.hydrate(tableArchiveFixture());
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    const toggle = Array.from(element.querySelectorAll<HTMLButtonElement>('.control-action')).find(
      (button) => button.textContent?.includes('Hide presets')
    );

    expect(toggle).toBeTruthy();
    expect(component.quickFiltersCollapsed()).toBe(false);
    expect(element.querySelector('#table-presets')?.hasAttribute('hidden')).toBe(false);

    toggle?.click();
    fixture.detectChanges();

    expect(component.quickFiltersCollapsed()).toBe(true);
    expect(element.querySelector('#table-presets')?.hasAttribute('hidden')).toBe(true);
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');
  });

  it('scrolls focus to the table result shell from the control row', () => {
    const target = document.createElement('section');
    const scrollIntoView = jest.fn();
    const focus = jest.fn();
    target.scrollIntoView = scrollIntoView;
    target.focus = focus;

    component.scrollToTableContent(target);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});

function tableArchiveFixture() {
  return {
    seasons: {
      1921: {
        tier3: [tableRow('Third Division North FC')],
        tier4: [tableRow('Third Division South FC')],
      },
      1992: {
        seasonInfo: { table: [tableRow('Ignored Info Row')] },
        tier1: [tableRow('Arsenal'), tableRow('Aston Villa', 2)],
        tier2: [tableRow('Newcastle United')],
      },
      2025: {
        seasonInfo: { table: [tableRow('Ignored Current Info Row')] },
        tier1: [tableRow('Alpha FC'), tableRow('Bravo Town', 2)],
        tier2: [tableRow('Charlie City')],
        tier6: [tableRow('National North FC')],
        tier7: [tableRow('National South FC')],
      },
    },
  };
}

function tableRow(team: string, pos = 1) {
  return {
    team,
    pos,
    played: 38,
    won: 24,
    drawn: 8,
    lost: 6,
    goalsFor: 70 - pos,
    goalsAgainst: 35,
    goalDifference: 35 - pos,
    goalAverage: null,
    points: 80 - pos,
    notes: null,
    wasRelegated: false,
    wasPromoted: false,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
  };
}
