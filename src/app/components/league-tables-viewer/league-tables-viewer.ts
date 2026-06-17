import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { DataIssueReportDialog } from '@app/components/data-issue-report-dialog/data-issue-report-dialog';
import { LeagueTierToStringyPipe } from '@app/pipes/league-tier-to-stringy-pipe';
import { LeagueStore } from '@app/store/league.store';
import { LeagueTableView } from '@app/types';
import type { DataIssueReportContext } from '@app/utils/data-issue-report';
import { LeagueTableComponent } from '../league-table/league-table';
import { SeasonSummaryCardComponent } from '../season-summary-card/season-summary-card';

@Component({
  selector: 'app-league-tables-viewer',
  templateUrl: './league-tables-viewer.html',
  styleUrl: './league-tables-viewer.scss',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    LeagueTableComponent,
    CommonModule,
    MatIconModule,
    LeagueTierToStringyPipe,
    SeasonSummaryCardComponent,
    DataIssueReportDialog,
  ],
  providers: [LeagueTierToStringyPipe],
})
export class LeagueTablesViewerComponent {
  store = inject(LeagueStore);
  private leagueLabelPipe = inject(LeagueTierToStringyPipe);

  years: number[] = [];
  leaguesForYear: string[] = [];

  selectedYear = signal<number | undefined>(undefined);
  selectedLeague = signal<string | undefined>(undefined);

  constructor() {
    effect(() => {
      const seasonTiers = this.store.getSeasonTiers();
      this.years = seasonTiers.map((st) => st.season).sort((a, b) => b - a);

      if (this.years.length > 0 && !this.selectedYear()) {
        this.onYearChange(this.years[0]);
      }
    });
  }

  currentTable = computed<LeagueTableView[] | null>(() => {
    const year = this.selectedYear();
    const league = this.selectedLeague();
    if (!year || !league) return null;

    const table = this.store.getFullTable(year, league);
    if (!table) return null;

    return table.map((entry) => ({
      ...entry,
      teamName: this.store.getTeamNameById(entry.teamId),
    }));
  });

  currentLeagueLabel = computed(() => {
    const league = this.selectedLeague();
    return league ?? '';
  });

  dataIssueContext = computed<DataIssueReportContext>(() => {
    const league = this.selectedLeague();
    return {
      pageTitle: 'League table archive',
      sourcePath: '/tables',
      season: this.selectedYear(),
      competition: league ? this.leagueLabelPipe.transform(league) || league : undefined,
    };
  });

  onYearChange(year: number) {
    this.selectedYear.set(year);
    this.selectedLeague.set(undefined);

    const seasonTiers = this.store.getSeasonTiers();
    const currentSeasonsAvailableTiers = seasonTiers.find((st) => st.season === year);
    this.leaguesForYear = currentSeasonsAvailableTiers?.tiers ?? [];
    this.selectedLeague.set(this.leaguesForYear[0]);
  }

  onLeagueChange(league: string) {
    this.selectedLeague.set(league);
  }
}
