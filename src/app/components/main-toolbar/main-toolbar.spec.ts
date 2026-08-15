import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { provideRouter } from '@angular/router';
import { APP_THEME_STORAGE_KEY } from '../../services/theme.service';
import { MainToolbar } from './main-toolbar';

describe('MainToolbar', () => {
  let component: MainToolbar;
  let fixture: ComponentFixture<MainToolbar>;

  beforeEach(async () => {
    window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');

    await TestBed.configureTestingModule({
      imports: [
        MainToolbar,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatFormFieldModule,
        MatInputModule,
      ],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(MainToolbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('links the brand and archive nav item to the root archive page', () => {
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector<HTMLAnchorElement>('.brand')?.getAttribute('href')).toBe('/');
    expect(element.querySelector<HTMLAnchorElement>('.nav-links a')?.getAttribute('href')).toBe(
      '/'
    );
  });

  it('provides a mobile navigation menu trigger', () => {
    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector<HTMLButtonElement>('.mobile-menu-trigger');

    expect(trigger).toBeTruthy();
    expect(trigger?.getAttribute('aria-label')).toBe('Open site navigation');
  });

  it('provides the three named colour themes in an accessible selector', () => {
    const element: HTMLElement = fixture.nativeElement;
    const select = element.querySelector<HTMLSelectElement>('.theme-select');

    expect(select?.getAttribute('aria-label')).toBe('Colour theme');
    expect(Array.from(select?.options ?? []).map((option) => option.textContent?.trim())).toEqual([
      'Terrace',
      'Clubhouse',
      'Floodlights',
    ]);
  });

  it('changes the active document theme from the selector', () => {
    const element: HTMLElement = fixture.nativeElement;
    const select = element.querySelector<HTMLSelectElement>('.theme-select');

    expect(select).toBeTruthy();
    select!.value = 'clubhouse';
    select!.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(document.documentElement.dataset['theme']).toBe('clubhouse');
    expect(window.localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('clubhouse');
  });
});
