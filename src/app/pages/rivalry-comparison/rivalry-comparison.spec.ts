import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { RivalryComparison } from './rivalry-comparison';

describe('RivalryComparison', () => {
  let component: RivalryComparison;
  let fixture: ComponentFixture<RivalryComparison>;
  let store: InstanceType<typeof LeagueStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RivalryComparison],
      providers: [LeagueStore, provideRouter([])],
    }).compileComponents();

    store = TestBed.inject(LeagueStore);
    store.hydrate(rivalryFixture(), (teamName: string) => `${teamName.toLowerCase()} id`);
    fixture = TestBed.createComponent(RivalryComparison);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the rivalry workbench with shared season rows', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Rivalry Comparison');
    expect(element.textContent).toContain('Shared Season Rows');
    expect(component.scorecard()).toMatchObject({
      sharedSeasons: 3,
      firstHigher: 1,
      secondHigher: 2,
      sameTier: 2,
    });

    const tableLink = Array.from(element.querySelectorAll<HTMLAnchorElement>('a')).find((link) =>
      link.textContent?.includes('2022')
    );
    expect(tableLink?.getAttribute('href')).toContain('/tables?season=2022');
  });

  it('switches selected clubs from the selector handlers', () => {
    const charlie = store.getTeams().find((team) => team.name === 'Charlie City')!;

    component.onSecondTeamChange(String(charlie.id));

    expect(component.selectedTeams().second?.name).toBe('Charlie City');
    expect(component.comparisonRows().map((row) => row.season)).toEqual([2021]);
  });
});

function rivalryFixture() {
  return {
    seasons: {
      2020: {
        tier1: [row('Alpha FC', 1, 82), row('Bravo Town', 2, 80)],
      },
      2021: {
        tier1: [row('Bravo Town', 3, 66), row('Charlie City', 4, 61)],
        tier2: [row('Alpha FC', 1, 91)],
      },
      2022: {
        tier1: [row('Bravo Town', 1, 88), row('Alpha FC', 2, 84)],
      },
    },
  };
}

function row(team: string, pos: number, points: number) {
  return {
    team,
    pos,
    played: 38,
    won: 20,
    drawn: 8,
    lost: 10,
    goalsFor: 70,
    goalsAgainst: 35,
    goalDifference: 35,
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
