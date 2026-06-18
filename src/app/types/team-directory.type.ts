import type { Team } from '@app/store/league.models';

export const TEAM_DIRECTORY_FILTERS = [
  {
    id: 'all',
    label: 'All',
    description: 'Every club name in the archive',
  },
  {
    id: 'active',
    label: 'Active',
    description: 'Seen in the latest tracked season',
  },
  {
    id: 'historical',
    label: 'Historical',
    description: 'Not seen in the latest tracked season',
  },
  {
    id: 'top-flight',
    label: 'Top flight',
    description: 'Has appeared in the top tier',
  },
  {
    id: 'current-top-flight',
    label: 'Current top flight',
    description: 'Top-tier club in the latest tracked season',
  },
  {
    id: 'long-run',
    label: '50+ seasons',
    description: 'At least 50 tracked league seasons',
  },
  {
    id: 'lineage',
    label: 'Lineage links',
    description: 'Has recorded merger, phoenix, or successor metadata',
  },
] as const;

export type TeamDirectoryFilter = (typeof TEAM_DIRECTORY_FILTERS)[number]['id'];
export type TeamDirectoryCategory = Exclude<TeamDirectoryFilter, 'all'>;

export interface TeamDirectoryItem extends Team {
  categories: TeamDirectoryCategory[];
  firstSeenSeason: number | null;
  lastSeenSeason: number | null;
  totalSeasonsSeen: number;
  status: 'active' | 'historical';
}

export function isTeamDirectoryFilter(value: string): value is TeamDirectoryFilter {
  return TEAM_DIRECTORY_FILTERS.some((filter) => filter.id === value);
}
