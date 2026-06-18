import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService, type DataLoadStatus } from '@app/store/services/hydrate-store-json';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let store: InstanceType<typeof LeagueStore>;
  let loadStatus: WritableSignal<DataLoadStatus>;
  let showLoadingState: WritableSignal<boolean>;
  let loadDataSpy: jest.Mock;
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(async () => {
    originalMatchMedia = window.matchMedia;
    loadStatus = signal<DataLoadStatus>('idle');
    showLoadingState = signal(false);
    loadDataSpy = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [Home],

      providers: [
        provideRouter([]),
        LeagueStore,
        {
          provide: DataLoaderService,
          useValue: {
            loadStatus,
            loadError: signal(null),
            showLoadingState,
            loadData: loadDataSpy,
          },
        },
      ],
    }).compileComponents();

    store = TestBed.inject(LeagueStore);
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    jest.useRealTimers();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reserves archive metrics without flashing loading UI before delayed loading is visible', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(component.archiveLoaded()).toBe(false);
    expect(element.querySelector('h1')?.textContent).toContain('Explore English football history.');
    expect(element.querySelectorAll('.metric-placeholder')).toHaveLength(3);
    expect(element.querySelectorAll('.metric-placeholder--visible')).toHaveLength(0);
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('shows static archive loading state after the loader disclosure delay', () => {
    loadStatus.set('loading');
    showLoadingState.set(true);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(component.showArchiveLoading()).toBe(true);
    expect(element.querySelectorAll('.metric-placeholder--visible')).toHaveLength(3);
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Loading archive coverage.'
    );
  });

  it('shows archive load failure with a retry action', () => {
    loadStatus.set('error');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Archive coverage could not load.'
    );

    element.querySelector<HTMLButtonElement>('button')?.click();

    expect(loadDataSpy).toHaveBeenCalledTimes(1);
  });

  it('shows archive counts after data hydrates', () => {
    store.hydrate({
      seasons: {
        2024: {
          tier1: [tableRow('Alpha FC')],
          tier2: [tableRow('Bravo Town')],
        },
        2025: {
          tier1: [tableRow('Alpha FC')],
          tier3: [tableRow('Charlie City')],
        },
      },
    });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(component.archiveLoaded()).toBe(true);
    expect(component.seasonsCount()).toBe(2);
    expect(component.teamsCount()).toBe(3);
    expect(component.tiersCount()).toBe(3);
    expect(element.querySelector('h1')?.textContent).toContain('Explore English football history.');
    expect(element.querySelectorAll('.metric-placeholder')).toHaveLength(0);
    expect(element.querySelector('.archive-meta')?.textContent).toContain('3 clubs');
  });

  it('reveals archive counts with a short ticker animation', () => {
    jest.useFakeTimers();

    store.hydrate(archiveFixture());
    fixture.detectChanges();

    expect(component.archiveTickerRunning()).toBe(true);
    expect(component.archiveTickerValues()['clubs']).toBeDefined();
    expect(fixture.nativeElement.querySelectorAll('.ticker-number--running')).toHaveLength(3);

    jest.advanceTimersByTime(760);
    fixture.detectChanges();

    expect(component.archiveTickerRunning()).toBe(false);
    expect(component.archiveTickerValues()).toMatchObject({
      seasons: '2',
      clubs: '3',
      'tracked tiers': '3',
    });
  });

  it('uses a simple final-value reveal on mobile instead of ticker cycling', () => {
    jest.useFakeTimers();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: query === '(max-width: 560px)',
      })),
    });

    store.hydrate(archiveFixture());
    fixture.detectChanges();

    expect(component.archiveTickerRunning()).toBe(false);
    expect(component.archiveSimpleRevealRunning()).toBe(true);
    expect(component.archiveTickerValues()).toMatchObject({
      seasons: '2',
      clubs: '3',
      'tracked tiers': '3',
    });
    expect(fixture.nativeElement.querySelectorAll('.ticker-number--running')).toHaveLength(0);
    expect(fixture.nativeElement.querySelectorAll('.ticker-number--simple-reveal')).toHaveLength(3);

    jest.advanceTimersByTime(420);
    fixture.detectChanges();

    expect(component.archiveSimpleRevealRunning()).toBe(false);
  });

  it('skips ticker motion when reduced motion is preferred', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({ matches: true }),
    });

    store.hydrate(archiveFixture());
    fixture.detectChanges();

    expect(component.archiveTickerRunning()).toBe(false);
    expect(fixture.nativeElement.querySelectorAll('.ticker-number--running')).toHaveLength(0);
    expect(component.archiveTickerValues()).toMatchObject({
      seasons: '2',
      clubs: '3',
      'tracked tiers': '3',
    });
  });
});

function archiveFixture() {
  return {
    seasons: {
      2024: {
        tier1: [tableRow('Alpha FC')],
        tier2: [tableRow('Bravo Town')],
      },
      2025: {
        tier1: [tableRow('Alpha FC')],
        tier3: [tableRow('Charlie City')],
      },
    },
  };
}

function tableRow(team: string) {
  return {
    team,
    pos: 1,
    played: 38,
    won: 24,
    drawn: 8,
    lost: 6,
    goalsFor: 70,
    goalsAgainst: 35,
    goalDifference: 35,
    goalAverage: null,
    points: 80,
    notes: null,
    wasRelegated: false,
    wasPromoted: false,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
  };
}
