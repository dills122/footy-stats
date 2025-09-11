// install dependencies first: npm install wikipedia cheerio
import * as fs from 'node:fs';
import * as path from 'node:path';
import wikipedia from 'wikipedia';

import parseDivisionTable from './parse-division-table.js'

const outputFile = path.join(process.cwd(), 'data-output', `wiki_promotion_relegations_by_season.json`);

// Simple wait function
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSeasonTeams(seasonSlug) {
    // Example slug: '1900–01_Football_League'
    const page = await wikipedia.page(seasonSlug);
    const html = await page.html();

    await wait(500);

    // const infoboxData = parseInfobox(html)

    // console.log('INFOBOX DATA --- ', infoboxData);

    //TODO create a nice logger message with a link to page when missing data
    const firstDivTable = parseDivisionTable(html, 'first');
    if (!firstDivTable.length) console.warn(`Missing First Div table data on ${seasonSlug}`)
    const secondDivTable = parseDivisionTable(html, 'second');
    if (!secondDivTable.length) console.warn(`Missing First Div table data on ${seasonSlug}`)


    return {
        first: firstDivTable,
        second: secondDivTable
    }

}

async function buildPromotionRelegation(startYear, endYear) {
    const results = {
        seasons: {},
        expansions: {},
        relegations: {}
    };

    // let prevTier1 = null;

    for (let year = startYear; year <= endYear; year++) {
        const endYearEndingDigits = String(year + 1).slice(-2);

        const slug = `${year}-${endYearEndingDigits === '00' ? String(year + 1) : endYearEndingDigits}_Football_League`;
        console.log(`Fetching ${slug}...`);
        try {
            const divisionResultTables = await fetchSeasonTeams(slug);

            const tier1 = divisionResultTables.first || [];
            const tier2 = divisionResultTables.second || [];

            results.seasons[year] = { tier1, tier2 };

            // if (prevTier1) {
            //     // Teams in current Tier1 but not in previous Tier1
            //     const newTeams = tier1.filter(t => !prevTier1.includes(t));
            //     // Relegated teams: in prevTier1 but not current Tier1
            //     const relegatedTeams = prevTier1.filter(t => !tier1.includes(t));

            //     results.expansions[year] = newTeams;
            //     results.relegations[year] = relegatedTeams;
            // }
            // prevTier1 = tier1;
        } catch (e) {
            console.error(`Failed to fetch ${slug}:`, e.message);
        }
    }

    return results;
}

(async () => {
    const data = await buildPromotionRelegation(1910, 1955);
    // Write JSON output
    fs.writeFileSync(outputFile, JSON.stringify(data, null, 2));
    console.log(`League tables written to ${outputFile}`);
})();
