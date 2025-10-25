/**
 * Builds Wikipedia URLs for English football clubs.
 * Handles special cases and applies naming conventions like "_F.C." for city-based clubs.
 */
export function buildWikipediaLinks(clubs: string[]): Record<string, string> {
  const baseUrl = 'https://en.wikipedia.org/wiki/';

  // ✅ Explicit overrides for known edge cases
  const specialCases: Record<string, string> = {
    Darwen: 'Darwen_F.C._(1870)',
    Blackpool: 'Blackpool_F.C.',
    Accrington: 'Accrington_F.C._(1878)',
    Burton: 'Burton_Town_F.C.',
    Reading: 'Reading_F.C.',
    Swindon: 'Swindon_Town_F.C.',
    Wrexham: 'Wrexham_A.F.C.',
    Chester: 'Chester_F.C.',
    Carlisle: 'Carlisle_United_F.C.',
  };

  return clubs.reduce<Record<string, string>>((acc, club) => {
    const cleanName = club.trim();

    // Use special-case mapping first
    if (specialCases[cleanName]) {
      acc[club] = `${baseUrl}${specialCases[cleanName]}`;
      return acc;
    }

    // If the club is a single word (like "Blackpool"), append "_F.C."
    const needsFC =
      !/\b(F\.?C\.?|AFC|United|City|Town|Rovers|County|Albion)\b/i.test(cleanName) &&
      cleanName.split(' ').length === 1;

    const wikiTitle = needsFC ? `${cleanName}_F.C.` : cleanName;

    const formatted = wikiTitle
      .replace(/\s+/g, '_') // spaces → underscores
      .replace(/&/g, 'and') // ampersands → and
      .replace(/[^\w()'_–.-]/g, ''); // strip problematic punctuation

    acc[club] = `${baseUrl}${encodeURIComponent(formatted)}`;
    return acc;
  }, {});
}

export function buildWorldFootballLink(club: string) {
  const base = 'https://www.worldfootball.net/teams/';
  const formatted = club
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return `${base}${formatted}/`;
}

/**
 * Builds 11v11.com URLs for each English football club name.
 * Example: "Manchester United" → "https://www.11v11.com/teams/manchester-united/"
 */
export function build11v11Links(clubs: string[]): Record<string, string> {
  const baseUrl = 'https://www.11v11.com/teams/';

  return clubs.reduce<Record<string, string>>((acc, club) => {
    const formatted = club
      .trim()
      .toLowerCase()
      .replace(/&/g, 'and') // replace ampersands
      .replace(/[^a-z0-9]+/g, '-') // spaces and punctuation → hyphen
      .replace(/^-+|-+$/g, ''); // trim stray hyphens

    acc[club] = `${baseUrl}${formatted}/`;
    return acc;
  }, {});
}
