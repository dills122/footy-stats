import { readFileSync } from 'node:fs';

describe('global document sizing', () => {
  const styles = readFileSync('src/styles.scss', 'utf8');

  it('lets the themed document background grow beyond one viewport', () => {
    expect(styles).not.toMatch(/html,\s*body\s*\{\s*height:\s*100%;\s*\}/);
    expect(styles).toMatch(/html\s*\{[^}]*min-height:\s*100%;[^}]*\}/);
    expect(styles).toMatch(/body\s*\{[^}]*min-height:\s*100vh;[^}]*\}/);
  });
});
