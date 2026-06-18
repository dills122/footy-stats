import type { LeagueTableEntry } from '@app/store/league.models';

export interface TeamDeepTotals {
  seasons: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  averagePosition: number | null;
  pointsPerGame: number | null;
  goalsPerGame: number | null;
}

export interface TeamDeepTierRow {
  tier: string;
  tierLabel: string;
  seasons: number;
  firstSeason: number;
  lastSeason: number;
  bestPosition: number;
  bestSeason: number;
  points: number;
  averagePosition: number;
  movementEvents: number;
}

export interface TeamDeepSeasonRow {
  season: number;
  tier: string;
  tierLabel: string;
  teamName: string;
  position: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number | null;
  points: number;
  pointsPerGame: number | null;
  movementLabel: string | null;
}

export interface TeamDeepRecordMark {
  label: string;
  value: string;
  detail: string;
  season: number;
  tier: string;
}

export interface TeamDeepPositionBand {
  label: string;
  count: number;
  detail: string;
}

export interface TeamDeepStatsData {
  totals: TeamDeepTotals;
  recordMarks: TeamDeepRecordMark[];
  tierRows: TeamDeepTierRow[];
  movementRows: TeamDeepSeasonRow[];
  seasonRows: TeamDeepSeasonRow[];
  positionBands: TeamDeepPositionBand[];
}

type TeamNameLookup = (teamId: number) => string;
type TierLabelFormatter = (tier: string) => string;

export function buildTeamDeepStatsData(
  entries: readonly LeagueTableEntry[],
  getTeamName: TeamNameLookup,
  formatTierLabel: TierLabelFormatter
): TeamDeepStatsData {
  const seasonRows = entries
    .slice()
    .sort((a, b) => b.season - a.season || tierRank(a.tier) - tierRank(b.tier))
    .map((entry) => seasonRow(entry, getTeamName, formatTierLabel));
  const totals = buildTotals(entries);

  return {
    totals,
    recordMarks: buildRecordMarks(entries, formatTierLabel),
    tierRows: buildTierRows(entries, formatTierLabel),
    movementRows: seasonRows.filter((row) => row.movementLabel),
    seasonRows,
    positionBands: buildPositionBands(entries),
  };
}

function buildTotals(entries: readonly LeagueTableEntry[]): TeamDeepTotals {
  const totals = entries.reduce(
    (acc, entry) => ({
      seasons: acc.seasons + 1,
      played: acc.played + entry.played,
      won: acc.won + entry.won,
      drawn: acc.drawn + entry.drawn,
      lost: acc.lost + entry.lost,
      goalsFor: acc.goalsFor + entry.goalsFor,
      goalsAgainst: acc.goalsAgainst + entry.goalsAgainst,
      goalDifference:
        acc.goalDifference + (entry.goalDifference ?? entry.goalsFor - entry.goalsAgainst),
      points: acc.points + entry.points,
      positionTotal: acc.positionTotal + entry.pos,
    }),
    {
      seasons: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      positionTotal: 0,
    }
  );

  return {
    seasons: totals.seasons,
    played: totals.played,
    won: totals.won,
    drawn: totals.drawn,
    lost: totals.lost,
    goalsFor: totals.goalsFor,
    goalsAgainst: totals.goalsAgainst,
    goalDifference: totals.goalDifference,
    points: totals.points,
    averagePosition: totals.seasons ? totals.positionTotal / totals.seasons : null,
    pointsPerGame: totals.played ? totals.points / totals.played : null,
    goalsPerGame: totals.played ? totals.goalsFor / totals.played : null,
  };
}

function buildTierRows(
  entries: readonly LeagueTableEntry[],
  formatTierLabel: TierLabelFormatter
): TeamDeepTierRow[] {
  const byTier = new Map<string, LeagueTableEntry[]>();
  entries.forEach((entry) => byTier.set(entry.tier, [...(byTier.get(entry.tier) ?? []), entry]));

  return Array.from(byTier.entries())
    .map(([tier, tierEntries]) => {
      const sorted = tierEntries.slice().sort((a, b) => a.season - b.season);
      const best = tierEntries
        .slice()
        .sort((a, b) => a.pos - b.pos || b.points - a.points || b.season - a.season)[0];
      const points = tierEntries.reduce((sum, entry) => sum + entry.points, 0);
      const positionTotal = tierEntries.reduce((sum, entry) => sum + entry.pos, 0);
      const movementEvents = tierEntries.filter(
        (entry) => entry.wasPromoted || entry.wasRelegated || entry.wasReprieved
      ).length;

      return {
        tier,
        tierLabel: formatTierLabel(tier),
        seasons: tierEntries.length,
        firstSeason: sorted[0].season,
        lastSeason: sorted.at(-1)!.season,
        bestPosition: best.pos,
        bestSeason: best.season,
        points,
        averagePosition: positionTotal / tierEntries.length,
        movementEvents,
      };
    })
    .sort((a, b) => tierRank(a.tier) - tierRank(b.tier));
}

function buildRecordMarks(
  entries: readonly LeagueTableEntry[],
  formatTierLabel: TierLabelFormatter
): TeamDeepRecordMark[] {
  const bestFinish = entries
    .slice()
    .sort((a, b) => a.pos - b.pos || tierRank(a.tier) - tierRank(b.tier) || b.points - a.points)[0];
  const mostPoints = maxEntry(entries, (entry) => entry.points);
  const bestGoalDifference = maxEntry(
    entries,
    (entry) => entry.goalDifference ?? entry.goalsFor - entry.goalsAgainst
  );
  const mostGoals = maxEntry(entries, (entry) => entry.goalsFor);
  const fewestAgainst = minEntry(entries, (entry) => entry.goalsAgainst);
  const bestPointsPerGame = maxEntry(
    entries,
    (entry) => pointsPerGame(entry) ?? Number.NEGATIVE_INFINITY
  );

  return [
    bestFinish
      ? recordMark('Best finish', ordinal(bestFinish.pos), bestFinish, formatTierLabel)
      : null,
    mostPoints
      ? recordMark('Most points', `${mostPoints.points} pts`, mostPoints, formatTierLabel)
      : null,
    bestGoalDifference
      ? recordMark(
          'Best goal difference',
          signedNumber(
            bestGoalDifference.goalDifference ??
              bestGoalDifference.goalsFor - bestGoalDifference.goalsAgainst
          ),
          bestGoalDifference,
          formatTierLabel
        )
      : null,
    mostGoals
      ? recordMark('Most goals scored', `${mostGoals.goalsFor}`, mostGoals, formatTierLabel)
      : null,
    fewestAgainst
      ? recordMark(
          'Fewest goals against',
          `${fewestAgainst.goalsAgainst}`,
          fewestAgainst,
          formatTierLabel
        )
      : null,
    bestPointsPerGame
      ? recordMark(
          'Best points per game',
          formatDecimal(pointsPerGame(bestPointsPerGame)),
          bestPointsPerGame,
          formatTierLabel
        )
      : null,
  ].filter((mark): mark is TeamDeepRecordMark => Boolean(mark));
}

function buildPositionBands(entries: readonly LeagueTableEntry[]): TeamDeepPositionBand[] {
  const titleCount = entries.filter((entry) => entry.pos === 1).length;
  const podiumCount = entries.filter((entry) => entry.pos <= 3).length;
  const topSixCount = entries.filter((entry) => entry.pos <= 6).length;
  const relegationCount = entries.filter((entry) => entry.wasRelegated).length;

  return [
    {
      label: 'Titles',
      count: titleCount,
      detail: `${percentage(titleCount, entries.length)} of tracked rows`,
    },
    {
      label: 'Top three',
      count: podiumCount,
      detail: `${percentage(podiumCount, entries.length)} of tracked rows`,
    },
    {
      label: 'Top six',
      count: topSixCount,
      detail: `${percentage(topSixCount, entries.length)} of tracked rows`,
    },
    {
      label: 'Relegated',
      count: relegationCount,
      detail: `${percentage(relegationCount, entries.length)} of tracked rows`,
    },
  ];
}

function seasonRow(
  entry: LeagueTableEntry,
  getTeamName: TeamNameLookup,
  formatTierLabel: TierLabelFormatter
): TeamDeepSeasonRow {
  return {
    season: entry.season,
    tier: entry.tier,
    tierLabel: formatTierLabel(entry.tier),
    teamName: getTeamName(entry.teamId),
    position: entry.pos,
    played: entry.played,
    won: entry.won,
    drawn: entry.drawn,
    lost: entry.lost,
    goalsFor: entry.goalsFor,
    goalsAgainst: entry.goalsAgainst,
    goalDifference: entry.goalDifference,
    points: entry.points,
    pointsPerGame: pointsPerGame(entry),
    movementLabel: movementLabel(entry),
  };
}

function recordMark(
  label: string,
  value: string,
  entry: LeagueTableEntry,
  formatTierLabel: TierLabelFormatter
): TeamDeepRecordMark {
  return {
    label,
    value,
    detail: `${entry.season} / ${formatTierLabel(entry.tier)}`,
    season: entry.season,
    tier: entry.tier,
  };
}

function maxEntry(
  entries: readonly LeagueTableEntry[],
  getValue: (entry: LeagueTableEntry) => number
): LeagueTableEntry | null {
  return (
    entries.slice().sort((a, b) => getValue(b) - getValue(a) || b.season - a.season)[0] ?? null
  );
}

function minEntry(
  entries: readonly LeagueTableEntry[],
  getValue: (entry: LeagueTableEntry) => number
): LeagueTableEntry | null {
  return (
    entries.slice().sort((a, b) => getValue(a) - getValue(b) || b.season - a.season)[0] ?? null
  );
}

function movementLabel(entry: LeagueTableEntry): string | null {
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

function pointsPerGame(entry: LeagueTableEntry): number | null {
  return entry.played ? entry.points / entry.played : null;
}

function tierRank(tier: string): number {
  const parsed = Number.parseInt(tier.replace('tier', ''), 10);
  return Number.isFinite(parsed) ? parsed : 99;
}

function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  return `${value}${{ 1: 'st', 2: 'nd', 3: 'rd' }[value % 10] ?? 'th'}`;
}

function signedNumber(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

function formatDecimal(value: number | null): string {
  return value === null ? 'No data' : value.toFixed(2);
}

function percentage(value: number, total: number): string {
  return total ? `${Math.round((value / total) * 100)}%` : '0%';
}
