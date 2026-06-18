import { buildCsv, buildJson, buildTxt, sanitizeExportFilename } from './data-export';

describe('data export utilities', () => {
  it('builds csv from the union of row columns with escaped values', () => {
    expect(
      buildCsv([
        { club: 'Manchester United', points: 71 },
        { club: 'Aston Villa', note: 'Won, then "held"' },
      ])
    ).toBe('club,points,note\nManchester United,71,\nAston Villa,,"Won, then ""held"""');
  });

  it('builds text export content with summary and rows', () => {
    expect(
      buildTxt({
        title: 'Premier League 2025',
        generatedAt: '2026-06-18T12:00:00.000Z',
        summary: { season: 2025, competition: 'Premier League' },
        rows: [{ club: 'Liverpool', points: 60 }],
      })
    ).toBe(
      [
        'Premier League 2025',
        'Generated: 2026-06-18T12:00:00.000Z',
        '',
        'Summary',
        'Season: 2025',
        'Competition: Premier League',
        '',
        'Rows (1)',
        'Club\tPoints',
        'Liverpool\t60',
        '',
      ].join('\n')
    );
  });

  it('builds json export content with optional data', () => {
    expect(
      JSON.parse(
        buildJson({
          title: 'Club export',
          generatedAt: '2026-06-18T12:00:00.000Z',
          summary: { club: 'Arsenal' },
          rows: [{ season: 2025 }],
          data: { aliases: ['Arsenal FC'] },
        })
      )
    ).toEqual({
      title: 'Club export',
      generatedAt: '2026-06-18T12:00:00.000Z',
      summary: { club: 'Arsenal' },
      rows: [{ season: 2025 }],
      data: { aliases: ['Arsenal FC'] },
    });
  });

  it('sanitizes filenames for downloads', () => {
    expect(sanitizeExportFilename('Premier League / 2025 Table')).toBe('premier-league-2025-table');
    expect(sanitizeExportFilename('   ')).toBe('footy-stats-export');
  });
});
