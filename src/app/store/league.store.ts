/* eslint-disable @typescript-eslint/no-explicit-any */
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

        Object.entries(seasonData as any).forEach(([tierName, tierValue]: [string, any]) => {
          const tableRows: any[] = Array.isArray(tierValue) ? tierValue : tierValue.table;

          tableRows.forEach((row) => {
            let teamId = teamsMap[row.team];
            if (!teamId) {
              teamId = nextTeamId++;
              teamsMap[row.team] = teamId;
            }

            // Calculate goalDifference if not provided
            const goalDifference =
              row.goalDifference ??
              (typeof row.goalsFor === 'number' && typeof row.goalsAgainst === 'number'
                ? row.goalsFor - row.goalsAgainst
                : null);

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
              goalDifference,
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
        });
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
    getSeasons(): number[] {
      return store.seasons();
    },
    getFullTable(season?: number, tier?: string): LeagueTableEntry[] {
      return store
        .tables()
        .filter((row) => (!season || row.season === season) && (!tier || row.tier === tier));
    },
    getSeasonTiers(): { season: number; tiers: string[] }[] {
      const map: Record<number, Set<string>> = {};

      store.tables().forEach((entry) => {
        if (!map[entry.season]) {
          map[entry.season] = new Set();
        }
        map[entry.season].add(entry.tier);
      });

      return Object.entries(map).map(([season, tiersSet]) => ({
        season: +season,
        tiers: Array.from(tiersSet).sort(),
      }));
    },
    getTeams(): Team[] {
      return Object.values(store.teams());
    },
    getTeamById(id: number): Team {
      return store.teams()[id];
    },
    getTeamNameById(id: number): string {
      return store.teams()[id]?.name ?? 'Unknown';
    },
    getSeasonsAndTiersForTeam(teamId: number): { season: number; tier: string }[] {
      const entries = store.tables().filter((entry) => entry.teamId === teamId);
      return entries.map((entry) => ({ season: entry.season, tier: entry.tier }));
    },
    getTeamOverview(teamId: number): {
      team: Team;
      seasons: { season: number; tier: string; pos: number }[];
    } {
      const entries = store.tables().filter((entry) => entry.teamId === teamId);
      const team = this.getTeamById(teamId);
      const seasons = entries.map((entry) => ({
        season: entry.season,
        tier: entry.tier,
        pos: entry.pos,
      }));
      return {
        team,
        seasons,
      };
    },
    getPromotionRelegationInfo(
      season: number,
      tier: string
    ): { promoted: Team[]; relegated: Team[] } {
      const tableData = this.getFullTable(season, tier);
      let promotedTeams = [];
      let relegatedTeams = [];
      if (!tableData?.length) {
        return { promoted: [], relegated: [] };
      }

      promotedTeams = tier === 'tier1' ? [] : tableData.filter((entry) => entry.wasPromoted);
      relegatedTeams = tableData.filter((entry) => entry.wasRelegated);

      return {
        promoted: promotedTeams.map((entry) => this.getTeamById(entry.teamId)),
        relegated: relegatedTeams.map((entry) => this.getTeamById(entry.teamId)),
      };
    },
  }))
);
