import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { DataLoaderService } from './store/services/hydrate-store-json';

describe('App', () => {
  let loadDataSpy: jest.Mock;

  beforeEach(async () => {
    loadDataSpy = jest.fn().mockResolvedValue(undefined);

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
  });
});
