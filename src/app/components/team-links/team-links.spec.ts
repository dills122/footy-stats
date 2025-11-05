import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeamLinks } from './team-links';

describe('TeamLinks', () => {
  let component: TeamLinks;
  let fixture: ComponentFixture<TeamLinks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeamLinks],
    }).compileComponents();

    fixture = TestBed.createComponent(TeamLinks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
