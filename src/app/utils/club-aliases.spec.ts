import { buildClubIdentityTeamIndex, getClubIdentityNames } from './club-aliases';

describe('club aliases', () => {
  it.each([
    ['Arsenal', ['Arsenal', 'Woolwich Arsenal']],
    ['Woolwich Arsenal', ['Arsenal', 'Woolwich Arsenal']],
    ['Manchester City', ['Manchester City', 'Ardwick']],
    ['Ardwick', ['Manchester City', 'Ardwick']],
    ['Manchester United', ['Manchester United', 'Newton Heath']],
    ['Newton Heath', ['Manchester United', 'Newton Heath']],
  ])('returns shared identity names for %s', (clubName, expectedNames) => {
    expect(getClubIdentityNames(clubName)).toEqual(expectedNames);
  });

  it('returns the club name when no historical alias is configured', () => {
    expect(getClubIdentityNames('Chelsea')).toEqual(['Chelsea']);
  });

  it('maps historical aliases back to the selected modern club id', () => {
    const index = buildClubIdentityTeamIndex(
      [2],
      [
        { id: 1, name: 'Woolwich Arsenal' },
        { id: 2, name: 'Arsenal' },
        { id: 3, name: 'Chelsea' },
      ]
    );

    expect(index.get(1)).toBe(2);
    expect(index.get(2)).toBe(2);
    expect(index.has(3)).toBe(false);
  });
});
