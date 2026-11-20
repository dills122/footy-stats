import {
  LEAGUE_SYSTEM_ERAS,
  leagueSystemEraForSeason,
  leagueSystemExportRows,
  seasonCompetitionName,
} from './league-system-history';

describe('league system history', () => {
  it('uses archived competition titles and handles regional or generic source headings', () => {
    expect(seasonCompetitionName(1888, 'tier1', 'The Football League')).toBe('The Football League');
    expect(seasonCompetitionName(1890, 'tier2')).toBe('Football Alliance');
    expect(seasonCompetitionName(1920, 'tier3')).toBe('Third Division');
    expect(seasonCompetitionName(1921, 'tier4')).toBe('Third Division South');
    expect(seasonCompetitionName(2012, 'tier1', 'League tables')).toBe('Premier League');
    expect(seasonCompetitionName(2012, 'tier5', 'League tables')).toBe('Conference Premier');
    expect(seasonCompetitionName(2025, 'tier7', 'South')).toBe('National League South');
  });

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
