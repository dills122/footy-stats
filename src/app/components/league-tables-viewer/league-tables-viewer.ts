import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTableView } from '@app/types';
import { LeagueTableComponent } from '../league-table/league-table';

@Component({
  selector: 'app-league-tables-viewer',
  templateUrl: './league-tables-viewer.html',
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    LeagueTableComponent,
    CommonModule,
    MatCardModule,
    MatIconModule,
  ],
})
export class LeagueTablesViewerComponent {
  store = inject(LeagueStore);

  years: number[] = [];
  leaguesForYear: string[] = [];

  selectedYear?: number;
  selectedLeague?: string;

  constructor() {
    // reactively recompute seasons and tiers
    effect(() => {
      const seasonTiers = this.store.getSeasonTiers();
      this.years = seasonTiers.map((st) => st.season).sort((a, b) => b - a);

      if (this.years.length > 0 && !this.selectedYear) {
        this.onYearChange(this.years[0]);
      }
    });
  }

  get currentTable(): LeagueTableView[] | null {
    if (!this.selectedYear || !this.selectedLeague) return null;

    const table = this.store.getTables(this.selectedYear, this.selectedLeague);
    if (!table) return null;

    const t = table.map((entry) => ({
      ...entry,
      teamName: this.store.getTeamNameById(entry.teamId),
    }));
    return t;
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.selectedLeague = undefined;

    // find tiers for this year
    const seasonTiers = this.store.getSeasonTiers();
    const match = seasonTiers.find((st) => st.season === year);
    this.leaguesForYear = match ? match.tiers : [];
  }
}
