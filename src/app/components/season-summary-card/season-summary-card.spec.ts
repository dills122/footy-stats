import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeasonSummaryCardComponent } from './season-summary-card';

describe('SeasonSummaryCard', () => {
  let component: SeasonSummaryCardComponent;
  let fixture: ComponentFixture<SeasonSummaryCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeasonSummaryCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SeasonSummaryCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
