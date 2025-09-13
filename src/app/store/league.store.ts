import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import type { LeagueState, LeagueTableEntry, Team } from './league.models';

let nextTeamId = 1;

export const LeagueStore = signalStore(
  { providedIn: 'root' },
  withState<LeagueState>({
    teams: {},
    tables: [],
    seasons: [],
  }),
  withMethods((store) => ({
    hydrate(rawData: any) {
      const teamsMap: Record<string, number> = {};
      const tables: LeagueTableEntry[] = [];
      const seasons: number[] = [];

      Object.entries(rawData.seasons).forEach(([yearStr, seasonData]) => {
        const year = +yearStr;
        seasons.push(year);

        Object.entries(seasonData as any).forEach(
          ([tierName, tierValue]: [string, any]) => {
            const tableRows: any[] = Array.isArray(tierValue)
              ? tierValue
              : tierValue.table;

            tableRows.forEach((row) => {
              let teamId = teamsMap[row.team];
              if (!teamId) {
                teamId = nextTeamId++;
                teamsMap[row.team] = teamId;
              }

              tables.push({
                season: year,
                tier: tierName,
                teamId,
                pos: row.pos,
                played: row.played,
                won: row.won,
                drawn: row.drawn,
                lost: row.lost,
                goalsFor: row.goalsFor,
                goalsAgainst: row.goalsAgainst,
                goalDifference: row.goalDifference,
                goalAverage: row.goalAverage,
                points: row.points,
                notes: row.notes,
                wasRelegated: row.wasRelegated,
                wasPromoted: row.wasPromoted,
                isExpansionTeam: row.isExpansionTeam,
                wasReElected: row.wasReElected,
                wasReprieved: row.wasReprieved,
              });
            });
          }
        );
      });

      // Build teams object
      const teams: Record<number, Team> = {};
      Object.entries(teamsMap).forEach(([name, id]) => {
        teams[id] = { id, name };
      });

      patchState(store, {
        teams,
        tables,
        seasons,
      });
    },

    // Helpers
    getSeasons(): number[] {
      return store.seasons();
    },

    getTables(season?: number, tier?: string): LeagueTableEntry[] {
      return store
        .tables()
        .filter(
          (row) =>
            (!season || row.season === season) && (!tier || row.tier === tier)
        );
    },

    searchTeam(
      name: string
    ): { season: number; tier: string; team: Team; entry: LeagueTableEntry }[] {
      const results: any[] = [];
      const lower = name.toLowerCase();

      store.tables().forEach((entry) => {
        const team = store.teams()[entry.teamId];
        if (team.name.toLowerCase().includes(lower)) {
          results.push({
            season: entry.season,
            tier: entry.tier,
            team,
            entry,
          });
        }
      });

      return results;
    },

    //TODO need new method to be able to pull full table entires by season
  }))
);
