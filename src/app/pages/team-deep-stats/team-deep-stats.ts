import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { buildTeamDeepStatsData } from '@app/utils/team-deep-stats';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';

@Component({
  selector: 'app-team-deep-stats',
  imports: [CommonModule, MatButtonModule, RouterLink, DataExportMenu],
  providers: [LeagueTierToStringyPipe],
  templateUrl: './team-deep-stats.html',
  styleUrl: './team-deep-stats.scss',
})
export class TeamDeepStats {
  private route = inject(ActivatedRoute);
  private clubMetadataStore = inject(ClubMetadataStore);
  private leagueStore = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  private tierLabelPipe = inject(LeagueTierToStringyPipe);
  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  clubId = computed(() => this.paramMap().get('clubId') ?? '');
  metadataLoaded = computed(() => Boolean(this.clubMetadataStore.getGeneratedAt()));
  showLoadingState = computed(() => !this.metadataLoaded() && this.dataLoader.showLoadingState());
  loadFailed = computed(() => !this.metadataLoaded() && this.dataLoader.loadStatus() === 'error');
  club = computed(() => this.clubMetadataStore.getClubById(this.clubId()));
  entries = computed(() =>
    this.leagueStore
      .getEntriesByClubId(this.clubId())
      .slice()
      .sort((a, b) => b.season - a.season || this.tierRank(a.tier) - this.tierRank(b.tier))
  );
  deepStats = computed(() =>
    buildTeamDeepStatsData(
      this.entries(),
      (teamId) => this.leagueStore.getTeamNameById(teamId),
      (tier) => this.tierLabel(tier)
    )
  );
  exportSummary = computed<ExportSummary>(() => ({
    page: 'Club Deep Stats',
    clubId: this.clubId(),
    clubName: this.club()?.canonicalName ?? '',
    ...this.deepStats().totals,
  }));
  exportRows = computed<ExportRow[]>(() =>
    this.deepStats().seasonRows.map((row) => ({
      season: row.season,
      tier: row.tier,
      tierLabel: row.tierLabel,
      teamName: row.teamName,
      clubId: row.clubId,
      position: row.position,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDifference: row.goalDifference,
      points: row.points,
      pointsPerGame: row.pointsPerGame,
      movementLabel: row.movementLabel,
    }))
  );
  exportFilename = computed(() => `footy-stats-club-deep-stats-${this.clubId() || 'unknown'}`);

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }

  tableQueryParams(season: number, tier: string): { season: number; tier: string } {
    return { season, tier };
  }

  tierLabel(tier: string): string {
    const label = this.tierLabelPipe.transform(tier);
    if (label) {
      return label;
    }

    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? `Tier ${parsed}` : tier;
  }

  ordinal(value: number): string {
    const mod100 = value % 100;
    if (mod100 >= 11 && mod100 <= 13) {
      return `${value}th`;
    }

    const suffixByMod10: Record<number, string> = {
      1: 'st',
      2: 'nd',
      3: 'rd',
    };
    return `${value}${suffixByMod10[value % 10] ?? 'th'}`;
  }

  signedNumber(value: number | null): string {
    if (value === null) {
      return 'No data';
    }

    return value > 0 ? `+${value}` : String(value);
  }

  formatDecimal(value: number | null): string {
    return value === null ? 'No data' : value.toFixed(2);
  }

  printPage() {
    globalThis.print?.();
  }

  private tierRank(tier: string): number {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? parsed : 99;
  }
}
