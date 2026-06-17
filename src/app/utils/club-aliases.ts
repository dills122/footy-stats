const CLUB_IDENTITY_GROUPS = [
  ['Arsenal', 'Woolwich Arsenal'],
  ['Manchester City', 'Ardwick'],
  ['Manchester United', 'Newton Heath'],
] as const;

export interface ClubIdentityTeam {
  id: number;
  name: string;
}

export function getClubIdentityNames(clubName: string): readonly string[] {
  return (
    CLUB_IDENTITY_GROUPS.find((group) => (group as readonly string[]).includes(clubName)) ?? [
      clubName,
    ]
  );
}

export function buildClubIdentityTeamIndex(
  selectedTeamIds: readonly number[],
  teams: readonly ClubIdentityTeam[]
): Map<number, number> {
  const teamById = new Map(teams.map((team) => [team.id, team]));
  const teamIdToSelectedId = new Map<number, number>();

  selectedTeamIds.forEach((selectedTeamId) => {
    const selectedTeam = teamById.get(selectedTeamId);
    if (!selectedTeam) {
      return;
    }

    const identityNames = new Set(getClubIdentityNames(selectedTeam.name));
    teams
      .filter((team) => identityNames.has(team.name))
      .forEach((team) => {
        if (!teamIdToSelectedId.has(team.id)) {
          teamIdToSelectedId.set(team.id, selectedTeamId);
        }
      });
  });

  return teamIdToSelectedId;
}
