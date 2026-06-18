import type { LeagueTableEntry, Team } from '@app/store/league.models';

export interface TierClubTotal {
  key: string;
  name: string;
  clubId: string | null;
  count: number;
  detail: string;
}

export interface TierRaceRow {
  season: number;
  gap: number;
  tieBreakerGap: number | null;
  primaryName: string;
  primaryClubId: string | null;
  secondaryName: string;
  secondaryClubId: string | null;
  detail: string;
}

export interface TierNotableSeason {
  season: number;
  label: string;
  value: string;
  teamName: string;
  clubId: string | null;
}

export interface TierSeasonChurn {
  season: number;
  promotedIn: number;
  relegatedOut: number;
  totalMovement: number;
}

export interface TierDominanceRun {
  key: string;
  name: string;
  clubId: string | null;
  count: number;
  startSeason: number;
  endSeason: number;
  detail: string;
}

export interface TierProfileData {
  tier: string;
  seasons: number[];
  latestSeason: number | null;
  uniqueClubCount: number;
  totalRows: number;
  promotionInCount: number;
  relegationOutCount: number;
  mostSeasons: TierClubTotal[];
  mostTitles: TierClubTotal[];
  mostTopThreeFinishes: TierClubTotal[];
  longestStays: TierDominanceRun[];
  longestActiveStays: TierDominanceRun[];
  mostPromotionsIn: TierClubTotal[];
  mostRelegationsOut: TierClubTotal[];
  closeTitleRaces: TierRaceRow[];
  closeSurvivalRaces: TierRaceRow[];
  closePromotionRaces: TierRaceRow[];
  notableSeasons: TierNotableSeason[];
  churnSeasons: TierSeasonChurn[];
}

type TeamLookup = (teamId: number) => Team | undefined;

interface RaceTieBreaker {
  gap: number | null;
  label: string;
  levelLabel: string;
}

export function buildTierProfileData(
  entries: readonly LeagueTableEntry[],
  tier: string,
  getTeamById: TeamLookup
): TierProfileData {
  const targetEntries = entries.filter((entry) => entry.tier === tier);
  const sourceTier = adjacentLowerTier(tier);
  const sourceEntries = sourceTier ? entries.filter((entry) => entry.tier === sourceTier) : [];
  const seasonTables = groupSeasonTables(targetEntries);
  const sourceSeasonTables = groupSeasonTables(sourceEntries);
  const seasons = Array.from(seasonTables.keys()).sort((a, b) => a - b);
  const clubKeys = new Set(targetEntries.map((entry) => clubKey(entry)));

  return {
    tier,
    seasons,
    latestSeason: seasons.at(-1) ?? null,
    uniqueClubCount: clubKeys.size,
    totalRows: targetEntries.length,
    promotionInCount: sourceEntries.filter((entry) => entry.wasPromoted).length,
    relegationOutCount: targetEntries.filter((entry) => entry.wasRelegated).length,
    mostSeasons: rankClubTotals(targetEntries, getTeamById, () => true, 'seasons'),
    mostTitles: rankClubTotals(targetEntries, getTeamById, (entry) => entry.pos === 1, 'titles'),
    mostTopThreeFinishes: rankClubTotals(
      targetEntries,
      getTeamById,
      (entry) => entry.pos <= 3,
      'top-three finishes'
    ),
    longestStays: longestContinuousStays(targetEntries, seasons, getTeamById, false),
    longestActiveStays: longestContinuousStays(targetEntries, seasons, getTeamById, true),
    mostPromotionsIn: sourceTier
      ? rankClubTotals(sourceEntries, getTeamById, (entry) => entry.wasPromoted, 'promotions')
      : [],
    mostRelegationsOut: rankClubTotals(
      targetEntries,
      getTeamById,
      (entry) => entry.wasRelegated,
      'relegations'
    ),
    closeTitleRaces: closeTitleRaces(seasonTables, getTeamById),
    closeSurvivalRaces: closeSurvivalRaces(seasonTables, getTeamById),
    closePromotionRaces: closePromotionRaces(sourceSeasonTables, getTeamById),
    notableSeasons: notableSeasons(seasonTables, getTeamById),
    churnSeasons: churnSeasons(seasonTables, sourceSeasonTables),
  };
}

function rankClubTotals(
  entries: readonly LeagueTableEntry[],
  getTeamById: TeamLookup,
  include: (entry: LeagueTableEntry) => boolean,
  noun: string
): TierClubTotal[] {
  const counts = new Map<string, { entry: LeagueTableEntry; count: number }>();

  entries.filter(include).forEach((entry) => {
    const key = clubKey(entry);
    const current = counts.get(key);
    counts.set(key, {
      entry,
      count: (current?.count ?? 0) + 1,
    });
  });

  return Array.from(counts.values())
    .map(({ entry, count }) => ({
      key: clubKey(entry),
      name: getTeamById(entry.teamId)?.name ?? 'Unknown',
      clubId: entry.clubId,
      count,
      detail: `${count} ${count === 1 ? singularNoun(noun) : noun}`,
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 8);
}

function singularNoun(noun: string): string {
  return noun.endsWith('finishes') ? noun.replace(/finishes$/, 'finish') : noun.replace(/s$/, '');
}

function longestContinuousStays(
  entries: readonly LeagueTableEntry[],
  seasons: readonly number[],
  getTeamById: TeamLookup,
  activeOnly: boolean
): TierDominanceRun[] {
  const latestSeason = seasons.at(-1);
  const entriesByClub = new Map<string, LeagueTableEntry[]>();

  entries.forEach((entry) => {
    const key = clubKey(entry);
    entriesByClub.set(key, [...(entriesByClub.get(key) ?? []), entry]);
  });

  return Array.from(entriesByClub.values())
    .flatMap((clubEntries) => {
      const uniqueEntries = uniqueSeasonEntries(clubEntries).sort((a, b) => a.season - b.season);
      const runs: TierDominanceRun[] = [];
      let runStart = uniqueEntries[0];
      let previous = uniqueEntries[0];
      let count = uniqueEntries[0] ? 1 : 0;

      uniqueEntries.slice(1).forEach((entry) => {
        if (isContinuousSeason(previous.season, entry.season)) {
          previous = entry;
          count += 1;
          return;
        }

        if (runStart && previous) {
          runs.push(dominanceRun(runStart, previous, count, getTeamById));
        }
        runStart = entry;
        previous = entry;
        count = 1;
      });

      if (runStart && previous) {
        runs.push(dominanceRun(runStart, previous, count, getTeamById));
      }

      return activeOnly ? runs.filter((run) => run.endSeason === latestSeason) : runs;
    })
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.endSeason - a.endSeason ||
        a.startSeason - b.startSeason ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 6);
}

function uniqueSeasonEntries(entries: readonly LeagueTableEntry[]): LeagueTableEntry[] {
  return Array.from(
    entries
      .slice()
      .sort(byPosition)
      .reduce(
        (bySeason, entry) => bySeason.set(entry.season, entry),
        new Map<number, LeagueTableEntry>()
      )
      .values()
  );
}

function isContinuousSeason(previousSeason: number, currentSeason: number): boolean {
  return (
    currentSeason === previousSeason + 1 ||
    (previousSeason === 1914 && currentSeason === 1919) ||
    (previousSeason === 1938 && currentSeason === 1946)
  );
}

function dominanceRun(
  startEntry: LeagueTableEntry,
  endEntry: LeagueTableEntry,
  count: number,
  getTeamById: TeamLookup
): TierDominanceRun {
  return {
    key: `${clubKey(startEntry)}:${startEntry.season}:${endEntry.season}`,
    name: getTeamById(endEntry.teamId)?.name ?? 'Unknown',
    clubId: endEntry.clubId,
    count,
    startSeason: startEntry.season,
    endSeason: endEntry.season,
    detail: `${count} ${count === 1 ? 'season' : 'seasons'} (${seasonRange(startEntry.season, endEntry.season)})`,
  };
}

function seasonRange(startSeason: number, endSeason: number): string {
  return startSeason === endSeason ? String(startSeason) : `${startSeason}-${endSeason}`;
}

function closeTitleRaces(
  seasonTables: ReadonlyMap<number, LeagueTableEntry[]>,
  getTeamById: TeamLookup
): TierRaceRow[] {
  return Array.from(seasonTables.entries())
    .flatMap(([season, table]) => {
      const sorted = sortTable(table);
      const champion = sorted[0];
      const runnerUp = sorted[1];
      if (!champion || !runnerUp) {
        return [];
      }

      return [raceRow(season, champion, runnerUp, champion.points - runnerUp.points, getTeamById)];
    })
    .sort(byClosestRace)
    .slice(0, 6);
}

function closeSurvivalRaces(
  seasonTables: ReadonlyMap<number, LeagueTableEntry[]>,
  getTeamById: TeamLookup
): TierRaceRow[] {
  return Array.from(seasonTables.entries())
    .flatMap(([season, table]) => {
      const sorted = sortTable(table);
      const firstRelegated = sorted.filter((entry) => entry.wasRelegated).sort(byPosition)[0];
      if (!firstRelegated) {
        return [];
      }

      const lastSafe = sorted.find((entry) => entry.pos === firstRelegated.pos - 1);
      if (!lastSafe) {
        return [];
      }

      return [
        raceRow(
          season,
          lastSafe,
          firstRelegated,
          lastSafe.points - firstRelegated.points,
          getTeamById
        ),
      ];
    })
    .sort(byClosestRace)
    .slice(0, 6);
}

function closePromotionRaces(
  sourceSeasonTables: ReadonlyMap<number, LeagueTableEntry[]>,
  getTeamById: TeamLookup
): TierRaceRow[] {
  return Array.from(sourceSeasonTables.entries())
    .flatMap(([season, table]) => {
      const sorted = sortTable(table);
      const promoted = sorted.filter((entry) => entry.wasPromoted).sort(byPosition);
      const lastPromoted = promoted.at(-1);
      if (!lastPromoted) {
        return [];
      }

      const firstOutside = sorted.find((entry) => entry.pos === lastPromoted.pos + 1);
      if (!firstOutside) {
        return [];
      }

      return [
        raceRow(
          season,
          lastPromoted,
          firstOutside,
          lastPromoted.points - firstOutside.points,
          getTeamById
        ),
      ];
    })
    .sort(byClosestRace)
    .slice(0, 6);
}

function notableSeasons(
  seasonTables: ReadonlyMap<number, LeagueTableEntry[]>,
  getTeamById: TeamLookup
): TierNotableSeason[] {
  const tables = Array.from(seasonTables.entries()).map(([season, table]) => ({
    season,
    table: sortTable(table),
  }));
  const biggestTitleMargin = tables
    .flatMap(({ season, table }) => {
      const champion = table[0];
      const runnerUp = table[1];
      return champion && runnerUp
        ? [
            notableRow(
              season,
              'Biggest title margin',
              `${champion.points - runnerUp.points} pts`,
              champion,
              getTeamById
            ),
          ]
        : [];
    })
    .sort((a, b) => Number.parseInt(b.value, 10) - Number.parseInt(a.value, 10))[0];
  const bestGoalDifference = tables
    .flatMap(({ season, table }) =>
      table.map((entry) =>
        notableRow(
          season,
          'Best goal difference',
          `${entry.goalDifference ?? 0}`,
          entry,
          getTeamById
        )
      )
    )
    .sort((a, b) => Number.parseInt(b.value, 10) - Number.parseInt(a.value, 10))[0];
  const mostGoals = tables
    .flatMap(({ season, table }) =>
      table.map((entry) =>
        notableRow(season, 'Most goals scored', `${entry.goalsFor}`, entry, getTeamById)
      )
    )
    .sort((a, b) => Number.parseInt(b.value, 10) - Number.parseInt(a.value, 10))[0];
  const bestDefense = tables
    .flatMap(({ season, table }) =>
      table.map((entry) =>
        notableRow(season, 'Fewest goals against', `${entry.goalsAgainst}`, entry, getTeamById)
      )
    )
    .sort((a, b) => Number.parseInt(a.value, 10) - Number.parseInt(b.value, 10))[0];

  return [biggestTitleMargin, bestGoalDifference, mostGoals, bestDefense].filter(
    (row): row is TierNotableSeason => Boolean(row)
  );
}

function churnSeasons(
  seasonTables: ReadonlyMap<number, LeagueTableEntry[]>,
  sourceSeasonTables: ReadonlyMap<number, LeagueTableEntry[]>
): TierSeasonChurn[] {
  return Array.from(seasonTables.entries())
    .map(([season, table]) => {
      const promotedIn = (sourceSeasonTables.get(season) ?? []).filter(
        (entry) => entry.wasPromoted
      ).length;
      const relegatedOut = table.filter((entry) => entry.wasRelegated).length;

      return {
        season,
        promotedIn,
        relegatedOut,
        totalMovement: promotedIn + relegatedOut,
      };
    })
    .sort((a, b) => b.totalMovement - a.totalMovement || b.season - a.season)
    .slice(0, 6);
}

function groupSeasonTables(entries: readonly LeagueTableEntry[]): Map<number, LeagueTableEntry[]> {
  const groups = new Map<number, LeagueTableEntry[]>();
  entries.forEach((entry) => {
    groups.set(entry.season, [...(groups.get(entry.season) ?? []), entry]);
  });
  return groups;
}

function sortTable(table: readonly LeagueTableEntry[]): LeagueTableEntry[] {
  return table.slice().sort(byPosition);
}

function byPosition(a: LeagueTableEntry, b: LeagueTableEntry): number {
  return a.pos - b.pos;
}

function byClosestRace(a: TierRaceRow, b: TierRaceRow): number {
  return (
    a.gap - b.gap ||
    (a.tieBreakerGap ?? Number.POSITIVE_INFINITY) - (b.tieBreakerGap ?? Number.POSITIVE_INFINITY) ||
    b.season - a.season
  );
}

function raceRow(
  season: number,
  primary: LeagueTableEntry,
  secondary: LeagueTableEntry,
  gap: number,
  getTeamById: TeamLookup
): TierRaceRow {
  const tieBreakerGap = raceTieBreakerGap(primary, secondary, gap);

  return {
    season,
    gap,
    tieBreakerGap,
    primaryName: getTeamById(primary.teamId)?.name ?? 'Unknown',
    primaryClubId: primary.clubId,
    secondaryName: getTeamById(secondary.teamId)?.name ?? 'Unknown',
    secondaryClubId: secondary.clubId,
    detail: raceDetail(primary, secondary, gap),
  };
}

function raceDetail(
  primary: LeagueTableEntry,
  secondary: LeagueTableEntry,
  pointGap: number
): string {
  const normalizedPointGap = Math.max(0, pointGap);
  if (normalizedPointGap > 0) {
    return `${normalizedPointGap} ${normalizedPointGap === 1 ? 'pt' : 'pts'}`;
  }

  const tieBreaker = raceTieBreaker(primary, secondary, pointGap);
  if (tieBreaker) {
    return tieBreaker.gap === null
      ? `${tieBreaker.levelLabel} / ${tieBreaker.label}`
      : `${tieBreaker.levelLabel} / +${formatTieBreakerGap(tieBreaker.gap)} ${tieBreaker.label}`;
  }

  return `${levelPointsLabel()} / tie-breaker`;
}

function raceTieBreakerGap(
  primary: LeagueTableEntry,
  secondary: LeagueTableEntry,
  pointGap: number
): number | null {
  return raceTieBreaker(primary, secondary, pointGap)?.gap ?? null;
}

function raceTieBreaker(
  primary: LeagueTableEntry,
  secondary: LeagueTableEntry,
  pointGap: number
): RaceTieBreaker | null {
  if (pointGap !== 0) {
    return null;
  }

  if (usesGoalAverageTieBreaker(primary.season)) {
    return goalAverageTieBreaker(primary, secondary);
  }

  const goalDifferenceTieBreaker = goalDifferenceAndGoalsTieBreaker(primary, secondary);
  if (goalDifferenceTieBreaker) {
    return goalDifferenceTieBreaker;
  }

  if (usesHeadToHeadTieBreaker(primary.season)) {
    return {
      gap: null,
      label: 'head-to-head or playoff',
      levelLabel: 'level on points, GD, and goals scored',
    };
  }

  return null;
}

function goalAverageTieBreaker(
  primary: LeagueTableEntry,
  secondary: LeagueTableEntry
): RaceTieBreaker | null {
  const primaryGoalAverage = goalAverage(primary);
  const secondaryGoalAverage = goalAverage(secondary);
  if (primaryGoalAverage === null || secondaryGoalAverage === null) {
    return null;
  }

  const goalAverageGap = Math.abs(primaryGoalAverage - secondaryGoalAverage);
  if (goalAverageGap > 0) {
    return {
      gap: goalAverageGap,
      label: 'goal average',
      levelLabel: levelPointsLabel(),
    };
  }

  return null;
}

function goalDifferenceAndGoalsTieBreaker(
  primary: LeagueTableEntry,
  secondary: LeagueTableEntry
): RaceTieBreaker | null {
  if (primary.goalDifference !== null && secondary.goalDifference !== null) {
    const goalDifferenceGap = Math.abs(primary.goalDifference - secondary.goalDifference);
    if (goalDifferenceGap > 0) {
      return {
        gap: goalDifferenceGap,
        label: 'GD',
        levelLabel: levelPointsLabel(),
      };
    }

    const goalsScoredGap = Math.abs(primary.goalsFor - secondary.goalsFor);
    if (goalsScoredGap > 0) {
      return {
        gap: goalsScoredGap,
        label: 'goals scored',
        levelLabel: 'level on points and GD',
      };
    }
  }

  return null;
}

function goalAverage(entry: LeagueTableEntry): number | null {
  if (entry.goalAverage !== null) {
    return entry.goalAverage;
  }

  return entry.goalsAgainst === 0 ? null : entry.goalsFor / entry.goalsAgainst;
}

function usesGoalAverageTieBreaker(season: number): boolean {
  return season <= 1975;
}

function usesHeadToHeadTieBreaker(season: number): boolean {
  return season >= 2019;
}

function formatTieBreakerGap(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
}

function levelPointsLabel(): string {
  return 'level on points';
}

function notableRow(
  season: number,
  label: string,
  value: string,
  entry: LeagueTableEntry,
  getTeamById: TeamLookup
): TierNotableSeason {
  return {
    season,
    label,
    value,
    teamName: getTeamById(entry.teamId)?.name ?? 'Unknown',
    clubId: entry.clubId,
  };
}

function adjacentLowerTier(tier: string): string | null {
  const value = tierNumber(tier);
  return value ? `tier${value + 1}` : null;
}

function tierNumber(tier: string): number | null {
  const parsed = Number.parseInt(tier.replace('tier', ''), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function clubKey(entry: LeagueTableEntry): string {
  return entry.clubId ?? `team:${entry.teamId}`;
}
