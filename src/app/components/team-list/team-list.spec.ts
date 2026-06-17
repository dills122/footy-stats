import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  it('filters teams from the selected letter input', () => {
    component.teams = [
      { id: 1, name: 'Arsenal', clubIds: ['arsenal'] },
      { id: 2, name: 'Chelsea', clubIds: ['chelsea'] },
    ];

    component.selectedLetter = 'c';

    expect(component.filteredTeams().map((team) => team.name)).toEqual(['Chelsea']);
  });

  it('emits an empty letter when the active letter is selected again', () => {
    const emittedLetters: string[] = [];
    component.selectedLetter = 'M';
    component.letterSelected.subscribe((letter) => emittedLetters.push(letter));

    component.selectLetter('M');

    expect(component.selectedLetterSignal()).toBeNull();
    expect(emittedLetters).toEqual(['']);
  });

  it('stores the selected letter in navigation state for team links', () => {
    component.selectedLetter = 'a';

    expect(component.teamLinkState()).toEqual({ teamsReturnLetter: 'A' });
  });
});
