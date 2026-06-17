import { getWartimeSuspensionLabelForSpan } from './wartime-suspensions';

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
      const periodKey = normalizeDisplayName(period.name);
      const existing = acc.find(
        (displayPeriod) => normalizeDisplayName(displayPeriod.name) === periodKey
      );

      if (existing) {
        existing.startSeason = Math.min(existing.startSeason, period.startSeason);
        existing.endSeason = Math.max(existing.endSeason, period.endSeason);
        return acc;
      }

      acc.push({ ...period, omittedRanges: [] });
      return acc;
    }, []);
}

function normalizeDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
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
