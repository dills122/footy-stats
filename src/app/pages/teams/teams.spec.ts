import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { Teams } from './teams';

describe('Teams', () => {
  let component: Teams;
  let fixture: ComponentFixture<Teams>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Teams],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: of(convertToParamMap({ letter: 'm', filter: 'historical' })),
            snapshot: { queryParamMap: convertToParamMap({ letter: 'm', filter: 'historical' }) },
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
});
