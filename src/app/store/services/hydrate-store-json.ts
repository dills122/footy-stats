import { HttpClient } from '@angular/common/http';
import { computed, Injectable, inject, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import type { ClubMetadataDocument } from '../club-metadata.models';
import { ClubMetadataStore } from '../club-metadata.store';
import { LeagueStore } from '../league.store';
import type { ActiveDataInfo, InstalledDataBundle, SeasonsDocument } from './data-bundle.models';
import { DataOverrideStorage } from './data-override-storage';

export type DataLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

const LOADING_DISCLOSURE_DELAY_MS = 400;

@Injectable({ providedIn: 'root' })
export class DataLoaderService {
  private http = inject(HttpClient);
  private store = inject(LeagueStore);
  private clubMetadataStore = inject(ClubMetadataStore);
  private overrideStorage = inject(DataOverrideStorage);
  private status = signal<DataLoadStatus>('idle');
  private error = signal<unknown | null>(null);
  private loadingDisclosed = signal(false);
  private activeData = signal<ActiveDataInfo | null>(null);
  private loadPromise: Promise<void> | null = null;
  private loadingDisclosureTimer: ReturnType<typeof setTimeout> | null = null;

  readonly loadStatus = this.status.asReadonly();
  readonly loadError = this.error.asReadonly();
  readonly activeDataInfo = this.activeData.asReadonly();
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

  async installOverride(bundle: InstalledDataBundle): Promise<void> {
    await this.overrideStorage.write(bundle);
    this.hydrateBundle(bundle.seasonsDocument, bundle.clubMetadataDocument, {
      source: 'local-override',
      version: bundle.manifest.version,
      generatedAt: bundle.manifest.generatedAt,
      gitSha: bundle.manifest.gitSha,
      installedAt: bundle.installedAt,
    });
    this.status.set('loaded');
    this.error.set(null);
  }

  async clearOverrideAndReload(): Promise<void> {
    await this.overrideStorage.clear();
    this.status.set('idle');
    this.activeData.set(null);
    await this.loadData();
  }

  private async fetchAndHydrate(): Promise<void> {
    const override = await this.overrideStorage.read();
    if (override) {
      this.hydrateBundle(override.seasonsDocument, override.clubMetadataDocument, {
        source: 'local-override',
        version: override.manifest.version,
        generatedAt: override.manifest.generatedAt,
        gitSha: override.manifest.gitSha,
        installedAt: override.installedAt,
      });
      return;
    }

    const [data, clubMetadata] = await Promise.all([
      lastValueFrom(this.http.get<SeasonsDocument>('assets/seasons.json')),
      lastValueFrom(this.http.get<ClubMetadataDocument>('assets/club-metadata.json')),
    ]);

    this.hydrateBundle(data, clubMetadata, this.buildShippedDataInfo(data, clubMetadata));
  }

  private hydrateBundle(
    data: SeasonsDocument,
    clubMetadata: ClubMetadataDocument,
    info: ActiveDataInfo
  ) {
    this.clubMetadataStore.hydrate(clubMetadata);
    this.store.hydrate(data, (teamName, season) =>
      this.clubMetadataStore.getClubIdForTeamSeason(teamName, season)
    );
    this.activeData.set(info);
  }

  private buildShippedDataInfo(
    data: SeasonsDocument,
    clubMetadata: ClubMetadataDocument
  ): ActiveDataInfo {
    const metadata = data.metadata ?? clubMetadata.metadata;

    return {
      source: 'shipped',
      version: metadata.gitSha || metadata.generatedAt,
      generatedAt: metadata.generatedAt,
      gitSha: metadata.gitSha,
    };
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
