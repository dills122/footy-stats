import { provideHttpClient } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { App } from './app';
import { DataUpdateService } from './store/services/data-update.service';
import { DataLoaderService } from './store/services/hydrate-store-json';

@Component({ template: '<h1>Archive page</h1><input aria-label="Filter" />' })
class NavigationTestPage {}

describe('App', () => {
  let loadDataSpy: jest.Mock;
  let checkForUpdatesSpy: jest.Mock;

  beforeEach(async () => {
    loadDataSpy = jest.fn().mockResolvedValue(undefined);
    checkForUpdatesSpy = jest.fn().mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideRouter([
          { path: 'first', component: NavigationTestPage },
          { path: 'second', component: NavigationTestPage },
        ]),
        {
          provide: DataLoaderService,
          useValue: {
            loadData: loadDataSpy,
          },
        },
        {
          provide: DataUpdateService,
          useValue: {
            activeDataInfo: signal(null),
            checkStatus: signal('idle'),
            installStatus: signal('idle'),
            latestManifest: signal(null),
            statusMessage: signal(''),
            hasLocalOverride: signal(false),
            updateAvailable: signal(false),
            checkForUpdates: checkForUpdatesSpy,
            installLatestUpdate: jest.fn(),
            clearLocalOverride: jest.fn(),
            dismissAvailableUpdate: jest.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('allows keyboard users to skip directly to the main content', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const main = element.querySelector('main');
    element.querySelector<HTMLAnchorElement>('.skip-link')?.click();
    expect(document.activeElement).toBe(main);
  });

  it('moves focus on page navigation and keeps it on the active filter for query changes', async () => {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/first');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector('main input')!;
    input.focus();

    await router.navigateByUrl('/first?filter=historic');
    fixture.detectChanges();
    expect(document.activeElement).toBe(input);

    await router.navigateByUrl('/second');
    fixture.detectChanges();
    expect(document.activeElement).toBe(element.querySelector('main h1'));
  });

  it('loads data on init', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges(); // triggers ngOnInit

    expect(loadDataSpy).toHaveBeenCalledTimes(1);
    await fixture.whenStable();
    expect(checkForUpdatesSpy).toHaveBeenCalledTimes(1);
  });

  it('renders source and view links in the footer', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('a[href="https://github.com/dills122/footy-stats"]')).toBeTruthy();
    expect(
      element.querySelector('a[href="https://github.com/dills122/footy-stats/issues"]')
    ).toBeTruthy();
    expect(element.querySelector('a[href="/leagues/tier1/deep-stats"]')?.textContent).toContain(
      'Top flight stats'
    );
    expect(
      Array.from(element.querySelectorAll<HTMLAnchorElement>('a[href="/system"]')).some((link) =>
        link.textContent?.includes('League system')
      )
    ).toBe(true);
  });

  it('shows the scroll-to-top button after scrolling down', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    Object.defineProperty(globalThis, 'scrollY', {
      configurable: true,
      value: 640,
    });
    fixture.componentInstance['onWindowScroll']();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.scroll-top-button')).toBeTruthy();
  });
});
