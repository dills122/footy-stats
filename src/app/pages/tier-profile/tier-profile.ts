import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import {
  buildTierProfileData,
  type TierClubTotal,
  type TierDominanceRun,
  type TierRaceRow,
} from '@app/utils/tier-profile';

interface EraFilter {
  id: string;
  label: string;
  detail: string;
  start: number | null;
  end: number | null;
  tier1Only?: boolean;
}

interface TierDataNoticeDefinition {
  id: string;
  tiers: readonly string[];
  ranges: readonly SeasonRange[];
  title: string;
  detail: string;
}

interface SeasonRange {
  start: number;
  end: number;
}

interface TierDataNotice {
  id: string;
  title: string;
  detail: string;
  seasonsLabel: string;
}

type RaceSectionId = 'title' | 'survival' | 'promotion';

const ERA_FILTERS: EraFilter[] = [
  {
    id: 'all',
    label: 'All eras',
    detail: 'Full archive',
    start: null,
    end: null,
  },
  {
    id: 'goal-average',
    label: 'Goal average',
    detail: 'Up to 1975',
    start: null,
    end: 1975,
  },
  {
    id: 'gd-goals',
    label: 'GD and goals',
    detail: '1976-2018',
    start: 1976,
    end: 2018,
  },
  {
    id: 'premier-league',
    label: 'Premier League',
    detail: '1992 onward',
    start: 1992,
    end: null,
    tier1Only: true,
  },
  {
    id: 'modern',
    label: 'Modern rules',
    detail: '2019 onward',
    start: 2019,
    end: null,
  },
];

const TIER_DATA_NOTICES: TierDataNoticeDefinition[] = [
  {
    id: 'third-division-regional',
    tiers: ['tier3', 'tier4'],
    ranges: [
      { start: 1921, end: 1938 },
      { start: 1946, end: 1957 },
    ],
    title: 'Regional Third Division data',
    detail:
      'From 1921-22 through 1957-58, the Football League Third Division was split into North and South. These archive slots use tier3 for Third Division North and tier4 for Third Division South, but both represent pyramid level 3. True level 4 begins in 1958-59 with the Fourth Division.',
  },
  {
    id: 'national-league-regional',
    tiers: ['tier6', 'tier7'],
    ranges: [{ start: 2021, end: 2025 }],
    title: 'Parallel level 6 divisions',
    detail:
      'From 2021-2025 in the current archive, National League North and South are stored as tier6 and tier7 slots, but both represent parallel pyramid level 6 divisions. Tier7 should not be read as a true level 7 in this period.',
  },
];

@Component({
  selector: 'app-tier-profile',
  imports: [CommonModule, MatButtonModule, RouterLink],
  providers: [LeagueTierToStringyPipe],
  templateUrl: './tier-profile.html',
  styleUrl: './tier-profile.scss',
})
export class TierProfile {
  private route = inject(ActivatedRoute);
  private store = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  private tierLabelPipe = inject(LeagueTierToStringyPipe);
  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });
  private queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  tierId = computed(() => this.paramMap().get('tier') ?? '');
  expandedRaceSections = signal<Record<RaceSectionId, boolean>>({
    title: true,
    survival: false,
    promotion: false,
  });
  hasArchiveData = computed(() => this.store.getFullTable().length > 0);
  showLoadingState = computed(() => !this.hasArchiveData() && this.dataLoader.showLoadingState());
  loadFailed = computed(() => !this.hasArchiveData() && this.dataLoader.loadStatus() === 'error');
  fullProfile = computed(() => {
    const tier = this.tierId();
    if (!/^tier\d+$/.test(tier)) {
      return null;
    }

    const profile = buildTierProfileData(this.store.getFullTable(), tier, (teamId) =>
      this.store.getTeamById(teamId)
    );
    return profile.totalRows ? profile : null;
  });
  availableEraFilters = computed(() => {
    const profile = this.fullProfile();
    if (!profile) {
      return [];
    }

    const seasons = profile.seasons;
    const filters = ERA_FILTERS.filter(
      (filter) =>
        (!filter.tier1Only || this.tierId() === 'tier1') &&
        seasons.some((season) => this.seasonMatchesEra(season, filter))
    );
    const latestSeason = profile.latestSeason;
    if (latestSeason) {
      const recentFilter: EraFilter = {
        id: 'recent',
        label: 'Last 10 seasons',
        detail: `${Math.max(seasons[0], latestSeason - 9)}-${latestSeason}`,
        start: latestSeason - 9,
        end: latestSeason,
      };
      filters.push(recentFilter);
    }

    return filters;
  });
  selectedEraFilter = computed(() => {
    const requestedEra = this.queryParamMap().get('era') ?? 'all';
    return (
      this.availableEraFilters().find((filter) => filter.id === requestedEra) ??
      this.availableEraFilters()[0] ??
      ERA_FILTERS[0]
    );
  });
  profile = computed(() => {
    const fullProfile = this.fullProfile();
    const tier = this.tierId();
    const selectedEra = this.selectedEraFilter();
    if (!fullProfile || selectedEra.id === 'all') {
      return fullProfile;
    }

    const filteredEntries = this.store
      .getFullTable()
      .filter((entry) => this.seasonMatchesEra(entry.season, selectedEra));
    const profile = buildTierProfileData(filteredEntries, tier, (teamId) =>
      this.store.getTeamById(teamId)
    );
    return profile.totalRows ? profile : fullProfile;
  });

  tierLabel = computed(() => this.formatTierLabel(this.tierId()));
  sourceTierLabel = computed(() => {
    const sourceTier = this.adjacentLowerTier(this.tierId());
    return sourceTier ? this.formatTierLabel(sourceTier) : '';
  });
  upperTierId = computed(() => {
    const tier = this.adjacentUpperTier(this.tierId());
    return tier && this.hasTier(tier) ? tier : null;
  });
  lowerTierId = computed(() => {
    const tier = this.adjacentLowerTier(this.tierId());
    return tier && this.hasTier(tier) ? tier : null;
  });
  dataNotices = computed<TierDataNotice[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    return TIER_DATA_NOTICES.filter((notice) => notice.tiers.includes(this.tierId()))
      .map((notice) => ({
        id: notice.id,
        title: notice.title,
        detail: notice.detail,
        seasonsLabel: this.affectedSeasonsLabel(profile.seasons, notice.ranges),
      }))
      .filter((notice) => notice.seasonsLabel.length > 0);
  });

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }

  seasonRangeLabel(): string {
    const seasons = this.profile()?.seasons ?? [];
    if (!seasons.length) {
      return 'No seasons';
    }

    const first = seasons[0];
    const latest = seasons.at(-1);
    return first === latest ? String(first) : `${first}-${latest}`;
  }

  tableQueryParams(season: number): { season: number; tier: string } {
    return {
      season,
      tier: this.tierId(),
    };
  }

  latestTableQueryParams(): { season: number; tier: string } | null {
    const latestSeason = this.profile()?.latestSeason;
    return latestSeason
      ? {
          season: latestSeason,
          tier: this.tierId(),
        }
      : null;
  }

  sourceTableQueryParams(season: number): { season: number; tier: string } {
    return {
      season,
      tier: this.adjacentLowerTier(this.tierId()) ?? this.tierId(),
    };
  }

  movementRows(rows: TierClubTotal[]): TierClubTotal[] {
    return rows.slice(0, 6);
  }

  raceRows(rows: TierRaceRow[]): TierRaceRow[] {
    return rows.slice(0, 5);
  }

  isRaceSectionExpanded(sectionId: RaceSectionId): boolean {
    return this.expandedRaceSections()[sectionId];
  }

  toggleRaceSection(sectionId: RaceSectionId) {
    this.expandedRaceSections.update((sections) => ({
      ...sections,
      [sectionId]: !sections[sectionId],
    }));
  }

  runRows(rows: TierDominanceRun[]): TierDominanceRun[] {
    return rows.slice(0, 5);
  }

  topRow<T>(rows: readonly T[]): T | null {
    return rows[0] ?? null;
  }

  previewNames(rows: readonly { name: string }[]): string {
    return rows
      .slice(1, 3)
      .map((row) => row.name)
      .join(' / ');
  }

  eraQueryParams(filterId: string): { era: string | null } {
    return {
      era: filterId === 'all' ? null : filterId,
    };
  }

  selectedEraSummary(): string {
    const profile = this.profile();
    if (!profile?.seasons.length) {
      return 'No seasons in this view';
    }

    const first = profile.seasons[0];
    const latest = profile.seasons.at(-1);
    return first === latest
      ? `Showing ${first}`
      : `Showing ${profile.seasons.length} seasons from ${first}-${latest}`;
  }

  private formatTierLabel(tier: string): string {
    return this.tierLabelPipe.transform(tier) || this.fallbackTierLabel(tier);
  }

  private fallbackTierLabel(tier: string): string {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `Tier ${parsed}` : 'Unknown tier';
  }

  private adjacentLowerTier(tier: string): string | null {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `tier${parsed + 1}` : null;
  }

  private adjacentUpperTier(tier: string): string | null {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) && parsed > 1 ? `tier${parsed - 1}` : null;
  }

  private hasTier(tier: string): boolean {
    return this.store.getFullTable().some((entry) => entry.tier === tier);
  }

  private seasonMatchesEra(season: number, filter: EraFilter): boolean {
    return (
      (filter.start === null || season >= filter.start) &&
      (filter.end === null || season <= filter.end)
    );
  }

  private affectedSeasonsLabel(seasons: readonly number[], ranges: readonly SeasonRange[]): string {
    const affectedSeasons = seasons.filter((season) =>
      ranges.some((range) => season >= range.start && season <= range.end)
    );
    if (!affectedSeasons.length) {
      return '';
    }

    const segments: string[] = [];
    let segmentStart = affectedSeasons[0];
    let previousSeason = affectedSeasons[0];

    affectedSeasons.slice(1).forEach((season) => {
      if (season === previousSeason + 1) {
        previousSeason = season;
        return;
      }

      segments.push(this.formatSeasonSegment(segmentStart, previousSeason));
      segmentStart = season;
      previousSeason = season;
    });

    segments.push(this.formatSeasonSegment(segmentStart, previousSeason));
    return segments.join(', ');
  }

  private formatSeasonSegment(start: number, end: number): string {
    return start === end ? String(start) : `${start}-${end}`;
  }
}
