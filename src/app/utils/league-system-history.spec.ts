import {
  LEAGUE_SYSTEM_ERAS,
  leagueSystemEraForSeason,
  leagueSystemExportRows,
} from './league-system-history';

describe('league system history', () => {
  it('maps key seasons to the correct football tier era', () => {
    expect(leagueSystemEraForSeason(1888).id).toBe('founding-league');
    expect(leagueSystemEraForSeason(1892).id).toBe('two-division-league');
    expect(leagueSystemEraForSeason(1921).id).toBe('regional-third');
    expect(leagueSystemEraForSeason(1958).id).toBe('four-division-league');
    expect(leagueSystemEraForSeason(1992).id).toBe('premier-league-split');
    expect(leagueSystemEraForSeason(2004).id).toBe('efl-branding');
    expect(leagueSystemEraForSeason(2021).id).toBe('parallel-national-leagues');
  });

  it('marks regional and national league split tiers as parallel levels', () => {
    const regionalThird = leagueSystemEraForSeason(1950).tiers.at(-1);
    const nationalLeagueRegional = leagueSystemEraForSeason(2025).tiers.at(-1);

    expect(regionalThird?.kind).toBe('parallel');
    expect(regionalThird?.tierKeys).toEqual(['tier3', 'tier4']);
    expect(nationalLeagueRegional?.kind).toBe('parallel');
    expect(nationalLeagueRegional?.tierKeys).toEqual(['tier6', 'tier7']);
  });

  it('builds one export row per tier band', () => {
    const rows = leagueSystemExportRows(LEAGUE_SYSTEM_ERAS.slice(0, 1));

    expect(rows).toEqual([
      {
        era: '1888-1891',
        startSeason: 1888,
        endSeason: 1891,
        level: 1,
        label: 'Level 1',
        leagues: ['Football League'],
        tierKeys: ['tier1'],
        kind: 'single',
        note: '',
      },
    ]);
  });
});
