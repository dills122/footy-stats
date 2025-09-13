import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeagueTable } from './league-table';

describe('LeagueTable', () => {
  let component: LeagueTable;
  let fixture: ComponentFixture<LeagueTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeagueTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
