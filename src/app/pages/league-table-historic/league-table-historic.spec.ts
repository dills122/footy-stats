import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, ParamMap, provideRouter } from '@angular/router';

import { LeagueTablesViewerComponent } from '@app/components/league-tables-viewer/league-tables-viewer';
import { BehaviorSubject } from 'rxjs';
import { LeagueTableHistoric } from './league-table-historic';

describe('LeagueTableHistoric', () => {
  let component: LeagueTableHistoric;
  let fixture: ComponentFixture<LeagueTableHistoric>;
  let queryParamMap$: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    queryParamMap$ = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [LeagueTablesViewerComponent, LeagueTableHistoric],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            queryParamMap: queryParamMap$.asObservable(),
            snapshot: {
              queryParamMap: convertToParamMap({}),
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeagueTableHistoric);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
