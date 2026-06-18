import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { DataIssueReportDialog } from '@app/components/data-issue-report-dialog/data-issue-report-dialog';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTableView } from '@app/types';
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
    LeagueTierToStringyPipe,
    SeasonSummaryCardComponent,
    DataIssueReportDialog,
  ],
  providers: [LeagueTierToStringyPipe],
})
export class LeagueTablesViewerComponent implements OnDestroy {
  store = inject(LeagueStore);
  private leagueLabelPipe = inject(LeagueTierToStringyPipe);
  private route = inject(ActivatedRoute);
  private queryParamMapSignal = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private tableRevealTimer: ReturnType<typeof setTimeout> | null = null;

  years: number[] = [];
  leaguesForYear: string[] = [];

  selectedYear = signal<number | undefined>(undefined);
  selectedLeague = signal<string | undefined>(undefined);
  tableRevealActive = signal(false);
  quickFiltersCollapsed = signal(false);

  constructor() {
    effect(() => {
      const seasonTiers = this.getCompetitionSeasonTiers();
      const queryParams = this.queryParamMapSignal();
      this.years = seasonTiers.map((st) => st.season).sort((a, b) => b - a);

      if (!this.years.length) {
        return;
      }

      const requestedSeason = Number(queryParams.get('season'));
      const requestedTier = queryParams.get('tier') ?? undefined;
      const requestedSeasonTiers = Number.isInteger(requestedSeason)
        ? seasonTiers.find((seasonTier) => seasonTier.season === requestedSeason)
        : undefined;

      if (
        requestedSeasonTiers &&
        (!requestedTier || requestedSeasonTiers.tiers.includes(requestedTier))
      ) {
        this.selectTable(requestedSeason, requestedTier ?? requestedSeasonTiers.tiers[0]);
        return;
      }

      if (!this.selectedYear()) {
        this.selectTable(this.years[0]);
      }
    });

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

  currentLeagueLabel = computed(() => {
    const league = this.selectedLeague();
    return league ?? '';
  });

  tableControlsReady = computed(() =>
    Boolean(this.selectedYear() && this.selectedLeague() && this.years.length)
  );

  tablePresets = computed<TablePreset[]>(() => {
    const seasonTiers = this.getCompetitionSeasonTiers();
    const latestSeason = seasonTiers.at(-1)?.season;
    const earliestTopFlight = seasonTiers.find((season) => season.tiers.includes('tier1'))?.season;
    const firstSecondTier = seasonTiers.find((season) => season.tiers.includes('tier2'))?.season;
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

  dataIssueContext = computed<DataIssueReportContext>(() => {
    const league = this.selectedLeague();
    return {
      pageTitle: 'League table archive',
      sourcePath: '/tables',
      season: this.selectedYear(),
      competition: league ? this.leagueLabelPipe.transform(league) || league : undefined,
    };
  });

  onYearChange(year: number) {
    this.selectTable(year);
  }

  onLeagueChange(league: string) {
    this.selectedLeague.set(league);
  }

  applyPreset(preset: TablePreset) {
    this.onYearChange(preset.season);
    this.selectedLeague.set(preset.tier);
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
    return this.getCompetitionSeasonTiers().some(
      (seasonTier) => seasonTier.season === season && seasonTier.tiers.includes(tier)
    );
  }

  private selectTable(year: number, tier?: string) {
    const seasonTiers = this.getCompetitionSeasonTiers();
    const currentSeasonsAvailableTiers = seasonTiers.find((st) => st.season === year);
    this.leaguesForYear = currentSeasonsAvailableTiers?.tiers ?? [];

    this.selectedYear.set(year);
    this.selectedLeague.set(
      tier && this.leaguesForYear.includes(tier) ? tier : this.leaguesForYear[0]
    );
  }

  private getCompetitionSeasonTiers(): { season: number; tiers: string[] }[] {
    return this.store
      .getSeasonTiers()
      .map((seasonTier) => ({
        season: seasonTier.season,
        tiers: seasonTier.tiers.filter((tier) => /^tier\d+$/.test(tier)),
      }))
      .filter((seasonTier) => seasonTier.tiers.length);
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
