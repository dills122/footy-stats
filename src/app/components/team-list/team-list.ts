import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import {
  isTeamDirectoryFilter,
  TEAM_DIRECTORY_FILTERS,
  type TeamDirectoryCategory,
  type TeamDirectoryFilter,
  type TeamDirectoryItem,
} from '@app/types';
import {
  build11v11Links,
  buildWikipediaLinks,
  buildWorldFootballLink,
} from '../../utils/link-builders';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.html',
  styleUrls: ['./team-list.scss'],
  imports: [CommonModule, MatTableModule, MatIconModule, MatTooltipModule, RouterLink],
})
export class TeamList {
  private teamsSignal = signal<TeamDirectoryItem[]>([]);

  @Input() set teams(value: TeamDirectoryItem[] | null) {
    this.teamsSignal.set(value ?? []);
  }

  @Input() set selectedLetter(value: string | null) {
    const normalized = value?.trim().toUpperCase() || null;
    this.selectedLetterSignal.set(normalized);
  }
  @Input() set selectedFilter(value: TeamDirectoryFilter | string | null) {
    this.selectedFilterSignal.set(value && isTeamDirectoryFilter(value) ? value : 'all');
  }

  @Output() letterSelected = new EventEmitter<string>();
  @Output() filterSelected = new EventEmitter<TeamDirectoryFilter>();
  @Output() filtersCleared = new EventEmitter<void>();

  selectedLetterSignal = signal<string | null>(null);
  selectedFilterSignal = signal<TeamDirectoryFilter>('all');

  filterOptions = computed(() =>
    TEAM_DIRECTORY_FILTERS.map((filter) => ({
      ...filter,
      count:
        filter.id === 'all'
          ? this.teamsSignal().length
          : this.teamsSignal().filter((team) =>
              team.categories.includes(filter.id as TeamDirectoryCategory)
            ).length,
    }))
  );

  letters = computed(() => {
    const letters = Array.from(
      new Set(this.categoryFilteredTeams().map((team) => team.name[0].toUpperCase()))
    ).sort();
    return letters;
  });

  categoryFilteredTeams = computed(() => {
    const filter = this.selectedFilterSignal();
    const teams = this.teamsSignal();
    return filter === 'all' ? teams : teams.filter((team) => team.categories.includes(filter));
  });

  filteredTeams = computed(() => {
    const letter = this.selectedLetterSignal();
    const teams = this.categoryFilteredTeams();
    return letter ? teams.filter((team) => team.name[0].toUpperCase() === letter) : teams;
  });
  hasActiveFilters = computed(
    () => Boolean(this.selectedLetterSignal()) || this.selectedFilterSignal() !== 'all'
  );

  selectLetter(letter: string) {
    const normalized = letter.trim().toUpperCase();
    const oldLetter = this.selectedLetterSignal();
    if (!normalized || oldLetter === normalized) {
      this.selectedLetterSignal.set(null);
      this.letterSelected.emit('');
      return;
    }
    this.selectedLetterSignal.set(normalized);
    this.letterSelected.emit(normalized);
  }

  selectFilter(filter: TeamDirectoryFilter) {
    this.selectedFilterSignal.set(filter);
    this.filterSelected.emit(filter);
  }

  clearFilters() {
    this.selectedLetterSignal.set(null);
    this.selectedFilterSignal.set('all');
    this.filtersCleared.emit();
  }

  createWikipediaLink(club: string): string {
    return buildWikipediaLinks([club])[club];
  }

  createWorldFootballLink(club: string): string {
    return buildWorldFootballLink(club);
  }

  create11v11Link(club: string): string {
    const links = build11v11Links([club]);
    return links[club];
  }

  primaryClubId(team: TeamDirectoryItem): string | null {
    return team.clubIds[0] ?? null;
  }

  teamLinkState(): Record<string, string> {
    const letter = this.selectedLetterSignal();
    const filter = this.selectedFilterSignal();
    return {
      ...(letter ? { teamsReturnLetter: letter } : {}),
      ...(filter !== 'all' ? { teamsReturnFilter: filter } : {}),
    };
  }

  seasonSpanLabel(team: TeamDirectoryItem): string {
    if (!team.firstSeenSeason || !team.lastSeenSeason) {
      return 'No seasons';
    }

    return team.firstSeenSeason === team.lastSeenSeason
      ? team.firstSeenSeason.toString()
      : `${team.firstSeenSeason}-${team.lastSeenSeason}`;
  }

  seasonCountLabel(team: TeamDirectoryItem): string {
    return `${team.totalSeasonsSeen} ${team.totalSeasonsSeen === 1 ? 'season' : 'seasons'}`;
  }

  statusLabel(team: TeamDirectoryItem): string {
    return team.status === 'active' ? 'Active' : 'Historical';
  }
}
