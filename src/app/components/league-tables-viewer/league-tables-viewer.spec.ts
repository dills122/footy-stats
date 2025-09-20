import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeagueTablesViewer } from './league-tables-viewer';

describe('LeagueTablesViewer', () => {
  let component: LeagueTablesViewer;
  let fixture: ComponentFixture<LeagueTablesViewer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueTablesViewer],
    }).compileComponents();

    fixture = TestBed.createComponent(LeagueTablesViewer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
