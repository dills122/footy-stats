import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LineChart } from 'echarts/charts';
import { GridComponent, MarkAreaComponent, TooltipComponent } from 'echarts/components';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { DataIssueReportDialog } from '@app/components/data-issue-report-dialog/data-issue-report-dialog';
import type { LeagueTableEntry } from '@app/store/league.models';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { isTeamDirectoryFilter, type TeamDirectoryFilter } from '@app/types';
import type { DataIssueReportContext } from '@app/utils/data-issue-report';
import {
  buildClubDerivedGaps,
  buildClubDisplayNamePeriods,
  type ClubDisplayNamePeriod,
} from '@app/utils/club-identity-ranges';
import { buildClubPerformanceMilestones } from '@app/utils/club-performance-milestones';
import { buildWikipediaLinks } from '@app/utils/link-builders';
import { getWartimeSuspensionRanges } from '@app/utils/wartime-suspensions';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';

const TIER_LABELS: Record<string, string> = {
  tier1: 'Premier League',
  tier2: 'Championship',
  tier3: 'League One',
  tier4: 'League Two',
  tier5: 'National League',
  tier6: 'National League North',
  tier7: 'National League South',
};

const RELATIONSHIP_LABELS: Record<string, string> = {
  merger: 'Merger',
  phoenix: 'Phoenix club',
  relocation: 'Relocation',
  successor: 'Successor',
  supporterPhoenix: 'Supporter phoenix',
};

const RELATIONSHIP_DIRECTION_LABELS: Record<string, string> = {
  formedBySupportersOf: 'formed by supporters of',
  formedFrom: 'formed from',
  mergedInto: 'merged into',
  predecessor: 'predecessor',
  relocatedFrom: 'relocated from',
  relocatedTo: 'relocated to',
  successor: 'successor',
  supporterFounded: 'supporter founded',
};

interface MilestoneCard {
  label: string;
  value: string;
  detail: string;
}

interface SnapshotFact {
  label: string;
  value: string;
}

interface CompactSeasonRow {
  season: number;
  tier: string;
  tierLabel: string;
  positionLabel: string;
  recordLabel: string;
  movementLabel: string | null;
}

interface RecentSeasonRow extends LeagueTableEntry {
  teamName: string;
}

interface HistoricalStatusSummary {
  label: string;
  summary: string;
  detail: string;
  sourceUrl: string;
  sourceLabel: string;
  sourceNote: string | null;
}

type HistoryDisplayMode = 'compact' | 'small-chart' | 'full-chart';

interface TeamsReturnNavigationState {
  teamsReturnLetter?: unknown;
  teamsReturnFilter?: unknown;
}

echarts.use([LineChart, GridComponent, TooltipComponent, MarkAreaComponent, CanvasRenderer]);

@Component({
  selector: 'app-team-overview',
  imports: [
    CommonModule,
    MatButtonModule,
    RouterLink,
    NgxEchartsDirective,
    DataIssueReportDialog,
    DataExportMenu,
  ],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './team-overview.html',
  styleUrl: './team-overview.scss',
})
export class TeamOverview implements AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private clubMetadataStore = inject(ClubMetadataStore);
  private leagueStore = inject(LeagueStore);
  private dataLoader = inject(DataLoaderService);
  private historyPanelObserver?: ResizeObserver;

  @ViewChild('historyPanel') private historyPanel?: ElementRef<HTMLElement>;

  private paramMap = toSignal(this.route.paramMap, {
    initialValue: this.route.snapshot.paramMap,
  });

  clubId = computed(() => this.paramMap().get('clubId') ?? '');
  metadataLoaded = computed(() => Boolean(this.clubMetadataStore.getGeneratedAt()));
  showLoadingState = computed(() => !this.metadataLoaded() && this.dataLoader.showLoadingState());
  loadFailed = computed(() => !this.metadataLoaded() && this.dataLoader.loadStatus() === 'error');
  milestonesExpanded = signal(false);
  milestoneCollapsedHeight = signal<number | null>(null);
  teamsReturnLetter = signal(this.readTeamsReturnLetter());
  teamsReturnFilter = signal<TeamDirectoryFilter>(this.readTeamsReturnFilter());
  backToTeamsQueryParams = computed(() => {
    const letter = this.teamsReturnLetter();
    const filter = this.teamsReturnFilter();
    const queryParams = {
      ...(letter ? { letter } : {}),
      ...(filter !== 'all' ? { filter } : {}),
    };

    return Object.keys(queryParams).length ? queryParams : null;
  });
  club = computed(() => this.clubMetadataStore.getClubById(this.clubId()));
  entries = computed(() =>
    this.leagueStore
      .getEntriesByClubId(this.clubId())
      .slice()
      .sort((a, b) => b.season - a.season || this.tierRank(a.tier) - this.tierRank(b.tier))
  );
  seasons = computed(() => this.club()?.derived.seasonsSeen ?? []);
  latestDataSeason = computed(() => this.leagueStore.getSeasons().at(-1) ?? null);
  statusLabel = computed(() => {
    const club = this.club();
    if (!club) {
      return 'unknown';
    }

    if (club.status?.current) {
      return club.status.current;
    }

    return club.derived.lastSeenSeason === this.latestDataSeason() ? 'active' : 'historical';
  });
  dataIssueContext = computed<DataIssueReportContext>(() => ({
    pageTitle: 'Club profile',
    sourcePath: `/teams/${this.clubId()}`,
    clubName: this.club()?.canonicalName ?? (this.clubId() || undefined),
  }));
  teamNames = computed(() =>
    Array.from(
      new Set(this.entries().map((entry) => this.leagueStore.getTeamNameById(entry.teamId)))
    )
  );
  latestEntry = computed(() => this.entries()[0] ?? null);
  topTierBestFinish = computed(() => {
    const topTierEntries = this.entries().filter((entry) => entry.tier === 'tier1');
    if (!topTierEntries.length) {
      return null;
    }

    return topTierEntries.reduce((best, entry) => (entry.pos < best.pos ? entry : best));
  });
  tierSummary = computed(() => {
    const counts = new Map<string, number>();
    this.entries().forEach((entry) => counts.set(entry.tier, (counts.get(entry.tier) ?? 0) + 1));
    return Array.from(counts.entries())
      .map(([tier, count]) => ({ tier, label: this.tierLabel(tier), count }))
      .sort((a, b) => this.tierRank(a.tier) - this.tierRank(b.tier));
  });
  movementSummary = computed(() => {
    const entries = this.entries();
    return {
      promoted: entries.filter((entry) => entry.wasPromoted).length,
      relegated: entries.filter((entry) => entry.wasRelegated).length,
      reprieved: entries.filter((entry) => entry.wasReprieved).length,
    };
  });
  relationshipRows = computed(
    () =>
      this.club()?.derived.relationships?.map((relationship) => {
        const relatedClub = this.clubMetadataStore.getClubById(relationship.clubKey);
        return {
          ...relationship,
          relatedClubId: relatedClub ? relationship.clubKey : null,
          relatedName: relatedClub?.canonicalName ?? relationship.clubKey,
        };
      }) ?? []
  );
  historicalStatusSummary = computed<HistoricalStatusSummary | null>(() => {
    const club = this.club();
    if (!club || this.statusLabel() === 'active') {
      return null;
    }

    const source = this.primaryClubSource();
    const lastSeenSeason = club.derived.lastSeenSeason;
    const relationship = this.relationshipRows()[0];
    const latestLifecycleEvent = club.history?.lifecycleEvents
      .slice()
      .reverse()
      .find((event) => event.label);
    const exitReasonDetail = club.status?.reasonLabel ?? latestLifecycleEvent?.label;
    let relationshipDetail =
      'No explicit fold, merger, or exit reason is recorded in metadata yet.';
    if (exitReasonDetail) {
      relationshipDetail = exitReasonDetail;
    } else if (relationship) {
      relationshipDetail = `${this.relationshipLabel(relationship.relationship, relationship.direction)} ${relationship.relatedName}.`;
    }

    return {
      label: this.statusLabel(),
      summary: `Historical in this archive after ${lastSeenSeason}.`,
      detail: relationshipDetail,
      sourceUrl: source.url,
      sourceLabel: source.label,
      sourceNote: source.note,
    };
  });
  displayNamePeriods = computed(() =>
    buildClubDisplayNamePeriods(this.club()?.derived.observedNamePeriods ?? [])
  );
  gapRows = computed(() => {
    const explicitGaps = this.club()?.history?.absenceExplanations ?? [];
    if (explicitGaps.length) {
      return explicitGaps.map((gap) => ({
        fromSeason: gap.fromSeason,
        toSeason: gap.toSeason,
        reason: gap.reason || gap.basis || 'Recorded absence',
        isOfficialSuspension: false,
      }));
    }

    return buildClubDerivedGaps(this.club()?.derived.observedNamePeriods ?? []);
  });
  recentEntries = computed(() => this.entries().slice(0, 12));
  recentSeasonRows = computed<RecentSeasonRow[]>(() =>
    this.recentEntries().map((entry) => ({
      ...entry,
      teamName: this.leagueStore.getTeamNameById(entry.teamId),
    }))
  );
  exportSummary = computed<ExportSummary>(() => ({
    page: 'Club Profile',
    clubId: this.clubId(),
    clubName: this.club()?.canonicalName ?? '',
    status: this.statusLabel(),
    trackedSeasons: this.club()?.derived.totalSeasonsSeen ?? this.entries().length,
    seasonRange: this.club() ? this.trackedSeasonRangeLabel() : '',
    aliases: this.club()?.derived.aliases ?? [],
  }));
  exportRows = computed<ExportRow[]>(() =>
    this.entries().map((entry) => ({
      season: entry.season,
      tier: entry.tier,
      tierLabel: this.tierLabel(entry.tier),
      teamName: this.leagueStore.getTeamNameById(entry.teamId),
      clubId: entry.clubId,
      position: entry.pos,
      played: entry.played,
      won: entry.won,
      drawn: entry.drawn,
      lost: entry.lost,
      goalsFor: entry.goalsFor,
      goalsAgainst: entry.goalsAgainst,
      goalDifference: entry.goalDifference,
      goalAverage: entry.goalAverage,
      points: entry.points,
      wasPromoted: entry.wasPromoted,
      wasRelegated: entry.wasRelegated,
      wasReElected: entry.wasReElected,
      wasReprieved: entry.wasReprieved,
      notes: entry.notes,
    }))
  );
  exportData = computed(() => ({
    club: this.club(),
    teamNames: this.teamNames(),
    tierSummary: this.tierSummary(),
    movementSummary: this.movementSummary(),
    relationships: this.relationshipRows(),
    displayNamePeriods: this.displayNamePeriods(),
    gaps: this.gapRows(),
    milestones: this.performanceMilestones(),
  }));
  exportFilename = computed(() => `footy-stats-club-${this.clubId() || 'unknown'}`);

  dataIssueContextForSeason(entry: RecentSeasonRow): DataIssueReportContext {
    return {
      pageTitle: 'Club season row',
      sourcePath: `/teams/${this.clubId()} season ${entry.season}`,
      clubName: entry.teamName || this.club()?.canonicalName || undefined,
      season: entry.season,
      competition: this.tierLabel(entry.tier),
    };
  }

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }

  identityPeriodRangeLabel(period: ClubDisplayNamePeriod): string {
    return `${period.startSeason}-${this.seasonEndLabel(period.endSeason)}`;
  }

  trackedSeasonRangeLabel(): string {
    const club = this.club();
    if (!club) {
      return '';
    }

    return `${club.derived.firstSeenSeason} to ${this.seasonEndLabel(club.derived.lastSeenSeason)}`;
  }

  private seasonEndLabel(season: number): string {
    return season === this.latestDataSeason() ? `current (${season})` : season.toString();
  }

  private primaryClubSource(): { url: string; label: string; note: string | null } {
    const club = this.club();
    const statusSource = club?.status?.sourceRefs?.find((source) => source.sourceUrl);
    if (statusSource?.sourceUrl) {
      return {
        url: statusSource.sourceUrl,
        label: 'Status source',
        note: statusSource.notes ?? null,
      };
    }

    const identitySource = club?.derived.identitySources?.find((source) => source.sourceUrl);
    if (identitySource?.sourceUrl) {
      return {
        url: identitySource.sourceUrl,
        label: 'Metadata source',
        note: identitySource.notes ?? null,
      };
    }

    const relationshipSource = club?.derived.relationships
      ?.flatMap((relationship) => relationship.sourceRefs ?? [])
      .find((source) => source.sourceUrl);
    if (relationshipSource?.sourceUrl) {
      return {
        url: relationshipSource.sourceUrl,
        label: 'Continuity source',
        note: relationshipSource.notes ?? null,
      };
    }

    const name = club?.canonicalName ?? this.clubId();
    return {
      url: buildWikipediaLinks([name])[name],
      label: 'Wikipedia',
      note: null,
    };
  }

  ngAfterViewInit() {
    const historyPanel = this.historyPanel?.nativeElement;

    if (!historyPanel || typeof ResizeObserver === 'undefined') {
      return;
    }

    const updateCollapsedHeight = () => {
      const height = Math.ceil(historyPanel.getBoundingClientRect().height);
      this.milestoneCollapsedHeight.set(height > 0 ? height : null);
    };

    updateCollapsedHeight();
    this.historyPanelObserver = new ResizeObserver(updateCollapsedHeight);
    this.historyPanelObserver.observe(historyPanel);
  }

  ngOnDestroy() {
    this.historyPanelObserver?.disconnect();
  }

  toggleMilestones() {
    this.milestonesExpanded.update((expanded) => !expanded);
  }

  private readTeamsReturnLetter(): string {
    const state = (this.router.getCurrentNavigation()?.extras.state ??
      globalThis.history?.state) as TeamsReturnNavigationState | undefined;
    const rawLetter = typeof state?.teamsReturnLetter === 'string' ? state.teamsReturnLetter : '';
    const letter = rawLetter.trim().toUpperCase();

    return /^[A-Z]$/.test(letter) ? letter : '';
  }

  private readTeamsReturnFilter(): TeamDirectoryFilter {
    const state = (this.router.getCurrentNavigation()?.extras.state ??
      globalThis.history?.state) as TeamsReturnNavigationState | undefined;
    const filter = typeof state?.teamsReturnFilter === 'string' ? state.teamsReturnFilter : '';

    return isTeamDirectoryFilter(filter) ? filter : 'all';
  }

  entriesAscending = computed(() =>
    this.entries()
      .slice()
      .sort((a, b) => a.season - b.season || this.tierRank(a.tier) - this.tierRank(b.tier))
  );
  historyDisplayMode = computed<HistoryDisplayMode>(() => {
    const seasonCount = this.club()?.derived.totalSeasonsSeen ?? this.entries().length;
    if (seasonCount <= 10) {
      return 'compact';
    }

    if (seasonCount <= 20) {
      return 'small-chart';
    }

    return 'full-chart';
  });
  historyPanelTitle = computed(() =>
    this.historyDisplayMode() === 'compact' ? 'Season Snapshot' : 'League Path'
  );
  historyPanelMeta = computed(() => {
    const seasonCount = this.club()?.derived.totalSeasonsSeen ?? this.entries().length;
    return `${seasonCount} ${seasonCount === 1 ? 'season' : 'seasons'}`;
  });
  compactSeasonRows = computed<CompactSeasonRow[]>(() =>
    this.entriesAscending().map((entry) => ({
      season: entry.season,
      tier: entry.tier,
      tierLabel: this.tierLabel(entry.tier),
      positionLabel: this.ordinal(entry.pos),
      recordLabel: `${entry.won}-${entry.drawn}-${entry.lost}`,
      movementLabel: this.movementLabel(entry),
    }))
  );
  compactSnapshotFacts = computed<SnapshotFact[]>(() => {
    const entries = this.entries();
    const totalRecord = entries.reduce(
      (record, entry) => ({
        won: record.won + entry.won,
        drawn: record.drawn + entry.drawn,
        lost: record.lost + entry.lost,
        points: record.points + entry.points,
      }),
      { won: 0, drawn: 0, lost: 0, points: 0 }
    );
    const bestFinish = this.topTierBestFinish();
    const averagePoints = entries.length ? (totalRecord.points / entries.length).toFixed(1) : null;

    return [
      {
        label: 'Best finish',
        value: bestFinish ? `${bestFinish.season} / ${this.ordinal(bestFinish.pos)}` : 'No data',
      },
      {
        label: 'Total record',
        value: `${totalRecord.won}-${totalRecord.drawn}-${totalRecord.lost}`,
      },
      {
        label: 'Avg points',
        value: averagePoints ?? 'No data',
      },
    ];
  });
  performanceMilestones = computed(() => buildClubPerformanceMilestones(this.entries()));
  milestoneCards = computed<MilestoneCard[]>(() => {
    const milestones = this.performanceMilestones();

    return [
      {
        label: 'First table record',
        value: this.entryLabel(milestones.firstEntry),
        detail: 'Earliest season in the current archive data.',
      },
      {
        label: 'Top-flight peak',
        value: milestones.bestTopFlightEntry
          ? this.entryLabel(milestones.bestTopFlightEntry)
          : 'No top-flight data',
        detail: 'Best recorded finish in the highest available tier.',
      },
      {
        label: 'Longest top-flight run',
        value: this.runLabel(milestones.longestTopFlightRun),
        detail: 'Consecutive top-tier table rows; official war gaps do not break the run.',
      },
      {
        label: 'Longest tracked run',
        value: this.runLabel(milestones.longestTrackedRun),
        detail: 'Longest continuous spell anywhere in the tracked league pyramid.',
      },
      {
        label: 'Largest non-war gap',
        value: milestones.longestNonWartimeGap
          ? `${milestones.longestNonWartimeGap.fromSeason}-${milestones.longestNonWartimeGap.toSeason}`
          : 'No non-war gaps',
        detail: milestones.longestNonWartimeGap
          ? `${milestones.longestNonWartimeGap.seasons} missing seasons between table records.`
          : 'Only official wartime suspensions or continuous records were found.',
      },
      {
        label: 'Movement seasons',
        value: `${milestones.promotionSeasons.length} up / ${milestones.relegationSeasons.length} down`,
        detail: this.movementYearsLabel(milestones.promotionSeasons, milestones.relegationSeasons),
      },
    ];
  });
  chartOptions = computed<EChartsCoreOption>(() => {
    const entries = this.entriesAscending();
    if (!entries.length) {
      return {
        animation: false,
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
      };
    }

    const firstSeason = entries[0].season;
    const lastSeason = entries.at(-1)!.season;
    const seasons = Array.from(
      { length: lastSeason - firstSeason + 1 },
      (_, index) => firstSeason + index
    );
    const entriesBySeason = new Map(entries.map((entry) => [entry.season, entry]));
    const data = seasons.map((season) => {
      const entry = entriesBySeason.get(season);
      return entry ? this.tierNumber(entry.tier) : null;
    });
    const tierValues = entries.map((entry) => this.tierNumber(entry.tier));
    const isSmallChart = this.historyDisplayMode() === 'small-chart';
    const wartimeMarkAreas = getWartimeSuspensionRanges(seasons).map((range) => [
      {
        name: range.label,
        xAxis: String(range.startSeason),
        itemStyle: {
          color: 'rgba(217, 119, 6, 0.14)',
          borderColor: 'rgba(217, 119, 6, 0.28)',
          borderWidth: 1,
        },
        label: {
          color: '#fde68a',
          fontSize: 11,
        },
      },
      {
        xAxis: String(range.endSeason),
      },
    ]);

    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: {
        left: isSmallChart ? 96 : 110,
        right: 18,
        top: isSmallChart ? 14 : 16,
        bottom: isSmallChart ? 24 : 30,
        containLabel: false,
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(7, 10, 19, 0.94)',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        textStyle: {
          color: '#d7deeb',
        },
        formatter: (params: unknown) => this.pathTooltip(params, entriesBySeason),
      },
      xAxis: {
        type: 'category',
        data: seasons.map((season) => String(season)),
        boundaryGap: false,
        axisLabel: {
          color: '#c5d0e4',
          hideOverlap: true,
          fontSize: isSmallChart ? 10 : 11,
        },
        axisLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.45)' },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        inverse: true,
        min: Math.max(1, Math.min(...tierValues) - 0.25),
        max: Math.max(...tierValues) + 0.25,
        interval: 1,
        axisLabel: {
          color: '#c5d0e4',
          fontSize: isSmallChart ? 10 : 11,
          fontWeight: 700,
          margin: 10,
          formatter: (value: number) => this.tierLabel(`tier${value}`),
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.18)' },
        },
      },
      series: [
        {
          name: this.club()?.canonicalName ?? 'Club path',
          type: 'line',
          data,
          connectNulls: false,
          showSymbol: false,
          symbolSize: 6,
          lineStyle: {
            width: 2.8,
            color: '#f59e0b',
          },
          itemStyle: {
            color: '#fbbf24',
          },
          markArea: {
            silent: false,
            tooltip: {
              formatter: (params: { name?: string }) =>
                `${params.name ?? 'Official league suspended'}: no official table record`,
            },
            data: wartimeMarkAreas,
          },
        },
      ],
    };
  });

  tierLabel(tier: string): string {
    return TIER_LABELS[tier] ?? tier;
  }

  aliasLetter(alias: string): string {
    return alias.trim().charAt(0).toUpperCase();
  }

  relationshipLabel(relationship: string, direction: string): string {
    const relationshipLabel = RELATIONSHIP_LABELS[relationship] ?? relationship;
    const directionLabel = RELATIONSHIP_DIRECTION_LABELS[direction] ?? direction;
    return `${relationshipLabel} / ${directionLabel}`;
  }

  entryLabel(entry: LeagueTableEntry | null): string {
    if (!entry) {
      return 'No table record';
    }
    return `${entry.season} / ${this.tierLabel(entry.tier)} / ${this.ordinal(entry.pos)}`;
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

  runLabel(run: { startSeason: number; endSeason: number; rowCount: number } | null): string {
    if (!run) {
      return 'No tracked run';
    }

    return `${run.startSeason}-${run.endSeason} / ${run.rowCount} ${run.rowCount === 1 ? 'season' : 'seasons'}`;
  }

  private movementLabel(entry: LeagueTableEntry): string | null {
    if (entry.wasPromoted) {
      return 'Promoted';
    }

    if (entry.wasRelegated) {
      return 'Relegated';
    }

    if (entry.wasReprieved) {
      return 'Reprieved';
    }

    return null;
  }

  private movementYearsLabel(promoted: readonly number[], relegated: readonly number[]): string {
    const latestPromotions = promoted.slice(-3).join(', ');
    const latestRelegations = relegated.slice(-3).join(', ');

    if (!latestPromotions && !latestRelegations) {
      return 'No promotion or relegation markers in the current table data.';
    }

    return [
      latestPromotions ? `Recent promotions: ${latestPromotions}` : null,
      latestRelegations ? `Recent relegations: ${latestRelegations}` : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join(' / ');
  }

  private pathTooltip(
    params: unknown,
    entriesBySeason: ReadonlyMap<number, LeagueTableEntry>
  ): string {
    const point = Array.isArray(params) ? params[0] : params;
    if (!point || typeof point !== 'object' || !('axisValue' in point)) {
      return '';
    }

    const season = Number((point as { axisValue: string }).axisValue);
    const entry = entriesBySeason.get(season);
    if (!entry) {
      return `${season}: no table record`;
    }

    return `${season}: ${this.tierLabel(entry.tier)}, ${this.ordinal(entry.pos)}, ${entry.points} pts`;
  }

  private tierRank(tier: string): number {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? parsed : 99;
  }

  private tierNumber(tier: string): number {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? parsed : 99;
  }
}
