import { signal, type WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  Router,
  provideRouter,
} from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService, type DataLoadStatus } from '@app/store/services/hydrate-store-json';
import { BehaviorSubject } from 'rxjs';

import { Teams } from './teams';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;
  let router: Router;
  let loadStatus: WritableSignal<DataLoadStatus>;
  let showLoadingState: WritableSignal<boolean>;
  let loadDataSpy: jest.Mock;
  let params: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    loadStatus = signal<DataLoadStatus>('idle');
    showLoadingState = signal(false);
    loadDataSpy = jest.fn().mockResolvedValue(undefined);
    params = new BehaviorSubject(convertToParamMap({ letter: 'm', filter: 'historical' }));

    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: params,
            snapshot: { queryParamMap: params.value },
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
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Teams);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads the selected letter from the route query params', () => {
    expect(component.selectedLetter()).toBe('M');
  });

  it('reads the selected filter from the route query params', () => {
    expect(component.selectedFilter()).toBe('historical');
  });

  it('writes the selected letter to the route query params', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onLetterSelected('C');

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { letter: 'C' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('writes the selected filter to the route query params', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onFilterSelected('active');

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { filter: 'active' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('clears the filter query param when all teams are selected', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onFilterSelected('all');

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { filter: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('writes search input to the query string without pushing a history entry per keystroke', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    component.onSearchChanged('Manchester');

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { q: 'Manchester' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      info: { scrollPosition: [0, 0] },
    });
  });

  it('combines a linked name search with category and letter filters for display and export', () => {
    TestBed.inject(LeagueStore).hydrate({
      seasons: {
        1900: { tier1: [{ team: 'Manchester City' }, { team: 'Maidenhead United' }] },
        2025: { tier1: [{ team: 'Manchester United' }] },
      },
    });
    params.next(convertToParamMap({ q: 'mAnChEsTeR', letter: 'M', filter: 'historical' }));
    fixture.detectChanges();

    expect(component.matchingTeams().map(({ name }) => name)).toEqual([
      'Manchester City',
      'Manchester United',
    ]);
    expect(component.exportRows().map((row) => row['name'])).toEqual(['Manchester City']);
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector<HTMLInputElement>('input[type=search]')?.value).toBe('mAnChEsTeR');
    expect(element.querySelector('.team-name')?.textContent?.trim()).toBe('Manchester City');
  });

  it('clears search, letter, and filter query params together', () => {
    const navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.onFiltersCleared();

    expect(navigateSpy).toHaveBeenCalledWith([], {
      relativeTo: TestBed.inject(ActivatedRoute),
      queryParams: { q: null, letter: null, filter: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('does not show a loading banner until the loader discloses slow loading', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.loading')).toBeNull();

    loadStatus.set('loading');
    showLoadingState.set(true);
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading teams...');
  });

  it('shows a retryable error state when the club directory fails to load', () => {
    loadStatus.set('error');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Club directory could not load.'
    );

    element.querySelector<HTMLButtonElement>('button')?.click();

    expect(loadDataSpy).toHaveBeenCalledTimes(1);
  });
});
