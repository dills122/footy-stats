// home.component.ts
import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { LeagueStore } from '@app/store/league.store';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';

interface ArchiveStat {
  label: string;
  value: number;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [CommonModule, MatButtonModule, RouterLink, DataExportMenu],
})
export class Home implements OnDestroy {
  private store = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  private archiveTickerInterval: ReturnType<typeof setInterval> | null = null;
  private archiveTickerTimeout: ReturnType<typeof setTimeout> | null = null;
  private archiveTickerStarted = false;

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
  exportSummary = computed<ExportSummary>(() => ({
    page: 'Archive Home',
    seasons: this.seasonsCount(),
    clubs: this.teamsCount(),
    trackedTiers: this.tiersCount(),
  }));
  exportRows = computed<ExportRow[]>(() =>
    this.archiveStats().map((stat) => ({ metric: stat.label, value: stat.value }))
  );
  archiveTickerValues = signal<Record<string, string>>({});
  archiveTickerRunning = signal(false);
  archiveSimpleRevealRunning = signal(false);

  constructor() {
    effect(() => {
      if (!this.archiveLoaded() || this.archiveTickerStarted) {
        return;
      }

      this.archiveTickerStarted = true;
      this.startArchiveTicker(this.archiveStats());
    });
  }

  ngOnDestroy() {
    this.clearArchiveTicker();
  }

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }

  archiveStatDisplayValue(stat: ArchiveStat): string {
    return this.archiveTickerValues()[stat.label] ?? this.formatArchiveValue(stat.value);
  }

  private startArchiveTicker(stats: ArchiveStat[]) {
    this.clearArchiveTicker();

    if (this.prefersReducedMotion()) {
      this.archiveTickerValues.set(this.realArchiveValues(stats));
      this.archiveTickerRunning.set(false);
      this.archiveSimpleRevealRunning.set(false);
      return;
    }

    if (this.prefersSimpleArchiveReveal()) {
      this.archiveTickerValues.set(this.realArchiveValues(stats));
      this.archiveTickerRunning.set(false);
      this.archiveSimpleRevealRunning.set(true);
      this.archiveTickerTimeout = setTimeout(() => {
        this.archiveSimpleRevealRunning.set(false);
        this.archiveTickerTimeout = null;
      }, 420);
      return;
    }

    this.archiveTickerRunning.set(true);
    this.archiveSimpleRevealRunning.set(false);
    this.archiveTickerValues.set(this.randomArchiveValues(stats));
    this.archiveTickerInterval = setInterval(() => {
      this.archiveTickerValues.set(this.randomArchiveValues(stats));
    }, 70);
    this.archiveTickerTimeout = setTimeout(() => {
      this.clearArchiveTicker();
      this.archiveTickerValues.set(this.realArchiveValues(stats));
      this.archiveTickerRunning.set(false);
    }, 760);
  }

  private clearArchiveTicker() {
    if (this.archiveTickerInterval) {
      clearInterval(this.archiveTickerInterval);
      this.archiveTickerInterval = null;
    }

    if (this.archiveTickerTimeout) {
      clearTimeout(this.archiveTickerTimeout);
      this.archiveTickerTimeout = null;
    }

    this.archiveTickerRunning.set(false);
    this.archiveSimpleRevealRunning.set(false);
  }

  private randomArchiveValues(stats: ArchiveStat[]): Record<string, string> {
    return Object.fromEntries(
      stats.map((stat) => {
        const digits = Math.max(this.formatArchiveValue(stat.value).length, 2);
        const ceiling = 10 ** digits;
        const value = Math.floor(Math.random() * ceiling)
          .toString()
          .padStart(digits, '0');

        return [stat.label, value];
      })
    );
  }

  private realArchiveValues(stats: ArchiveStat[]): Record<string, string> {
    return Object.fromEntries(
      stats.map((stat) => [stat.label, this.formatArchiveValue(stat.value)])
    );
  }

  private formatArchiveValue(value: number): string {
    return value.toLocaleString('en-US');
  }

  private prefersReducedMotion(): boolean {
    return this.matchesMedia('(prefers-reduced-motion: reduce)');
  }

  private prefersSimpleArchiveReveal(): boolean {
    return this.matchesMedia('(max-width: 560px)');
  }

  private matchesMedia(query: string): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia(query).matches
    );
  }
}
