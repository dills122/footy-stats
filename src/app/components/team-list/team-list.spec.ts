import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { TeamDirectoryItem } from '@app/types';

import { TeamList } from './team-list';

describe('TeamList', () => {
  let component: TeamList;
  let fixture: ComponentFixture<TeamList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamList],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  function team(overrides: Partial<TeamDirectoryItem>): TeamDirectoryItem {
    return {
      id: 1,
      name: 'Arsenal',
      clubIds: ['arsenal'],
      categories: ['active', 'top-flight', 'current-top-flight', 'long-run'],
      firstSeenSeason: 1888,
      lastSeenSeason: 2025,
      totalSeasonsSeen: 99,
      status: 'active',
      ...overrides,
    };
  }

  it('filters teams from the selected letter input', () => {
    component.teams = [
      team({ id: 1, name: 'Arsenal', clubIds: ['arsenal'] }),
      team({ id: 2, name: 'Chelsea', clubIds: ['chelsea'] }),
    ];

    component.selectedLetter = 'c';

    expect(component.filteredTeams().map((team) => team.name)).toEqual(['Chelsea']);
  });

  it('filters teams from the selected directory filter input', () => {
    component.teams = [
      team({ id: 1, name: 'Arsenal', categories: ['active', 'top-flight'] }),
      team({
        id: 2,
        name: 'Accrington',
        categories: ['historical', 'top-flight'],
        status: 'historical',
        lastSeenSeason: 1892,
        totalSeasonsSeen: 5,
      }),
    ];

    component.selectedFilter = 'historical';

    expect(component.filteredTeams().map((team) => team.name)).toEqual(['Accrington']);
  });

  it('emits an empty letter when the active letter is selected again', () => {
    const emittedLetters: string[] = [];
    component.selectedLetter = 'M';
    component.letterSelected.subscribe((letter) => emittedLetters.push(letter));

    component.selectLetter('M');

    expect(component.selectedLetterSignal()).toBeNull();
    expect(emittedLetters).toEqual(['']);
  });

  it('emits the selected directory filter', () => {
    const emittedFilters: string[] = [];
    component.filterSelected.subscribe((filter) => emittedFilters.push(filter));

    component.selectFilter('top-flight');

    expect(component.selectedFilterSignal()).toBe('top-flight');
    expect(emittedFilters).toEqual(['top-flight']);
  });

  it('stores the selected filters in navigation state for team links', () => {
    component.selectedLetter = 'a';
    component.selectedFilter = 'active';

    expect(component.teamLinkState()).toEqual({
      teamsReturnLetter: 'A',
      teamsReturnFilter: 'active',
    });
  });
});
