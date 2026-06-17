import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { LeagueTableComponent } from './league-table';

describe('LeagueTable', () => {
  let component: LeagueTableComponent;
  let fixture: ComponentFixture<LeagueTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueTableComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LeagueTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links table teams with club metadata to their team overview page', () => {
    component.leagueTable = [
      {
        season: 2025,
        tier: 'tier1',
        teamId: 1,
        teamName: 'Manchester United',
        clubId: 'manchester united',
        pos: 1,
        played: 38,
        won: 28,
        drawn: 6,
        lost: 4,
        goalsFor: 80,
        goalsAgainst: 30,
        goalDifference: 50,
        goalAverage: null,
        points: 90,
        notes: null,
        wasRelegated: false,
        wasPromoted: false,
        isExpansionTeam: false,
        wasReElected: false,
        wasReprieved: false,
      },
    ];

    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.team-link') as HTMLAnchorElement | null;
    expect(link?.textContent?.trim()).toBe('Manchester United');
    expect(link?.getAttribute('href')).toBe('/teams/manchester%20united');
  });
});
