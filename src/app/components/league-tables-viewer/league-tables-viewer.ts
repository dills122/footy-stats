import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute, Router } from '@angular/router';
import { ArchiveLoadState } from '@app/components/archive-load-state/archive-load-state';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { LeagueTableView } from '@app/types';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';
import type { DataIssueReportContext } from '@app/utils/data-issue-report';
import { LeagueTableComponent } from '../league-table/league-table';
import { SeasonSummaryCardComponent } from '../season-summary-card/season-summary-card';

interface TablePreset {
  id: string;
  label: string;
  detail: string;
  season: number;
  tier: string;
}

interface TableDataNoticeDefinition {
  id: string;
  tiers: readonly string[];
  ranges: readonly { start: number; end: number }[];
  title: string;
  detail: string;
}

interface TableDataNotice {
  id: string;
  title: string;
  detail: string;
}

const TABLE_DATA_NOTICES: TableDataNoticeDefinition[] = [
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
  selector: 'app-league-tables-viewer',
  templateUrl: './league-tables-viewer.html',
  styleUrl: './league-tables-viewer.scss',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    LeagueTableComponent,
    CommonModule,
    MatIconModule,
    SeasonSummaryCardComponent,
    DataExportMenu,
    ArchiveLoadState,
  ],
})
export class LeagueTablesViewerComponent implements OnDestroy {
  store = inject(LeagueStore);
  protected readonly loadStatus = inject(DataLoaderService).loadStatus;
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private queryParamMapSignal = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private tableRevealTimer: ReturnType<typeof setTimeout> | null = null;

  private competitionSeasons = computed(() =>
    this.store
      .getSeasonTiers()
      .map(({ season, tiers }) => ({
        season,
        tiers: tiers.filter((tier) => /^tier\d+$/.test(tier)),
      }))
      .filter(({ tiers }) => tiers.length)
      .sort((a, b) => b.season - a.season)
  );
  years = computed(() => this.competitionSeasons().map(({ season }) => season));
  private selectedSeason = computed(() => {
    const requested = Number(this.queryParamMapSignal().get('season'));
    const seasons = this.competitionSeasons();
    return seasons.find(({ season }) => season === requested) ?? seasons[0];
  });
  selectedYear = computed(() => this.selectedSeason()?.season);
  leaguesForYear = computed(() => this.selectedSeason()?.tiers ?? []);
  selectedLeague = computed(() => {
    const requested = this.queryParamMapSignal().get('tier');
    const tiers = this.leaguesForYear();
    return requested && tiers.includes(requested) ? requested : tiers[0];
  });
  tableRevealActive = signal(false);
  protected readonly compactLayout = globalThis.matchMedia?.('(max-width: 800px)').matches ?? false;
  quickFiltersCollapsed = signal(this.compactLayout);

  constructor() {
    effect(() => {
      const tableKey = this.tableResultKey();
      if (!tableKey) {
        this.tableRevealActive.set(false);
        return;
      }

      this.tableRevealActive.set(false);
      if (this.tableRevealTimer) {
        clearTimeout(this.tableRevealTimer);
      }

      this.tableRevealTimer = setTimeout(() => {
        this.tableRevealActive.set(true);
        this.tableRevealTimer = null;
      }, 20);
    });
  }

  ngOnDestroy() {
    if (this.tableRevealTimer) {
      clearTimeout(this.tableRevealTimer);
    }
  }

  currentTable = computed<LeagueTableView[] | null>(() => {
    const year = this.selectedYear();
    const league = this.selectedLeague();
    if (!year || !league) return null;

    const table = this.store.getFullTable(year, league);
    if (!table) return null;

    return table.map((entry) => ({
      ...entry,
      teamName: this.store.getTeamNameById(entry.teamId),
    }));
  });

  currentCompetitionName = computed(() => this.competitionName(this.selectedLeague()));

  competitionName(tier?: string): string {
    const season = this.selectedYear();
    return season && tier ? this.store.getCompetitionName(season, tier) : '';
  }

  tableControlsReady = computed(() =>
    Boolean(this.selectedYear() && this.selectedLeague() && this.years().length)
  );

  tablePresets = computed<TablePreset[]>(() => {
    const seasonTiers = this.competitionSeasons();
    const latestSeason = seasonTiers[0]?.season;
    const earliestTopFlight = seasonTiers
      .filter((season) => season.tiers.includes('tier1'))
      .at(-1)?.season;
    const firstSecondTier = seasonTiers
      .filter((season) => season.tiers.includes('tier2'))
      .at(-1)?.season;
    const candidates: TablePreset[] = [
      {
        id: 'latest-top-flight',
        label: 'Latest top flight',
        detail: 'Current Premier League table',
        season: latestSeason ?? 0,
        tier: 'tier1',
      },
      {
        id: 'latest-championship',
        label: 'Latest Championship',
        detail: 'Promotion race context',
        season: latestSeason ?? 0,
        tier: 'tier2',
      },
      {
        id: 'premier-league-launch',
        label: 'Premier League launch',
        detail: '1992 top-flight reset',
        season: 1992,
        tier: 'tier1',
      },
      {
        id: 'post-war-restart',
        label: 'Post-war restart',
        detail: '1946 league return',
        season: 1946,
        tier: 'tier1',
      },
      {
        id: 'first-football-league',
        label: 'First league table',
        detail: 'Earliest top-flight record',
        season: earliestTopFlight ?? 0,
        tier: 'tier1',
      },
      {
        id: 'first-second-tier',
        label: 'Second tier begins',
        detail: 'First recorded tier two',
        season: firstSecondTier ?? 0,
        tier: 'tier2',
      },
    ];

    return candidates.filter((preset, index, presets) => {
      if (!this.hasSeasonTier(preset.season, preset.tier)) {
        return false;
      }

      return (
        presets.findIndex(
          (candidate) => candidate.season === preset.season && candidate.tier === preset.tier
        ) === index
      );
    });
  });

  activePresetId = computed(() => {
    const selectedYear = this.selectedYear();
    const selectedLeague = this.selectedLeague();
    return (
      this.tablePresets().find(
        (preset) => preset.season === selectedYear && preset.tier === selectedLeague
      )?.id ?? ''
    );
  });

  tableResultKey = computed(() => {
    const year = this.selectedYear();
    const league = this.selectedLeague();
    return year && league ? `${year}:${league}` : '';
  });

  tableDataNotices = computed<TableDataNotice[]>(() => {
    const year = this.selectedYear();
    const league = this.selectedLeague();
    if (!year || !league) {
      return [];
    }

    return TABLE_DATA_NOTICES.filter(
      (notice) =>
        notice.tiers.includes(league) &&
        notice.ranges.some((range) => year >= range.start && year <= range.end)
    ).map((notice) => ({
      id: notice.id,
      title: notice.title,
      detail: notice.detail,
    }));
  });

  dataIssueContext = computed<DataIssueReportContext>(() => {
    return {
      pageTitle: 'League table archive',
      sourcePath: '/tables',
      season: this.selectedYear(),
      competition: this.currentCompetitionName() || undefined,
    };
  });
  exportSummary = computed<ExportSummary>(() => ({
    page: 'League Tables',
    season: this.selectedYear() ?? '',
    competition: this.currentCompetitionName(),
    rows: this.currentTable()?.length ?? 0,
  }));
  exportRows = computed<ExportRow[]>(() =>
    (this.currentTable() ?? [])
      .slice()
      .sort((a, b) => b.points - a.points || (b.goalDifference ?? 0) - (a.goalDifference ?? 0))
      .map((row, index) => ({
        position: index + 1,
        season: row.season,
        tier: row.tier,
        competition: this.currentCompetitionName(),
        teamName: row.teamName,
        clubId: row.clubId,
        played: row.played,
        won: row.won,
        drawn: row.drawn,
        lost: row.lost,
        goalsFor: row.goalsFor,
        goalsAgainst: row.goalsAgainst,
        goalDifference: row.goalDifference,
        goalAverage: row.goalAverage,
        points: row.points,
        wasPromoted: row.wasPromoted,
        wasRelegated: row.wasRelegated,
        wasReElected: row.wasReElected,
        wasReprieved: row.wasReprieved,
        notes: row.notes,
      }))
  );
  exportFilename = computed(
    () => `footy-stats-table-${this.selectedYear() ?? 'season'}-${this.selectedLeague() ?? 'tier'}`
  );

  onYearChange(year: number) {
    this.selectTable(year, this.selectedLeague());
  }

  onLeagueChange(league: string) {
    const year = this.selectedYear();
    if (year !== undefined) {
      this.selectTable(year, league);
    }
  }

  applyPreset(preset: TablePreset) {
    this.selectTable(preset.season, preset.tier);
  }

  toggleQuickFilters() {
    this.quickFiltersCollapsed.update((isCollapsed) => !isCollapsed);
  }

  scrollToTableContent(target: HTMLElement) {
    target.scrollIntoView({
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    });
    target.focus({ preventScroll: true });
  }

  private hasSeasonTier(season: number, tier: string): boolean {
    return this.competitionSeasons().some(
      (seasonTier) => seasonTier.season === season && seasonTier.tiers.includes(tier)
    );
  }

  private selectTable(season: number, preferredTier?: string) {
    const tiers = this.competitionSeasons().find((entry) => entry.season === season)?.tiers;
    if (!tiers?.length) return;

    const tier = preferredTier && tiers.includes(preferredTier) ? preferredTier : tiers[0];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { season, tier },
      queryParamsHandling: 'merge',
    });
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
