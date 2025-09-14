import { Component, inject, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { LeagueTablesViewerComponent } from './components/league-tables-viewer/league-tables-viewer';
import { DataLoaderService } from './store/services/hydrate-store-json';

@Component({
  selector: 'app-root',
  imports: [MatSlideToggleModule, LeagueTablesViewerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('angular-mat-tailwind-starter');
  private dataLoader = inject(DataLoaderService);

  ngOnInit() {
    this.dataLoader.loadData(); // async, store will hydrate in background
  }
}
