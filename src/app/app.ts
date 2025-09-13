import { Component, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { LeagueTablesViewerComponent } from './league-tables-viewer/league-tables-viewer';

@Component({
  selector: 'app-root',
  imports: [MatSlideToggleModule, LeagueTablesViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('angular-mat-tailwind-starter');
}
