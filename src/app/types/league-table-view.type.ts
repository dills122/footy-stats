import type { LeagueTableEntry } from '@app/store/league.models';
import type { SetOptional } from 'type-fest';

export type LeagueTableView = SetOptional<LeagueTableEntry, 'teamId'> & {
  teamName: string;
};
