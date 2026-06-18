import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import type { ClubMetadataDocument } from '../club-metadata.models';
import { ClubMetadataStore } from '../club-metadata.store';
import { LeagueStore } from '../league.store';

export type DataLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

const LOADING_DISCLOSURE_DELAY_MS = 400;

@Injectable({ providedIn: 'root' })
export class DataLoaderService {
  private http = inject(HttpClient);
  private store = inject(LeagueStore);
  private clubMetadataStore = inject(ClubMetadataStore);
  private status = signal<DataLoadStatus>('idle');
  private error = signal<unknown | null>(null);
  private loadingDisclosed = signal(false);
  private loadPromise: Promise<void> | null = null;
  private loadingDisclosureTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loadStatus = this.status.asReadonly();
  readonly loadError = this.error.asReadonly();
  readonly showLoadingState = computed(
    () => this.status() === 'loading' && this.loadingDisclosed()
  );

  loadData(): Promise<void> {
    if (this.status() === 'loaded') {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.status.set('loading');
    this.error.set(null);
    this.scheduleLoadingDisclosure();

    this.loadPromise = this.fetchAndHydrate()
      .then(() => {
        this.status.set('loaded');
      })
      .catch((error: unknown) => {
        this.error.set(error);
        this.status.set('error');
      })
      .finally(() => {
        this.clearLoadingDisclosure();
        this.loadPromise = null;
      });

    return this.loadPromise;
  }

  private async fetchAndHydrate(): Promise<void> {
    const [data, clubMetadata] = await Promise.all([
      lastValueFrom(this.http.get('assets/seasons.json')),
      lastValueFrom(this.http.get<ClubMetadataDocument>('assets/club-metadata.json')),
    ]);

    this.clubMetadataStore.hydrate(clubMetadata);
    this.store.hydrate(data, (teamName, season) =>
      this.clubMetadataStore.getClubIdForTeamSeason(teamName, season)
    );
  }

  private scheduleLoadingDisclosure() {
    this.clearLoadingDisclosure();
    this.loadingDisclosureTimer = setTimeout(() => {
      if (this.status() === 'loading') {
        this.loadingDisclosed.set(true);
      }
    }, LOADING_DISCLOSURE_DELAY_MS);
  }

  private clearLoadingDisclosure() {
    if (this.loadingDisclosureTimer) {
      clearTimeout(this.loadingDisclosureTimer);
      this.loadingDisclosureTimer = null;
    }

    this.loadingDisclosed.set(false);
  }
}
