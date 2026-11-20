import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';

@Component({
  selector: 'app-archive-load-state',
  imports: [MatButtonModule],
  template: `
    @if (dataLoader.loadStatus() === 'error') {
      <div class="app-panel archive-state">
        <p role="alert">The archive could not load.</p>
        <button type="button" mat-stroked-button (click)="dataLoader.loadData()">Retry</button>
      </div>
    } @else {
      <p class="archive-state" role="status">Loading archive data…</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .archive-state {
      margin: 0;
      padding: 1rem;
    }

    .archive-state p {
      margin: 0 0 0.75rem;
    }
  `,
})
export class ArchiveLoadState {
  protected readonly dataLoader = inject(DataLoaderService);
}
