import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  build11v11Links,
  buildWikipediaLinks,
  buildWorldFootballLink,
} from '../../utils/link-builders';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.html',
  styleUrls: ['./team-list.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
  ],
})
export class TeamList {
  @Input() teams: string[] = [];
  @Output() letterSelected = new EventEmitter<string>();

  selectedLetter = signal<string | null>(null);

  letters = computed(() => {
    const letters = Array.from(new Set(this.teams.map((t) => t[0].toUpperCase()))).sort();
    return letters;
  });

  filteredTeams = computed(() => {
    const letter = this.selectedLetter();
    return letter ? this.teams.filter((t) => t[0].toUpperCase() === letter) : this.teams;
  });

  selectLetter(letter: string) {
    this.selectedLetter.set(letter);
    this.letterSelected.emit(letter);
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
}
