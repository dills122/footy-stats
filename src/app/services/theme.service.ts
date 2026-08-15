import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export const APP_THEME_STORAGE_KEY = 'footy-stats-color-theme';

export const APP_THEMES = [
  { id: 'terrace', label: 'Terrace' },
  { id: 'clubhouse', label: 'Clubhouse' },
  { id: 'floodlights', label: 'Floodlights' },
] as const;

export type AppTheme = (typeof APP_THEMES)[number]['id'];

const DEFAULT_APP_THEME: AppTheme = 'terrace';

function isAppTheme(value: string | null): value is AppTheme {
  return APP_THEMES.some((theme) => theme.id === value);
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly activeThemeState = signal<AppTheme>(this.readStoredTheme());

  readonly themes = APP_THEMES;
  readonly activeTheme = this.activeThemeState.asReadonly();

  constructor() {
    this.applyTheme(this.activeThemeState());
  }

  setTheme(theme: string): void {
    if (!isAppTheme(theme)) {
      return;
    }

    this.activeThemeState.set(theme);
    this.applyTheme(theme);

    try {
      this.document.defaultView?.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {
      // Theme selection still works when storage is unavailable or blocked.
    }
  }

  private readStoredTheme(): AppTheme {
    try {
      const storedTheme =
        this.document.defaultView?.localStorage.getItem(APP_THEME_STORAGE_KEY) ?? null;
      return isAppTheme(storedTheme) ? storedTheme : DEFAULT_APP_THEME;
    } catch {
      return DEFAULT_APP_THEME;
    }
  }

  private applyTheme(theme: AppTheme): void {
    this.document.documentElement.dataset['theme'] = theme;
  }
}
