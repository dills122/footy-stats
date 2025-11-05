import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { Team } from '@app/store/league.models';
import { TeamLinks } from '../team-links/team-links';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.html',
  styleUrls: ['./team-list.scss'],
  imports: [
    RouterModule,
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    FormsModule,
    MatIconModule,
    MatTooltipModule,
    TeamLinks,
  ],
})
export class TeamList {
  @Input() teams: Team[] = [];
  @Output() letterSelected = new EventEmitter<string>();

  selectedLetter = signal<string | null>(null);

  letters = computed(() => {
    const letters = Array.from(new Set(this.teams.map((t) => t.name[0].toUpperCase()))).sort();
    return letters;
  });

  filteredTeams = computed(() => {
    const letter = this.selectedLetter();
    return letter ? this.teams.filter((t) => t.name[0].toUpperCase() === letter) : this.teams;
  });

  selectLetter(letter: string) {
    const oldLetter = this.selectedLetter();
    if (oldLetter === letter) {
      this.selectedLetter.set(null);
      this.letterSelected.emit('');
      return;
    }
    this.selectedLetter.set(letter);
    this.letterSelected.emit(letter);
  }
}
