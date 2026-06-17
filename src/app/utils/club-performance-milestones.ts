import type { LeagueTableEntry } from '@app/store/league.models';
import { isWartimeSuspensionSpan } from './wartime-suspensions';

export interface ClubSeasonRun {
  startSeason: number;
  endSeason: number;
  seasons: number[];
  rowCount: number;
}

export interface ClubSeasonGap {
  fromSeason: number;
  toSeason: number;
  seasons: number;
}

export interface ClubPerformanceMilestones {
  firstEntry: LeagueTableEntry | null;
  bestTopFlightEntry: LeagueTableEntry | null;
  longestTopFlightRun: ClubSeasonRun | null;
  longestTrackedRun: ClubSeasonRun | null;
  longestNonWartimeGap: ClubSeasonGap | null;
  promotionSeasons: number[];
  relegationSeasons: number[];
}

type EntryPredicate = (entry: LeagueTableEntry) => boolean;

export function buildClubPerformanceMilestones(
  entries: readonly LeagueTableEntry[]
): ClubPerformanceMilestones {
  const sortedEntries = entries
    .slice()
    .sort((a, b) => a.season - b.season || tierRank(a.tier) - tierRank(b.tier));

  const promotionSeasons = sortedEntries
    .filter((entry) => entry.wasPromoted)
    .map((entry) => entry.season);
  const relegationSeasons = sortedEntries
    .filter((entry) => entry.wasRelegated)
    .map((entry) => entry.season);

  return {
    firstEntry: sortedEntries[0] ?? null,
    bestTopFlightEntry: sortedEntries
      .filter((entry) => entry.tier === 'tier1')
      .reduce<LeagueTableEntry | null>(
        (best, entry) => (!best || entry.pos < best.pos ? entry : best),
        null
      ),
    longestTopFlightRun: findLongestRun(sortedEntries, (entry) => entry.tier === 'tier1'),
    longestTrackedRun: findLongestRun(sortedEntries, () => true),
    longestNonWartimeGap: findLongestNonWartimeGap(sortedEntries),
    promotionSeasons,
    relegationSeasons,
  };
}

function findLongestRun(
  entries: readonly LeagueTableEntry[],
  predicate: EntryPredicate
): ClubSeasonRun | null {
  const matchingEntries = entries.filter(predicate);
  if (!matchingEntries.length) {
    return null;
  }

  const runs = matchingEntries.reduce<ClubSeasonRun[]>((acc, entry) => {
    const currentRun = acc.at(-1);
    const previousSeason = currentRun?.endSeason;

    if (
      !currentRun ||
      previousSeason === undefined ||
      !isContinuousSeason(previousSeason, entry.season)
    ) {
      acc.push({
        startSeason: entry.season,
        endSeason: entry.season,
        seasons: [entry.season],
        rowCount: 1,
      });
      return acc;
    }

    currentRun.endSeason = entry.season;
    currentRun.seasons.push(entry.season);
    currentRun.rowCount += 1;
    return acc;
  }, []);

  return runs.reduce((best, run) => {
    if (run.rowCount !== best.rowCount) {
      return run.rowCount > best.rowCount ? run : best;
    }

    return run.endSeason - run.startSeason > best.endSeason - best.startSeason ? run : best;
  });
}

function findLongestNonWartimeGap(entries: readonly LeagueTableEntry[]): ClubSeasonGap | null {
  const gaps = entries
    .slice(0, -1)
    .map((entry, index) => {
      const nextEntry = entries[index + 1];
      const fromSeason = entry.season + 1;
      const toSeason = nextEntry.season - 1;
      if (fromSeason > toSeason || isWartimeSuspensionSpan(fromSeason, toSeason)) {
        return null;
      }

      return {
        fromSeason,
        toSeason,
        seasons: toSeason - fromSeason + 1,
      };
    })
    .filter((gap): gap is ClubSeasonGap => gap !== null);

  if (!gaps.length) {
    return null;
  }

  return gaps.reduce((longest, gap) => (gap.seasons > longest.seasons ? gap : longest));
}

function isContinuousSeason(previousSeason: number, nextSeason: number): boolean {
  if (nextSeason === previousSeason + 1) {
    return true;
  }

  const omittedFrom = previousSeason + 1;
  const omittedTo = nextSeason - 1;
  return isWartimeSuspensionSpan(omittedFrom, omittedTo);
}

function tierRank(tier: string): number {
  const parsed = Number.parseInt(tier.replace('tier', ''), 10);
  return Number.isFinite(parsed) ? parsed : 99;
}
