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
});
