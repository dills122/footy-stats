import { TestBed } from '@angular/core/testing';

import { APP_THEME_STORAGE_KEY, ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    window.localStorage.removeItem(APP_THEME_STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses Terrace as the default theme and applies it to the document', () => {
    const service = TestBed.inject(ThemeService);

    expect(service.activeTheme()).toBe('terrace');
    expect(document.documentElement.dataset['theme']).toBe('terrace');
  });

  it('applies and persists a selected theme', () => {
    const service = TestBed.inject(ThemeService);

    service.setTheme('floodlights');

    expect(service.activeTheme()).toBe('floodlights');
    expect(document.documentElement.dataset['theme']).toBe('floodlights');
    expect(window.localStorage.getItem(APP_THEME_STORAGE_KEY)).toBe('floodlights');
  });

  it('restores a valid stored theme', () => {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, 'clubhouse');

    const service = TestBed.inject(ThemeService);

    expect(service.activeTheme()).toBe('clubhouse');
    expect(document.documentElement.dataset['theme']).toBe('clubhouse');
  });

  it('ignores an unknown stored theme', () => {
    window.localStorage.setItem(APP_THEME_STORAGE_KEY, 'ultraviolet');

    const service = TestBed.inject(ThemeService);

    expect(service.activeTheme()).toBe('terrace');
    expect(document.documentElement.dataset['theme']).toBe('terrace');
  });
});
