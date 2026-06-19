import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { provideRouter } from '@angular/router';
import { MainToolbar } from './main-toolbar';

describe('MainToolbar', () => {
  let component: MainToolbar;
  let fixture: ComponentFixture<MainToolbar>;

  beforeEach(async () => {
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
});
