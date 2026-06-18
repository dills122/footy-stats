import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let store: InstanceType<typeof LeagueStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],

      providers: [provideRouter([]), LeagueStore],
    }).compileComponents();

    store = TestBed.inject(LeagueStore);
    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows stable loading placeholders before archive data hydrates', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(component.archiveLoaded()).toBe(false);
    expect(element.querySelector('h1')?.textContent).toContain('Explore English football history.');
    expect(element.querySelectorAll('.metric-skeleton')).toHaveLength(3);
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
    expect(element.querySelector('h1')?.textContent).toContain(
      'Explore 2 seasons of English football history.'
    );
    expect(element.querySelectorAll('.metric-skeleton')).toHaveLength(0);
    expect(element.querySelector('.archive-meta')?.textContent).toContain('3 clubs');
  });
});

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
