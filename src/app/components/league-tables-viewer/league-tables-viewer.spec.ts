import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTablesViewerComponent } from './league-tables-viewer';

describe('LeagueTablesViewer', () => {
  let component: LeagueTablesViewerComponent;
  let fixture: ComponentFixture<LeagueTablesViewerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueTablesViewerComponent],
      providers: [LeagueStore, provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(LeagueTablesViewerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
