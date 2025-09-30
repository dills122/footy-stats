import { Component, inject, OnInit, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { RouterModule } from '@angular/router';
import { MainToolbar } from './components/main-toolbar/main-toolbar';
import { DataLoaderService } from './store/services/hydrate-store-json';

@Component({
  selector: 'app-root',
  imports: [MatSlideToggleModule, MainToolbar, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  protected readonly title = signal('Footy Stats - English Football Data');
  private dataLoader = inject(DataLoaderService);

  ngOnInit() {
    this.dataLoader.loadData(); // async, store will hydrate in background
  }
}
