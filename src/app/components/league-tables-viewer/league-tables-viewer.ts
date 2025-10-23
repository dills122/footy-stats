import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTableView } from '@app/types';
import { LeagueTableComponent } from '../league-table/league-table';
import { SeasonSummaryCardComponent } from '../season-summary-card/season-summary-card';

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
    LeagueTierToStringyPipe,
    SeasonSummaryCardComponent,
  ],
  providers: [LeagueTierToStringyPipe],
})
export class LeagueTablesViewerComponent {
  store = inject(LeagueStore);

  years: number[] = [];
  leaguesForYear: string[] = [];

  selectedYear?: number;
  selectedLeague?: string;

  constructor() {
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

    const table = this.store.getFullTable(this.selectedYear, this.selectedLeague);
    if (!table) return null;

    return table.map((entry) => ({
      ...entry,
      teamName: this.store.getTeamNameById(entry.teamId),
    }));
  }

  onYearChange(year: number) {
    this.selectedYear = year;
    this.selectedLeague = undefined;

    const seasonTiers = this.store.getSeasonTiers();
    const currentSeasonsAvailableTiers = seasonTiers.find((st) => st.season === year);
    this.leaguesForYear = currentSeasonsAvailableTiers?.tiers ?? [];
    this.selectedLeague = this.leaguesForYear[0];
  }
}
