import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-team-list',
  templateUrl: './team-list.html',
  imports: [CommonModule, MatCardModule, MatButtonModule, MatTableModule, FormsModule],
})
export class TeamList {
  @Input() teams: string[] = [];
  @Output() letterSelected = new EventEmitter<string>();

  selectedLetter = signal<string | null>(null);

  letters = computed(() => {
    // Unique first letters, uppercase, sorted
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
}
