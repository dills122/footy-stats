import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
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
import type { LeagueTableEntry, Team } from '@app/store/league.models';
import { LeagueStore } from '@app/store/league.store';
import { buildClubIdentityTeamIndex } from '@app/utils/club-aliases';

interface RivalryPreset {
  id: string;
  label: string;
  region: string;
  description: string;
  teamNames: readonly [string, string];
}

interface RivalrySeasonRow {
  season: number;
  first: RivalryEntryView;
  second: RivalryEntryView;
  leader: 'first' | 'second' | 'level';
  leaderLabel: string;
  relativeStanding: number;
  pointsGap: number | null;
}

interface RivalryEntryView {
  teamName: string;
  clubId: string | null;
  tier: string;
  tierLabel: string;
  position: number;
  points: number;
}

interface RivalryScorecard {
  sharedSeasons: number;
  firstHigher: number;
  secondHigher: number;
  level: number;
  sameTier: number;
  firstMorePoints: number;
  secondMorePoints: number;
}

const RIVALRY_PRESETS: RivalryPreset[] = [
  {
    id: 'north-london',
    label: 'North London',
    region: 'London',
    description: 'Arsenal and Tottenham across shared league seasons.',
    teamNames: ['Arsenal', 'Tottenham Hotspur'],
  },
  {
    id: 'manchester',
    label: 'Manchester',
    region: 'North West',
    description: 'United and City from long archive history into the modern era.',
    teamNames: ['Manchester United', 'Manchester City'],
  },
  {
    id: 'merseyside',
    label: 'Merseyside',
    region: 'North West',
    description: 'Liverpool and Everton in one of the longest-running top-flight pairings.',
    teamNames: ['Liverpool', 'Everton'],
  },
  {
    id: 'tyne-wear',
    label: 'Tyne-Wear',
    region: 'North East',
    description: 'Newcastle and Sunderland across promotion, relegation, and top-tier spells.',
    teamNames: ['Newcastle United', 'Sunderland'],
  },
  {
    id: 'second-city',
    label: 'Second City',
    region: 'Midlands',
    description: 'Aston Villa and Birmingham across shared league records.',
    teamNames: ['Aston Villa', 'Birmingham'],
  },
  {
    id: 'east-midlands',
    label: 'East Midlands',
    region: 'Midlands',
    description: 'Derby and Forest as a focused two-club comparison.',
    teamNames: ['Derby County', 'Nottingham Forest'],
  },
  {
    id: 'steel-city',
    label: 'Steel City',
    region: 'Yorkshire',
    description: 'Sheffield United and Wednesday through shared archive seasons.',
    teamNames: ['Sheffield United', 'Sheffield Wednesday'],
  },
  {
    id: 'west-london',
    label: 'West London',
    region: 'London',
    description: 'Chelsea and Fulham as a first West London comparison preset.',
    teamNames: ['Chelsea', 'Fulham'],
  },
];

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  CanvasRenderer,
]);

@Component({
  selector: 'app-rivalry-comparison',
  imports: [CommonModule, FormsModule, RouterLink, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  templateUrl: './rivalry-comparison.html',
  styleUrl: './rivalry-comparison.scss',
})
export class RivalryComparison {
  private store = inject(LeagueStore);

  readonly rivalryPresets = RIVALRY_PRESETS;
  firstTeamId = signal<number | null>(null);
  secondTeamId = signal<number | null>(null);
  activePresetId = signal<string>('');

  teams = computed(() =>
    this.store
      .getTeams()
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  );
  selectedTeams = computed(() => {
    const first = this.teamById(this.firstTeamId());
    const second = this.teamById(this.secondTeamId());
    return {
      first,
      second,
    };
  });
  availablePresets = computed(() =>
    this.rivalryPresets
      .map((preset) => ({
        ...preset,
        teamIds: preset.teamNames
          .map((teamName) => this.teams().find((team) => team.name === teamName)?.id ?? null)
          .filter((teamId): teamId is number => teamId !== null),
      }))
      .filter((preset) => preset.teamIds.length === 2)
  );
  comparisonRows = computed<RivalrySeasonRow[]>(() => {
    const firstTeamId = this.firstTeamId();
    const secondTeamId = this.secondTeamId();
    const teams = this.teams();

    if (!firstTeamId || !secondTeamId || firstTeamId === secondTeamId) {
      return [];
    }

    const selectedIdByTeamId = buildClubIdentityTeamIndex([firstTeamId, secondTeamId], teams);
    const entriesBySelectedTeam = new Map<number, Map<number, LeagueTableEntry>>();

    this.store.getFullTable().forEach((entry) => {
      const selectedTeamId = selectedIdByTeamId.get(entry.teamId);
      if (!selectedTeamId) {
        return;
      }

      const entriesBySeason = entriesBySelectedTeam.get(selectedTeamId) ?? new Map();
      const existing = entriesBySeason.get(entry.season);
      if (!existing || this.compareEntryStanding(entry, existing) < 0) {
        entriesBySeason.set(entry.season, entry);
      }
      entriesBySelectedTeam.set(selectedTeamId, entriesBySeason);
    });

    const firstEntries = entriesBySelectedTeam.get(firstTeamId) ?? new Map();
    const secondEntries = entriesBySelectedTeam.get(secondTeamId) ?? new Map();

    return Array.from(firstEntries.keys())
      .filter((season) => secondEntries.has(season))
      .sort((a, b) => b - a)
      .map((season) => {
        const first = this.entryView(firstEntries.get(season)!);
        const second = this.entryView(secondEntries.get(season)!);
        const comparison = this.compareEntryStanding(
          firstEntries.get(season)!,
          secondEntries.get(season)!
        );
        const leader = comparison < 0 ? 'first' : comparison > 0 ? 'second' : 'level';
        const relativeStanding =
          this.absoluteStandingScore(secondEntries.get(season)!) -
          this.absoluteStandingScore(firstEntries.get(season)!);
        const pointsGap =
          first.tier === second.tier
            ? firstEntries.get(season)!.points - secondEntries.get(season)!.points
            : null;

        return {
          season,
          first,
          second,
          leader,
          relativeStanding,
          pointsGap,
          leaderLabel:
            leader === 'first'
              ? `${first.teamName} higher`
              : leader === 'second'
                ? `${second.teamName} higher`
                : 'Level',
        };
      });
  });
  scorecard = computed<RivalryScorecard>(() => {
    const rows = this.comparisonRows();
    return {
      sharedSeasons: rows.length,
      firstHigher: rows.filter((row) => row.leader === 'first').length,
      secondHigher: rows.filter((row) => row.leader === 'second').length,
      level: rows.filter((row) => row.leader === 'level').length,
      sameTier: rows.filter((row) => row.first.tier === row.second.tier).length,
      firstMorePoints: rows.filter((row) => row.pointsGap !== null && row.pointsGap > 0).length,
      secondMorePoints: rows.filter((row) => row.pointsGap !== null && row.pointsGap < 0).length,
    };
  });
  recentRows = computed(() => this.comparisonRows().slice(0, 16));
  chartRows = computed(() =>
    this.comparisonRows()
      .slice()
      .sort((a, b) => a.season - b.season)
  );
  sameTierChartRows = computed(() => this.chartRows().filter((row) => row.pointsGap !== null));
  relativeStandingChartOptions = computed<EChartsCoreOption>(() => {
    const rows = this.chartRows();
    return this.lineChartOptions({
      rows,
      yAxisName: 'Relative standing',
      series: [
        {
          name: 'Relative standing',
          data: rows.map((row) => row.relativeStanding),
          color: '#f59e0b',
        },
      ],
    });
  });
  pointsGapChartOptions = computed<EChartsCoreOption>(() => {
    const rows = this.sameTierChartRows();
    return this.lineChartOptions({
      rows,
      yAxisName: 'Points gap',
      series: [
        {
          name: 'Points gap',
          data: rows.map((row) => row.pointsGap ?? 0),
          color: '#38bdf8',
        },
      ],
    });
  });
  tierPathChartOptions = computed<EChartsCoreOption>(() => {
    const rows = this.chartRows();
    const selected = this.selectedTeams();
    return this.lineChartOptions({
      rows,
      inverseYAxis: true,
      yAxisName: 'Tier',
      yAxisFormatter: (value) => this.tierLabel(`tier${Math.round(value)}`),
      series: [
        {
          name: selected.first?.name ?? 'First club',
          data: rows.map((row) => this.tierRank(row.first.tier)),
          color: '#f59e0b',
        },
        {
          name: selected.second?.name ?? 'Second club',
          data: rows.map((row) => this.tierRank(row.second.tier)),
          color: '#38bdf8',
        },
      ],
    });
  });

  constructor() {
    effect(() => {
      const teams = this.teams();
      if (teams.length < 2 || (this.firstTeamId() && this.secondTeamId())) {
        return;
      }

      const defaultPreset =
        this.availablePresets().find((preset) => preset.id === 'north-london') ??
        this.availablePresets()[0];
      if (defaultPreset) {
        this.applyPreset(defaultPreset.id);
        return;
      }

      const first = teams.find((team) => team.name === 'Arsenal') ?? teams[0];
      const second =
        teams.find((team) => team.name === 'Tottenham Hotspur' && team.id !== first.id) ??
        teams.find((team) => team.id !== first.id);

      this.firstTeamId.set(first.id);
      this.secondTeamId.set(second?.id ?? null);
    });
  }

  applyPreset(presetId: string) {
    const preset = this.availablePresets().find((candidate) => candidate.id === presetId);
    if (!preset) {
      return;
    }

    this.firstTeamId.set(preset.teamIds[0]);
    this.secondTeamId.set(preset.teamIds[1]);
    this.activePresetId.set(preset.id);
  }

  onFirstTeamChange(value: number | string) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.firstTeamId.set(parsed);
    this.activePresetId.set('');
    if (this.secondTeamId() === parsed) {
      this.secondTeamId.set(this.teams().find((team) => team.id !== parsed)?.id ?? null);
    }
  }

  onSecondTeamChange(value: number | string) {
    const parsed = Number.parseInt(String(value), 10);
    if (!Number.isFinite(parsed)) {
      return;
    }

    this.secondTeamId.set(parsed);
    this.activePresetId.set('');
    if (this.firstTeamId() === parsed) {
      this.firstTeamId.set(this.teams().find((team) => team.id !== parsed)?.id ?? null);
    }
  }

  tierLabel(tier: string): string {
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

  private teamById(teamId: number | null): Team | null {
    return teamId ? (this.store.getTeamById(teamId) ?? null) : null;
  }

  private entryView(entry: LeagueTableEntry): RivalryEntryView {
    return {
      teamName: this.store.getTeamNameById(entry.teamId),
      clubId: entry.clubId,
      tier: entry.tier,
      tierLabel: this.tierLabel(entry.tier),
      position: entry.pos,
      points: entry.points,
    };
  }

  private compareEntryStanding(first: LeagueTableEntry, second: LeagueTableEntry): number {
    const tierDifference = this.tierRank(first.tier) - this.tierRank(second.tier);
    if (tierDifference !== 0) {
      return tierDifference;
    }

    return first.pos - second.pos;
  }

  private tierRank(tier: string): number {
    const parsed = Number.parseInt(tier.replace('tier', ''), 10);
    return Number.isFinite(parsed) ? parsed : 99;
  }

  private absoluteStandingScore(entry: LeagueTableEntry): number {
    return this.tierRank(entry.tier) * 100 + entry.pos;
  }

  private lineChartOptions({
    rows,
    series,
    yAxisName,
    inverseYAxis = false,
    yAxisFormatter,
  }: {
    rows: readonly RivalrySeasonRow[];
    series: { name: string; data: number[]; color: string }[];
    yAxisName: string;
    inverseYAxis?: boolean;
    yAxisFormatter?: (value: number) => string;
  }): EChartsCoreOption {
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
        left: 44,
        right: 18,
        top: series.length > 1 ? 42 : 24,
        bottom: rows.length > 35 ? 54 : 30,
        containLabel: true,
      },
      legend: {
        show: series.length > 1,
        top: 6,
        right: 10,
        textStyle: {
          color: '#d7deeb',
          fontSize: 12,
          fontWeight: 700,
        },
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
        name: yAxisName,
        inverse: inverseYAxis,
        minInterval: 1,
        nameTextStyle: {
          color: '#c5d0e4',
          fontSize: 11,
        },
        axisLabel: {
          color: '#c5d0e4',
          fontSize: 11,
          formatter: yAxisFormatter,
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
      series: series.map((item) => ({
        name: item.name,
        type: 'line',
        data: item.data,
        showSymbol: rows.length <= 24,
        symbolSize: 5,
        smooth: true,
        lineStyle: {
          width: 2.3,
          color: item.color,
        },
        itemStyle: {
          color: item.color,
        },
        emphasis: {
          focus: 'series',
        },
      })),
    };
  }
}
