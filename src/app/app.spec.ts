import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { DataUpdateService } from './store/services/data-update.service';
import { DataLoaderService } from './store/services/hydrate-store-json';

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
        provideRouter([]),
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

  it('exposes the initial title signal value', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;

    expect(app['title']()).toBe('Footy Stats - English Football Data');
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
