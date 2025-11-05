import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LeagueStore } from '@app/store/league.store';
import { TeamOverview } from './team-overview';

describe('TeamOverview', () => {
  let component: TeamOverview;
  let fixture: ComponentFixture<TeamOverview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamOverview],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '1' })),
          },
        },
        {
          provide: LeagueStore,
          useValue: {
            getTeamOverview: () => ({
              team: { id: 1, name: 'Test Team' },
              seasons: [],
            }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamOverview);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
