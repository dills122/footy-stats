export interface WartimeSuspensionRange {
  startSeason: number;
  endSeason: number;
  label: string;
  description: string;
}

const WARTIME_SUSPENSION_RANGES: readonly WartimeSuspensionRange[] = [
  {
    startSeason: 1915,
    endSeason: 1918,
    label: 'First World War',
    description: 'Official Football League competition was suspended.',
  },
  {
    startSeason: 1939,
    endSeason: 1945,
    label: 'Second World War',
    description: 'Official league tables were abandoned or replaced by wartime competitions.',
  },
] as const;

export function getWartimeSuspensionRanges(seasons: readonly number[]): WartimeSuspensionRange[] {
  if (!seasons.length) {
    return [];
  }

  const selectedSeasons = new Set(seasons);

  return WARTIME_SUSPENSION_RANGES.map((range) => {
    const includedSeasons = Array.from(selectedSeasons)
      .filter((season) => season >= range.startSeason && season <= range.endSeason)
      .sort((a, b) => a - b);

    if (!includedSeasons.length) {
      return null;
    }

    return {
      ...range,
      startSeason: includedSeasons[0],
      endSeason: includedSeasons[includedSeasons.length - 1],
    };
  }).filter((range): range is WartimeSuspensionRange => range !== null);
}
