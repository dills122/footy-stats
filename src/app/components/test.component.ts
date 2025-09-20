import { Component, effect, inject } from '@angular/core';
import { LeagueStore } from '../store/league.store';

@Component({
  selector: 'app-store-test',
  standalone: true,
  template: `
    <p>Check console for store output</p>
  `,
})
export class StoreTestComponent {
  private store = inject(LeagueStore);

  constructor() {
    // reactive logging
    effect(() => {
      console.log('Store changed:', this.store.seasons());
      console.log('Store changed:', this.store.tables());
    });
  }
}
