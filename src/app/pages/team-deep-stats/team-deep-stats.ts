import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { DataExportMenu } from '@app/components/data-export-menu/data-export-menu';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { ClubMetadataStore } from '@app/store/club-metadata.store';
import { LeagueStore } from '@app/store/league.store';
import { DataLoaderService } from '@app/store/services/hydrate-store-json';
import { buildTeamDeepStatsData } from '@app/utils/team-deep-stats';
import type { ExportRow, ExportSummary } from '@app/utils/data-export';

type PointsChartMode = 'points' | 'ppg';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-team-deep-stats',
  imports: [CommonModule, MatButtonModule, RouterLink, NgxEchartsDirective, DataExportMenu],
  providers: [LeagueTierToStringyPipe, provideEchartsCore({ echarts })],
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

  readonly pointsChartModes: { id: PointsChartMode; label: string }[] = [
    { id: 'points', label: 'Points' },
    { id: 'ppg', label: 'PPG' },
  ];

  pointsChartMode = signal<PointsChartMode>('points');
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
  pointsChartRows = computed(() =>
    this.deepStats()
      .seasonRows.slice()
      .sort((a, b) => a.season - b.season || this.tierRank(a.tier) - this.tierRank(b.tier))
  );
  pointsChartOptions = computed<EChartsCoreOption>(() => {
    const rows = this.pointsChartRows();
    const mode = this.pointsChartMode();
    const data = rows.map((row) => (mode === 'points' ? row.points : row.pointsPerGame));

    if (!rows.length) {
      return {
        animation: false,
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
      };
    }

    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: {
        left: 46,
        right: 18,
        top: 24,
        bottom: rows.length > 35 ? 54 : 30,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        backgroundColor: 'rgba(7, 10, 19, 0.94)',
        borderColor: 'rgba(148, 163, 184, 0.28)',
        textStyle: {
          color: '#d7deeb',
        },
      },
      xAxis: {
        type: 'category',
        data: rows.map((row) => String(row.season)),
        axisLabel: {
          color: '#c5d0e4',
          fontSize: 11,
          hideOverlap: true,
        },
        axisLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.45)' },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: mode === 'points' ? 1 : 0,
        axisLabel: {
          color: '#c5d0e4',
          fontSize: 11,
          formatter: (value: number) => (mode === 'points' ? String(value) : value.toFixed(1)),
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.18)' },
        },
      },
      dataZoom:
        rows.length > 35
          ? [
              {
                type: 'slider',
                xAxisIndex: 0,
                height: 18,
                bottom: 18,
                filterMode: 'none',
                backgroundColor: 'rgba(15, 23, 42, 0.75)',
                fillerColor: 'rgba(217, 119, 6, 0.22)',
                borderColor: 'rgba(148, 163, 184, 0.42)',
                handleStyle: {
                  color: '#d97706',
                  borderColor: '#f59e0b',
                },
                textStyle: {
                  color: '#d7deeb',
                  fontSize: 10,
                },
              },
            ]
          : [],
      series: [
        {
          name: mode === 'points' ? 'Points' : 'Points per game',
          type: 'line',
          data,
          showSymbol: rows.length <= 24,
          symbolSize: 5,
          connectNulls: false,
          smooth: true,
          lineStyle: {
            width: 2.4,
            color: '#f59e0b',
          },
          itemStyle: {
            color: '#f59e0b',
          },
          emphasis: {
            focus: 'series',
          },
        },
      ],
    };
  });

  retryArchiveLoad() {
    void this.dataLoader.loadData();
  }

  setPointsChartMode(mode: PointsChartMode) {
    this.pointsChartMode.set(mode);
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
