import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTablesViewerComponent } from './league-tables-viewer';

describe('LeagueTablesViewer', () => {
  let component: LeagueTablesViewerComponent;
  let fixture: ComponentFixture<LeagueTablesViewerComponent>;
  let store: InstanceType<typeof LeagueStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueTablesViewerComponent],
      providers: [LeagueStore, provideHttpClient()],
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
    expect(element.querySelector('.record-header-action .report-trigger')?.textContent).toContain(
      'Report table issue'
    );
    expect(element.querySelector('.table-result-placeholder')).toBeNull();
    expect(element.querySelector('.table-result')).toBeTruthy();
    expect(component.tableRevealActive()).toBe(false);

    jest.advanceTimersByTime(20);
    fixture.detectChanges();

    expect(component.tableRevealActive()).toBe(true);
    expect(element.querySelector('.table-result--revealed')).toBeTruthy();
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

    component.applyPreset(premierLeagueLaunch!);
    fixture.detectChanges();

    expect(component.selectedYear()).toBe(1992);
    expect(component.selectedLeague()).toBe('tier1');
    expect(component.activePresetId()).toBe('premier-league-launch');
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
      1992: {
        seasonInfo: { table: [tableRow('Ignored Info Row')] },
        tier1: [tableRow('Arsenal'), tableRow('Aston Villa', 2)],
        tier2: [tableRow('Newcastle United')],
      },
      2025: {
        seasonInfo: { table: [tableRow('Ignored Current Info Row')] },
        tier1: [tableRow('Alpha FC'), tableRow('Bravo Town', 2)],
        tier2: [tableRow('Charlie City')],
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
