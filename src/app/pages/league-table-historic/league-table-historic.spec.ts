import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeagueTablesViewerComponent } from '@app/components/league-tables-viewer/league-tables-viewer';
import { LeagueTableHistoric } from './league-table-historic';

describe('LeagueTableHistoric', () => {
  let component: LeagueTableHistoric;
  let fixture: ComponentFixture<LeagueTableHistoric>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueTablesViewerComponent, LeagueTableHistoric],
    }).compileComponents();

    fixture = TestBed.createComponent(LeagueTableHistoric);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
