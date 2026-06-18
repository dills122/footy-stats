import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TeamList } from '@app/components/team-list/team-list';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import {
  isTeamDirectoryFilter,
  type TeamDirectoryCategory,
  type TeamDirectoryFilter,
  type TeamDirectoryItem,
} from '@app/types';

@Component({
  selector: 'app-teams',
  imports: [TeamList],
  templateUrl: './teams.html',
  styleUrl: './teams.scss',
})
export class Teams {
  private store = inject(LeagueStore);
  private clubMetadataStore = inject(ClubMetadataStore);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

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
}
