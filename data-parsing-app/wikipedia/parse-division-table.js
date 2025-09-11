import * as cheerio from 'cheerio';

/**
 * Normalize header text to map columns reliably across eras.
 */
function normalizeHeader(txt) {
    const t = txt.trim().toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[.]/g, '');

    if (t === 'pos' || t === 'position' || t === 'no') return 'pos';
    if (t === 'team' || t === 'club' || t === 'side') return 'team';
    if (t === 'pld' || t === 'p' || t === 'played') return 'played';
    if (t === 'w' || t === 'won') return 'won';
    if (t === 'd' || t === 'draw' || t === 'drawn') return 'drawn';
    if (t === 'l' || t === 'lost') return 'lost';
    if (t === 'gf' || t === 'goals for') return 'goalsFor';
    if (t === 'ga' || t === 'goals against') return 'goalsAgainst';
    if (t === 'gd' || t === 'goal difference') return 'goalDifference';
    if (t === 'gav' || t === 'gavg' || t === 'goal average' || t === 'ga v' || t === 'g av') return 'goalAverage';
    if (t === 'pts' || t === 'points') return 'points';
    if (t.includes('qualification') || t.includes('relegation') || t === 'notes' || t === 'remarks') return 'notes';
    return t; // unknown, keep raw (won't be mapped)
}

function wasRelegated(note) {
    return String(note).toLowerCase().includes('relegation')
}

function wasPromoted(note) {

    return String(note).toLowerCase().includes('promotion')
}

/**
 * Extract clean text from a cell: strips references/footnotes.
 */
function cellText($, cell) {
    const clone = $(cell).clone();
    clone.find('sup.reference, span.reference, style, script, .navbar, .plainlinks, .hlist').remove();
    return clone.text().replace(/\[\d+\]/g, '').trim();
}

function mapDivisionToSlug(division) {
    switch (division) {
        case 'first':
            return '#First_Division';
        case 'second':
            return '#Second_Division'
        default:
            return ''
    }
}

/**
 * Parse a First Division league table from a Football League Wikipedia page.
 * Returns an array of rows with mapped stats.
 */
export function parseDivisionTable(html, division) {
    const $ = cheerio.load(html);

    const headerSlug = mapDivisionToSlug(division);

    // Step 1: Find the header
    const header = $(headerSlug);

    // Step 2: From that header, traverse forward to the first .wikitable
    const table = header.closest('div').nextAll('.wikitable').first();

    // Build header map (index -> field)
    const headerRow = table.find('tr').first();
    const headerCells = headerRow.find('th');
    const headerMap = [];
    headerCells.each((i, th) => {
        const label = cellText($, th);
        headerMap[i] = normalizeHeader(label);
    });

    // Helper to find index by field name
    const idxOf = (field) => headerMap.findIndex(h => h === field);

    // Track rowspan carryover for 'notes' column
    let notesCarry = { text: null, remaining: 0 };
    const results = [];

    // Iterate data rows (skip the header row)
    table.find('tr').slice(1).each((_, tr) => {
        const $tr = $(tr);

        // Skip sub-headers or separators that contain more TH than TD (besides team TH)
        const dataCells = $tr.find('td, th[scope="row"]');
        if (dataCells.length === 0) return;

        // Build an array aligned to headers by position:
        // The table typically uses: td(pos), th[scope=row](team), td(...stats)
        // So order of nodes in `dataCells` should match header order.
        const texts = [];
        dataCells.each((_, c) => {
            // For team, prefer the link text (avoids "(R)" etc).
            if ($(c).is('th[scope="row"]')) {
                const teamLink = $(c).find('a').first().text().trim();
                texts.push(teamLink || cellText($, c));
            } else {
                texts.push(cellText($, c));
            }
        });

        // If the row appears to be a secondary header (e.g., repeats column names), skip it
        const isProbablyHeader = texts.every(t => Number.isNaN(parseInt(t, 10))) && texts.some(t => /team|club|pld|pts/i.test(t));
        if (isProbablyHeader) return;

        const get = (field) => {
            const i = idxOf(field);
            if (i === -1) return undefined;
            // If this row is missing a trailing cell because of a previous rowspan,
            // fall back to carry text for notes.
            return texts[i];
        };

        const num = (v) => {
            if (v == null) return null;
            const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
            return Number.isNaN(n) ? null : n;
        };

        const row = {
            pos: num(get('pos')),
            team: get('team') || null,
            played: num(get('played')),
            won: num(get('won')),
            drawn: num(get('drawn')),
            lost: num(get('lost')),
            goalsFor: num(get('goalsFor')),
            goalsAgainst: num(get('goalsAgainst')),
            goalDifference: num(get('goalDifference')),
            goalAverage: num(get('goalAverage')),
            points: num(get('points')),
            notes: null,
            wasRelegated: null,
            wasPromoted: null
        };

        // Handle notes with potential rowspan carryover
        const notesIdx = idxOf('notes');
        if (notesIdx !== -1) {
            // Determine if this row actually contains the notes cell
            const rawNotesCell = $tr.find('td, th').get(notesIdx);
            if (rawNotesCell) {
                // Has a real cell here
                const text = cellText($, rawNotesCell) || null;
                row.notes = text?.length ? text : null;

                // Setup carryover if rowspan > 1
                const rs = parseInt($(rawNotesCell).attr('rowspan') || '1', 10);
                if (!Number.isNaN(rs) && rs > 1) {
                    notesCarry = { text: row.notes, remaining: rs - 1 };
                } else {
                    notesCarry = { text: null, remaining: 0 };
                }
            } else if (notesCarry.remaining > 0) {
                // No cell here due to previous rowspan: carry it
                row.notes = notesCarry.text;
                notesCarry.remaining -= 1;
            }
        }

        /**
         * TODO add additional step here to parse notes and add info to row
         * wasRelegated, wasPromoted, newExpansionTeam
        **/
        row.wasPromoted = wasPromoted(row.notes)
        row.wasRelegated = wasRelegated(row.notes)



        // Only accept rows that have a team name and a position
        if (row.team && row.pos != null) {
            results.push(row);
        }
    });

    return results;
}

export default parseDivisionTable;