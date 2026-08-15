import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-main-toolbar',
  imports: [RouterModule, MatToolbarModule, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './main-toolbar.html',
  styleUrl: './main-toolbar.scss',
})
export class MainToolbar {
  protected readonly themeService = inject(ThemeService);

  protected onThemeChange(event: Event): void {
    this.themeService.setTheme((event.target as HTMLSelectElement).value);
  }
}
