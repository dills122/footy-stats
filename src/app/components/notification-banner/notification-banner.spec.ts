import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationBannerComponent } from './notification-banner';

describe('NotificationBannerComponent', () => {
  let component: NotificationBannerComponent;
  let fixture: ComponentFixture<NotificationBannerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationBannerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationBannerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Data Coverage Warning');
    fixture.componentRef.setInput('variant', 'warning');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('uses alert role for warning notifications', () => {
    const element = fixture.nativeElement.querySelector('.notification-banner');
    expect(element.getAttribute('role')).toBe('alert');
  });
});
