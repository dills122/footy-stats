import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SeasonSummaryCardComponent } from './season-summary-card';

describe('SeasonSummaryCard', () => {
  let component: SeasonSummaryCardComponent;
  let fixture: ComponentFixture<SeasonSummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeasonSummaryCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SeasonSummaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links summary club names when club metadata ids are available', () => {
    component.tableData = [
      tableRow('Alpha FC', 'alpha fc', 82, 74, 28),
      tableRow('Bravo Town', 'bravo town', 76, 81, 34),
    ];

    component.ngOnChanges();
    fixture.detectChanges();

    const links = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLAnchorElement>('.app-club-link')
    );

    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Alpha FC',
      'Bravo Town',
      'Alpha FC',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/teams/alpha%20fc',
      '/teams/bravo%20town',
      '/teams/alpha%20fc',
    ]);
  });
});

function tableRow(
  teamName: string,
  clubId: string | null,
  points: number,
  goalsFor: number,
  goalsAgainst: number
) {
  return {
    season: 2025,
    tier: 'tier1',
    teamId: 1,
    clubId,
    teamName,
    pos: 1,
    played: 38,
    won: 24,
    drawn: 10,
    lost: 4,
    goalsFor,
    goalsAgainst,
    goalDifference: goalsFor - goalsAgainst,
    goalAverage: null,
    points,
    notes: null,
    wasRelegated: false,
    wasPromoted: false,
    isExpansionTeam: false,
    wasReElected: false,
    wasReprieved: false,
  };
}
