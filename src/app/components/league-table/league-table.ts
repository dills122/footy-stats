import { Component, Input } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import type { LeagueTableView } from '@app/types';

@Component({
  selector: 'app-league-table',
  templateUrl: './league-table.html',
  styleUrls: ['./league-table.scss'],
  imports: [MatTableModule],
})
export class LeagueTableComponent {
  @Input() leagueTable: LeagueTableView[] = [];

  displayedColumns: string[] = [
    'position',
    'teamName',
    'played',
    'won',
    'drawn',
    'lost',
    'goalsFor',
    'goalsAgainst',
    'goalDifference',
    'points',
  ];

  get sortedTable(): LeagueTableView[] {
    return [...this.leagueTable].sort(
      (a, b) => b.points - a.points || (b.goalDifference ?? 0) - (a.goalDifference ?? 0)
    );
  }
}
