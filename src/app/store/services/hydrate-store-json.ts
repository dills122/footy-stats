import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import type { ClubMetadataDocument } from '../club-metadata.models';
import { ClubMetadataStore } from '../club-metadata.store';
import { LeagueStore } from '../league.store';

@Injectable({ providedIn: 'root' })
export class DataLoaderService {
  private http = inject(HttpClient);
  private store = inject(LeagueStore);
  private clubMetadataStore = inject(ClubMetadataStore);

  async loadData() {
    const [data, clubMetadata] = await Promise.all([
      lastValueFrom(this.http.get('assets/seasons.json')),
      lastValueFrom(this.http.get<ClubMetadataDocument>('assets/club-metadata.json')),
    ]);
    console.log('Data loaded from JSON:', data);
    this.clubMetadataStore.hydrate(clubMetadata);
    this.store.hydrate(data, (teamName, season) =>
      this.clubMetadataStore.getClubIdForTeamSeason(teamName, season)
    );
    console.log('Store hydrated with data');
  }
}
