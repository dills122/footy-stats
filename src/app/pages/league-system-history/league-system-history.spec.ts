import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LeagueSystemHistory } from './league-system-history';

describe('LeagueSystemHistory', () => {
  let component: LeagueSystemHistory;
  let fixture: ComponentFixture<LeagueSystemHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeagueSystemHistory],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LeagueSystemHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders the current parallel National League era by default', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(component.activeEra().id).toBe('parallel-national-leagues');
    expect(element.textContent).toContain('National League North');
    expect(element.textContent).toContain('National League South');
    expect(element.textContent).toContain('parallel pyramid level 6');
  });

  it('switches the infographic to regional Third Division history', () => {
    component.selectEra('regional-third');
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;

    expect(element.textContent).toContain('Third Division North');
    expect(element.textContent).toContain('Third Division South');
    expect(element.textContent).toContain('Both regional sections represent pyramid level 3');
  });

  it('toggles the compact era selector and collapses it after choosing an era', () => {
    const element: HTMLElement = fixture.nativeElement;
    const toggle = element.querySelector<HTMLButtonElement>('.era-selector-toggle');

    expect(component.eraSelectorCollapsed()).toBe(true);
    expect(element.querySelector('.era-selector')?.classList).toContain('is-collapsed');
    expect(toggle?.getAttribute('aria-expanded')).toBe('false');

    toggle?.click();
    fixture.detectChanges();

    expect(component.eraSelectorCollapsed()).toBe(false);
    expect(element.querySelector('.era-selector')?.classList).not.toContain('is-collapsed');

    component.selectEra('regional-third');
    fixture.detectChanges();

    expect(component.eraSelectorCollapsed()).toBe(true);
    expect(component.activeEra().id).toBe('regional-third');
  });

  it('offers txt, csv, and json export actions', () => {
    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll<HTMLButtonElement>('.export-button')
    );

    expect(buttons.map((button) => button.querySelector('span')?.textContent?.trim())).toEqual([
      'TXT',
      'CSV',
      'JSON',
    ]);
    expect(buttons.every((button) => !button.disabled)).toBe(true);
  });
});
