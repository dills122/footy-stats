import { LeagueTierToStringyPipe } from './league-tier-to-stringy-pipe';

describe('LeagueTierToStringyPipe', () => {
  let pipe: LeagueTierToStringyPipe;

  beforeEach(() => {
    pipe = new LeagueTierToStringyPipe();
  });

  it.each([
    ['tier1', 'Premier League'],
    ['tier2', 'Championship'],
    ['tier3', 'League One'],
    ['tier4', 'League Two'],
    ['tier5', 'National League'],
  ])('maps %s to %s', (input, expected) => {
    expect(pipe.transform(input)).toBe(expected);
  });

  it('returns empty string for unknown tiers', () => {
    expect(pipe.transform('tier99')).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform(undefined as unknown as string)).toBe('');
  });
});
