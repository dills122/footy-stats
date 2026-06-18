import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import {
  buildTierProfileData,
  type TierClubTotal,
  type TierRaceRow,
} from '@app/utils/tier-profile';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';

@Component({
  selector: 'app-league-deep-stats',
  imports: [CommonModule, MatButtonModule, RouterLink, DataExportMenu],
  providers: [LeagueTierToStringyPipe],
  templateUrl: './league-deep-stats.html',
  styleUrl: './league-deep-stats.scss',
})
export class LeagueDeepStats {
  private route = inject(ActivatedRoute);
  private store = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  private tierLabelPipe = inject(LeagueTierToStringyPipe);
  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  tierId = computed(() => this.paramMap().get('tier') ?? '');
  hasArchiveData = computed(() => this.store.getFullTable().length > 0);
  showLoadingState = computed(() => !this.hasArchiveData() && this.dataLoader.showLoadingState());
  loadFailed = computed(() => !this.hasArchiveData() && this.dataLoader.loadStatus() === 'error');
  profile = computed(() => {
    const tier = this.tierId();
    if (!/^tier\d+$/.test(tier)) {
      return null;
    }

    const profile = buildTierProfileData(
      this.store.getFullTable(),
      tier,
      (teamId) => this.store.getTeamById(teamId),
      {
        leaderLimit: 24,
        raceLimit: 24,
        runLimit: 24,
        churnLimit: 24,
      }
    );
    return profile.totalRows ? profile : null;
  });
  tierLabel = computed(() => this.formatTierLabel(this.tierId()));
  sourceTierLabel = computed(() => this.formatTierLabel(this.adjacentLowerTier(this.tierId())));
  exportSummary = computed<ExportSummary>(() => {
    const profile = this.profile();
    return {
      page: 'League Deep Stats',
      tier: this.tierId(),
      competition: this.tierLabel(),
      seasonRange: this.seasonRangeLabel(),
      rows: profile?.totalRows ?? 0,
      seasons: profile?.seasons.length ?? 0,
      uniqueClubs: profile?.uniqueClubCount ?? 0,
      promotedIn: profile?.promotionInCount ?? 0,
      relegatedOut: profile?.relegationOutCount ?? 0,
    };
  });
  exportRows = computed<ExportRow[]>(() => {
    const profile = this.profile();
    if (!profile) {
      return [];
    }

    const rows: ExportRow[] = [];
    const addClubTotals = (section: string, totals: readonly TierClubTotal[]) => {
      totals.forEach((row, index) =>
        rows.push({
          section,
          rank: index + 1,
          name: row.name,
          clubId: row.clubId,
          count: row.count,
          detail: row.detail,
        })
      );
    };
    const addRaces = (section: string, races: readonly TierRaceRow[]) => {
      races.forEach((row, index) =>
        rows.push({
          section,
          rank: index + 1,
          season: row.season,
          gap: row.gap,
          tieBreakerGap: row.tieBreakerGap,
          primaryName: row.primaryName,
          primaryClubId: row.primaryClubId,
          secondaryName: row.secondaryName,
          secondaryClubId: row.secondaryClubId,
          detail: row.detail,
        })
      );
    };

    addClubTotals('Most seasons', profile.mostSeasons);
    addClubTotals('Most titles', profile.mostTitles);
    addClubTotals('Top-three finishes', profile.mostTopThreeFinishes);
    addClubTotals('Promotions in', profile.mostPromotionsIn);
    addClubTotals('Relegations out', profile.mostRelegationsOut);
    addRaces('Close title races', profile.closeTitleRaces);
    addRaces('Close survival races', profile.closeSurvivalRaces);
    addRaces('Close promotion races', profile.closePromotionRaces);
    profile.churnSeasons.forEach((row) =>
      rows.push({
        section: 'High-churn seasons',
        season: row.season,
        promotedIn: row.promotedIn,
        relegatedOut: row.relegatedOut,
        totalMovement: row.totalMovement,
      })
    );

    return rows;
  });
  exportFilename = computed(() => `footy-stats-league-deep-stats-${this.tierId()}`);

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
    return { season, tier: this.tierId() };
  }

  sourceTableQueryParams(season: number): { season: number; tier: string } {
    return { season, tier: this.adjacentLowerTier(this.tierId()) };
  }

  topRows<T>(rows: readonly T[], limit = 12): T[] {
    return rows.slice(0, limit);
  }

  raceRows(rows: readonly TierRaceRow[]): TierRaceRow[] {
    return rows.slice(0, 12);
  }

  leaderRows(rows: readonly TierClubTotal[]): TierClubTotal[] {
    return rows.slice(0, 12);
  }

  printPage() {
    globalThis.print?.();
  }

  private formatTierLabel(tier: string): string {
    return this.tierLabelPipe.transform(tier) || this.fallbackTierLabel(tier);
  }

  private fallbackTierLabel(tier: string): string {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `Tier ${parsed}` : 'Unknown tier';
  }

  private adjacentLowerTier(tier: string): string {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `tier${parsed + 1}` : tier;
  }
}
