import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

describe('GitHub Pages route entry points', () => {
  const script = 'scripts/dev/write-pages-routes.mjs';
  const shell = '<base href="/"><app-root></app-root><script src="main-HASH.js"></script>';
  let output: string;

  beforeEach(() => {
    output = mkdtempSync(join(tmpdir(), 'footy-pages-'));
    mkdirSync(join(output, 'assets'));
    writeFileSync(join(output, 'index.html'), shell);
    writeFileSync(join(output, 'assets', 'seasons.json'), '{"seasons":{"2025":{"tier7":{}}}}');
  });

  afterEach(() => {
    rmSync(output, { recursive: true, force: true });
  });

  it('serves archive pages and profiles, including club IDs with spaces', () => {
    writeFileSync(join(output, 'assets', 'club-metadata.json'), '{"clubs":{"aston villa":{}}}');
    execFileSync(process.execPath, [script, output]);

    for (const directory of [
      'tables',
      'system',
      'movement',
      'rivalries',
      'teams',
      'teams/aston villa',
      'teams/aston villa/deep-stats',
      'leagues/tier7',
      'leagues/tier7/deep-stats',
    ]) {
      expect(readFileSync(join(output, directory, 'index.html'), 'utf8')).toBe(shell);
    }
  });

  it('rejects club IDs that are not a single path segment', () => {
    writeFileSync(join(output, 'assets', 'club-metadata.json'), '{"clubs":{"../outside":{}}}');
    const result = spawnSync(process.execPath, [script, output], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('Invalid club route segment');
  });
});
