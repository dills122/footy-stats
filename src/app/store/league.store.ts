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
  withMethods((store) => {
    let seasonIndex = new Map<number, LeagueTableEntry[]>();
    let seasonTierIndex = new Map<string, LeagueTableEntry[]>();
    let teamEntriesIndex = new Map<number, LeagueTableEntry[]>();
    let seasonTiersIndex: { season: number; tiers: string[] }[] = [];

    return {
      hydrate(rawData: any) {
        nextTeamId = 1;
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

        seasonIndex = new Map<number, LeagueTableEntry[]>();
        seasonTierIndex = new Map<string, LeagueTableEntry[]>();
        teamEntriesIndex = new Map<number, LeagueTableEntry[]>();
        const seasonTiersMap = new Map<number, Set<string>>();

        tables.forEach((entry) => {
          if (!seasonIndex.has(entry.season)) {
            seasonIndex.set(entry.season, []);
          }
          seasonIndex.get(entry.season)!.push(entry);

          const seasonTierKey = `${entry.season}:${entry.tier}`;
          if (!seasonTierIndex.has(seasonTierKey)) {
            seasonTierIndex.set(seasonTierKey, []);
          }
          seasonTierIndex.get(seasonTierKey)!.push(entry);

          if (!teamEntriesIndex.has(entry.teamId)) {
            teamEntriesIndex.set(entry.teamId, []);
          }
          teamEntriesIndex.get(entry.teamId)!.push(entry);

          if (!seasonTiersMap.has(entry.season)) {
            seasonTiersMap.set(entry.season, new Set());
          }
          seasonTiersMap.get(entry.season)!.add(entry.tier);
        });

        seasonTiersIndex = Array.from(seasonTiersMap.entries()).map(([season, tiersSet]) => ({
          season,
          tiers: Array.from(tiersSet).sort(),
        }));

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
        store.tables();

        if (season && tier) {
          return seasonTierIndex.get(`${season}:${tier}`) ?? [];
        }

        if (season) {
          return seasonIndex.get(season) ?? [];
        }

        if (tier) {
          return store.tables().filter((row) => row.tier === tier);
        }

        return store.tables();
      },
      getSeasonTiers(): { season: number; tiers: string[] }[] {
        store.tables();
        return seasonTiersIndex;
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
        store.tables();
        const entries = teamEntriesIndex.get(teamId) ?? [];
        return entries.map((entry) => ({ season: entry.season, tier: entry.tier }));
      },
      getTeamOverview(teamId: number): {
        team: Team;
        seasons: { season: number; tier: string; pos: number }[];
      } {
        store.tables();
        const entries = teamEntriesIndex.get(teamId) ?? [];
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
    };
  })
);
