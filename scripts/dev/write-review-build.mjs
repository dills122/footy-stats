import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const commit =
  process.env.RENDER_GIT_COMMIT ??
  execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

if (!/^[a-f0-9]{40}$/.test(commit)) {
  throw new Error('The review build requires a full Git commit SHA.');
}

await writeFile(
  new URL('../../dist/footy-stats/browser/review-build.json', import.meta.url),
  JSON.stringify({ commit }) + '\n'
);
