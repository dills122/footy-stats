import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import type { Team } from '@app/store/league.models';
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
  @Input() teams: Team[] = [];
  @Input() set selectedLetter(value: string | null) {
    const normalized = value?.trim().toUpperCase() || null;
    this.selectedLetterSignal.set(normalized);
  }

  @Output() letterSelected = new EventEmitter<string>();

  selectedLetterSignal = signal<string | null>(null);

  letters = computed(() => {
    const letters = Array.from(
      new Set(this.teams.map((team) => team.name[0].toUpperCase()))
    ).sort();
    return letters;
  });

  filteredTeams = computed(() => {
    const letter = this.selectedLetterSignal();
    return letter ? this.teams.filter((team) => team.name[0].toUpperCase() === letter) : this.teams;
  });

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

  primaryClubId(team: Team): string | null {
    return team.clubIds[0] ?? null;
  }
}
