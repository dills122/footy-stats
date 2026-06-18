import { CommonModule } from '@angular/common';
import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { LineChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkPointComponent,
  TooltipComponent,
} from 'echarts/components';
import type { EChartsCoreOption } from 'echarts/core';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { ActivatedRoute, Router } from '@angular/router';
import { LeagueStore } from '@app/store/league.store';
import { buildClubIdentityTeamIndex } from '@app/utils/club-aliases';
import { getWartimeSuspensionRanges } from '@app/utils/wartime-suspensions';

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

interface ClubQuickPickGroup {
  id: string;
  label: string;
  description: string;
  teamNames: string[];
}

interface ClubQuickPickResolvedGroup extends ClubQuickPickGroup {
  teams: { id: number; name: string }[];
}

interface MovementChartSetup {
  id: string;
  label: string;
  era: string;
  description: string;
  teamNames: string[];
  startSeason: number | null;
  endSeason: number | null;
}

type ChartDetailMode = 'path' | 'events';

const TEAM_COLOR_POOL = [
  '#d97706',
  '#059669',
  '#2563eb',
  '#0891b2',
  '#be123c',
  '#65a30d',
  '#4f46e5',
  '#b45309',
  '#7c3aed',
  '#0f766e',
  '#64748b',
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

const MOVEMENT_CHART_MIN_HEIGHT = 320;
const MOVEMENT_CHART_MAX_HEIGHT = 560;
const MOVEMENT_CHART_VERTICAL_CHROME = 148;
const MOVEMENT_CHART_TIER_GAP = 82;

const DEFAULT_STARTER_TEAM_NAMES = [
  'Arsenal',
  'Chelsea',
  'Liverpool',
  'Manchester City',
  'Manchester United',
  'Tottenham Hotspur',
] as const;

const DEFAULT_CHART_SETUP_ID = 'big-six-premier-league-era';

const MOVEMENT_CHART_SETUPS: MovementChartSetup[] = [
  {
    id: DEFAULT_CHART_SETUP_ID,
    label: 'Big Six, Premier League era',
    era: '1992 onward',
    description: 'The modern Big Six across the Premier League era.',
    teamNames: [...DEFAULT_STARTER_TEAM_NAMES],
    startSeason: 1992,
    endSeason: null,
  },
  {
    id: 'big-six-all-time',
    label: 'Big Six, full archive',
    era: 'All seasons',
    description: 'Modern heavyweights across the full recorded league archive.',
    teamNames: [...DEFAULT_STARTER_TEAM_NAMES],
    startSeason: null,
    endSeason: null,
  },
  {
    id: 'north-west-rivalries',
    label: 'North West rivalries',
    era: '1890 onward',
    description: 'Liverpool, Everton, Manchester United, and Manchester City over the long run.',
    teamNames: ['Liverpool', 'Everton', 'Manchester United', 'Manchester City'],
    startSeason: 1890,
    endSeason: null,
  },
  {
    id: 'north-london',
    label: 'North London',
    era: '1893 onward',
    description:
      'Arsenal and Tottenham through early league entry, promotion, and modern stability.',
    teamNames: ['Arsenal', 'Tottenham Hotspur'],
    startSeason: 1893,
    endSeason: null,
  },
  {
    id: 'manchester',
    label: 'Manchester divide',
    era: '1890 onward',
    description: 'United and City from Newton Heath and Ardwick roots to the Premier League era.',
    teamNames: ['Manchester United', 'Manchester City'],
    startSeason: 1890,
    endSeason: null,
  },
  {
    id: 'premier-league-powers',
    label: 'Premier League powers',
    era: '1992 onward',
    description: 'The familiar Premier League contenders from the competition reset onward.',
    teamNames: [
      'Arsenal',
      'Chelsea',
      'Liverpool',
      'Manchester City',
      'Manchester United',
      'Tottenham Hotspur',
      'Newcastle United',
    ],
    startSeason: 1992,
    endSeason: null,
  },
  {
    id: 'leeds-rise-fall',
    label: 'Leeds rise and fall',
    era: '1960-2004',
    description: 'Leeds against major rivals through ascent, title contention, and relegation.',
    teamNames: ['Leeds United', 'Manchester United', 'Liverpool', 'Chelsea'],
    startSeason: 1960,
    endSeason: 2004,
  },
  {
    id: 'outsider-champions',
    label: 'Outsider champions',
    era: '1988 onward',
    description: 'Blackburn and Leicester beside the clubs that shaped their title-era context.',
    teamNames: ['Blackburn Rovers', 'Leicester City', 'Manchester City', 'Chelsea'],
    startSeason: 1988,
    endSeason: null,
  },
  {
    id: 'midlands-old-powers',
    label: 'Midlands old powers',
    era: 'All seasons',
    description: 'Villa, Wolves, Albion, Birmingham, Derby, and Forest across the pyramid.',
    teamNames: [
      'Aston Villa',
      'Wolverhampton Wanderers',
      'West Bromwich Albion',
      'Birmingham',
      'Derby County',
      'Nottingham Forest',
    ],
    startSeason: null,
    endSeason: null,
  },
  {
    id: 'fallen-giants',
    label: 'Fallen giants',
    era: '1960 onward',
    description: 'Historic names with long arcs away from the top flight.',
    teamNames: [
      'Sunderland',
      'Sheffield Wednesday',
      'Ipswich Town',
      'Bolton Wanderers',
      'Preston North End',
      'Derby County',
    ],
    startSeason: 1960,
    endSeason: null,
  },
];

const CLUB_QUICK_PICK_GROUPS: ClubQuickPickGroup[] = [
  {
    id: 'common',
    label: 'Common Picks',
    description: 'Frequently compared clubs and modern heavyweights.',
    teamNames: [
      'Arsenal',
      'Chelsea',
      'Liverpool',
      'Manchester City',
      'Manchester United',
      'Tottenham Hotspur',
      'Newcastle United',
      'Aston Villa',
      'Everton',
      'Leeds United',
    ],
  },
  {
    id: 'big-six',
    label: 'Big Six',
    description: 'Fast add for the clubs most people reach for first.',
    teamNames: [
      'Arsenal',
      'Chelsea',
      'Liverpool',
      'Manchester City',
      'Manchester United',
      'Tottenham Hotspur',
    ],
  },
  {
    id: 'historic',
    label: 'Historic Clubs',
    description: 'Older powers and long-running names across the pyramid.',
    teamNames: [
      'Blackburn Rovers',
      'Derby County',
      'Ipswich Town',
      'Nottingham Forest',
      'Sheffield Wednesday',
      'Sunderland',
      'Wolverhampton Wanderers',
      'Preston North End',
      'Bolton Wanderers',
      'Huddersfield Town',
    ],
  },
] as const;

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  MarkPointComponent,
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
  readonly chartDetailModes: { id: ChartDetailMode; label: string }[] = [
    { id: 'path', label: 'Path' },
    { id: 'events', label: 'Events' },
  ];

  selectedTeamIds = signal<number[]>([]);
  clubSearchTerm = signal<string>('');
  activeClubQuickPick = signal<string>('common');
  quickPickMenuOpen = signal<boolean>(false);
  selectedStartSeason = signal<number | null>(null);
  selectedEndSeason = signal<number | null>(null);
  activePreset = signal<string>('last-20');
  configCollapsed = signal<boolean>(false);
  chartSetupsCollapsed = signal<boolean>(true);
  chartDetailMode = signal<ChartDetailMode>('path');
  activeChartSetupId = signal<string>(DEFAULT_CHART_SETUP_ID);
  focusedTeamId = signal<number | null>(null);
  isCompactViewport = signal<boolean>(this.readIsCompactViewport());
  private applyingUrlState = false;
  private lastSyncedQueryState = '';
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

  hasClubSearchTerm = computed(() => Boolean(this.clubSearchTerm().trim()));

  clubQuickPickGroups = computed<ClubQuickPickResolvedGroup[]>(() => {
    const teams = this.teams();
    const selectedIds = new Set(this.selectedTeamIds());
    return CLUB_QUICK_PICK_GROUPS.map((group) => ({
      ...group,
      teams: group.teamNames
        .flatMap((teamName) => {
          const team = teams.find((candidate) => candidate.name === teamName);
          return team ? [{ id: team.id, name: team.name }] : [];
        })
        .filter((team) => !selectedIds.has(team.id)),
    }));
  });

  activeClubQuickPickGroup = computed<ClubQuickPickResolvedGroup | null>(
    () =>
      this.clubQuickPickGroups().find((group) => group.id === this.activeClubQuickPick()) ??
      this.clubQuickPickGroups()[0] ??
      null
  );

  chartSetups = computed(() =>
    MOVEMENT_CHART_SETUPS.map((setup) => ({
      ...setup,
      teamCount: this.getTeamIdsForNames(setup.teamNames).length,
    })).filter((setup) => setup.teamCount > 0)
  );

  activeChartSetup = computed(
    () => MOVEMENT_CHART_SETUPS.find((setup) => setup.id === this.activeChartSetupId()) ?? null
  );

  chartContextTitle = computed(() => this.activeChartSetup()?.label ?? 'Custom comparison');

  selectedSeasonRangeLabel = computed(() => {
    const start = this.selectedStartSeason();
    const end = this.selectedEndSeason();

    if (start === null || end === null) {
      return 'No season range selected';
    }

    return start === end ? String(start) : `${start}-${end}`;
  });

  selectedSeasonCount = computed(() => this.selectedRange().length);

  visibleTierBounds = computed(() => {
    const tierValues = this.teamSeries().flatMap((series) =>
      series.points.map((point) => point.tier)
    );
    const allTiers = this.tierLevels();
    const globalMaxTier = allTiers.length ? Math.max(...allTiers) : 7;

    if (!tierValues.length) {
      return {
        min: 1,
        max: globalMaxTier,
      };
    }

    const minVisibleTier = Math.min(...tierValues);
    const maxVisibleTier = Math.max(...tierValues);
    const visibleTierCount = maxVisibleTier - minVisibleTier + 1;

    if (visibleTierCount === 1) {
      return {
        min: Math.max(1, minVisibleTier - 1),
        max: Math.min(globalMaxTier, maxVisibleTier + 1),
      };
    }

    return {
      min: minVisibleTier,
      max: maxVisibleTier,
    };
  });

  movementChartHeight = computed(() => {
    if (this.isCompactViewport()) {
      return 300;
    }

    const tierBounds = this.visibleTierBounds();
    const tierIntervals = Math.max(1, tierBounds.max - tierBounds.min);
    const preferredHeight =
      MOVEMENT_CHART_VERTICAL_CHROME + tierIntervals * MOVEMENT_CHART_TIER_GAP;

    return Math.min(
      MOVEMENT_CHART_MAX_HEIGHT,
      Math.max(MOVEMENT_CHART_MIN_HEIGHT, preferredHeight)
    );
  });

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

    const teamIdToSelectedId = buildClubIdentityTeamIndex(selected, this.teams());
    const dataByTeam = new Map<number, TeamSeriesPoint[]>();
    this.entries().forEach((entry) => {
      const selectedTeamId = teamIdToSelectedId.get(entry.teamId);
      if (selectedTeamId === undefined) {
        return;
      }
      if (!range.has(entry.season)) {
        return;
      }

      const tierNumber = this.tierToNumber(entry.tier);
      if (!tierNumber) {
        return;
      }

      if (!dataByTeam.has(selectedTeamId)) {
        dataByTeam.set(selectedTeamId, []);
      }

      dataByTeam.get(selectedTeamId)!.push({
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
    const tierBounds = this.visibleTierBounds();
    const series = this.teamSeries();
    const wartimeSuspensionRanges = getWartimeSuspensionRanges(seasons);
    const showMovementEvents = this.chartDetailMode() === 'events';
    const isCompactViewport = this.isCompactViewport();
    const isDenseComparison = series.length >= 5 || seasons.length >= 45;
    const showWartimeLabels = !isDenseComparison && seasons.length <= 60;
    const pathOpacity = isDenseComparison ? 0.52 : 0.88;
    const pathWidth = isDenseComparison ? 1.8 : 2.4;
    const focusedTeamId = this.focusedTeamId();
    const wartimeMarkAreas = wartimeSuspensionRanges.map((range) => [
      {
        name: range.label,
        xAxis: String(range.startSeason),
        itemStyle: {
          color: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'rgba(245, 158, 11, 0.32)',
          borderWidth: 1,
        },
        label: {
          show: showWartimeLabels,
          color: '#fde68a',
          fontSize: 12,
          fontWeight: 700,
          formatter: range.label,
          position: 'insideTop',
        },
        emphasis: {
          label: {
            color: '#fef3c7',
          },
        },
      },
      {
        xAxis: String(range.endSeason),
      },
    ]);

    if (!seasons.length || !series.length) {
      return {
        animation: false,
        xAxis: { type: 'category', data: [] },
        yAxis: { type: 'value' },
        series: [],
      };
    }

    const chartSeries = series.map((team, index) => {
      const pointsBySeason = new Map(team.points.map((point) => [point.season, point]));
      const lineData: (number | null)[] = seasons.map(
        (season) => pointsBySeason.get(season)?.tier ?? null
      );
      const isFocused = focusedTeamId === team.teamId;
      const seriesOpacity = focusedTeamId === null ? pathOpacity : isFocused ? 0.96 : 0.14;

      const promotedMarkers = team.points
        .filter((point) => point.wasPromoted)
        .map((point) => ({
          coord: [String(point.season), point.tier],
          symbol: 'circle',
          symbolSize: 9,
          itemStyle: { color: '#16a34a', borderColor: '#0f172a', borderWidth: 1 },
        }));

      const relegatedMarkers = team.points
        .filter((point) => point.wasRelegated)
        .map((point) => ({
          coord: [String(point.season), point.tier],
          symbol: 'diamond',
          symbolSize: 9,
          itemStyle: { color: '#dc2626', borderColor: '#0f172a', borderWidth: 1 },
        }));

      return {
        name: team.teamName,
        type: 'line',
        data: lineData,
        connectNulls: false,
        showSymbol: false,
        symbol: 'circle',
        symbolSize: 5,
        lineStyle: {
          width: isFocused ? 2.8 : pathWidth,
          color: team.color,
          opacity: seriesOpacity,
        },
        itemStyle: {
          color: team.color,
          opacity: seriesOpacity,
        },
        emphasis: {
          focus: 'series',
          lineStyle: { width: 3.4, opacity: 1 },
          itemStyle: { opacity: 1 },
        },
        markPoint: {
          data: showMovementEvents ? [...promotedMarkers, ...relegatedMarkers] : [],
          silent: true,
          z: 6,
          itemStyle: {
            opacity: 0.82,
          },
        },
        ...(index === 0 && wartimeMarkAreas.length
          ? {
              markArea: {
                silent: false,
                tooltip: {
                  formatter: (params: { name?: string }) =>
                    `${params.name ?? 'Wartime suspension'}: no official league table`,
                },
                data: wartimeMarkAreas,
              },
            }
          : {}),
      };
    });

    return {
      animation: false,
      backgroundColor: 'transparent',
      grid: {
        left: isCompactViewport ? 58 : 184,
        right: isCompactViewport ? 14 : 40,
        top: isCompactViewport ? 16 : 60,
        bottom: isCompactViewport ? 48 : 88,
        containLabel: false,
      },
      legend: {
        show: !isCompactViewport,
        top: 14,
        left: 18,
        textStyle: {
          color: '#d7deeb',
          fontSize: 14,
          fontWeight: 600,
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
        data: seasons.map((season) => String(season)),
        boundaryGap: false,
        axisLabel: {
          color: '#c5d0e4',
          fontSize: isCompactViewport ? 10 : 13,
          margin: isCompactViewport ? 9 : 16,
          hideOverlap: true,
        },
        axisLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.5)' },
        },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        min: tierBounds.min,
        max: tierBounds.max,
        interval: 1,
        inverse: true,
        axisLabel: {
          color: '#c5d0e4',
          fontSize: isCompactViewport ? 10 : 13,
          fontWeight: 700,
          margin: isCompactViewport ? 7 : 12,
          formatter: (value: number) =>
            isCompactViewport ? this.compactTierLabel(value) : this.tierLabel(value),
        },
        axisLine: { show: false },
        splitLine: {
          lineStyle: { color: 'rgba(148, 163, 184, 0.22)' },
        },
      },
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          height: isCompactViewport ? 18 : 24,
          bottom: isCompactViewport ? 14 : 48,
          filterMode: 'none',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          fillerColor: 'rgba(217, 119, 6, 0.24)',
          borderColor: 'rgba(148, 163, 184, 0.42)',
          handleStyle: {
            color: '#d97706',
            borderColor: '#f59e0b',
          },
          textStyle: {
            color: '#d7deeb',
            fontSize: isCompactViewport ? 10 : 12,
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
        query.get('collapsed'),
        query.get('setup'),
        ['teams', 'start', 'end', 'preset', 'collapsed', 'setup'].some((param) => query.has(param))
      );
      this.hasAppliedInitialUrlState.set(true);
    });

    effect((onCleanup) => {
      if (!this.hasAppliedInitialUrlState() || this.applyingUrlState) {
        return;
      }

      const teams = this.selectedTeamIds().join(',');
      const start = this.selectedStartSeason();
      const end = this.selectedEndSeason();
      const preset = this.activePreset();
      const collapsed = this.configCollapsed();
      const setup = this.activeChartSetupId();

      const nextQuery: Record<string, string | null> = {
        teams: teams || null,
        start: start === null ? null : String(start),
        end: end === null ? null : String(end),
        preset: preset || null,
        collapsed: collapsed ? '1' : null,
        setup: setup || null,
      };

      const nextQueryState = JSON.stringify(nextQuery);
      if (nextQueryState === this.lastSyncedQueryState) {
        return;
      }

      const timeoutId = window.setTimeout(() => {
        this.lastSyncedQueryState = nextQueryState;
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: nextQuery,
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }, 140);

      onCleanup(() => window.clearTimeout(timeoutId));
    });
  }

  addTeam(teamId: number) {
    const selected = this.selectedTeamIds();
    if (selected.includes(teamId) || selected.length >= this.maxSelectedTeams) {
      return;
    }
    this.selectedTeamIds.set([...selected, teamId]);
    this.clubSearchTerm.set('');
    this.activeChartSetupId.set('');
  }

  addQuickPickTeam(teamId: number) {
    this.addTeam(teamId);
  }

  removeTeam(teamId: number) {
    this.selectedTeamIds.set(this.selectedTeamIds().filter((id) => id !== teamId));
    if (this.focusedTeamId() === teamId) {
      this.focusedTeamId.set(null);
    }
    this.activeChartSetupId.set('');
  }

  clearSelectedTeams() {
    this.selectedTeamIds.set([]);
    this.focusedTeamId.set(null);
    this.activeChartSetupId.set('');
  }

  onClubSearchInput(value: string) {
    this.clubSearchTerm.set(value);
  }

  setActiveClubQuickPick(groupId: string) {
    this.activeClubQuickPick.set(groupId);
  }

  toggleQuickPickMenu() {
    this.quickPickMenuOpen.set(!this.quickPickMenuOpen());
  }

  closeQuickPickMenu() {
    this.quickPickMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event.target'])
  onDocumentClick(target: EventTarget | null) {
    if (!this.quickPickMenuOpen() || !(target instanceof Element)) {
      return;
    }

    if (!target.closest('.quick-pick-shell')) {
      this.closeQuickPickMenu();
    }
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isCompactViewport.set(this.readIsCompactViewport());
  }

  toggleConfigPanel() {
    this.configCollapsed.set(!this.configCollapsed());
  }

  toggleChartSetupsPanel() {
    this.chartSetupsCollapsed.set(!this.chartSetupsCollapsed());
  }

  setChartDetailMode(mode: ChartDetailMode) {
    this.chartDetailMode.set(mode);
  }

  toggleFocusedTeam(teamId: number) {
    this.focusedTeamId.set(this.focusedTeamId() === teamId ? null : teamId);
  }

  applyChartSetup(setupId: string) {
    const setup = MOVEMENT_CHART_SETUPS.find((candidate) => candidate.id === setupId);
    if (!setup) {
      return;
    }

    const min = this.minSeason();
    const max = this.maxSeason();
    const start = Math.max(min, Math.min(setup.startSeason ?? min, max));
    const end = Math.max(start, Math.min(setup.endSeason ?? max, max));
    const selectedTeamIds = this.getTeamIdsForNames(setup.teamNames).slice(
      0,
      this.maxSelectedTeams
    );

    this.selectedTeamIds.set(selectedTeamIds);
    this.focusedTeamId.set(null);
    this.selectedStartSeason.set(start);
    this.selectedEndSeason.set(end);
    this.activePreset.set(start === min && end === max ? 'all' : '');
    this.activeClubQuickPick.set(setup.id === DEFAULT_CHART_SETUP_ID ? 'big-six' : 'common');
    this.activeChartSetupId.set(setup.id);
    this.configCollapsed.set(true);
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
    this.activeChartSetupId.set('');
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
    this.activeChartSetupId.set('');
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
      this.activeChartSetupId.set('');
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
    this.activeChartSetupId.set('');
  }

  tierLabel(tier: number): string {
    return TIER_LABELS[tier] ?? `Tier ${tier}`;
  }

  private compactTierLabel(tier: number): string {
    return `T${tier}`;
  }

  private readIsCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches;
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
    collapsedRaw: string | null,
    setupRaw: string | null,
    hasQueryState: boolean
  ) {
    this.applyingUrlState = true;
    try {
      const validTeamIds = new Set(this.teams().map((team) => team.id));
      const parsedTeams = (teamsRaw ?? '')
        .split(',')
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isFinite(value) && validTeamIds.has(value))
        .slice(0, this.maxSelectedTeams);
      this.selectedTeamIds.set(hasQueryState ? parsedTeams : this.getDefaultSelectedTeamIds());

      const min = this.minSeason();
      const max = this.maxSeason();
      const parsedStart = Number.parseInt(startRaw ?? '', 10);
      const parsedEnd = Number.parseInt(endRaw ?? '', 10);

      if (!hasQueryState) {
        const defaultSetup =
          MOVEMENT_CHART_SETUPS.find((setup) => setup.id === DEFAULT_CHART_SETUP_ID) ??
          MOVEMENT_CHART_SETUPS[0];
        const defaultStart = Math.max(min, Math.min(defaultSetup.startSeason ?? min, max));
        const defaultEnd = Math.max(defaultStart, Math.min(defaultSetup.endSeason ?? max, max));

        this.selectedTeamIds.set(
          this.getTeamIdsForNames(defaultSetup.teamNames).slice(0, this.maxSelectedTeams)
        );
        this.selectedStartSeason.set(defaultStart);
        this.selectedEndSeason.set(defaultEnd);
        this.activePreset.set('');
        this.activeClubQuickPick.set('big-six');
        this.activeChartSetupId.set(DEFAULT_CHART_SETUP_ID);
        this.configCollapsed.set(true);
        return;
      }

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
      this.activeChartSetupId.set(
        setupRaw && MOVEMENT_CHART_SETUPS.some((setup) => setup.id === setupRaw) ? setupRaw : ''
      );
      this.configCollapsed.set(collapsedRaw === '1');
    } finally {
      this.applyingUrlState = false;
    }
  }

  private getDefaultSelectedTeamIds(): number[] {
    return this.getTeamIdsForNames([...DEFAULT_STARTER_TEAM_NAMES]);
  }

  private getTeamIdsForNames(teamNames: readonly string[]): number[] {
    const teamByName = new Map(this.teams().map((team) => [team.name, team.id]));

    return teamNames
      .map((teamName) => teamByName.get(teamName))
      .filter((teamId): teamId is number => teamId !== undefined);
  }
}
