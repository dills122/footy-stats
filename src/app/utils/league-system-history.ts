export type TierBandKind = 'single' | 'parallel';

export interface TierBand {
  level: number;
  label: string;
  leagues: string[];
  tierKeys: string[];
  kind: TierBandKind;
  note?: string;
}

export interface LeagueSystemEra {
  id: string;
  label: string;
  startSeason: number;
  endSeason: number | null;
  headline: string;
  summary: string;
  tiers: TierBand[];
  changes: string[];
  archiveNotes: string[];
}

export const LEAGUE_SYSTEM_ERAS: readonly LeagueSystemEra[] = [
  {
    id: 'founding-league',
    label: '1888-1891',
    startSeason: 1888,
    endSeason: 1891,
    headline: 'One national Football League division',
    summary:
      'The archive starts with one national league table before the Football League split into multiple divisions.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['Football League'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
    ],
    changes: ['Single table era', 'No second national division yet'],
    archiveNotes: ['FootyStats treats the founding Football League as top-flight tier1 data.'],
  },
  {
    id: 'two-division-league',
    label: '1892-1919',
    startSeason: 1892,
    endSeason: 1919,
    headline: 'First and Second Division structure',
    summary:
      'The Football League expanded into a two-division system with the First Division as the top flight.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['First Division'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
      {
        level: 2,
        label: 'Level 2',
        leagues: ['Second Division'],
        tierKeys: ['tier2'],
        kind: 'single',
      },
    ],
    changes: ['Top flight renamed First Division', 'Second Division becomes the second tier'],
    archiveNotes: ['Election and test-match context appears in row notes where available.'],
  },
  {
    id: 'regional-third',
    label: '1921-1957',
    startSeason: 1921,
    endSeason: 1957,
    headline: 'Regional Third Division North and South',
    summary:
      'The third level split into North and South sections running in parallel below the Second Division.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['First Division'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
      {
        level: 2,
        label: 'Level 2',
        leagues: ['Second Division'],
        tierKeys: ['tier2'],
        kind: 'single',
      },
      {
        level: 3,
        label: 'Level 3',
        leagues: ['Third Division North', 'Third Division South'],
        tierKeys: ['tier3', 'tier4'],
        kind: 'parallel',
        note: 'Parallel regional sections, not separate pyramid levels.',
      },
    ],
    changes: [
      'Third Division expands into North and South sections',
      'Only regional champions moved up',
    ],
    archiveNotes: [
      'FootyStats stores Third Division North as tier3 and Third Division South as tier4 for table slots.',
      'Both regional sections represent pyramid level 3 in this era.',
    ],
  },
  {
    id: 'four-division-league',
    label: '1958-1991',
    startSeason: 1958,
    endSeason: 1991,
    headline: 'National Third and Fourth Divisions',
    summary: 'The regional third tier was reorganized into national Third and Fourth Divisions.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['First Division'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
      {
        level: 2,
        label: 'Level 2',
        leagues: ['Second Division'],
        tierKeys: ['tier2'],
        kind: 'single',
      },
      {
        level: 3,
        label: 'Level 3',
        leagues: ['Third Division'],
        tierKeys: ['tier3'],
        kind: 'single',
      },
      {
        level: 4,
        label: 'Level 4',
        leagues: ['Fourth Division'],
        tierKeys: ['tier4'],
        kind: 'single',
      },
    ],
    changes: ['Regional sections merged', 'Fourth Division created as the new level 4'],
    archiveNotes: ['This is the cleanest four-tier Football League era in the archive.'],
  },
  {
    id: 'premier-league-split',
    label: '1992-2003',
    startSeason: 1992,
    endSeason: 2003,
    headline: 'Premier League split and Football League renumbering',
    summary:
      'The Premier League became the top flight and the remaining Football League divisions were renumbered below it.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['Premier League'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
      {
        level: 2,
        label: 'Level 2',
        leagues: ['Football League First Division'],
        tierKeys: ['tier2'],
        kind: 'single',
      },
      {
        level: 3,
        label: 'Level 3',
        leagues: ['Football League Second Division'],
        tierKeys: ['tier3'],
        kind: 'single',
      },
      {
        level: 4,
        label: 'Level 4',
        leagues: ['Football League Third Division'],
        tierKeys: ['tier4'],
        kind: 'single',
      },
    ],
    changes: [
      'First Division clubs break away into the Premier League',
      'Football League names shift down one level',
    ],
    archiveNotes: [
      'FootyStats keeps tier1 as the top flight before and after the Premier League split.',
    ],
  },
  {
    id: 'efl-branding',
    label: '2004-2020',
    startSeason: 2004,
    endSeason: 2020,
    headline: 'Championship, League One, and League Two branding',
    summary:
      'The second through fourth levels adopted the modern Championship, League One, and League Two names.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['Premier League'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
      {
        level: 2,
        label: 'Level 2',
        leagues: ['Championship'],
        tierKeys: ['tier2'],
        kind: 'single',
      },
      {
        level: 3,
        label: 'Level 3',
        leagues: ['League One'],
        tierKeys: ['tier3'],
        kind: 'single',
      },
      {
        level: 4,
        label: 'Level 4',
        leagues: ['League Two'],
        tierKeys: ['tier4'],
        kind: 'single',
      },
      {
        level: 5,
        label: 'Level 5',
        leagues: ['National League'],
        tierKeys: ['tier5'],
        kind: 'single',
      },
    ],
    changes: [
      'Modern EFL branding appears',
      'National League data extends the archive below League Two',
    ],
    archiveNotes: ['Lower-tier coverage becomes denser in the modern archive period.'],
  },
  {
    id: 'parallel-national-leagues',
    label: '2021-present',
    startSeason: 2021,
    endSeason: null,
    headline: 'National League North and South run in parallel',
    summary:
      'The current archive includes the National League and two regional National League divisions below it.',
    tiers: [
      {
        level: 1,
        label: 'Level 1',
        leagues: ['Premier League'],
        tierKeys: ['tier1'],
        kind: 'single',
      },
      {
        level: 2,
        label: 'Level 2',
        leagues: ['Championship'],
        tierKeys: ['tier2'],
        kind: 'single',
      },
      {
        level: 3,
        label: 'Level 3',
        leagues: ['League One'],
        tierKeys: ['tier3'],
        kind: 'single',
      },
      {
        level: 4,
        label: 'Level 4',
        leagues: ['League Two'],
        tierKeys: ['tier4'],
        kind: 'single',
      },
      {
        level: 5,
        label: 'Level 5',
        leagues: ['National League'],
        tierKeys: ['tier5'],
        kind: 'single',
      },
      {
        level: 6,
        label: 'Level 6',
        leagues: ['National League North', 'National League South'],
        tierKeys: ['tier6', 'tier7'],
        kind: 'parallel',
        note: 'Parallel regional level 6 divisions in the current archive.',
      },
    ],
    changes: ['National League North and South appear as parallel regional divisions'],
    archiveNotes: [
      'FootyStats stores National League North as tier6 and National League South as tier7.',
      'For 2021-2025 archive data, both slots represent parallel pyramid level 6 divisions.',
    ],
  },
];

export function leagueSystemEraForSeason(season: number): LeagueSystemEra {
  return (
    LEAGUE_SYSTEM_ERAS.find(
      (era) => season >= era.startSeason && (era.endSeason === null || season <= era.endSeason)
    ) ?? LEAGUE_SYSTEM_ERAS[LEAGUE_SYSTEM_ERAS.length - 1]
  );
}

export function leagueSystemExportRows(eras = LEAGUE_SYSTEM_ERAS): Record<string, unknown>[] {
  return eras.flatMap((era) =>
    era.tiers.map((tier) => ({
      era: era.label,
      startSeason: era.startSeason,
      endSeason: era.endSeason ?? 'present',
      level: tier.level,
      label: tier.label,
      leagues: tier.leagues,
      tierKeys: tier.tierKeys,
      kind: tier.kind,
      note: tier.note ?? '',
    }))
  );
}
