// src/app/models/league.models.ts

export interface LeagueTableEntry {
  season: number;
  tier: string;
  teamId: number;
  pos: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number | null;
  goalAverage: number | null;
  points: number;
  notes: string | null;
  wasRelegated: boolean;
  wasPromoted: boolean;
  isExpansionTeam: boolean;
  wasReElected: boolean;
  wasReprieved: boolean;
}

export interface Team {
  id: number;
  name: string;
}

export interface LeagueState {
  teams: Record<number, Team>; // teamId -> Team
  tables: LeagueTableEntry[];
  seasons: number[]; // all season years
}
