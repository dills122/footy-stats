// home.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { LeagueStore } from '@app/store/league.store';

interface ArchiveStat {
  label: string;
  value: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [CommonModule, MatButtonModule, RouterLink],
})
export class Home {
  private store = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  teamsCount = computed(() => {
    const teams = this.store.getTeams(); // <- reactive getter
    return teams?.length ?? 0;
  });
  seasonsCount = computed(() => {
    const seasonsAndTiers = this.store.getSeasons(); // <- reactive getter
    return seasonsAndTiers?.length ?? 0;
  });
  tiersCount = computed(() => {
    const tierNames = new Set(this.store.getSeasonTiers().flatMap((season) => season.tiers));
    return tierNames.size;
  });
  archiveLoaded = computed(() => this.seasonsCount() > 0 && this.teamsCount() > 0);
  showArchiveLoading = computed(() => !this.archiveLoaded() && this.dataLoader.showLoadingState());
  archiveLoadFailed = computed(
    () => !this.archiveLoaded() && this.dataLoader.loadStatus() === 'error'
  );
  archiveBusy = computed(() => !this.archiveLoaded() && this.dataLoader.loadStatus() === 'loading');
  archiveStats = computed<ArchiveStat[]>(() => [
    { label: 'seasons', value: this.seasonsCount() },
    { label: 'clubs', value: this.teamsCount() },
    { label: 'tracked tiers', value: this.tiersCount() },
  ]);

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }
}
