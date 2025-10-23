import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { LeagueStore } from '../league.store';

@Injectable({ providedIn: 'root' })
export class DataLoaderService {
  private http = inject(HttpClient);
  private store = inject(LeagueStore);

  async loadData() {
    const data: unknown = await lastValueFrom(this.http.get('assets/seasons.json'));
    console.log('Data loaded from JSON:', data);
    this.store.hydrate(data);
    console.log('Store hydrated with data');
  }
}
