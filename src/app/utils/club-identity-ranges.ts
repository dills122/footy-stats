import { getWartimeSuspensionLabelForSpan, isWartimeSuspensionSpan } from './wartime-suspensions';

export interface ClubObservedNamePeriod {
  name: string;
  startSeason: number;
  endSeason: number;
}

export interface ClubDisplayNamePeriod extends ClubObservedNamePeriod {
  omittedRanges: {
    fromSeason: number;
    toSeason: number;
    reason: string;
    isOfficialSuspension: boolean;
  }[];
}

export interface ClubDerivedGap {
  fromSeason: number;
  toSeason: number;
  reason: string;
  isOfficialSuspension: boolean;
}

export function buildClubDisplayNamePeriods(
  periods: readonly ClubObservedNamePeriod[]
): ClubDisplayNamePeriod[] {
  return periods
    .slice()
    .sort((a, b) => a.startSeason - b.startSeason || a.name.localeCompare(b.name))
    .reduce<ClubDisplayNamePeriod[]>((acc, period) => {
      const previous = acc.at(-1);

      if (!previous || previous.name !== period.name) {
        acc.push({ ...period, omittedRanges: [] });
        return acc;
      }

      const omittedFrom = previous.endSeason + 1;
      const omittedTo = period.startSeason - 1;
      if (omittedFrom <= omittedTo && isWartimeSuspensionSpan(omittedFrom, omittedTo)) {
        previous.endSeason = period.endSeason;
        previous.omittedRanges.push({
          fromSeason: omittedFrom,
          toSeason: omittedTo,
          reason:
            getWartimeSuspensionLabelForSpan(omittedFrom, omittedTo) ?? 'Official league suspended',
          isOfficialSuspension: true,
        });
        return acc;
      }

      acc.push({ ...period, omittedRanges: [] });
      return acc;
    }, []);
}

export function buildClubDerivedGaps(periods: readonly ClubObservedNamePeriod[]): ClubDerivedGap[] {
  const sortedPeriods = periods
    .slice()
    .sort((a, b) => a.startSeason - b.startSeason || a.name.localeCompare(b.name));

  return sortedPeriods
    .slice(0, -1)
    .map((period, index) => {
      const nextPeriod = sortedPeriods[index + 1];
      const fromSeason = period.endSeason + 1;
      const toSeason = nextPeriod.startSeason - 1;
      const suspensionLabel = getWartimeSuspensionLabelForSpan(fromSeason, toSeason);

      return {
        fromSeason,
        toSeason,
        reason: suspensionLabel ?? 'No official league record in metadata',
        isOfficialSuspension: Boolean(suspensionLabel),
      };
    })
    .filter((gap) => gap.fromSeason <= gap.toSeason);
}
