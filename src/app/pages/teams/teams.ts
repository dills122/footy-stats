import { ViewportScroller } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, Scroll } from '@angular/router';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { TeamList } from '@app/components/team-list/team-list';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import {
  isTeamDirectoryFilter,
  type TeamDirectoryCategory,
  type TeamDirectoryFilter,
  type TeamDirectoryItem,
} from '@app/types';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';
import { normalizeClubSearchText } from '@app/utils/club-aliases';

@Component({
  selector: 'app-teams',
  imports: [MatButtonModule, TeamList, DataExportMenu],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
})
export class Teams {
  private store = inject(LeagueStore);
  private clubMetadataStore = inject(ClubMetadataStore);
  private dataLoader = inject(DataLoaderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private viewportScroller = inject(ViewportScroller);
  private searchNavigation?: { scrollPosition: [number, number] };

  private queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  // Add a computed signal so it automatically re-evaluates once hydrated
  teams = computed<TeamDirectoryItem[]>(() => {
    const teams = this.store.getTeams();
    const latestSeason = this.store.getSeasons().at(-1) ?? null;
    const tableRows = this.store.getFullTable();

    return (
      teams
        ?.map((team) => {
          const rows = tableRows.filter((row) => row.teamId === team.id);
          const seasons = Array.from(new Set(rows.map((row) => row.season))).sort((a, b) => a - b);
          const tiers = new Set(rows.map((row) => row.tier));
          const latestRows = latestSeason ? rows.filter((row) => row.season === latestSeason) : [];
          const isActive = latestRows.length > 0;
          const status: TeamDirectoryItem['status'] = isActive ? 'active' : 'historical';
          const hasLineage = team.clubIds.some(
            (clubId) =>
              (this.clubMetadataStore.getClubById(clubId)?.derived.relationships ?? []).length
          );
          const categories: TeamDirectoryCategory[] = [];

          categories.push(isActive ? 'active' : 'historical');
          if (tiers.has('tier1')) {
            categories.push('top-flight');
          }
          if (latestRows.some((row) => row.tier === 'tier1')) {
            categories.push('current-top-flight');
          }
          if (seasons.length >= 50) {
            categories.push('long-run');
          }
          if (hasLineage) {
            categories.push('lineage');
          }

          return {
            ...team,
            categories,
            firstSeenSeason: seasons[0] ?? null,
            lastSeenSeason: seasons.at(-1) ?? null,
            totalSeasonsSeen: seasons.length,
            status,
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name)) ?? []
    );
  });

  selectedLetter = computed(() => {
    const rawLetter = this.queryParamMap().get('letter') ?? '';
    const letter = rawLetter.trim().toUpperCase();
    return /^[A-Z]$/.test(letter) ? letter : '';
  });

  selectedFilter = computed<TeamDirectoryFilter>(() => {
    const filter = this.queryParamMap().get('filter') ?? 'all';
    return isTeamDirectoryFilter(filter) ? filter : 'all';
  });
  searchQuery = computed(() => this.queryParamMap().get('q') ?? '');
  matchingTeams = computed(() => {
    const query = normalizeClubSearchText(this.searchQuery());
    return query
      ? this.teams().filter((team) => normalizeClubSearchText(team.name).includes(query))
      : this.teams();
  });

  exportTeams = computed(() => {
    const filter = this.selectedFilter();
    const letter = this.selectedLetter();
    return this.matchingTeams().filter(
      (team) =>
        (filter === 'all' || team.categories.includes(filter)) &&
        (!letter || team.name[0].toUpperCase() === letter)
    );
  });
  exportSummary = computed<ExportSummary>(() => ({
    page: 'Teams Archive',
    filter: this.selectedFilter(),
    letter: this.selectedLetter() || 'all',
    ...(this.searchQuery().trim() ? { search: this.searchQuery().trim() } : {}),
    rows: this.exportTeams().length,
  }));
  exportRows = computed<ExportRow[]>(() =>
    this.exportTeams().map((team) => ({
      id: team.id,
      name: team.name,
      primaryClubId: team.clubIds[0] ?? '',
      clubIds: team.clubIds,
      status: team.status,
      categories: team.categories,
      firstSeenSeason: team.firstSeenSeason,
      lastSeenSeason: team.lastSeenSeason,
      totalSeasonsSeen: team.totalSeasonsSeen,
    }))
  );
  exportFilename = computed(
    () => `footy-stats-teams-${this.selectedFilter()}-${this.selectedLetter() || 'all'}`
  );
  showLoadingState = computed(() => !this.teams().length && this.dataLoader.showLoadingState());
  loadFailed = computed(() => !this.teams().length && this.dataLoader.loadStatus() === 'error');

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (!(event instanceof Scroll)) return;

      const navigation = this.router.lastSuccessfulNavigation;
      const search = this.searchNavigation;
      if (search && event.routerEvent.id === navigation?.id && navigation.extras.info === search) {
        this.searchNavigation = undefined;
        // Restore the live search position after the router's default scroll reset.
        queueMicrotask(() =>
          this.viewportScroller.scrollToPosition(search.scrollPosition, { behavior: 'instant' })
        );
      }
    });
  }

  onLetterSelected(letter: string) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { letter: letter || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onFilterSelected(filter: TeamDirectoryFilter) {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { filter: filter === 'all' ? null : filter },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  onSearchChanged(query: string) {
    this.searchNavigation = { scrollPosition: this.viewportScroller.getScrollPosition() };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      info: this.searchNavigation,
    });
  }

  onFiltersCleared() {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: null, letter: null, filter: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }
}
