import { build11v11Links, buildWikipediaLinks, buildWorldFootballLink } from './link-builders';

describe('buildWikipediaLinks', () => {
  it('returns mapped links for special-case clubs', () => {
    const result = buildWikipediaLinks(['Darwen', 'Accrington']);

    expect(result['Darwen']).toBe('https://en.wikipedia.org/wiki/Darwen_F.C._(1870)');
    expect(result['Accrington']).toBe('https://en.wikipedia.org/wiki/Accrington_F.C._(1878)');
  });

  it('appends _F.C. for single-word clubs without a suffix', () => {
    const result = buildWikipediaLinks(['Sunderland']);

    expect(result['Sunderland']).toBe('https://en.wikipedia.org/wiki/Sunderland_F.C.');
  });

  it('normalizes spaces, ampersands, and punctuation', () => {
    const result = buildWikipediaLinks(["King's Lynn", 'Brighton & Hove Albion']);

    expect(result["King's Lynn"]).toBe(
      `https://en.wikipedia.org/wiki/${encodeURIComponent("King's_Lynn")}`
    );
    expect(result['Brighton & Hove Albion']).toBe(
      'https://en.wikipedia.org/wiki/Brighton_and_Hove_Albion'
    );
  });
});

describe('buildWorldFootballLink', () => {
  it('lowercases names and replaces whitespace with hyphens', () => {
    expect(buildWorldFootballLink('  Aston Villa  ')).toBe(
      'https://www.worldfootball.net/teams/aston-villa/'
    );
  });

  it('collapses punctuation into single hyphens', () => {
    expect(buildWorldFootballLink('Queens Park Rangers')).toBe(
      'https://www.worldfootball.net/teams/queens-park-rangers/'
    );
  });
});

describe('build11v11Links', () => {
  it('builds links for each club with normalized slugs', () => {
    const result = build11v11Links(['Everton', 'Sheffield Wednesday']);

    expect(result['Everton']).toBe('https://www.11v11.com/teams/everton/');
    expect(result['Sheffield Wednesday']).toBe('https://www.11v11.com/teams/sheffield-wednesday/');
  });

  it('replaces ampersands and trims stray hyphens', () => {
    const result = build11v11Links(['Brighton & Hove Albion', 'St. Johnstone!']);

    expect(result['Brighton & Hove Albion']).toBe(
      'https://www.11v11.com/teams/brighton-and-hove-albion/'
    );
    expect(result['St. Johnstone!']).toBe('https://www.11v11.com/teams/st-johnstone/');
  });
});
