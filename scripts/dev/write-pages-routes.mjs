import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const output =
  process.argv[2] ?? fileURLToPath(new URL('../../dist/footy-stats/browser/', import.meta.url));
const [metadata, archive] = await Promise.all(
  ['club-metadata.json', 'seasons.json'].map(async (name) =>
    JSON.parse(await readFile(join(output, 'assets', name), 'utf8'))
  )
);

const routes = ['tables', 'system', 'movement', 'rivalries', 'teams'];
const tiers = new Set(
  Object.values(archive.seasons).flatMap((season) =>
    Object.keys(season).filter((key) => /^tier\d+$/.test(key))
  )
);

for (const clubId of Object.keys(metadata.clubs)) {
  if (!clubId || clubId === '.' || clubId === '..' || /[/\\]/.test(clubId)) {
    throw new Error(`Invalid club route segment: ${JSON.stringify(clubId)}`);
  }
  routes.push(`teams/${clubId}`, `teams/${clubId}/deep-stats`);
}

for (const tier of tiers) {
  routes.push(`leagues/${tier}`, `leagues/${tier}/deep-stats`);
}

// The server serves the same Angular shell at each path and leaves its query string intact.
for (const route of routes) {
  const directory = join(output, route);
  await mkdir(directory, { recursive: true });
  await copyFile(join(output, 'index.html'), join(directory, 'index.html'));
}

console.log(`Wrote GitHub Pages entry points for ${routes.length} archive routes.`);
