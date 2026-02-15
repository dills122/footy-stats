import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';

interface TeamSeriesPoint {
  season: number;
  tier: number;
  wasPromoted: boolean;
  wasRelegated: boolean;
}

interface TeamSeries {
  teamId: number;
  teamName: string;
  color: string;
  points: TeamSeriesPoint[];
}

const TEAM_COLOR_POOL = [
  '#dc2626',
  '#2563eb',
  '#059669',
  '#7c3aed',
  '#d97706',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#4f46e5',
  '#be123c',
];

const TIER_LABELS: Record<number, string> = {
  1: 'Premier League',
  2: 'Championship',
  3: 'League One',
  4: 'League Two',
  5: 'National League',
  6: 'National League North',
  7: 'National League South',
};

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-movement-explorer',
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './movement-explorer.html',
  styleUrl: './movement-explorer.scss',
  providers: [provideEchartsCore({ echarts })],
})
export class MovementExplorer {
  private store = inject(LeagueStore);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly maxSelectedTeams = 10;
  readonly availablePresets = [
    { id: 'last-10', label: 'Last 10' },
    { id: 'last-20', label: 'Last 20' },
    { id: 'last-50', label: 'Last 50' },
    { id: 'all', label: 'All Time' },
  ] as const;

  selectedTeamIds = signal<number[]>([]);
  clubSearchTerm = signal<string>('');
  selectedStartSeason = signal<number | null>(null);
  selectedEndSeason = signal<number | null>(null);
  activePreset = signal<string>('last-20');
  configCollapsed = signal<boolean>(false);
  private applyingUrlState = false;
  private hasAppliedInitialUrlState = signal<boolean>(false);
  private queryParamMapSignal = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  teams = computed(() =>
    this.store
      .getTeams()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  );
  seasons = computed(() =>
    this.store
      .getSeasons()
      .slice()
      .sort((a, b) => a - b)
  );
  minSeason = computed(() => this.seasons()[0] ?? 1888);
  maxSeason = computed(() => this.seasons()[this.seasons().length - 1] ?? 2024);
  entries = computed(() => this.store.getFullTable());

  selectedTeams = computed(() => {
    const selectedIds = new Set(this.selectedTeamIds());
    return this.teams().filter((team) => selectedIds.has(team.id));
  });

  filteredTeamOptions = computed(() => {
    const selectedIds = new Set(this.selectedTeamIds());
    const term = this.clubSearchTerm().trim().toLowerCase();
    return this.teams()
      .filter((team) => !selectedIds.has(team.id))
      .filter((team) => !term || team.name.toLowerCase().includes(term))
      .slice(0, 14);
  });

  selectedSeasonCount = computed(() => this.selectedRange().length);

  selectedRange = computed(() => {
    const allSeasons = this.seasons();
    const startSeason = this.selectedStartSeason();
    const endSeason = this.selectedEndSeason();

    if (!allSeasons.length || startSeason === null || endSeason === null) {
      return [];
    }

    const lower = Math.min(startSeason, endSeason);
    const upper = Math.max(startSeason, endSeason);
    return allSeasons.filter((season) => season >= lower && season <= upper);
  });

  tierLevels = computed(() => {
    const availableTierValues = this.entries()
      .map((entry) => this.tierToNumber(entry.tier))
      .filter((tier): tier is number => tier !== null);

    if (!availableTierValues.length) {
      return [1, 2, 3, 4, 5, 6, 7];
    }

    const maxTier = Math.max(...availableTierValues);
    return Array.from({ length: maxTier }, (_, idx) => idx + 1);
  });

  teamSeries = computed<TeamSeries[]>(() => {
    const selected = this.selectedTeamIds();
    const range = new Set(this.selectedRange());
    if (!selected.length || !range.size) {
      return [];
    }

    const dataByTeam = new Map<number, TeamSeriesPoint[]>();
    this.entries().forEach((entry) => {
      if (!selected.includes(entry.teamId)) {
        return;
      }
      if (!range.has(entry.season)) {
        return;
      }

      const tierNumber = this.tierToNumber(entry.tier);
      if (!tierNumber) {
        return;
      }

      if (!dataByTeam.has(entry.teamId)) {
        dataByTeam.set(entry.teamId, []);
      }

      dataByTeam.get(entry.teamId)!.push({
        season: entry.season,
        tier: tierNumber,
        wasPromoted: entry.wasPromoted,
        wasRelegated: entry.wasRelegated,
      });
    });

    return selected
      .map((teamId, idx) => {
        const team = this.store.getTeamById(teamId);
        const points = (dataByTeam.get(teamId) ?? []).slice().sort((a, b) => a.season - b.season);
        if (!team || !points.length) {
          return null;
        }
        return {
          teamId,
          teamName: team.name,
          color: TEAM_COLOR_POOL[idx % TEAM_COLOR_POOL.length],
          points,
        };
      })
      .filter((series): series is TeamSeries => series !== null);
  });

  chartOptions = computed<EChartsCoreOption>(() => {
    const seasons = this.selectedRange();
    const tiers = this.tierLevels();
    const maxTier = tiers.length ? Math.max(...tiers) : 7;
    const series = this.teamSeries();

    if (!seasons.length || !series.length) {
      return {
        animation: false,
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
      };
    }

    const chartSeries = series.map((team) => {
      const pointsBySeason = new Map(team.points.map((point) => [point.season, point]));
      const lineData: (number | null)[] = seasons.map(
        (season) => pointsBySeason.get(season)?.tier ?? null
      );

      const promotedMarkers = team.points
        .filter((point) => point.wasPromoted)
        .map((point) => ({
          coord: [String(point.season), point.tier],
          symbol: 'circle',
          symbolSize: 12,
          itemStyle: { color: '#16a34a' },
        }));

      const relegatedMarkers = team.points
        .filter((point) => point.wasRelegated)
        .map((point) => ({
          coord: [String(point.season), point.tier],
          symbol: 'diamond',
          symbolSize: 12,
          itemStyle: { color: '#dc2626' },
        }));

      return {
        name: team.teamName,
        type: 'line',
        data: lineData,
        connectNulls: false,
        showSymbol: true,
        symbolSize: 6,
        lineStyle: { width: 2.6, color: team.color },
        itemStyle: { color: team.color },
        emphasis: { focus: 'series' },
        markPoint: {
          data: [...promotedMarkers, ...relegatedMarkers],
          silent: true,
          z: 6,
        },
      };
    });

    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: {
        left: 220,
        right: 40,
        top: 88,
        bottom: 122,
        containLabel: false,
      },
      legend: {
        top: 14,
        left: 18,
        textStyle: {
          color: '#d7deeb',
          fontSize: 18,
          fontWeight: 600,
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
      },
      xAxis: {
        type: 'category',
        data: seasons.map((season) => String(season)),
        boundaryGap: false,
        axisLabel: {
          color: '#c5d0e4',
          fontSize: 18,
          margin: 20,
          hideOverlap: true,
        },
        axisLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.5)' },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: 1,
        max: maxTier,
        interval: 1,
        inverse: true,
        axisLabel: {
          color: '#c5d0e4',
          fontSize: 17,
          fontWeight: 700,
          margin: 18,
          formatter: (value: number) => this.tierLabel(value),
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.22)' },
        },
      },
      dataZoom: [
        {
          type: 'inside',
          filterMode: 'none',
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          height: 24,
          bottom: 48,
          filterMode: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          fillerColor: 'rgba(225, 29, 72, 0.28)',
          borderColor: 'rgba(148, 163, 184, 0.42)',
          handleStyle: {
            color: '#f43f5e',
            borderColor: '#fb7185',
          },
          textStyle: {
            color: '#d7deeb',
            fontSize: 14,
          },
        },
      ],
      series: chartSeries,
    };
  });

  constructor() {
    effect(() => {
      const allSeasons = this.seasons();
      if (!allSeasons.length) {
        return;
      }

      const latestSeason = allSeasons.at(-1)!;
      const earliestSeason = allSeasons[0];
      const start = this.selectedStartSeason();
      const end = this.selectedEndSeason();

      if (end === null || !allSeasons.includes(end)) {
        this.selectedEndSeason.set(latestSeason);
      }

      if (start === null || !allSeasons.includes(start)) {
        this.selectedStartSeason.set(Math.max(earliestSeason, latestSeason - 19));
      }
    });

    effect(() => {
      const seasons = this.seasons();
      const teams = this.teams();
      const query = this.queryParamMapSignal();
      if (!seasons.length || !teams.length || this.hasAppliedInitialUrlState()) {
        return;
      }

      this.applyStateFromQuery(
        query.get('teams'),
        query.get('start'),
        query.get('end'),
        query.get('preset'),
        query.get('collapsed')
      );
      this.hasAppliedInitialUrlState.set(true);
    });

    effect(() => {
      if (!this.hasAppliedInitialUrlState() || this.applyingUrlState) {
        return;
      }

      const teams = this.selectedTeamIds().join(',');
      const start = this.selectedStartSeason();
      const end = this.selectedEndSeason();
      const preset = this.activePreset();
      const collapsed = this.configCollapsed();

      const nextQuery: Record<string, string | null> = {
        teams: teams || null,
        start: start === null ? null : String(start),
        end: end === null ? null : String(end),
        preset: preset || null,
        collapsed: collapsed ? '1' : null,
      };

      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: nextQuery,
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  addTeam(teamId: number) {
    const selected = this.selectedTeamIds();
    if (selected.includes(teamId) || selected.length >= this.maxSelectedTeams) {
      return;
    }
    this.selectedTeamIds.set([...selected, teamId]);
    this.clubSearchTerm.set('');
  }

  removeTeam(teamId: number) {
    this.selectedTeamIds.set(this.selectedTeamIds().filter((id) => id !== teamId));
  }

  clearSelectedTeams() {
    this.selectedTeamIds.set([]);
  }

  onClubSearchInput(value: string) {
    this.clubSearchTerm.set(value);
  }

  toggleConfigPanel() {
    this.configCollapsed.set(!this.configCollapsed());
  }

  onStartSeasonInput(rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const min = this.minSeason();
    const max = this.maxSeason();
    const clamped = Math.max(min, Math.min(parsed, max));
    const currentEnd = this.selectedEndSeason() ?? max;
    this.selectedStartSeason.set(Math.min(clamped, currentEnd));
    this.activePreset.set('');
  }

  onEndSeasonInput(rawValue: string) {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) {
      return;
    }
    const min = this.minSeason();
    const max = this.maxSeason();
    const clamped = Math.max(min, Math.min(parsed, max));
    const currentStart = this.selectedStartSeason() ?? min;
    this.selectedEndSeason.set(Math.max(clamped, currentStart));
    this.activePreset.set('');
  }

  setPreset(presetId: string) {
    const allSeasons = this.seasons();
    if (!allSeasons.length) {
      return;
    }

    const min = allSeasons[0];
    const max = allSeasons[allSeasons.length - 1];
    if (presetId === 'all') {
      this.selectedStartSeason.set(min);
      this.selectedEndSeason.set(max);
      this.activePreset.set(presetId);
      return;
    }

    const windowByPreset: Record<string, number> = {
      'last-10': 10,
      'last-20': 20,
      'last-50': 50,
    };
    const size = windowByPreset[presetId];
    if (!size) {
      return;
    }

    this.selectedStartSeason.set(Math.max(min, max - size + 1));
    this.selectedEndSeason.set(max);
    this.activePreset.set(presetId);
  }

  tierLabel(tier: number): string {
    return TIER_LABELS[tier] ?? `Tier ${tier}`;
  }

  private tierToNumber(tier: string): number | null {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private applyStateFromQuery(
    teamsRaw: string | null,
    startRaw: string | null,
    endRaw: string | null,
    presetRaw: string | null,
    collapsedRaw: string | null
  ) {
    this.applyingUrlState = true;
    try {
      const validTeamIds = new Set(this.teams().map((team) => team.id));
      const parsedTeams = (teamsRaw ?? '')
        .split(',')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && validTeamIds.has(value))
        .slice(0, this.maxSelectedTeams);
      this.selectedTeamIds.set(parsedTeams);

      const min = this.minSeason();
      const max = this.maxSeason();
      const parsedStart = Number.parseInt(startRaw ?? '', 10);
      const parsedEnd = Number.parseInt(endRaw ?? '', 10);

      if (Number.isFinite(parsedStart)) {
        this.selectedStartSeason.set(Math.max(min, Math.min(parsedStart, max)));
      }
      if (Number.isFinite(parsedEnd)) {
        this.selectedEndSeason.set(Math.max(min, Math.min(parsedEnd, max)));
      }

      const currentStart = this.selectedStartSeason() ?? min;
      const currentEnd = this.selectedEndSeason() ?? max;
      if (currentStart > currentEnd) {
        this.selectedStartSeason.set(currentEnd);
      }

      if (presetRaw && this.availablePresets.some((preset) => preset.id === presetRaw)) {
        this.activePreset.set(presetRaw);
      }
      this.configCollapsed.set(collapsedRaw === '1');
    } finally {
      this.applyingUrlState = false;
    }
  }
}
